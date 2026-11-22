import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders })
const source = (session: any) => {
  const ref = String(session.referrer || '').toLowerCase()
  if (session.utm_source) return String(session.utm_source).replace(/^./, (c) => c.toUpperCase())
  if (ref.includes('instagram')) return 'Instagram'
  if (ref.includes('facebook') || ref.includes('fb.')) return 'Facebook'
  if (ref.includes('whatsapp') || ref.includes('wa.me')) return 'WhatsApp'
  if (ref.includes('tiktok')) return 'TikTok'
  if (ref.includes('google')) return 'Google'
  if (ref.includes('bing') || ref.includes('yahoo') || ref.includes('duckduckgo')) return 'Other search'
  if (ref.includes('chatgpt') || ref.includes('openai') || ref.includes('perplexity')) return 'AI assistants'
  if (!ref || ref.includes('ushangachronicles')) return 'Typed in / bookmark'
  return 'Other websites'
}
const countBy = (rows: any[], key: (row: any) => string) => {
  const map = new Map<string, number>()
  for (const row of rows) {
    const name = key(row) || 'Unknown'
    map.set(name, (map.get(name) || 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 20).map(([name, visitors]) => ({ name, visitors }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405)
  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const publishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
  const authorization = req.headers.get('Authorization')
  if (!url || !serviceKey || !publishableKey || !authorization) return response({ error: 'Authentication required' }, 401)
  const token = authorization.replace(/^Bearer\s+/i, '')
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) return response({ error: 'Authentication required' }, 401)
  const isAdmin = userData.user.app_metadata?.role === 'admin' || (await admin.from('admin_users').select('id').eq('user_id', userData.user.id).maybeSingle()).data
  if (!isAdmin) return response({ error: 'Admin access required' }, 403)

  const body = await req.json().catch(() => ({}))
  const requestedDays = Number(body.days || 30)
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const [sessionResult, viewResult] = await Promise.all([
    admin.from('visitor_sessions').select('session_key, first_seen_at, last_seen_at, country, region, referrer, device_type, utm_source').gte('first_seen_at', since),
    admin.from('analytics_page_views').select('session_key, path, viewed_at, duration_seconds').gte('viewed_at', since).not('path', 'like', '/admin%'),
  ])
  if (sessionResult.error) return response({ error: sessionResult.error.message }, 500)
  if (viewResult.error) return response({ error: viewResult.error.message }, 500)
  const sessions = sessionResult.data || []
  const views = viewResult.data || []
  const today = new Date().toISOString().slice(0, 10)
  const weekStart = new Date(Date.now() - ((new Date().getUTCDay() || 7) - 1) * 86400000).toISOString()
  const durations = new Map<string, number>()
  for (const view of views) durations.set(view.session_key, (durations.get(view.session_key) || 0) + Number(view.duration_seconds || 0))
  const engagedSessions = [...durations.values()].filter((value) => value >= 10).length
  const dailyMap = new Map<string, number>()
  for (const session of sessions) {
    const day = String(session.first_seen_at).slice(0, 10)
    dailyMap.set(day, (dailyMap.get(day) || 0) + 1)
  }
  const pages = new Map<string, { page_views: number; visitors: Set<string> }>()
  for (const view of views) {
    const item = pages.get(view.path) || { page_views: 0, visitors: new Set<string>() }
    item.page_views += 1
    item.visitors.add(view.session_key)
    pages.set(view.path, item)
  }
  const funnel = {
    visited: new Set(views.map((view) => view.session_key)).size,
    viewed_product: new Set(views.filter((view) => String(view.path).startsWith('/product')).map((view) => view.session_key)).size,
    reached_checkout: new Set(views.filter((view) => String(view.path).startsWith('/checkout')).map((view) => view.session_key)).size,
  }
  return response({
    days,
    summary: {
      visitors: sessions.length,
      today: sessions.filter((row) => String(row.first_seen_at).slice(0, 10) === today).length,
      this_week: sessions.filter((row) => String(row.first_seen_at) >= weekStart).length,
      page_views: views.length,
      engagement_seconds: [...durations.values()].reduce((sum, value) => sum + value, 0),
      avg_engagement_seconds: sessions.length ? Math.round([...durations.values()].reduce((sum, value) => sum + value, 0) / sessions.length) : 0,
      engaged_sessions: engagedSessions,
    },
    daily: [...dailyMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, visitors]) => ({ day, visitors })),
    countries: countBy(sessions, (row) => row.country || 'Unknown'),
    regions: countBy(sessions, (row) => row.region || 'Unknown'),
    sources: countBy(sessions, source),
    devices: countBy(sessions, (row) => String(row.device_type || 'unknown').replace(/^./, (c) => c.toUpperCase())),
    pages: [...pages.entries()].sort((a, b) => b[1].page_views - a[1].page_views).slice(0, 20).map(([path, row]) => ({ path, page_views: row.page_views, unique_visitors: row.visitors.size })),
    funnel,
  })
})
