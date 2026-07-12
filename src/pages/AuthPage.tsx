// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Singleton pattern for client
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const supabase = (() => {
  if (supabaseInstance) return supabaseInstance
  
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      lockTimeout: 10000, // Increased from default 5000ms
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storage: {
        getItem: (key) => {
          try {
            return localStorage.getItem(key)
          } catch {
            return null
          }
        },
        setItem: (key,import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Mail, Lock, User, Loader2 } from 'lucide-react'
import { useSEO } from '@/hooks/useSEO'

export default function AuthPage() {
  useSEO('Sign In', undefined, undefined, true)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = (location.state as any)?.returnTo || '/'
  
  // Use ref to prevent multiple navigation calls
  const hasNavigated = useRef(false)
  const isMounted = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Optimized session check with cleanup
  useEffect(() => {
    let isSubscribed = true

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session && isSubscribed && !hasNavigated.current) {
          hasNavigated.current = true
          navigate(returnTo)
        }
      } catch (error) {
        // Silently handle session check errors
        console.debug('Session check failed:', error)
      }
    }

    // Set up auth state listener with proper cleanup
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only navigate on specific events to avoid loops
        if (
          session && 
          isSubscribed && 
          !hasNavigated.current &&
          (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
        ) {
          hasNavigated.current = true
          navigate(returnTo)
        }
      }
    )

    checkSession()

    return () => {
      isSubscribed = false
      subscription?.unsubscribe()
    }
  }, [navigate, returnTo])

  // Reset navigation flag when returning to auth page
  useEffect(() => {
    hasNavigated.current = false
  }, [location.pathname])

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { 
      toast.error('Please enter your email')
      return 
    }
    
    setForgotLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      
      toast.success('Password reset link sent! Check your email.')
      setShowForgot(false)
      setEmail('') // Clear email for security
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email')
    } finally {
      if (isMounted.current) {
        setForgotLoading(false)
      }
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        })
        if (error) throw error
        
        if (isMounted.current) {
          toast.success('Welcome back!')
        }
      } else {
        if (!name.trim()) {
          if (isMounted.current) {
            toast.error('Please enter your name')
          }
          setLoading(false)
          return
        }
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) throw error
        
        if (isMounted.current) {
          toast.success('Check your email to confirm your account!')
          // Clear form for security
          setEmail('')
          setPassword('')
          setName('')
        }
      }
    } catch (err: any) {
      if (isMounted.current) {
        toast.error(err.message || 'Authentication failed')
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { 
          redirectTo: window.location.origin,
        },
      })
      if (error) throw error
    } catch (err: any) {
      if (isMounted.current) {
        toast.error(err.message || 'Google sign-in failed')
      }
      setLoading(false)
    }
  }

  // Rest of your JSX remains the same...
  return (
    <div className="bg-background min-h-screen pt-24 pb-16 flex items-center justify-center px-4">
      {/* ... your existing JSX ... */}
    </div>
  )
} value) => {
          try {
            localStorage.setItem(key, value)
          } catch {
            // Handle storage errors silently
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key)
          } catch {
            // Handle storage errors silently
          }
        },
      },
    },
  })
  
  return supabaseInstance
})()
