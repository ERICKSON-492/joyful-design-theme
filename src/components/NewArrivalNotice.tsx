import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/dbClient'
import { productPath } from '@/lib/slug'

const SEEN_KEY = 'ushanga-new-products-seen'
const POLL_MS = 2 * 60 * 1000

/**
 * Tells people who have visited before when new products have been added
 * since they were last here (and while they are browsing). First-time
 * visitors are never shown this, they just get a marker saved.
 */
export function NewArrivalNotice() {
  const navigate = useNavigate()

  useEffect(() => {
    let stopped = false

    const readMarker = () => {
      try { return localStorage.getItem(SEEN_KEY) } catch { return null }
    }
    const writeMarker = (v: string) => {
      try { localStorage.setItem(SEEN_KEY, v) } catch { /* ignore */ }
    }

    const check = async () => {
      const marker = readMarker()
      if (!marker) {
        const { data } = await supabase.from('products').select('created_at').eq('is_active', true).order('created_at', { ascending: false }).limit(1)
        writeMarker((data as any[] | null)?.[0]?.created_at || new Date().toISOString())
        return
      }
      const { data, error } = await supabase
        .from('products')
        .select('id,name,created_at')
        .eq('is_active', true)
        .gt('created_at', marker)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error || stopped || !Array.isArray(data) || data.length === 0) return
      const rows = data as { id: string; name: string; created_at: string }[]
      writeMarker(rows[0].created_at)
      const first = rows[0]
      toast(rows.length === 1 ? 'New in the shop' : `${rows.length} new pieces in the shop`, {
        description: rows.length === 1 ? first.name : `${first.name} and more`,
        duration: 12000,
        action: {
          label: rows.length === 1 ? 'View' : 'Shop now',
          onClick: () => navigate(rows.length === 1 ? productPath(first) : '/shop'),
        },
      })
    }

    const first = window.setTimeout(() => { void check() }, 4000)
    const timer = window.setInterval(() => { void check() }, POLL_MS)
    return () => {
      stopped = true
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [navigate])

  return null
}
