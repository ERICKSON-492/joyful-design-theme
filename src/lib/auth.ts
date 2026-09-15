export interface AuthUser {
  id: string
  email: string
  displayName: string | null
  role: 'user' | 'admin'
}

export async function authRequest<T = { user: AuthUser | null }>(path: string, payload?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: payload === undefined ? 'GET' : 'POST',
    credentials: 'include',
    headers: payload === undefined ? undefined : { 'content-type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Authentication request failed')
  return data as T
}

export const getCurrentUser = () => authRequest<{ user: AuthUser | null }>('/api/auth/me')
export const login = (email: string, password: string) => authRequest<{ user: AuthUser }>('/api/auth/login', { email, password })
export const signup = (email: string, password: string, displayName: string) => authRequest<{ user: AuthUser }>('/api/auth/signup', { email, password, displayName })
export const logout = () => authRequest<{ ok: true }>('/api/auth/logout', {})
