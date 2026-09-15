// Base address of the Neon-backed API server (Render).
// - Set VITE_API_BASE_URL to override per environment.
// - In development we use relative paths: the Vite dev server proxies /api to
//   the API, keeping requests same-origin so cookies and CORS are a non-issue.
const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
const fallback = import.meta.env.DEV ? '' : 'https://joyful-design-theme.onrender.com'

export const API_BASE = (configured ?? fallback).replace(/\/+$/, '')

export function apiUrl(path: string): string {
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${suffix}`
}
