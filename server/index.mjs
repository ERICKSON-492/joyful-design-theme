import http from 'node:http'
import crypto from 'node:crypto'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleDb, handleFiles, handleSignedUrl, handleRealtime } from './db-api.mjs'
import { handleFunction, handleMpesaCallback, handleRpc, drainOutbox } from './functions-api.mjs'

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } })
const supabaseAdmin = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  : null
const port = Number(process.env.PORT || 3001)
const sessionTtlSeconds = Number(process.env.SESSION_TTL_SECONDS || 2592000)
const sessionCookieName = process.env.SESSION_COOKIE_NAME || 'ushanga_session'
const r2 = process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME
  ? new S3Client({ region: 'auto', endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } })
  : null
const r2PublicBaseUrl = String(process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '')
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(body === undefined ? '' : JSON.stringify(body)) }
const body = async (req) => { let raw = ''; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {} }
const productFields = 'id,name,description,price,price_min,price_max,category,subcategory,image_url,image_urls,stock,is_active,is_preorder,preorder_label,low_stock_threshold,sale_price,created_at,updated_at'
const variantFields = 'id,product_id,variant_label,size,color,price,stock,is_active,created_at,updated_at'
const productDto = (p) => ({ ...p, price: Number(p.price), price_min: p.price_min == null ? null : Number(p.price_min), price_max: p.price_max == null ? null : Number(p.price_max), sale_price: p.sale_price == null ? null : Number(p.sale_price) })
const variantDto = (v) => ({ ...v, price: Number(v.price) })

const parseCookies = (header = '') => Object.fromEntries(header.split(';').map(v => v.trim().split('=').map(decodeURIComponent)).filter(v => v.length === 2))
const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex')
const safeUser = (u) => ({ id: u.id, email: u.email, displayName: u.display_name, role: u.role })
// The browser app is served from a different origin than this API, so the
// session cookie must be SameSite=None (which requires Secure).
const cookie = (token, maxAge = sessionTtlSeconds) => `${sessionCookieName}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=None; Partitioned; Path=/; Max-Age=${maxAge}`

const extraOrigins = String(process.env.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean)
function allowedOrigin(origin) {
  if (!origin) return null
  if (extraOrigins.includes(origin)) return origin
  let host
  try { host = new URL(origin).hostname } catch { return null }
  if (host === 'localhost' || host === '127.0.0.1') return origin
  if (host.endsWith('.lovable.app') || host.endsWith('.lovableproject.com')) return origin
  if (host.endsWith('.pages.dev')) return origin
  if (host === 'ushangachronicles.com' || host.endsWith('.ushangachronicles.com')) return origin
  return null
}
function applyCors(req, res) {
  const origin = allowedOrigin(req.headers.origin)
  if (!origin) return
  res.setHeader('access-control-allow-origin', origin)
  res.setHeader('access-control-allow-credentials', 'true')
  res.setHeader('access-control-allow-methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('access-control-allow-headers', 'content-type,authorization')
  res.setHeader('access-control-max-age', '86400')
  res.setHeader('vary', 'Origin')
}
async function neonUser(req) {
  const token = parseCookies(req.headers.cookie || '')[sessionCookieName]
  if (!token) return null
  const r = await pool.query('SELECT u.id,u.email,u.display_name,u.role,u.is_active FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.is_active=true', [tokenHash(token)])
  if (!r.rowCount) return null
  await pool.query('UPDATE auth_sessions SET last_seen_at=now() WHERE token_hash=$1', [tokenHash(token)])
  return r.rows[0]
}
async function createSession(req, userId) {
  const raw = crypto.randomBytes(32).toString('base64url')
  await pool.query('INSERT INTO auth_sessions (user_id,token_hash,expires_at,user_agent,ip_address) VALUES ($1,$2,now()+($3 * interval \'1 second\'),$4,$5)', [userId, tokenHash(raw), sessionTtlSeconds, req.headers['user-agent'] || null, req.socket.remoteAddress || null])
  return raw
}
const authJson = (res, status, body, headers = {}) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }); res.end(JSON.stringify(body)) }

async function authUser(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token || !supabaseAdmin) return null
  const { data } = await supabaseAdmin.auth.getUser(token)
  return data.user || null
}
async function requireAdmin(req) {
  const sessionUser = await neonUser(req)
  if (sessionUser?.role === 'admin') return sessionUser
  const user = await authUser(req)
  if (!user) return null
  const { rowCount } = await pool.query('SELECT 1 FROM public.admin_users WHERE user_id=$1', [user.id])
  return rowCount ? user : null
}
function queryFilters(url) {
  const p = url.searchParams
  const where = []; const values = []
  const add = (sql, value) => { values.push(value); where.push(sql.replace('$VALUE', `$${values.length}`)) }
  if (p.get('is_active') === 'eq.true') add('is_active=$VALUE', true)
  if (p.get('is_active') === 'eq.false') add('is_active=$VALUE', false)
  if (p.get('category')?.startsWith('eq.')) add('category=$VALUE', decodeURIComponent(p.get('category').slice(3)))
  if (p.get('id')?.startsWith('eq.')) add('id=$VALUE', p.get('id').slice(3))
  if (p.get('id')?.startsWith('neq.')) add('id<>$VALUE', p.get('id').slice(4))
  if (p.get('product_id')?.startsWith('eq.')) add('product_id=$VALUE', p.get('product_id').slice(3))
  return { where: where.length ? `WHERE ${where.join(' AND ')}` : '', values, limit: Math.min(Number(p.get('limit') || 100), 200), order: p.get('order')?.includes('created_at.desc') ? 'created_at DESC' : p.get('order')?.includes('price.asc') ? 'price ASC' : 'created_at ASC' }
}
async function handle(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true })
  if (req.method === 'GET' && url.pathname === '/api/auth/me') { const user = await neonUser(req); return authJson(res, 200, { user: user ? safeUser(user) : null }) }
  if (req.method === 'POST' && url.pathname === '/api/auth/signup') {
    const b = await body(req); const email = String(b.email || '').trim().toLowerCase(); const password = String(b.password || ''); const displayName = String(b.displayName || b.name || '').trim()
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6 || password.length > 128) return authJson(res, 400, { error: 'Use a valid email and a password of at least 6 characters.' })
    const passwordHash = await bcrypt.hash(password, 12)
    try { const r = await pool.query('INSERT INTO auth_users (email,password_hash,display_name) VALUES ($1,$2,$3) RETURNING id,email,display_name,role', [email, passwordHash, displayName || null]); const session = await createSession(req, r.rows[0].id); return authJson(res, 201, { user: safeUser(r.rows[0]) }, { 'set-cookie': cookie(session) }) }
    catch (e) { if (e.code === '23505') return authJson(res, 409, { error: 'An account with that email already exists.' }); throw e }
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const b = await body(req); const email = String(b.email || '').trim().toLowerCase(); const password = String(b.password || ''); const r = await pool.query('SELECT id,email,password_hash,display_name,role,is_active FROM auth_users WHERE email=$1', [email]); const user = r.rows[0]
    if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) return authJson(res, 401, { error: 'Invalid email or password.' })
    const session = await createSession(req, user.id); return authJson(res, 200, { user: safeUser(user) }, { 'set-cookie': cookie(session) })
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/logout') { const token = parseCookies(req.headers.cookie || '')[sessionCookieName]; if (token) await pool.query('DELETE FROM auth_sessions WHERE token_hash=$1', [tokenHash(token)]); return authJson(res, 200, { ok: true }, { 'set-cookie': cookie('', 0) }) }
  if (req.method === 'POST' && url.pathname === '/api/auth/forgot-password') return authJson(res, 200, { ok: true, message: 'If that email exists, a reset link will be sent.' })
  if (req.method === 'GET' && url.pathname === '/api/products') {
    const f = queryFilters(url); const r = await pool.query(`SELECT ${productFields} FROM public.products ${f.where} ORDER BY ${f.order} LIMIT ${f.limit}`, f.values); return json(res, 200, r.rows.map(productDto))
  }
  if (req.method === 'GET' && url.pathname.startsWith('/api/products/')) {
    const id = decodeURIComponent(url.pathname.slice(14)); const r = await pool.query(`SELECT ${productFields} FROM public.products WHERE id=$1 AND is_active=true`, [id]); if (!r.rowCount) return json(res, 404, { error: 'Product not found' }); return json(res, 200, productDto(r.rows[0]))
  }
  if (req.method === 'GET' && url.pathname === '/api/product-variants') { const f = queryFilters(url); const r = await pool.query(`SELECT ${variantFields} FROM public.product_variants ${f.where} ORDER BY ${f.order} LIMIT ${f.limit}`, f.values); return json(res, 200, r.rows.map(variantDto)) }
  if (url.pathname.startsWith('/api/admin/')) {
    if (!(await requireAdmin(req))) return json(res, 403, { error: 'Admin access required' })
    if (req.method === 'GET' && url.pathname === '/api/admin/products') { const r = await pool.query(`SELECT ${productFields} FROM public.products ORDER BY created_at DESC`); return json(res, 200, { products: r.rows.map(productDto) }) }
    if (req.method === 'POST' && url.pathname === '/api/admin/products') { const b = await body(req); const r = await pool.query(`INSERT INTO products (name,description,price,price_min,price_max,category,subcategory,stock,image_url,image_urls,is_active,is_preorder,preorder_label) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING ${productFields}`, [b.name,b.description||null,b.price,b.price_min??null,b.price_max??null,b.category||'',b.subcategory||null,b.stock||0,b.image_url||null,b.image_urls||[],b.is_active!==false,b.is_preorder||false,b.preorder_label||null]); return json(res, 201, productDto(r.rows[0])) }
    const match = url.pathname.match(/^\/api\/admin\/products\/([^/]+)$/)
    if (match && req.method === 'PATCH') { const b = await body(req); const allowed = ['name','description','price','price_min','price_max','category','subcategory','stock','image_url','image_urls','is_active','is_preorder','preorder_label','low_stock_threshold','sale_price']; const sets=[]; const vals=[]; for (const k of allowed) if (b[k] !== undefined) { vals.push(b[k]); sets.push(`${k}=$${vals.length}`) } if (!sets.length) return json(res, 400, { error:'No fields' }); vals.push(match[1]); const r=await pool.query(`UPDATE products SET ${sets.join(',')},updated_at=now() WHERE id=$${vals.length} RETURNING ${productFields}`,vals); return r.rowCount ? json(res,200,productDto(r.rows[0])) : json(res,404,{error:'Product not found'}) }
    if (match && req.method === 'DELETE') { await pool.query('UPDATE products SET is_active=false,updated_at=now() WHERE id=$1',[match[1]]); return json(res,204) }
    const vm = url.pathname.match(/^\/api\/admin\/variants(?:\/([^/]+))?$/)
    if (vm && req.method === 'POST') { const b=await body(req); const r=await pool.query(`INSERT INTO product_variants (product_id,variant_label,size,color,price,stock,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${variantFields}`,[b.product_id,b.variant_label||`${b.size||''} ${b.color||''}`.trim(),b.size||null,b.color||null,b.price||0,b.stock||0,b.is_active!==false]); return json(res,201,variantDto(r.rows[0])) }
    if (vm && req.method === 'PATCH') { const b=await body(req); const keys=['variant_label','size','color','price','stock','is_active']; const sets=[];const vals=[];for(const k of keys)if(b[k]!==undefined){vals.push(b[k]);sets.push(`${k}=$${vals.length}`)}vals.push(vm[1]);const r=await pool.query(`UPDATE product_variants SET ${sets.join(',')},updated_at=now() WHERE id=$${vals.length} RETURNING ${variantFields}`,vals);return r.rowCount?json(res,200,variantDto(r.rows[0])):json(res,404,{error:'Variant not found'}) }
    if (vm && req.method === 'DELETE') { await pool.query('UPDATE product_variants SET is_active=false,updated_at=now() WHERE id=$1',[vm[1]]); return json(res,204) }
  }
  if (req.method === 'POST' && url.pathname === '/api/orders') {
    const b=await body(req); if (!Array.isArray(b.items)||!b.items.length) return json(res,400,{error:'Cart is empty'})
    const ids=b.items.map(i=>i.id); const r=await pool.query('SELECT id,name,price,stock,is_active FROM products WHERE id=ANY($1::uuid[]) FOR UPDATE',[ids]); const byId=new Map(r.rows.map(x=>[x.id,x])); const authoritative=[]
    for(const item of b.items){const p=byId.get(item.id);if(!p||!p.is_active)return json(res,400,{error:`Product unavailable: ${item.name||item.id}`});const qty=Number(item.quantity);if(!Number.isInteger(qty)||qty<1||qty>p.stock)return json(res,409,{error:`Insufficient stock for ${p.name}`});authoritative.push({id:p.id,name:p.name,price:Number(p.price),quantity:qty})}
    const subtotal=authoritative.reduce((s,i)=>s+i.price*i.quantity,0); const shipping=Number(b.shipping_cost||0); const discount=Math.max(0,Number(b.discount_amount||0)); const total=Math.max(0,subtotal+shipping-discount)
    const client=await pool.connect(); try{await client.query('BEGIN'); for(const i of authoritative) await client.query('UPDATE products SET stock=stock-$1,updated_at=now() WHERE id=$2',[i.quantity,i.id]); const o=await client.query(`INSERT INTO joyful_orders (phone,customer_name,total_amount,status,items,user_id,shipping_address,email,shipping_method,shipping_cost,latitude,longitude,stock_decremented) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true) RETURNING id,total_amount`,[b.phone,b.customer_name,total,b.status||'pending',JSON.stringify(authoritative),b.user_id||null,b.shipping_address||{},b.email||null,b.shipping_method||null,shipping,b.latitude??null,b.longitude??null]); await client.query('COMMIT'); return json(res,201,{order:o.rows[0],subtotal,shipping_cost:shipping,discount_amount:discount,total})}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }
  // Generic data access (replaces PostgREST), file storage, signed links and
  // the polling channel that replaces realtime broadcast.
  if (url.pathname.startsWith('/api/db/')) {
    const user = await neonUser(req)
    const isAdmin = user?.role === 'admin' ? true : Boolean(await requireAdmin(req))
    return handleDb({ pool, req, res, url, json, body, user, isAdmin })
  }
  if (url.pathname.startsWith('/api/files/')) {
    const user = await neonUser(req)
    const isAdmin = user?.role === 'admin'
    return handleFiles({ pool, req, res, url, json, user, isAdmin })
  }
  if (req.method === 'POST' && url.pathname === '/api/storage/upload-url') {
    if (!r2 || !r2PublicBaseUrl) return authJson(res, 503, { error: 'R2 storage is not configured on the API.' })
    const b = await body(req); const folder = String(b.folder || ''); const user = await neonUser(req)
    const allowed = new Set(['product-images', 'site-images', 'review-photos', 'custom-orders', 'tribe-looks', 'order-receipts'])
    if (!allowed.has(folder)) return authJson(res, 400, { error: 'Unsupported storage folder.' })
    if (!user && folder !== 'custom-orders') return authJson(res, 403, { error: 'Sign in required.' })
    if (['product-images', 'site-images', 'tribe-looks', 'order-receipts'].includes(folder) && user?.role !== 'admin') return authJson(res, 403, { error: 'Admin access required.' })
    const key = `${folder}/${String(b.key || '').replace(/^\/+/, '').replace(/\.\./g, '').replace(/[^a-zA-Z0-9_./-]/g, '-').slice(0, 220)}`
    const contentType = String(b.contentType || 'application/octet-stream').slice(0, 120); const size = Number(b.size || 0)
    if (key === `${folder}/` || size < 1 || size > 15 * 1024 * 1024) return authJson(res, 400, { error: 'Invalid file key or size.' })
    const uploadUrl = await getSignedUrl(r2, new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, ContentType: contentType }), { expiresIn: 600 })
    return authJson(res, 200, { key, uploadUrl, publicUrl: `${r2PublicBaseUrl}/${key}` })
  }
  if (req.method === 'POST' && url.pathname === '/api/storage/delete') {
    if (!r2) return authJson(res, 503, { error: 'R2 storage is not configured on the API.' })
    const b = await body(req); const key = String(b.key || '').replace(/^\/+/, ''); const folder = key.split('/')[0]; const user = await neonUser(req)
    if (!user) return authJson(res, 403, { error: 'Sign in required.' })
    if (!['product-images', 'site-images', 'review-photos', 'custom-orders', 'tribe-looks', 'order-receipts'].includes(folder)) return authJson(res, 400, { error: 'Unsupported storage folder.' })
    if (folder !== 'review-photos' && user.role !== 'admin') return authJson(res, 403, { error: 'Admin access required.' })
    await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }))
    return authJson(res, 200, { ok: true })
  }
  if (req.method === 'POST' && url.pathname === '/api/storage/receipt-upload-url') {
    if (!r2) return authJson(res, 503, { error: 'R2 storage is not configured on the API.' })
    const b = await body(req); const user = await neonUser(req); const orderId = String(b.orderId || '')
    if (!user || !orderId) return authJson(res, 403, { error: 'Sign in required.' })
    const owner = await pool.query('SELECT 1 FROM joyful_orders WHERE id=$1 AND user_id=$2', [orderId, user.id])
    if (!owner.rowCount && user.role !== 'admin') return authJson(res, 403, { error: 'You cannot access this receipt.' })
    const key = `order-receipts/${orderId}/receipt-${Date.now()}.pdf`
    const uploadUrl = await getSignedUrl(r2, new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, ContentType: 'application/pdf' }), { expiresIn: 600 })
    const downloadUrl = await getSignedUrl(r2, new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }), { expiresIn: 60 * 60 * 24 * 7 })
    return authJson(res, 200, { key, uploadUrl, downloadUrl })
  }
  if (url.pathname === '/api/storage/sign') {
    if (!(await requireAdmin(req)) && !(await neonUser(req))) return json(res, 403, { error: 'Sign in required' })
    return handleSignedUrl({ res, url, json })
  }
  if (url.pathname.startsWith('/api/realtime/')) return handleRealtime({ req, res, url, json, body })
  // Background jobs (order emails, newsletter, unsubscribe, M-Pesa) and the
  // database functions the checkout calls.
  if (url.pathname.startsWith('/api/functions/')) {
    const user = await neonUser(req)
    const isAdmin = user?.role === 'admin' ? true : Boolean(await requireAdmin(req))
    return handleFunction({ pool, req, res, url, json, body, user, isAdmin })
  }
  if (url.pathname === '/api/mpesa/callback') return handleMpesaCallback({ pool, req, res, json, body })
  if (url.pathname.startsWith('/api/rpc/')) return handleRpc({ pool, req, res, url, json, body })
  return json(res,404,{error:'Not found'})
}

// Schema and data bootstrap: both SQL files are idempotent, so running them at
// boot keeps a fresh Neon database in step with the code without a manual step.
async function bootstrap() {
  const dir = path.dirname(fileURLToPath(import.meta.url))
  const files = ['neon-schema.sql', 'auth-schema.sql', 'neon-migration-schema.sql']
  for (const file of files) {
    const full = path.join(dir, file)
    if (!fs.existsSync(full)) continue
    try { await pool.query(fs.readFileSync(full, 'utf8')); console.log(`bootstrap: applied ${file}`) }
    catch (e) { console.error(`bootstrap: ${file} failed: ${e.message}`) }
  }
  await seedData(dir)
  // Promote accounts listed in ADMIN_EMAILS (comma-separated) to admin at boot,
  // so the owner can regain admin access on a fresh database without SQL access.
  const adminEmails = String(process.env.ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean)
  for (const email of adminEmails) {
    try {
      const r = await pool.query(`UPDATE auth_users SET role='admin' WHERE email=$1 RETURNING id`, [email])
      if (r.rowCount) await pool.query(`INSERT INTO admin_users (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [r.rows[0].id])
      console.log(`bootstrap: admin ${email} ${r.rowCount ? 'promoted' : 'not found (sign up first)'}`)
    } catch (e) { console.error(`bootstrap: admin promotion for ${email} failed: ${e.message}`) }
  }
}

// The seed runs one statement at a time (no shared transaction) so a single bad
// row cannot roll back the whole data load.
async function seedData(dir) {
  const full = path.join(dir, 'neon-seed.sql')
  if (!fs.existsSync(full)) return
  const statements = fs.readFileSync(full, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^(INSERT|UPDATE|SELECT setval)/i.test(l))
  let ok = 0
  const failures = []
  for (const sql of statements) {
    try { await pool.query(sql); ok++ }
    catch (e) { failures.push(`${e.message} :: ${sql.slice(0, 120)}`) }
  }
  console.log(`bootstrap: seed applied ${ok}/${statements.length} statements`)
  for (const f of failures.slice(0, 20)) console.error(`seed failed: ${f}`)
}

const server=http.createServer(async(req,res)=>{try{applyCors(req,res);if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}await handle(req,res,new URL(req.url,`http://${req.headers.host||'localhost'}`))}catch(e){console.error(e);json(res,500,{error:'Internal server error'})}})
if (process.env.SKIP_BOOTSTRAP !== 'true') await bootstrap()
setInterval(() => { drainOutbox(pool).catch(e => console.error('outbox drain failed:', e.message)) }, 60000)
server.listen(port,'0.0.0.0',()=>console.log(`Neon API listening on ${port}`))
