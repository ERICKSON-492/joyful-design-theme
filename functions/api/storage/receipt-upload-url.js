import { cors, currentUser, isAdmin, objectKey, options, presignedUrl, responses } from '../../../_r2.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return options(request)
  if (request.method !== 'POST') return responses.json({ error: 'Method not allowed' }, 405, cors(request))

  const user = await currentUser(request, env)
  if (!user) return responses.json({ error: 'Authentication required' }, 401, cors(request))

  try {
    const { orderId } = await request.json()
    if (!orderId || String(orderId).includes('/')) return responses.json({ error: 'A valid orderId is required' }, 400, cors(request))
    const admin = await isAdmin(user, env)
    const auth = request.headers.get('authorization')
    const orderResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/orders?select=id,user_id&id=eq.${encodeURIComponent(orderId)}&limit=1`, {
      headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization: auth },
    })
    const orders = orderResponse.ok ? await orderResponse.json() : []
    if (!orders[0] || (!admin && orders[0].user_id !== user.id)) return responses.json({ error: 'Not authorized for this order' }, 403, cors(request))

    const key = `order-receipts/${orderId}/receipt-${crypto.randomUUID()}.pdf`
    const uploadUrl = await presignedUrl(env, key, 'PUT', 'application/pdf', 600)
    const downloadUrl = await presignedUrl(env, key, 'GET', undefined, 604800)
    return responses.json({ uploadUrl, downloadUrl, key, expiresIn: 600 }, 200, cors(request))
  } catch (error) {
    return responses.json({ error: error instanceof Error ? error.message : 'Could not prepare receipt upload' }, 500, cors(request))
  }
}
