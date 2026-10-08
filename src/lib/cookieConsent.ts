export const COOKIE_CONSENT_KEY = 'ushanga-cookie-consent'
export const COOKIE_CONSENT_EVENT = 'ushanga-cookie-consent-changed'
export type CookieConsent = 'accepted' | 'declined'

export function parseCookieConsent(value: string | null): CookieConsent | null {
  return value === 'accepted' || value === 'declined' ? value : null
}

export function getCookieConsent(): CookieConsent | null {
  try {
    return parseCookieConsent(window.localStorage.getItem(COOKIE_CONSENT_KEY))
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
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: choice }))
}