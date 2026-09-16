// Generic data, file storage, realtime and background-job routes for the Neon API.
// These replace what the app used to get from Supabase (PostgREST, storage buckets,
// realtime broadcast channels and edge functions).
import crypto from 'node:crypto'

const READ_PUBLIC = 'public'
const READ_OWNER = 'owner'
const READ_ADMIN = 'admin'

// table -> { table: physical name, read, write, owner, insert }
export const tableRules = {
  categories: { read: READ_PUBLIC, write: READ_ADMIN },
  subcategories: { read: READ_PUBLIC, write: READ_ADMIN },
  category_images: { read: READ_PUBLIC, write: READ_ADMIN },
  site_content: { read: READ_PUBLIC, write: READ_ADMIN },
  hero_slides: { read: READ_PUBLIC, write: READ_ADMIN },
  chronicle_posts: { read: READ_PUBLIC, write: READ_ADMIN },
  shipping_methods: { read: READ_PUBLIC, write: READ_ADMIN },
  nairobi_areas: { read: READ_PUBLIC, write: READ_ADMIN },
  coupons: { read: READ_PUBLIC, write: READ_ADMIN },
  products: { read: READ_PUBLIC, write: READ_ADMIN },
  product_variants: { read: READ_PUBLIC, write: READ_ADMIN },
  payment_methods: { read: READ_ADMIN, write: READ_ADMIN },
  stock_adjustments: { read: READ_ADMIN, write: READ_ADMIN },
  email_send_log: { read: READ_ADMIN, write: READ_ADMIN },
  suppressed_emails: { read: READ_ADMIN, write: READ_ADMIN },
  newsletter_digest_state: { read: READ_ADMIN, write: READ_ADMIN },
  product_reviews: { read: READ_PUBLIC, write: READ_OWNER, owner: 'user_id', insert: 'user' },
  tribe_looks: { read: READ_PUBLIC, write: READ_OWNER, owner: 'user_id', insert: 'user' },
  profiles: { read: READ_OWNER, write: READ_OWNER, owner: 'user_id', insert: 'user' },
  orders: { table: 'joyful_orders', read: READ_OWNER, write: READ_ADMIN, owner: 'user_id', insert: 'user' },
  enquiry_messages: { read: READ_PUBLIC, write: READ_ADMIN, insert: 'anon' },
  newsletter_subscribers: { read: READ_ADMIN, write: READ_ADMIN, insert: 'anon' },
  custom_orders: { read: READ_ADMIN, write: READ_ADMIN, insert: 'anon' },
  contact_messages: { read: READ_ADMIN, write: READ_ADMIN, insert: 'anon' },
}

const columnCache = new Map()
async function columns(pool, physical) {
  if (columnCache.has(physical)) return columnCache.get(physical)
  const r = await pool.query(
    'SELECT column_name, data_type FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',
    ['public', physical],
  )
  const map = new Map(r.rows.map(row => [row.column_name, row.data_type]))
  columnCache.set(physical, map)
  return map
}

const opMap = {
  eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=', like: 'LIKE', ilike: 'ILIKE',
}

function buildFilters(params, cols, values) {
  const clauses = []
  for (const [key, raw] of params.entries()) {
    if (['select', 'order', 'limit', 'offset', 'count'].includes(key)) continue
    if (!cols.has(key)) continue
    const idx = raw.indexOf('.')
    if (idx < 0) continue
    const op = raw.slice(0, idx)
    const value = raw.slice(idx + 1)
    if (op === 'is') {
      clauses.push(`${key} IS ${value === 'null' ? 'NULL' : value === 'true' ? 'TRUE' : 'FALSE'}`)
      continue
    }
    if (op === 'in') {
      const list = value.replace(/^\(|\)$/g, '').split(',').map(v => v.replace(/^"|"$/g, ''))
      if (!list.length) { clauses.push('FALSE'); continue }
      values.push(list)
      clauses.push(`${key} = ANY($${values.length}${cols.get(key) === 'uuid' ? '::uuid[]' : '::text[]'})`)
      continue
    }
    if (op === 'cs') {
      values.push(value.replace(/^\{|\}$/g, '').split(','))
      clauses.push(`${key} @> $${values.length}::text[]`)
      continue
    }
    if (!opMap[op]) continue
    let cast = ''
    const type = cols.get(key)
    if (type === 'boolean') { values.push(value === 'true') } else if (type === 'uuid') { values.push(value); cast = '::uuid' } else { values.push(value) }
    clauses.push(`${key} ${opMap[op]} $${values.length}${cast}`)
  }
  return clauses
}

function buildOrder(params, cols) {
  const raw = params.get('order')
  if (!raw) return ''
  const parts = raw.split(',').map(piece => {
    const [col, ...mods] = piece.split('.')
    if (!cols.has(col)) return null
    const desc = mods.includes('desc')
    const nulls = mods.includes('nullslast') ? ' NULLS LAST' : ''
    return `${col} ${desc ? 'DESC' : 'ASC'}${nulls}`
  }).filter(Boolean)
  return parts.length ? `ORDER BY ${parts.join(',')}` : ''
}

function selectList(params, cols) {
  const raw = params.get('select')
  if (!raw || raw === '*') return '*'
  const picked = raw.split(',').map(c => c.trim().split(':').pop()).filter(c => cols.has(c))
  return picked.length ? picked.join(',') : '*'
}

// ---------------------------------------------------------------- data routes
export async function handleDb({ pool, req, res, url, json, body, user, isAdmin }) {
  const name = decodeURIComponent(url.pathname.slice('/api/db/'.length))
  const rule = tableRules[name]
  if (!rule) return json(res, 404, { message: `Unknown table ${name}`, code: '42P01' })
  const physical = rule.table || name
  const cols = await columns(pool, physical)
  if (!cols.size) return json(res, 404, { message: `relation "${name}" does not exist`, code: '42P01' })

  const params = url.searchParams
  const method = req.method

  if (method === 'GET') {
    if (rule.read === READ_ADMIN && !isAdmin) return json(res, 403, { message: 'Admin access required', code: '42501' })
    const values = []
    const clauses = buildFilters(params, cols, values)
    if (rule.read === READ_OWNER && !isAdmin) {
      if (!user) return json(res, 200, [])
      values.push(user.id)
      clauses.push(`${rule.owner} = $${values.length}::uuid`)
    }
    const limit = Math.min(Number(params.get('limit') || 1000), 2000)
    const sql = `SELECT ${selectList(params, cols)} FROM public.${physical} ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ${buildOrder(params, cols)} LIMIT ${limit}`
    const r = await pool.query(sql, values)
    return json(res, 200, r.rows)
  }

  if (method === 'POST') {
    const allowedInsert = isAdmin || rule.insert === 'anon' || (rule.insert === 'user' && user)
    if (!allowedInsert) return json(res, 403, { message: 'Not allowed', code: '42501' })
    const payload = await body(req)
    const rows = Array.isArray(payload) ? payload : [payload]
    const inserted = []
    for (const row of rows) {
      const data = { ...row }
      if (rule.owner && !isAdmin && user) data[rule.owner] = user.id
      const keys = Object.keys(data).filter(k => cols.has(k))
      if (!keys.length) return json(res, 400, { message: 'No valid columns', code: '42703' })
      const values = keys.map(k => (data[k] !== null && typeof data[k] === 'object' && !Array.isArray(data[k]) ? JSON.stringify(data[k]) : data[k]))
      const placeholders = keys.map((_, i) => `$${i + 1}`)
      try {
        const r = await pool.query(`INSERT INTO public.${physical} (${keys.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`, values)
        inserted.push(r.rows[0])
      } catch (e) {
        return json(res, e.code === '23505' ? 409 : 400, { message: e.message, code: e.code || '400', details: e.detail || null })
      }
    }
    return json(res, 201, inserted)
  }

  if (method === 'PATCH') {
    const payload = await body(req)
    const values = []
    const keys = Object.keys(payload).filter(k => cols.has(k) && k !== 'id')
    if (!keys.length) return json(res, 400, { message: 'No valid columns', code: '42703' })
    const sets = keys.map(k => {
      values.push(payload[k] !== null && typeof payload[k] === 'object' && !Array.isArray(payload[k]) ? JSON.stringify(payload[k]) : payload[k])
      return `${k}=$${values.length}`
    })
    if (cols.has('updated_at')) sets.push('updated_at=now()')
    const clauses = buildFilters(params, cols, values)
    if (!clauses.length) return json(res, 400, { message: 'A filter is required', code: '21000' })
    if (!isAdmin) {
      if (rule.write === READ_ADMIN) return json(res, 403, { message: 'Admin access required', code: '42501' })
      if (rule.write === READ_OWNER) {
        if (!user) return json(res, 403, { message: 'Sign in required', code: '42501' })
        values.push(user.id)
        clauses.push(`${rule.owner} = $${values.length}::uuid`)
      }
    }
    try {
      const r = await pool.query(`UPDATE public.${physical} SET ${sets.join(',')} WHERE ${clauses.join(' AND ')} RETURNING *`, values)
      return json(res, 200, r.rows)
    } catch (e) {
      return json(res, 400, { message: e.message, code: e.code || '400' })
    }
  }

  if (method === 'DELETE') {
    const values = []
    const clauses = buildFilters(params, cols, values)
    if (!clauses.length) return json(res, 400, { message: 'A filter is required', code: '21000' })
    if (!isAdmin) {
      if (rule.write !== READ_OWNER || !user) return json(res, 403, { message: 'Not allowed', code: '42501' })
      values.push(user.id)
      clauses.push(`${rule.owner} = $${values.length}::uuid`)
    }
    const r = await pool.query(`DELETE FROM public.${physical} WHERE ${clauses.join(' AND ')} RETURNING *`, values)
    return json(res, 200, r.rows)
  }

  return json(res, 405, { message: 'Method not allowed' })
}

// ------------------------------------------------------------- file storage
const PUBLIC_BUCKETS = new Set(['product-images', 'site_images', 'category-images'])
const signingKey = () => process.env.FILE_SIGNING_SECRET || process.env.SESSION_SECRET || 'ushanga-file-signing'
const signPath = (bucket, path, expiresAt) =>
  crypto.createHmac('sha256', signingKey()).update(`${bucket}/${path}:${expiresAt}`).digest('base64url')

export async function handleFiles({ pool, req, res, url, json, user, isAdmin }) {
  // GET /api/files/<bucket>/<path...>
  if (req.method === 'GET') {
    const rest = decodeURIComponent(url.pathname.slice('/api/files/'.length))
    const slash = rest.indexOf('/')
    if (slash < 0) return json(res, 404, { error: 'Not found' })
    const bucket = rest.slice(0, slash)
    const path = rest.slice(slash + 1)
    const r = await pool.query('SELECT mime, data, is_public FROM public.files WHERE bucket=$1 AND path=$2', [bucket, path])
    if (!r.rowCount) return json(res, 404, { error: 'File not found' })
    const file = r.rows[0]
    if (!file.is_public && !isAdmin) {
      const expires = Number(url.searchParams.get('expires') || 0)
      const token = url.searchParams.get('token') || ''
      if (!expires || expires < Date.now() / 1000 || token !== signPath(bucket, path, expires)) {
        return json(res, 403, { error: 'This link has expired' })
      }
    }
    res.writeHead(200, {
      'content-type': file.mime,
      'cache-control': file.is_public ? 'public, max-age=31536000, immutable' : 'private, no-store',
      'content-length': file.data.length,
    })
    return res.end(file.data)
  }

  // POST /api/files/<bucket>/<path...>  (raw body, content-type header = mime)
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!user) return json(res, 403, { error: 'Sign in required' })
    const rest = decodeURIComponent(url.pathname.slice('/api/files/'.length))
    const slash = rest.indexOf('/')
    if (slash < 0) return json(res, 400, { error: 'Missing file path' })
    const bucket = rest.slice(0, slash)
    const path = rest.slice(slash + 1)
    const chunks = []
    let size = 0
    for await (const chunk of req) {
      size += chunk.length
      if (size > 15 * 1024 * 1024) return json(res, 413, { error: 'File is larger than 15 MB' })
      chunks.push(chunk)
    }
    const data = Buffer.concat(chunks)
    const mime = req.headers['content-type'] || 'application/octet-stream'
    const isPublic = PUBLIC_BUCKETS.has(bucket)
    await pool.query(
      `INSERT INTO public.files (bucket,path,mime,size,is_public,data) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (bucket,path) DO UPDATE SET mime=EXCLUDED.mime,size=EXCLUDED.size,data=EXCLUDED.data,is_public=EXCLUDED.is_public`,
      [bucket, path, mime, data.length, isPublic, data],
    )
    return json(res, 201, { bucket, path, size: data.length })
  }

  if (req.method === 'DELETE') {
    if (!user) return json(res, 403, { error: 'Sign in required' })
    const rest = decodeURIComponent(url.pathname.slice('/api/files/'.length))
    const slash = rest.indexOf('/')
    if (slash < 0) return json(res, 400, { error: 'Missing file path' })
    await pool.query('DELETE FROM public.files WHERE bucket=$1 AND path=$2', [rest.slice(0, slash), rest.slice(slash + 1)])
    return json(res, 204)
  }
  return json(res, 405, { error: 'Method not allowed' })
}

export function handleSignedUrl({ res, url, json }) {
  const bucket = url.searchParams.get('bucket') || ''
  const path = url.searchParams.get('path') || ''
  const seconds = Math.min(Number(url.searchParams.get('expires_in') || 3600), 60 * 60 * 24 * 365)
  if (!bucket || !path) return json(res, 400, { error: 'bucket and path are required' })
  const expires = Math.floor(Date.now() / 1000) + seconds
  const token = signPath(bucket, path, expires)
  return json(res, 200, { path: `/api/files/${bucket}/${path}?expires=${expires}&token=${token}` })
}

// -------------------------------------------------------- realtime broadcast
const channels = new Map() // name -> [{ id, event, payload, at }]
let eventSeq = 0
export async function handleRealtime({ req, res, url, json, body }) {
  const name = decodeURIComponent(url.pathname.slice('/api/realtime/'.length))
  if (!name) return json(res, 400, { error: 'Channel name required' })
  if (req.method === 'POST') {
    const b = await body(req)
    const list = channels.get(name) || []
    list.push({ id: ++eventSeq, event: String(b.event || 'message'), payload: b.payload ?? {}, at: Date.now() })
    const cutoff = Date.now() - 60_000
    channels.set(name, list.filter(e => e.at > cutoff).slice(-50))
    return json(res, 202, { ok: true })
  }
  if (req.method === 'GET') {
    const since = Number(url.searchParams.get('since') || 0)
    const list = (channels.get(name) || []).filter(e => e.id > since)
    return json(res, 200, { events: list, cursor: eventSeq })
  }
  return json(res, 405, { error: 'Method not allowed' })
}
