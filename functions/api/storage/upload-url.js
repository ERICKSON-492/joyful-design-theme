import { cors, currentUser, isAdmin, objectKey, options, presignedUrl, responses } from '../../_r2.js'

const MAX_BYTES = 15 * 1024 * 1024
const ADMIN_FOLDERS = new Set(['product-images', 'site-images', 'custom-orders', 'tribe-looks'])

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return options(request)
  if (request.method !== 'POST') return responses.json({ error: 'Method not allowed' }, 405, cors(request))

  const user = await currentUser(request, env)
  if (!user) return responses.json({ error: 'Authentication required' }, 401, cors(request))

  try {
    const body = await request.json()
    const folder = String(body.folder || '')
    const key = objectKey(folder, body.key)
    const contentType = String(body.contentType || 'application/octet-stream')
    const size = Number(body.size || 0)
    if (!key || !Number.isFinite(size) || size < 1 || size > MAX_BYTES) {
      return responses.json({ error: 'Invalid upload or file exceeds the 15 MB limit' }, 400, cors(request))
    }
    if (ADMIN_FOLDERS.has(folder) && !(await isAdmin(user, env))) {
      return responses.json({ error: 'Administrator access required for this folder' }, 403, cors(request))
    }
    if (folder === 'order-receipts') {
      return responses.json({ error: 'Use the receipt upload endpoint' }, 400, cors(request))
    }

    const uploadUrl = await presignedUrl(env, key, 'PUT', contentType, 600)
    return responses.json({ uploadUrl, key, expiresIn: 600 }, 200, cors(request))
  } catch (error) {
    return responses.json({ error: error instanceof Error ? error.message : 'Could not prepare upload' }, 500, cors(request))
  }
}
