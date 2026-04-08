import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

type Status = 'loading' | 'valid' | 'already_unsubscribed' | 'invalid' | 'success' | 'error'

export default function UnsubscribePage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<Status>('loading')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) { setStatus('invalid'); return }

    const validate = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`
        const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } })
        if (!res.ok) { setStatus('invalid'); return }
        const data = await res.json()
        if (data.valid === false && data.reason === 'already_unsubscribed') {
          setStatus('already_unsubscribed')
        } else if (data.valid) {
          setStatus('valid')
        } else {
          setStatus('invalid')
        }
      } catch { setStatus('error') }
    }
    validate()
  }, [token])

  const handleUnsubscribe = async () => {
    if (!token) return
    setSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', {
        body: { token },
      })
      if (error) { setStatus('error'); return }
      if (data?.success) setStatus('success')
      else if (data?.reason === 'already_unsubscribed') setStatus('already_unsubscribed')
      else setStatus('error')
    } catch { setStatus('error') }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center">
        {status === 'loading' && <p className="text-muted-foreground">Verifying...</p>}

        {status === 'valid' && (
          <>
            <h1 className="font-display text-2xl font-bold text-foreground mb-3">Unsubscribe</h1>
            <p className="text-muted-foreground mb-6">Are you sure you want to unsubscribe from our emails?</p>
            <button
              onClick={handleUnsubscribe}
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Confirm Unsubscribe'}
            </button>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="font-display text-2xl font-bold text-foreground mb-3">Unsubscribed</h1>
            <p className="text-muted-foreground">You've been successfully unsubscribed from our emails.</p>
          </>
        )}

        {status === 'already_unsubscribed' && (
          <>
            <h1 className="font-display text-2xl font-bold text-foreground mb-3">Already Unsubscribed</h1>
            <p className="text-muted-foreground">You're already unsubscribed from our emails.</p>
          </>
        )}

        {status === 'invalid' && (
          <>
            <h1 className="font-display text-2xl font-bold text-foreground mb-3">Invalid Link</h1>
            <p className="text-muted-foreground">This unsubscribe link is invalid or has expired.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="font-display text-2xl font-bold text-foreground mb-3">Something went wrong</h1>
            <p className="text-muted-foreground">Please try again later or contact us for help.</p>
          </>
        )}
      </div>
    </div>
  )
}
