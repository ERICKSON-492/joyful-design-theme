export const COOKIE_CONSENT_KEY = 'ushanga-cookie-consent'
const COOKIE_CONSENT_MAX_AGE = 60 * 60 * 24 * 365
export const COOKIE_CONSENT_EVENT = 'ushanga-cookie-consent-changed'
export type CookieConsent = 'accepted' | 'declined'
const COOKIE_DOMAIN = 'Domain=.ushangachronicles.com'

function consentCookieSuffix() {
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('ushangachronicles.com')) {
    return `; ${COOKIE_DOMAIN}`
  }
  return ''
}

export function parseCookieConsent(value: string | null): CookieConsent | null {
  return value === 'accepted' || value === 'declined' ? value : null
}

export function getCookieConsent(): CookieConsent | null {
  try {
    const stored = parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_KEY))
    if (stored) return stored
  } catch {
    // Fall through to the first-party cookie when storage is unavailable.
  }

  try {
    const cookie = document.cookie
      .split(';')
      .map(entry => entry.trim())
      .find(entry => entry.startsWith(`${COOKIE_CONSENT_KEY}=`))
      ?.slice(COOKIE_CONSENT_KEY.length + 1)
    const stored = parseCookieConsent(cookie ? decodeURIComponent(cookie) : null)
    if (stored) {
      try { window.localStorage.setItem(COOKIE_CONSENT_KEY, stored) } catch { /* cookie remains the fallback */ }
    }
    return stored
  } catch {
    return null
  }
}

export function setCookieConsent(choice: CookieConsent) {
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, choice)
  } catch {
    // A blocked storage setting must not prevent a visitor from declining.
  }
  try {
    document.cookie = `${COOKIE_CONSENT_KEY}=${encodeURIComponent(choice)}; Max-Age=${COOKIE_CONSENT_MAX_AGE}; Path=/; SameSite=Lax${consentCookieSuffix()}`
  } catch {
    // Ignore blocked cookies; localStorage remains the primary persistence.
  }
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: choice }))
}
