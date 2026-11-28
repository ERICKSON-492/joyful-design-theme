import { supabase } from '@/integrations/supabase/client'

export interface AuthUser {
  id: string
  email: string
  displayName: string | null
  role: 'user' | 'admin'
}

type CurrentUserResponse = { user: AuthUser | null }
let currentUserRequest: Promise<CurrentUserResponse> | null = null

function getRole(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }): 'user' | 'admin' {
  return user.app_metadata?.role === 'admin' || user.user_metadata?.role === 'admin' ? 'admin' : 'user'
}

function mapUser(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> }): AuthUser {
  return {
    id: user.id,
    email: user.email || '',
    displayName: (user.user_metadata?.full_name as string | undefined) || (user.user_metadata?.name as string | undefined) || null,
    role: getRole(user),
  }
}

async function getCurrentUserUncached(): Promise<CurrentUserResponse> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return { user: data.user ? mapUser(data.user) : null }
}

export const getCurrentUser = () => {
  if (!currentUserRequest) {
    currentUserRequest = getCurrentUserUncached().catch(error => {
      currentUserRequest = null
      throw error
    })
  }
  return currentUserRequest
}

const clearCurrentUserCache = () => { currentUserRequest = null }

export const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  if (error) throw error
  clearCurrentUserCache()
  return { user: data.user ? mapUser(data.user) : null }
}

export const signup = async (email: string, password: string, displayName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { full_name: displayName.trim(), name: displayName.trim() } },
  })
  if (error) throw error

  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').upsert({
      user_id: data.user.id,
      email: data.user.email,
      display_name: displayName.trim(),
    }, { onConflict: 'user_id' })
    if (profileError) console.warn('[Auth] Profile sync skipped:', profileError.message)
  }

  clearCurrentUserCache()
  return { user: data.session && data.user ? mapUser(data.user) : null, needsEmailConfirmation: !data.session }
}

export const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  clearCurrentUserCache()
  return { ok: true as const }
}

export const loginWithGoogle = async (returnTo = '/') => {
  const safePath = returnTo.startsWith('/') && !returnTo.startsWith('//') && !returnTo.includes('\\') ? returnTo : '/'
  if (window.location.hostname === 'www.ushangachronicles.com') {
    window.location.assign(`https://ushangachronicles.com/auth?return_to=${encodeURIComponent(safePath)}`)
    return
  }
  try {
    sessionStorage.setItem('ushanga-auth-return-to', safePath)
  } catch {
    // Continue with the provider redirect even when sessionStorage is unavailable.
  }
  const redirectTo = `${window.location.origin}${safePath}`
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
  if (error) {
    try { sessionStorage.removeItem('ushanga-auth-return-to') } catch {}
    throw error
  }
}

export const requestPasswordReset = async (email: string) => {
  const redirectTo = `${window.location.origin}/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })
  if (error) throw error
  return { ok: true as const }
}

export const resetPassword = async (_token: string, password: string) => {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
  clearCurrentUserCache()
  return { ok: true as const }
}

supabase.auth.onAuthStateChange(() => clearCurrentUserCache())
