import crypto from 'node:crypto'

const rateWindowMs = 60_000
const maxRequestsPerWindow = 60
const requestWindows = new Map()

const text = (value, max = 200) => {
  if (value === null || value === undefined) return null
  const result = String(value).trim()
  return result ? result.slice(0, max) : null
}

const array = (value, maxItems = 200) => Array.isArray(value)
  ? value.map(item => text(item, 120)).filter(Boolean).slice(0, maxItems)
  : []

function rateLimited(req) {
  const ip = String(req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim()
  const now = Date.now()
  const current = requestWindows.get(ip)
  if (!current || now - current.startedAt >= rateWindowMs) {
    requestWindows.set(ip, { startedAt: now, count: 1 })
    if (requestWindows.size > 5000) {
      for (const [key, value] of requestWindows) if (now - value.startedAt >= rateWindowMs) requestWindows.delete(key)
    }
    return false
  }
  current.count += 1
  return current.count > maxRequestsPerWindow
}

function locationFromRequest(req) {
  return {
    country: text(req.headers['cf-ipcountry'] || req.headers['x-country'] || req.headers['x-vercel-ip-country'], 80),
    region: text(req.headers['cf-region'] || req.headers['x-vercel-ip-country-region'], 120),
    city: text(req.headers['cf-ipcity'] || req.headers['x-vercel-ip-city'], 120),
  }
}

function validSessionKey(value) {
  return /^[a-zA-Z0-9_-]{16,128}$/.test(String(value || ''))
}

export async function handleVisitorEvent({ pool, req, res, json, body }) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
  if (rateLimited(req)) return json(res, 429, { error: 'Too many analytics events' })
  const payload = await body(req)
  if (!validSessionKey(payload.sessionKey)) return json(res, 400, { error: 'Invalid session key' })
  const path = text(payload.path, 300)
  if (!path || !path.startsWith('/')) return json(res, 400, { error: 'Invalid path' })

  const location = locationFromRequest(req)
  const session = {
    sessionKey: String(payload.sessionKey),
    landingPage: text(payload.landingPage, 300) || path,
    referrer: text(payload.referrer, 500),
    deviceType: ['mobile', 'tablet', 'desktop'].includes(payload.deviceType) ? payload.deviceType : 'unknown',
    utmSource: text(payload.utmSource, 100),
    utmMedium: text(payload.utmMedium, 100),
    utmCampaign: text(payload.utmCampaign, 150),
  }

  await pool.query(
    `INSERT INTO public.visitor_sessions
      (session_key, country, region, city, landing_page, referrer, device_type, utm_source, utm_medium, utm_campaign)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (session_key) DO UPDATE SET
       last_seen_at=now(),
       country=COALESCE(EXCLUDED.country, visitor_sessions.country),
       region=COALESCE(EXCLUDED.region, visitor_sessions.region),
       city=COALESCE(EXCLUDED.city, visitor_sessions.city),
       referrer=COALESCE(visitor_sessions.referrer, EXCLUDED.referrer),
       utm_source=COALESCE(visitor_sessions.utm_source, EXCLUDED.utm_source),
       utm_medium=COALESCE(visitor_sessions.utm_medium, EXCLUDED.utm_medium),
       utm_campaign=COALESCE(visitor_sessions.utm_campaign, EXCLUDED.utm_campaign)` ,
    [session.sessionKey, location.country, location.region, location.city, session.landingPage, session.referrer, session.deviceType, session.utmSource, session.utmMedium, session.utmCampaign],
  )
  await pool.query('INSERT INTO public.analytics_page_views (session_key, path) VALUES ($1,$2)', [session.sessionKey, path])
  return json(res, 204)
}

export async function handleVisitorReport({ pool, req, res, url, json, requireAdmin }) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' })
  if (!await requireAdmin(req)) return json(res, 403, { error: 'Admin access required', code: '42501' })
  const requestedDays = Number(url.searchParams.get('days') || 30)
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30
  const [summary, daily, countries, regions, pages, sources] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS visitors, COUNT(*) FILTER (WHERE first_seen_at::date = CURRENT_DATE)::int AS today, COUNT(*) FILTER (WHERE first_seen_at >= date_trunc('week', now()))::int AS this_week FROM public.visitor_sessions WHERE first_seen_at >= now() - ($1 * interval '1 day')`, [days]),
    pool.query(`SELECT first_seen_at::date AS day, COUNT(*)::int AS visitors FROM public.visitor_sessions WHERE first_seen_at >= now() - ($1 * interval '1 day') GROUP BY 1 ORDER BY 1`, [days]),
    pool.query(`SELECT COALESCE(NULLIF(country,''),'Unknown') AS name, COUNT(*)::int AS visitors FROM public.visitor_sessions WHERE first_seen_at >= now() - ($1 * interval '1 day') GROUP BY 1 ORDER BY visitors DESC, name LIMIT 20`, [days]),
    pool.query(`SELECT COALESCE(NULLIF(region,''),'Unknown') AS name, COUNT(*)::int AS visitors FROM public.visitor_sessions WHERE first_seen_at >= now() - ($1 * interval '1 day') GROUP BY 1 ORDER BY visitors DESC, name LIMIT 20`, [days]),
    pool.query(`SELECT path, COUNT(*)::int AS page_views, COUNT(DISTINCT session_key)::int AS unique_visitors FROM public.analytics_page_views WHERE viewed_at >= now() - ($1 * interval '1 day') GROUP BY path ORDER BY page_views DESC, path LIMIT 20`, [days]),
    pool.query(`SELECT COALESCE(NULLIF(utm_source,''),'Direct') AS name, COUNT(*)::int AS visitors FROM public.visitor_sessions WHERE first_seen_at >= now() - ($1 * interval '1 day') GROUP BY 1 ORDER BY visitors DESC, name LIMIT 20`, [days]),
  ])
  return json(res, 200, { days, summary: summary.rows[0], daily: daily.rows, countries: countries.rows, regions: regions.rows, pages: pages.rows, sources: sources.rows })
}

export function createAnalyticsSessionKey() {
  return crypto.randomBytes(24).toString('base64url')
}
