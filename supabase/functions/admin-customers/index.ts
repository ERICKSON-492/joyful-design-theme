import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = req.headers.get('Authorization')
  if (!supabaseUrl || !serviceRoleKey || !authorization) return response({ error: 'Authentication required' }, 401)

  const token = authorization.replace(/^Bearer\s+/i, '')
  const caller = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
  if (!publishableKey) return response({ error: 'Server configuration error' }, 500)
  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })
  const { data: userData, error: userError } = await caller.auth.getUser(token)
  if (userError || !userData.user) return response({ error: 'Authentication required' }, 401)
  const isAdmin = userData.user.app_metadata?.role === 'admin' || (await caller.from('admin_users').select('id').eq('user_id', userData.user.id).maybeSingle()).data
  if (!isAdmin) return response({ error: 'Admin access required' }, 403)

  const body = await req.json().catch(() => ({}))
  if (body.action === 'list') {
    const { data, error } = await userClient.rpc('admin_list_customers')
    if (error) return response({ error: error.message }, 500)
    return response({ customers: data || [] })
  }

  const url = new URL(req.url)
  const customerId = url.searchParams.get('id') || body.id
  if (!customerId) return response({ error: 'Customer id is required' }, 400)
  const { data: target, error: targetError } = await caller.auth.admin.getUserById(customerId)
  if (targetError || !target.user) return response({ error: 'Customer not found' }, 404)
  if (target.user.app_metadata?.role === 'admin') return response({ error: 'Administrator accounts cannot be changed here' }, 403)

  if (body.action === 'archive' || body.action === 'restore') {
    const metadata = { ...(target.user.app_metadata || {}), account_status: body.action === 'archive' ? 'archived' : 'active' }
    const { error } = await caller.auth.admin.updateUserById(customerId, { app_metadata: metadata })
    if (error) return response({ error: error.message }, 500)
    return response({ ok: true, is_active: body.action === 'restore' })
  }

  const { data: anonymized, error: rpcError } = await userClient.rpc('admin_anonymize_customer', { target_user_id: customerId })
  if (rpcError) return response({ error: rpcError.message }, 500)
  const { error: deleteError } = await caller.auth.admin.deleteUser(customerId)
  if (deleteError) return response({ error: `Customer data was anonymized, but Auth deletion failed: ${deleteError.message}` }, 500)
  return response(anonymized || { ok: true })
})
