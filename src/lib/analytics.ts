import { getCookieConsent } from './cookieConsent'
import { apiUrl } from './apiBase'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
  }
}

let enabled = false
const VISITOR_SESSION_KEY = 'ushanga-visitor-session'
const LANDING_PAGE_KEY = 'ushanga-landing-page'

function visitorSessionKey() {
  try {
    const existing = window.localStorage.getItem(VISITOR_SESSION_KEY)
    if (existing) return existing
    const created = crypto.randomUUID()
    window.localStorage.setItem(VISITOR_SESSION_KEY, created)
    return created
  } catch {
    return crypto.randomUUID()
  }
}

function firstLandingPage(path: string) {
  try {
    const existing = window.sessionStorage.getItem(LANDING_PAGE_KEY)
    if (existing) return existing
    window.sessionStorage.setItem(LANDING_PAGE_KEY, path)
  } catch {
    // Tracking must never interrupt navigation when storage is unavailable.
  }
  return path
}

function sendFirstPartyPageView(path: string) {
  const params = new URLSearchParams(window.location.search)
  const payload = JSON.stringify({
    sessionKey: visitorSessionKey(),
    path: path.split('?')[0] || '/',
    landingPage: firstLandingPage(path.split('?')[0] || '/'),
    referrer: document.referrer || null,
    deviceType: /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
  })
  const endpoint = apiUrl('/api/analytics/visit')
  try {
    // text/plain avoids a preflight when the storefront and Render API have different origins.
    const sent = navigator.sendBeacon?.(endpoint, new Blob([payload], { type: 'text/plain;charset=UTF-8' }))
    if (sent) return
  } catch {
    // Fall through to keepalive fetch.
  }
  void fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload, keepalive: true }).catch(() => {})
}

export function enableAnalytics() {
  if (enabled || getCookieConsent() !== 'accepted') return
  enabled = true
  const dataLayer: unknown[][] = []
  const analyticsWindow = window as Window & { dataLayer?: unknown[][] }
  analyticsWindow.dataLayer = dataLayer
  window.gtag = (...args: unknown[]) => { dataLayer.push(args) }
  window.gtag('js', new Date())
  window.gtag('config', 'G-0LQ501QG00', { send_page_view: false })
  const google = document.createElement('script')
  google.async = true
  google.src = 'https://www.googletagmanager.com/gtag/js?id=G-0LQ501QG00'
  document.head.appendChild(google)

  type Pixel = ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void
    queue: unknown[][]
    push?: Pixel
    loaded: boolean
    version: string
  }
  const pixel: Pixel = Object.assign((...args: unknown[]) => {
    if (pixel.callMethod) pixel.callMethod(...args)
    else pixel.queue.push(args)
  }, { queue: [] as unknown[][], loaded: true, version: '2.0' })
  pixel.push = pixel
  window.fbq = pixel
  ;(window as Window & { _fbq?: Pixel })._fbq = pixel
  pixel('init', '2149137285636818')
  const meta = document.createElement('script')
  meta.async = true
  meta.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(meta)
  trackPageView(`${window.location.pathname}${window.location.search}`)
}

/**
 * Sends a GA4 page_view event and a Meta Pixel PageView event for the given
 * path. Both snippets in index.html only fire automatically on the very
 * first load — client-side route changes in this SPA need to report
 * themselves manually, or these tools will only ever see a single pageview
 * per visitor no matter how many pages they actually browse.
 */
export function trackPageView(path: string) {
  if (typeof window === 'undefined' || getCookieConsent() !== 'accepted') return
  sendFirstPartyPageView(path)
  // Deliberately build page_location from origin + pathname + search only —
  // never window.location.hash. During an OAuth redirect, the URL fragment
  // can briefly contain real session tokens before Supabase strips it, and
  // that must never be sent to a third party like Google Analytics or Meta.
  const safeLocation = `${window.location.origin}${window.location.pathname}${window.location.search}`

  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_location: safeLocation,
      page_title: document.title,
    })
  }

  if (window.fbq) {
    window.fbq('track', 'PageView')
  }
}
