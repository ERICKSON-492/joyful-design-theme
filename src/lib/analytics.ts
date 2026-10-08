import { getCookieConsent } from './cookieConsent'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
  }
}

let enabled = false

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
