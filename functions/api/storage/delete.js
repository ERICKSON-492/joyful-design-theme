import { cors, currentUser, isAdmin, objectKey, options, r2Client, responses } from '../../../_r2.js'

const ADMIN_FOLDERS = new Set(['product-images', 'site-images', 'custom-orders', 'tribe-looks'])

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return options(request)
  if (request.method !== 'POST') return responses.json({ error: 'Method not allowed' }, 405, cors(request))

  const user = await currentUser(request, env)
  if (!user) return responses.json({ error: 'Authentication required' }, 401, cors(request))

  try {
    const body = await request.json()
    const rawKey = String(body.key || '').replace(/^\/+/, '')
    const slash = rawKey.indexOf('/')
    const folder = slash > 0 ? rawKey.slice(0, slash) : ''
    const key = objectKey(folder, rawKey.slice(slash + 1))
    if (!key || folder === 'order-receipts') return responses.json({ error: 'Invalid or protected object key' }, 400, cors(request))
    if (ADMIN_FOLDERS.has(folder) && !(await isAdmin(user, env))) {
      return responses.json({ error: 'Administrator access required' }, 403, cors(request))
    }

    const { bucket } = r2Client(env)
    if (!bucket) throw new Error('R2_BUCKET binding is not configured')
    await bucket.delete(key)
    return responses.json({ ok: true }, 200, cors(request))
  } catch (error) {
    return responses.json({ error: error instanceof Error ? error.message : 'Could not delete object' }, 500, cors(request))
  }
}
