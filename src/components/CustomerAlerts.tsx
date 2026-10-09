import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/dbClient'
import { getCurrentUser } from '@/lib/auth'
import { playChime } from '@/lib/notify'

const POLL_MS = 30000
const label = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())

/**
 * Tells signed-in customers when the status of one of their orders changes,
 * including changes that happened while they were away.
 */
export function CustomerAlerts() {
  const navigate = useNavigate()

  useEffect(() => {
    let timer: number | undefined
    let stopped = false

    const start = async () => {
      window.clearInterval(timer)
      const { user } = await getCurrentUser().catch(() => ({ user: null }))
      if (!user || stopped) return
      const storeKey = `ushanga-order-status-${user.id}`

      const poll = async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('id,status,tracking_number')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30)
        if (error || !Array.isArray(data) || stopped) return
        let previous: Record<string, string> | null = null
        try {
          previous = JSON.parse(localStorage.getItem(storeKey) || 'null')
        } catch {
          previous = null
        }
        const next: Record<string, string> = {}
        for (const o of data as any[]) next[String(o.id)] = String(o.status || '')
        if (previous) {
          for (const o of data as any[]) {
            const before = previous[String(o.id)]
            if (before !== undefined && before !== o.status) {
              playChime()
              toast(`Order #${String(o.id).slice(0, 8).toUpperCase()} is now ${label(String(o.status))}`, {
                description: o.tracking_number ? `Tracking number: ${o.tracking_number}` : undefined,
                duration: 12000,
                action: { label: 'View', onClick: () => navigate('/my-orders') },
              })
            }
          }
        }
        try {
          localStorage.setItem(storeKey, JSON.stringify(next))
        } catch {
          /* ignore */
        }
      }

      void poll()
      timer = window.setInterval(poll, POLL_MS)
    }

    void start()
    window.addEventListener('ushanga-auth-changed', start)
    return () => {
      stopped = true
      window.clearInterval(timer)
      window.removeEventListener('ushanga-auth-changed', start)
    }
  }, [navigate])

  return null
}
