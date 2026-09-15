// Base address of the Neon-backed API server (Render). Override per
// environment with VITE_API_BASE_URL; leave it empty to use same-origin
// requests when the API is proxied under the site itself.
const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()

export const API_BASE = (configured ?? 'https://joyful-design-theme.onrender.com').replace(/\/+$/, '')

export function apiUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${suffix}`
}
