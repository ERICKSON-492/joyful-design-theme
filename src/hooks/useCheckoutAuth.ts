import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '@/lib/auth'

type CheckoutAuthState = { authChecked: boolean; userId: string | null; name: string; email: string }
const initialState: CheckoutAuthState = { authChecked: false, userId: null, name: '', email: '' }

export function useCheckoutAuth() {
  const navigate = useNavigate()
  const [state, setState] = useState<CheckoutAuthState>(initialState)
  useEffect(() => {
    let mounted = true
    getCurrentUser().then(({ user }) => {
      if (!mounted) return
      if (user) setState({ authChecked: true, userId: user.id, name: user.displayName || '', email: user.email })
      else { setState({ ...initialState, authChecked: true }); navigate('/auth', { state: { returnTo: '/checkout' }, replace: true }) }
    }).catch(() => {
      if (mounted) { setState({ ...initialState, authChecked: true }); navigate('/auth', { state: { returnTo: '/checkout' }, replace: true }) }
    })
    return () => { mounted = false }
  }, [navigate])
  return state
}
