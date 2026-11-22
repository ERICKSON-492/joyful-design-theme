import { AwsClient } from 'aws4fetch'

export const PUBLIC_PREFIXES = new Set([
  'product-images',
  'site-images',
  'site_images',
  'review-photos',
  'category-images',
  'custom-orders',
  'tribe-looks',
])

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
})

export const responses = { json }

export function objectKey(folder, key) {
  const cleanFolder = String(folder || '').replace(/^\/+|\/+$/g, '')
  const cleanKey = String(key || '').replace(/^\/+/, '')
  if (!cleanFolder || !cleanKey || cleanKey.includes('..') || cleanKey.includes('\\') || cleanFolder.includes('..')) return null
  return `${cleanFolder}/${cleanKey}`
}

export function r2Client(env) {
  const accountId = env.R2_ACCOUNT_ID
  const accessKeyId = env.R2_ACCESS_KEY_ID
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) throw new Error('R2 signing is not configured')
  return {
    bucket: env.R2_BUCKET,
    client: new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' }),
    endpoint: `https://${accountId}.r2.cloudflarestorage.com/${encodeURIComponent(env.R2_BUCKET_NAME || 'ushanga')}`,
  }
}

export async function presignedUrl(env, key, method, contentType, expiresIn = 600) {
  const { client, endpoint } = r2Client(env)
  const url = `${endpoint}/${key.split('/').map(encodeURIComponent).join('/')}`
  const signed = await client.sign(url, {
    method,
    aws: { signQuery: true, expires: expiresIn },
    headers: contentType ? { 'content-type': contentType } : undefined,
  })
  return signed.url
}

export async function currentUser(request, env) {
  const authorization = request.headers.get('authorization') || ''
  if (!authorization.toLowerCase().startsWith('bearer ')) return null
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return null
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization },
  })
  if (!response.ok) return null
  return response.json()
}

export async function isAdmin(user, env) {
  if (!user) return false
  if (user.app_metadata?.role === 'admin') return true
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/admin_users?select=id&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, {
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_PUBLISHABLE_KEY}` },
  })
  return response.ok && (await response.json()).length > 0
}

export function cors(request) {
  const origin = request.headers.get('origin') || '*'
  return { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' }
}

export function options(request) {
  return new Response(null, { status: 204, headers: cors(request) })
}
