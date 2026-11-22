import { cors, objectKey, options, r2Client, responses, PUBLIC_PREFIXES } from '../../../../_r2.js'

export async function onRequest(context) {
  const { request, env, params } = context
  if (request.method === 'OPTIONS') return options(request)
  if (!['GET', 'HEAD'].includes(request.method)) return responses.json({ error: 'Method not allowed' }, 405, cors(request))

  const rawPath = typeof params.path === 'string' ? params.path : ''
  const decoded = rawPath.split('/').map(part => decodeURIComponent(part)).join('/')
  const slash = decoded.indexOf('/')
  const folder = slash > 0 ? decoded.slice(0, slash) : ''
  const key = objectKey(folder, decoded.slice(slash + 1))
  if (!key || !PUBLIC_PREFIXES.has(folder)) return responses.json({ error: 'Object is not public' }, 404, cors(request))

  try {
    const { bucket } = r2Client(env)
    if (!bucket) throw new Error('R2_BUCKET binding is not configured')
    const object = await bucket.get(key)
    if (!object) return responses.json({ error: 'Not found' }, 404, cors(request))
    const headers = new Headers(cors(request))
    object.writeHttpMetadata(headers)
    headers.set('etag', object.httpEtag)
    headers.set('cache-control', 'public, max-age=31536000, immutable')
    if (request.method === 'HEAD') return new Response(null, { headers })
    return new Response(object.body, { headers })
  } catch (error) {
    return responses.json({ error: error instanceof Error ? error.message : 'Could not read object' }, 500, cors(request))
  }
}
