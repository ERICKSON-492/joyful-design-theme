declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
  }
}

/**
 * Sends a GA4 page_view event and a Meta Pixel PageView event for the given
 * path. Both snippets in index.html only fire automatically on the very
 * first load — client-side route changes in this SPA need to report
 * themselves manually, or these tools will only ever see a single pageview
 * per visitor no matter how many pages they actually browse.
 */
export function trackPageView(path: string) {
  if (typeof window === 'undefined') return
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
