import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

type CheckoutAuthState = {
  authChecked: boolean
  userId: string | null
  name: string
  email: string
}

const initialState: CheckoutAuthState = {
  authChecked: false,
  userId: null,
  name: '',
  email: '',
}

export function useCheckoutAuth() {
  const navigate = useNavigate()
  const [state, setState] = useState<CheckoutAuthState>(initialState)

  useEffect(() => {
    let isMounted = true
    let initialSessionResolved = false

    const applySession = (session: Session | null, source: 'initial' | 'listener') => {
      if (!isMounted) return

      const user = session?.user ?? null

      if (!initialSessionResolved && source === 'listener' && !user) {
        return
      }

      if (user) {
        setState((prev) => ({
          authChecked: true,
          userId: user.id,
          name: prev.name || user.user_metadata?.full_name || '',
          email: prev.email || user.email || '',
        }))
        return
      }

      setState((prev) => ({ ...prev, authChecked: true, userId: null }))
      navigate('/auth', { state: { returnTo: '/checkout' }, replace: true })
    }

    const fallbackId = window.setTimeout(() => {
      if (initialSessionResolved) return
      initialSessionResolved = true
      applySession(null, 'initial')
    }, 4000)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session, 'listener')
    })

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        initialSessionResolved = true
        window.clearTimeout(fallbackId)
        applySession(session, 'initial')
      })
      .catch(() => {
        initialSessionResolved = true
        window.clearTimeout(fallbackId)
        applySession(null, 'initial')
      })

    return () => {
      isMounted = false
      window.clearTimeout(fallbackId)
      subscription.unsubscribe()
    }
  }, [navigate])

  return state
}