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
import { handleFunction, handleMpesaCallback, handleRpc, drainOutbox, queueEmail, queueOrderConfirmation, queueNewProductNotifications, processScheduledSaleNotifications } from './functions-api.mjs'
import { createGoogleOAuthRoutes } from './google-oauth.mjs'
import { handleAdminCustomers } from './admin-customer-api.mjs'
import { handleVisitorEvent, handleVisitorReport, processWeeklyVisitorReport } from './analytics-api.mjs'

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
const publicR2MediaPrefixes = new Set(['product-images', 'site_images', 'site-images', 'review-photos', 'category-images', 'custom-orders', 'tribe-looks'])
const json = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(body === undefined ? '' : JSON.stringify(body)) }
const body = async (req) => { let raw = ''; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {} }
const productFields = 'id,name,description,price,price_min,price_max,category,subcategory,image_url,image_urls,stock,is_active,is_preorder,preorder_label,low_stock_threshold,sale_price,sale_starts_at,sale_ends_at,created_at,updated_at'
const variantFields = 'id,product_id,variant_label,size,color,price,stock,is_active,created_at,updated_at'
const productDto = (p) => ({ ...p, price: Number(p.price), price_min: p.price_min == null ? null : Number(p.price_min), price_max: p.price_max == null ? null : Number(p.price_max), sale_price: p.sale_price == null ? null : Number(p.sale_price) })
const variantDto = (v) => ({ ...v, price: Number(v.price) })
const activeSalePrice = (p) => {
  const sale = Number(p.sale_price); const original = Number(p.price); const now = Date.now()
  if (!Number.isFinite(sale) || !Number.isFinite(original) || sale <= 0 || sale >= original) return null
  const startsAt = p.sale_starts_at ? new Date(p.sale_starts_at).getTime() : null; const endsAt = p.sale_ends_at ? new Date(p.sale_ends_at).getTime() : null
  if (startsAt !== null && !Number.isFinite(startsAt) || endsAt !== null && !Number.isFinite(endsAt)) return null
  if (startsAt !== null && now < startsAt) return null
  if (endsAt !== null && now >= endsAt) return null
  return sale
}

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
function clientIp(req) {
  const fwd = String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return (fwd || req.socket.remoteAddress || '').replace(/^::ffff:/, '') || null
}
async function recordLoginEvent(req, event, userId, email) {
  try {
    await pool.query('INSERT INTO auth_login_events (user_id,email,event,ip_address,user_agent) VALUES ($1,$2,$3,$4,$5)', [userId || null, email || null, event, clientIp(req), String(req.headers['user-agent'] || '').slice(0, 400) || null])
  } catch (e) { console.error('login event not recorded:', e.message) }
}
async function createSession(req, userId, event = 'login') {
  const raw = crypto.randomBytes(32).toString('base64url')
  await pool.query('INSERT INTO auth_sessions (user_id,token_hash,expires_at,user_agent,ip_address) VALUES ($1,$2,now()+($3 * interval \'1 second\'),$4,$5)', [userId, tokenHash(raw), sessionTtlSeconds, req.headers['user-agent'] || null, req.socket.remoteAddress || null])
  const who = await pool.query('SELECT email FROM auth_users WHERE id=$1', [userId]).catch(() => null)
  await recordLoginEvent(req, event, userId, who?.rows[0]?.email)
  return raw
}
const authJson = (res, status, body, headers = {}) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }); res.end(JSON.stringify(body)) }
const handleGoogleOAuth = createGoogleOAuthRoutes({ pool, createSession, sessionCookie: cookie, env: process.env })

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
  if (await handleGoogleOAuth(req, res, url)) return
  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true })
  if (url.pathname === '/api/analytics/visit') return handleVisitorEvent({ pool, req, res, json, body })
  if (url.pathname === '/api/admin/analytics/visitors') return handleVisitorReport({ pool, req, res, url, json, requireAdmin })
  if (req.method === 'GET' && url.pathname === '/api/auth/me') { const user = await neonUser(req); return authJson(res, 200, { user: user ? safeUser(user) : null }) }
  if (req.method === 'POST' && url.pathname === '/api/auth/signup') {
    const b = await body(req); const email = String(b.email || '').trim().toLowerCase(); const password = String(b.password || ''); const displayName = String(b.displayName || b.name || '').trim()
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6 || password.length > 128) return authJson(res, 400, { error: 'Use a valid email and a password of at least 6 characters.' })
    const passwordHash = await bcrypt.hash(password, 12)
    try { const r = await pool.query('INSERT INTO auth_users (email,password_hash,display_name) VALUES ($1,$2,$3) RETURNING id,email,display_name,role', [email, passwordHash, displayName || null]); const session = await createSession(req, r.rows[0].id, 'signup'); return authJson(res, 201, { user: safeUser(r.rows[0]) }, { 'set-cookie': cookie(session) }) }
    catch (e) { if (e.code === '23505') return authJson(res, 409, { error: 'An account with that email already exists.' }); throw e }
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const b = await body(req); const email = String(b.email || '').trim().toLowerCase(); const password = String(b.password || ''); const r = await pool.query('SELECT id,email,password_hash,display_name,role,is_active FROM auth_users WHERE email=$1', [email]); const user = r.rows[0]
    if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash))) { await recordLoginEvent(req, 'login_failed', user?.id, email); return authJson(res, 401, { error: 'Invalid email or password.' }) }
    const session = await createSession(req, user.id); return authJson(res, 200, { user: safeUser(user) }, { 'set-cookie': cookie(session) })
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/logout') { const token = parseCookies(req.headers.cookie || '')[sessionCookieName]; if (token) await pool.query('DELETE FROM auth_sessions WHERE token_hash=$1', [tokenHash(token)]); return authJson(res, 200, { ok: true }, { 'set-cookie': cookie('', 0) }) }
  if (req.method === 'POST' && url.pathname === '/api/auth/forgot-password') {
    const b = await body(req); const email = String(b.email || '').trim().toLowerCase()
    const user = (await pool.query('SELECT id,email,display_name FROM auth_users WHERE email=$1 AND is_active=true', [email])).rows[0]
    if (user) {
      const raw = crypto.randomBytes(32).toString('base64url')
      await pool.query('DELETE FROM auth_reset_tokens WHERE user_id=$1 OR expires_at<now()', [user.id])
      await pool.query("INSERT INTO auth_reset_tokens (user_id,token_hash,expires_at) VALUES ($1,$2,now()+interval '1 hour')", [user.id, tokenHash(raw)])
      const site = String(process.env.PUBLIC_SITE_URL || process.env.ALLOWED_ORIGINS || 'https://ushangachronicles.com').split(',')[0].replace(/\/$/, '')
      const link = `${site}/reset-password?token=${encodeURIComponent(raw)}`
      const html = `<p>Hi ${user.display_name || 'there'},</p><p>Use the link below to set a new Ushanga Chronicles password. It expires in one hour.</p><p><a href="${link}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p>`
      await queueEmail(pool, { to: user.email, subject: 'Reset your Ushanga Chronicles password', html, label: 'password-reset' })
      drainOutbox(pool).catch(() => {})
    }
    return authJson(res, 200, { ok: true, message: 'If that email exists, a reset link will be sent.' })
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/reset-password') {
    const b = await body(req); const token = String(b.token || ''); const password = String(b.password || '')
    if (!token || password.length < 6 || password.length > 128) return authJson(res, 400, { error: 'Use a valid reset link and a password between 6 and 128 characters.' })
    const passwordHash = await bcrypt.hash(password, 12)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const tokenRow = await client.query('SELECT user_id FROM auth_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE', [tokenHash(token)])
      if (!tokenRow.rowCount) { await client.query('ROLLBACK'); return authJson(res, 400, { error: 'This reset link is invalid or has expired.' }) }
      await client.query('UPDATE auth_users SET password_hash=$1,updated_at=now() WHERE id=$2', [passwordHash, tokenRow.rows[0].user_id])
      await client.query('UPDATE auth_reset_tokens SET used_at=now() WHERE token_hash=$1', [tokenHash(token)])
      await client.query('DELETE FROM auth_sessions WHERE user_id=$1', [tokenRow.rows[0].user_id])
      await client.query('COMMIT')
      return authJson(res, 200, { ok: true })
    } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
  }
  if (req.method === 'GET' && url.pathname === '/api/products') {
    const f = queryFilters(url); const r = await pool.query(`SELECT ${productFields} FROM public.products ${f.where} ORDER BY ${f.order} LIMIT ${f.limit}`, f.values); return json(res, 200, r.rows.map(productDto))
  }
  if (req.method === 'GET' && url.pathname.startsWith('/api/products/')) {
    const id = decodeURIComponent(url.pathname.slice(14)); const r = await pool.query(`SELECT ${productFields} FROM public.products WHERE id=$1 AND is_active=true`, [id]); if (!r.rowCount) return json(res, 404, { error: 'Product not found' }); return json(res, 200, productDto(r.rows[0]))
  }
  if (req.method === 'GET' && url.pathname === '/api/product-variants') { const f = queryFilters(url); const r = await pool.query(`SELECT ${variantFields} FROM public.product_variants ${f.where} ORDER BY ${f.order} LIMIT ${f.limit}`, f.values); return json(res, 200, r.rows.map(variantDto)) }
  if (url.pathname.startsWith('/api/admin/')) {
    const adminAccess = await requireAdmin(req)
    if (!adminAccess) return json(res, 403, { error: 'Admin access required' })
    if (req.method === 'GET' && url.pathname === '/api/admin/logins') {
      const events = await pool.query(`SELECT e.id, e.event, COALESCE(e.email, u.email) AS email, u.display_name, u.role, e.ip_address, e.user_agent, e.created_at FROM auth_login_events e LEFT JOIN auth_users u ON u.id=e.user_id ORDER BY e.created_at DESC LIMIT 300`)
      const sessions = await pool.query(`SELECT s.id, u.email, u.display_name, u.role, s.created_at, s.last_seen_at, s.user_agent, host(s.ip_address) AS ip_address FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.expires_at>now() ORDER BY s.last_seen_at DESC LIMIT 100`)
      return json(res, 200, { events: events.rows, sessions: sessions.rows })
    }
    if (/^\/api\/admin\/customers(?:\/[^/]+)?$/.test(url.pathname)) {
      return handleAdminCustomers({ pool, req, res, url, json, body, isAdmin: true })
    }
    if (req.method === 'GET' && url.pathname === '/api/admin/products') { const r = await pool.query(`SELECT ${productFields} FROM public.products ORDER BY created_at DESC`); return json(res, 200, { products: r.rows.map(productDto) }) }
    if (req.method === 'POST' && url.pathname === '/api/admin/products') {
      const b = await body(req)
      const r = await pool.query(`INSERT INTO products (name,description,price,sale_price,sale_starts_at,sale_ends_at,price_min,price_max,category,subcategory,stock,image_url,image_urls,is_active,is_preorder,preorder_label) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING ${productFields}`, [b.name,b.description||null,b.price,b.sale_price??null,b.sale_starts_at||null,b.sale_ends_at||null,b.price_min??null,b.price_max??null,b.category||'',b.subcategory||null,b.stock||0,b.image_url||null,b.image_urls||[],b.is_active!==false,b.is_preorder||false,b.preorder_label||null])
      const product = productDto(r.rows[0])
      if (product.is_active) queueNewProductNotifications(pool, product).catch(error => console.error('new-product notification queue failed:', error.message))
      return json(res, 201, product)
    }
    const match = url.pathname.match(/^\/api\/admin\/products\/([^/]+)$/)
    if (match && req.method === 'PATCH') { const b = await body(req); const allowed = ['name','description','price','price_min','price_max','category','subcategory','stock','image_url','image_urls','is_active','is_preorder','preorder_label','low_stock_threshold','sale_price','sale_starts_at','sale_ends_at']; const sets=[]; const vals=[]; for (const k of allowed) if (b[k] !== undefined) { vals.push(b[k]); sets.push(`${k}=$${vals.length}`) } if (!sets.length) return json(res, 400, { error:'No fields' }); vals.push(match[1]); const r=await pool.query(`UPDATE products SET ${sets.join(',')},updated_at=now() WHERE id=$${vals.length} RETURNING ${productFields}`,vals); return r.rowCount ? json(res,200,productDto(r.rows[0])) : json(res,404,{error:'Product not found'}) }
    if (match && req.method === 'DELETE') { await pool.query('UPDATE products SET is_active=false,updated_at=now() WHERE id=$1',[match[1]]); return json(res,204) }
    const vm = url.pathname.match(/^\/api\/admin\/variants(?:\/([^/]+))?$/)
    if (vm && req.method === 'POST') { const b=await body(req); const r=await pool.query(`INSERT INTO product_variants (product_id,variant_label,size,color,price,stock,is_active) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ${variantFields}`,[b.product_id,b.variant_label||`${b.size||''} ${b.color||''}`.trim(),b.size||null,b.color||null,b.price||0,b.stock||0,b.is_active!==false]); return json(res,201,variantDto(r.rows[0])) }
    if (vm && req.method === 'PATCH') { const b=await body(req); const keys=['variant_label','size','color','price','stock','is_active']; const sets=[];const vals=[];for(const k of keys)if(b[k]!==undefined){vals.push(b[k]);sets.push(`${k}=$${vals.length}`)}vals.push(vm[1]);const r=await pool.query(`UPDATE product_variants SET ${sets.join(',')},updated_at=now() WHERE id=$${vals.length} RETURNING ${variantFields}`,vals);return r.rowCount?json(res,200,variantDto(r.rows[0])):json(res,404,{error:'Variant not found'}) }
    if (vm && req.method === 'DELETE') { await pool.query('UPDATE product_variants SET is_active=false,updated_at=now() WHERE id=$1',[vm[1]]); return json(res,204) }
  }
  if (req.method === 'POST' && url.pathname === '/api/orders') {
    const b=await body(req); if (!Array.isArray(b.items)||!b.items.length) return json(res,400,{error:'Cart is empty'})
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const requested = b.items.map(item => { const [productId, variantId] = String(item.id || '').split('_'); return { item, productId, variantId: variantId || null } })
    if (requested.some(({ productId, variantId }) => !uuidPattern.test(productId) || (variantId && !uuidPattern.test(variantId)))) return json(res,400,{error:'One or more cart items are invalid'})
    const productIds = [...new Set(requested.map(item => item.productId))]
    const variantIds = [...new Set(requested.map(item => item.variantId).filter(Boolean))]
    const [productsResult, variantsResult] = await Promise.all([
      pool.query('SELECT id,name,price,sale_price,sale_starts_at,sale_ends_at,stock,is_active FROM products WHERE id=ANY($1::uuid[])', [productIds]),
      variantIds.length ? pool.query('SELECT id,product_id,variant_label,price,stock,is_active FROM product_variants WHERE id=ANY($1::uuid[])', [variantIds]) : Promise.resolve({ rows: [] }),
    ])
    const byId=new Map(productsResult.rows.map(x=>[x.id,x])); const variantsById=new Map(variantsResult.rows.map(x=>[x.id,x])); const authoritative=[]
    for(const { item, productId, variantId } of requested){ const p=byId.get(productId); const v=variantId ? variantsById.get(variantId) : null; if(!p||!p.is_active||variantId && (!v||v.product_id!==p.id||!v.is_active))return json(res,400,{error:`Product unavailable: ${item.name||item.id}`}); const qty=Number(item.quantity); const stock=v?v.stock:p.stock; if(!Number.isInteger(qty)||qty<1||qty>stock)return json(res,409,{error:`Insufficient stock for ${p.name}`}); authoritative.push({id:p.id,variant_id:v?.id||null,name:v?`${p.name} (${v.variant_label})`:p.name,price:Number(v?.price??activeSalePrice(p)??p.price),quantity:qty}) }
    const subtotal=authoritative.reduce((s,i)=>s+i.price*i.quantity,0); const shipping=Number(b.shipping_cost||0); const discount=Math.max(0,Number(b.discount_amount||0)); const total=Math.max(0,subtotal+shipping-discount)
    const client=await pool.connect(); try{await client.query('BEGIN'); for(const i of authoritative) { if(i.variant_id) await client.query('UPDATE product_variants SET stock=stock-$1,updated_at=now() WHERE id=$2',[i.quantity,i.variant_id]); else await client.query('UPDATE products SET stock=stock-$1,updated_at=now() WHERE id=$2',[i.quantity,i.id]) } const o=await client.query(`INSERT INTO joyful_orders (phone,customer_name,total_amount,status,items,user_id,shipping_address,email,shipping_method,shipping_cost,latitude,longitude,stock_decremented) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true) RETURNING id,total_amount`,[b.phone,b.customer_name,total,b.status||'pending',JSON.stringify(authoritative),b.user_id||null,b.shipping_address||{},b.email||b.shipping_address?.email||null,b.shipping_method||null,shipping,b.latitude??null,b.longitude??null]); await client.query('COMMIT'); queueOrderConfirmation(pool, { ...o.rows[0], customer_name: b.customer_name, email: b.email || b.shipping_address?.email, items: authoritative }).catch(e => console.error('order confirmation queue failed:', e.message)); return json(res,201,{order:o.rows[0],subtotal,shipping_cost:shipping,discount_amount:discount,total})}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
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
  if (req.method === 'GET' && url.pathname.startsWith('/api/storage/public/')) {
    if (!r2) return json(res, 503, { error: 'R2 storage is not configured on the API.' })
    let key
    try { key = decodeURIComponent(url.pathname.slice('/api/storage/public/'.length)).replace(/^\/+/, '') }
    catch { return json(res, 400, { error: 'Invalid object key.' }) }
    const prefix = key.split('/')[0]
    if (!key.includes('/') || !publicR2MediaPrefixes.has(prefix)) return json(res, 404, { error: 'Object not found.' })
    try {
      const object = await r2.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }))
      if (!object.Body) return json(res, 404, { error: 'Object not found.' })
      const headers = {
        'content-type': object.ContentType || 'application/octet-stream',
        'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
        'x-content-type-options': 'nosniff',
      }
      if (object.ContentLength != null) headers['content-length'] = String(object.ContentLength)
      if (object.ETag) headers.etag = object.ETag
      res.writeHead(200, headers)
      object.Body.on('error', error => { console.error('R2 media stream failed:', error.message); res.destroy(error) })
      object.Body.pipe(res)
      return
    } catch (error) {
      if (['NoSuchKey', 'NotFound', 'NoSuchBucket'].includes(error?.name)) return json(res, 404, { error: 'Object not found.' })
      console.error('R2 media read failed:', error?.message || error)
      return json(res, 502, { error: 'Could not read the media object.' })
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/storage/upload-url') {
    if (!r2) return authJson(res, 503, { error: 'R2 storage is not configured on the API.' })
    const b = await body(req); const folder = String(b.folder || ''); const user = await neonUser(req)
    const allowed = new Set(['product-images', 'site-images', 'review-photos', 'custom-orders', 'tribe-looks', 'order-receipts'])
    if (!allowed.has(folder)) return authJson(res, 400, { error: 'Unsupported storage folder.' })
    if (!user && folder !== 'custom-orders') return authJson(res, 403, { error: 'Sign in required.' })
    if (['product-images', 'site-images', 'tribe-looks', 'order-receipts'].includes(folder) && user?.role !== 'admin') return authJson(res, 403, { error: 'Admin access required.' })
    const key = `${folder}/${String(b.key || '').replace(/^\/+/, '').replace(/\.\./g, '').replace(/[^a-zA-Z0-9_./-]/g, '-').slice(0, 220)}`
    const contentType = String(b.contentType || 'application/octet-stream').slice(0, 120); const size = Number(b.size || 0)
    if (key === `${folder}/` || size < 1 || size > 15 * 1024 * 1024) return authJson(res, 400, { error: 'Invalid file key or size.' })
    const uploadUrl = await getSignedUrl(r2, new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, ContentType: contentType }), { expiresIn: 600 })
    const publicUrl = `/api/storage/public/${key.split('/').map(encodeURIComponent).join('/')}`
    return authJson(res, 200, { key, uploadUrl, publicUrl })
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
  // Reconcile known heavy image references after seed data; suffix guards preserve admin replacements.
  try {
    const result = await pool.query(
      `UPDATE public.category_images
       SET image_url=$1
       WHERE category='Wear It' AND image_url LIKE $2
       RETURNING category`,
      ['/media/categories/wear-it.webp', '%wear-it-1791370426397.jpg'],
    )
    console.log(`bootstrap: optimized Wear It image reference ${result.rowCount ? 'updated' : 'unchanged'}`)
  } catch (e) {
    console.error(`bootstrap: Wear It image reference reconciliation failed: ${e.message}`)
  }
  try {
    const imageMap = JSON.parse(fs.readFileSync(path.join(dir, 'optimized-product-images.json'), 'utf8'))
    const sourceSuffixes = imageMap.flatMap(({ source_suffixes }) => source_suffixes)
    const replacementUrls = imageMap.flatMap(({ source_suffixes, image_url }) => source_suffixes.map(() => image_url))
    const result = await pool.query(
      `WITH image_map AS (
         SELECT * FROM unnest($1::text[], $2::text[]) AS m(source_suffix, image_url)
       ), updated_products AS (
         UPDATE public.products AS p
         SET image_url = COALESCE((
               SELECT m.image_url FROM image_map AS m
               WHERE right(split_part(split_part(p.image_url, '#', 1), '?', 1), char_length(m.source_suffix)) = m.source_suffix
               LIMIT 1
             ), p.image_url),
             image_urls = ARRAY(
               SELECT COALESCE((
                        SELECT m.image_url FROM image_map AS m
                        WHERE right(split_part(split_part(g.image_url, '#', 1), '?', 1), char_length(m.source_suffix)) = m.source_suffix
                        LIMIT 1
                      ), g.image_url)
               FROM unnest(COALESCE(p.image_urls, ARRAY[]::text[])) WITH ORDINALITY AS g(image_url, ordinal)
               ORDER BY g.ordinal
             )
         WHERE EXISTS (
                 SELECT 1 FROM image_map AS m
                 WHERE right(split_part(split_part(p.image_url, '#', 1), '?', 1), char_length(m.source_suffix)) = m.source_suffix
               )
            OR EXISTS (
                 SELECT 1
                 FROM unnest(COALESCE(p.image_urls, ARRAY[]::text[])) AS g(image_url)
                 JOIN image_map AS m
                   ON right(split_part(split_part(g.image_url, '#', 1), '?', 1), char_length(m.source_suffix)) = m.source_suffix
               )
         RETURNING p.id
       )
       SELECT count(*)::int AS updated_rows FROM updated_products`,
      [sourceSuffixes, replacementUrls],
    )
    console.log(`bootstrap: optimized catalog image URLs in ${result.rows[0]?.updated_rows ?? 0} product rows across ${imageMap.length} source objects`)
  } catch (e) {
    console.error(`bootstrap: catalog image URL reconciliation failed: ${e.message}`)
  }
  // Keep the four curated community gallery entries explicit and observable.
  // This also repairs an existing database if its historical seed file ran
  // before these rows were added.
  try {
    const curatedLooks = [
      ['d54b4876-a131-41ae-8d17-8c12de6711b1', '/media/tribe-looks/tess.jpeg', 'Tess', 'Beaded Dress'],
      ['cbab7d4f-6d94-4cbb-a39a-0fb205c71b8f', '/media/tribe-looks/anne.jpeg', 'Anne', 'Beaded Bracelet'],
      ['f77e0ad0-47ea-4b5d-9351-21e6e15d65e7', '/media/tribe-looks/luna.jpeg', 'Luna', 'Beaded Dog Collar'],
      ['c34d8b5e-83dc-46d9-84df-8d90a384f2c3', '/media/tribe-looks/amani.jpg', 'Amani K.', 'Layered Beaded Necklace'],
    ]
    const result = await pool.query(
      `INSERT INTO public.tribe_looks (id, user_id, image_url, name, piece_name, status)
       SELECT id::uuid, NULL, image_url, name, piece_name, 'approved'
       FROM unnest($1::text[], $2::text[], $3::text[], $4::text[])
         AS looks(id, image_url, name, piece_name)
       ON CONFLICT (id) DO NOTHING`,
      [
        curatedLooks.map(([id]) => id),
        curatedLooks.map(([, imageUrl]) => imageUrl),
        curatedLooks.map(([, , name]) => name),
        curatedLooks.map(([, , , pieceName]) => pieceName),
      ],
    )
    console.log(`bootstrap: curated tribe looks inserted ${result.rowCount}/${curatedLooks.length}`)
  } catch (e) {
    console.error(`bootstrap: curated tribe looks failed: ${e.message}`)
  }
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

function splitSqlStatements(source) {
  const statements = []
  let start = 0
  let inSingleQuote = false

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (!inSingleQuote && char === '-' && source[i + 1] === '-') {
      const lineEnd = source.indexOf('\n', i)
      if (lineEnd === -1) break
      i = lineEnd - 1
      continue
    }
    if (char !== "'") {
      if (char === ';' && !inSingleQuote) {
        const statement = source.slice(start, i + 1).split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim()
        if (statement) statements.push(statement)
        start = i + 1
      }
      continue
    }

    if (inSingleQuote && source[i + 1] === "'") {
      i += 1
      continue
    }
    inSingleQuote = !inSingleQuote
  }

  const tail = source.slice(start).split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .trim()
  if (tail) statements.push(tail)
  return statements
}

// The seed runs one statement at a time (no shared transaction) so a single bad
// row cannot roll back the whole data load. Statements may contain newlines inside
// quoted text, so split on semicolons outside single-quoted strings.
async function seedData(dir) {
  const full = path.join(dir, 'neon-seed.sql')
  if (!fs.existsSync(full)) return
  const statements = splitSqlStatements(fs.readFileSync(full, 'utf8'))
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
processScheduledSaleNotifications(pool).catch(e => console.error('initial scheduled sale notifications failed:', e.message))
processWeeklyVisitorReport(pool).catch(e => console.error('initial weekly visitor report failed:', e.message))
setInterval(() => {
  drainOutbox(pool).catch(e => console.error('outbox drain failed:', e.message))
  processScheduledSaleNotifications(pool).catch(e => console.error('scheduled sale notifications failed:', e.message))
  processWeeklyVisitorReport(pool).catch(e => console.error('weekly visitor report failed:', e.message))
}, 60000)
server.listen(port,'0.0.0.0',()=>console.log(`Neon API listening on ${port}`))
