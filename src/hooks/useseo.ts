import { useEffect } from 'react'

export const SITE_URL = 'https://www.ushangachronicles.com'
const DEFAULT_DESCRIPTION =
  'Ushanga Chronicles — handcrafted African jewelry, home decor, and accessories made in Nairobi, Kenya. Every piece tells a story.'

export function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Sets a unique title, meta description, and canonical URL for the current
 * page. Without this, every route in this single-page app shares the same
 * static tags from index.html — which is what causes Google Search Console
 * to report "Duplicate without user-selected canonical" and
 * "Crawled - currently not indexed" for most pages.
 *
 * @param title       Page title (site name is appended automatically)
 * @param description Optional meta description; falls back to the site default
 * @param path        Optional path for the canonical URL, e.g. '/shop'. Defaults to the current URL path.
 * @param noindex     Set true for pages that should never be indexed (e.g. admin, checkout, account)
 */
export function useSEO(title: string, description?: string, path?: string, noindex = false) {
  useEffect(() => {
    document.title = title ? `${title} – Ushanga Chronicles` : 'Ushanga Chronicles'

    upsertMeta('name', 'description', description || DEFAULT_DESCRIPTION)
    upsertMeta('property', 'og:title', document.title)
    upsertMeta('property', 'og:description', description || DEFAULT_DESCRIPTION)

    const canonicalPath = path ?? window.location.pathname
    upsertCanonical(`${SITE_URL}${canonicalPath === '/' ? '' : canonicalPath}`)

    let robotsEl = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (noindex) {
      if (!robotsEl) {
        robotsEl = document.createElement('meta')
        robotsEl.setAttribute('name', 'robots')
        document.head.appendChild(robotsEl)
      }
      robotsEl.setAttribute('content', 'noindex, nofollow')
    } else if (robotsEl) {
      robotsEl.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, path, noindex])
}
