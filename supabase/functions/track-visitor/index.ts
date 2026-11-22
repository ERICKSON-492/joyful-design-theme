import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-client-info, apikey',
  'Content-Type': 'application/json',
}
const text = (value: unknown, max = 300) => {
  if (value === null || value === undefined) return null
  const result = String(value).trim()
  return result ? result.slice(0, max) : null
}
const validSession = (value: unknown) => /^[a-zA-Z0-9_-]{16,128}$/.test(String(value || ''))
const windows = new Map<string, { started: number; count: number }>()

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders })
  const body = await req.json().catch(() => null)
  if (!body || !validSession(body.sessionKey)) return new Response(JSON.stringify({ error: 'Invalid session key' }), { status: 400, headers: corsHeaders })
  const ipKey = req.headers.get('cf-connecting-ip') || 'anonymous'
  const now = Date.now()
  const window = windows.get(ipKey)
  if (!window || now - window.started >= 60000) windows.set(ipKey, { started: now, count: 1 })
  else {
    window.count += 1
    if (window.count > 120) return new Response(JSON.stringify({ error: 'Too many analytics events' }), { status: 429, headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: corsHeaders })
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const path = text(body.path, 300)
  if (!path || !path.startsWith('/')) return new Response(JSON.stringify({ error: 'Invalid path' }), { status: 400, headers: corsHeaders })
  const sessionKey = String(body.sessionKey)

  if (body.eventType === 'engagement') {
    const duration = Math.max(0, Math.min(1800, Number(body.durationSeconds) || 0))
    if (duration > 0) {
      const { data: latest } = await db.from('analytics_page_views').select('id').eq('session_key', sessionKey).eq('path', path).order('viewed_at', { ascending: false }).limit(1).maybeSingle()
      if (latest) await db.from('analytics_page_views').update({ duration_seconds: duration }).eq('id', latest.id).lt('duration_seconds', duration)
      await db.from('visitor_sessions').update({ last_seen_at: new Date().toISOString() }).eq('session_key', sessionKey)
    }
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const countryCode = text(req.headers.get('cf-ipcountry') || req.headers.get('x-country'), 80)
  const { error: sessionError } = await db.from('visitor_sessions').upsert({
    session_key: sessionKey,
    country: countryCode,
    region: text(req.headers.get('cf-region'), 120),
    city: text(req.headers.get('cf-ipcity'), 120),
    landing_page: text(body.landingPage, 300) || path,
    referrer: text(body.referrer, 500),
    device_type: ['mobile', 'tablet', 'desktop'].includes(body.deviceType) ? body.deviceType : 'unknown',
    utm_source: text(body.utmSource, 100),
    utm_medium: text(body.utmMedium, 100),
    utm_campaign: text(body.utmCampaign, 150),
    last_seen_at: new Date().toISOString(),
  }, { onConflict: 'session_key' })
  if (sessionError) return new Response(JSON.stringify({ error: sessionError.message }), { status: 500, headers: corsHeaders })
  const { error: viewError } = await db.from('analytics_page_views').insert({ session_key: sessionKey, path, duration_seconds: 0 })
  if (viewError) return new Response(JSON.stringify({ error: viewError.message }), { status: 500, headers: corsHeaders })
  return new Response(null, { status: 204, headers: corsHeaders })
})
