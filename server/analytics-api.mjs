import crypto from 'node:crypto'
import { drainOutbox, queueEmail } from './functions-api.mjs'

const rateWindowMs = 60_000
const maxRequestsPerWindow = 60
const requestWindows = new Map()

const text = (value, max = 200) => {
  if (value === null || value === undefined) return null
  const result = String(value).trim()
  return result ? result.slice(0, max) : null
}

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]))

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

function isoWeekKey(date = new Date()) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((target - yearStart) / 86400000) + 1) / 7)
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

function reportRecipients() {
  return String(process.env.ANALYTICS_REPORT_EMAIL || process.env.ADMIN_EMAILS || '')
    .split(',').map(email => email.trim().toLowerCase()).filter(email => /^\S+@\S+\.\S+$/.test(email))
}

function reportHtml({ summary, countries, regions, pages, periodStart, periodEnd }) {
  const list = (rows, suffix = 'visitors') => rows.length
    ? `<ol>${rows.map(row => `<li style="margin:6px 0"><strong>${escapeHtml(row.name || row.path)}</strong> — ${Number(row.visitors ?? row.unique_visitors ?? 0).toLocaleString()} ${suffix}</li>`).join('')}</ol>`
    : '<p>No visitor data was recorded in this period.</p>'
  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#1a1a1a"><h2 style="color:#b8860b">Weekly visitor report</h2><p>${periodStart.toLocaleDateString('en-KE')} – ${periodEnd.toLocaleDateString('en-KE')}</p><div style="display:flex;gap:24px"><p><strong>${Number(summary.visitors || 0).toLocaleString()}</strong><br>unique visitors</p><p><strong>${Number(summary.page_views || 0).toLocaleString()}</strong><br>page views</p><p><strong>${Number(summary.new_visitors || 0).toLocaleString()}</strong><br>new visitors</p></div><h3>Top countries</h3>${list(countries)}<h3>Top regions</h3>${list(regions)}<h3>Top pages</h3>${list(pages, 'page views')}<p style="margin-top:24px"><a href="https://ushangachronicles.com/admin/analytics">Open analytics dashboard</a></p></div>`
}

export async function processWeeklyVisitorReport(pool, now = new Date()) {
  // The worker checks every minute. A short Monday morning window avoids a missed
  // report if Render starts the process a few seconds after 07:00 UTC.
  if (now.getUTCDay() !== 1 || now.getUTCHours() !== 7 || now.getUTCMinutes() > 5) return 0
  const recipients = reportRecipients()
  if (!recipients.length) return 0
  const reportKey = `weekly-${isoWeekKey(now)}`
  const claim = await pool.query('INSERT INTO public.analytics_report_state (report_key) VALUES ($1) ON CONFLICT DO NOTHING RETURNING report_key', [reportKey])
  if (!claim.rowCount) return 0
  const periodEnd = new Date(now)
  const periodStart = new Date(now.getTime() - 7 * 86400000)
  try {
    const [summary, countries, regions, pages] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS visitors, (SELECT COUNT(*)::int FROM public.analytics_page_views WHERE viewed_at >= $1 AND viewed_at < $2) AS page_views, COUNT(*) FILTER (WHERE first_seen_at >= $1)::int AS new_visitors FROM public.visitor_sessions WHERE first_seen_at < $2 AND last_seen_at >= $1`, [periodStart, periodEnd]),
      pool.query(`SELECT COALESCE(NULLIF(country,''),'Unknown') AS name, COUNT(*)::int AS visitors FROM public.visitor_sessions WHERE first_seen_at >= $1 AND first_seen_at < $2 GROUP BY 1 ORDER BY visitors DESC, name LIMIT 5`, [periodStart, periodEnd]),
      pool.query(`SELECT COALESCE(NULLIF(region,''),'Unknown') AS name, COUNT(*)::int AS visitors FROM public.visitor_sessions WHERE first_seen_at >= $1 AND first_seen_at < $2 GROUP BY 1 ORDER BY visitors DESC, name LIMIT 10`, [periodStart, periodEnd]),
      pool.query(`SELECT path, COUNT(*)::int AS page_views, COUNT(DISTINCT session_key)::int AS unique_visitors FROM public.analytics_page_views WHERE viewed_at >= $1 AND viewed_at < $2 GROUP BY path ORDER BY page_views DESC, path LIMIT 10`, [periodStart, periodEnd]),
    ])
    const reportSummary = summary.rows[0] || { visitors: 0, page_views: 0, new_visitors: 0 }
    for (const recipient of recipients) await queueEmail(pool, { to: recipient, subject: `Weekly website visitors — ${reportKey.replace('weekly-', '')}`, html: reportHtml({ summary: reportSummary, countries: countries.rows, regions: regions.rows, pages: pages.rows, periodStart, periodEnd }), label: 'weekly-visitor-report' })
    drainOutbox(pool).catch(error => console.error('weekly visitor report outbox drain failed:', error.message))
    console.log(`weekly visitor report queued for ${recipients.length} recipient(s): ${reportKey}`)
    return recipients.length
  } catch (error) {
    await pool.query('DELETE FROM public.analytics_report_state WHERE report_key=$1', [reportKey]).catch(() => {})
    throw error
  }
}

export function createAnalyticsSessionKey() {
  return crypto.randomBytes(24).toString('base64url')
}
