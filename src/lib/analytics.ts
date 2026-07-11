declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * Sends a GA4 page_view event for the given path. The gtag snippet in
 * index.html only fires a pageview automatically on the very first load —
 * client-side route changes in this SPA need to report themselves manually,
 * or Google Analytics will only ever see a single pageview per visitor.
 */
export function trackPageView(path: string) {
  if (typeof window === 'undefined' || !window.gtag) return
  // Deliberately build page_location from origin + pathname + search only —
  // never window.location.hash. During an OAuth redirect, the URL fragment
  // can briefly contain real session tokens before Supabase strips it, and
  // that must never be sent to a third party like Google Analytics.
  const safeLocation = `${window.location.origin}${window.location.pathname}${window.location.search}`
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: safeLocation,
    page_title: document.title,
  })
}
