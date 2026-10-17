import { apiUrl } from './apiBase'

export interface AuthUser {
  id: string
  email: string
  displayName: string | null
  role: 'user' | 'admin'
}

type CurrentUserResponse = { user: AuthUser | null }
let currentUserRequest: Promise<CurrentUserResponse> | null = null

export async function authRequest<T = { user: AuthUser | null }>(path: string, payload?: unknown): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: payload === undefined ? 'GET' : 'POST',
    credentials: 'include',
    headers: payload === undefined ? undefined : { 'content-type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Authentication request failed')
  return data as T
}

export const getCurrentUser = () => {
  if (!currentUserRequest) {
    currentUserRequest = authRequest<CurrentUserResponse>('/api/auth/me').catch(error => {
      currentUserRequest = null
      throw error
    })
  }
  return currentUserRequest
}

const clearCurrentUserCache = () => { currentUserRequest = null }

export const login = async (email: string, password: string) => {
  const result = await authRequest<{ user: AuthUser }>('/api/auth/login', { email, password })
  clearCurrentUserCache()
  return result
}
export const signup = async (email: string, password: string, displayName: string) => {
  const result = await authRequest<{ user: AuthUser }>('/api/auth/signup', { email, password, displayName })
  clearCurrentUserCache()
  return result
}
export const logout = async () => {
  const result = await authRequest<{ ok: true }>('/api/auth/logout', {})
  clearCurrentUserCache()
  return result
}
export const requestPasswordReset = (email: string) => authRequest<{ ok: true }>('/api/auth/forgot-password', { email })
export const resetPassword = (token: string, password: string) => authRequest<{ ok: true }>('/api/auth/reset-password', { token, password })
