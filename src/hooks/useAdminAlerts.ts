import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/dbClient'
import { playChime, showDesktopAlert } from '@/lib/notify'

const POLL_MS = 8000

interface Source {
  key: string
  table: string
  select: string
  /** Only rows that pass this are announced. */
  accept?: (row: any) => boolean
  title: (row: any) => string
  body: (row: any) => string
  href: string
}

const money = (n: unknown) => `KES ${Number(n || 0).toLocaleString()}`
const short = (s: unknown, n = 80) => {
  const t = String(s || '').trim()
  return t.length > n ? `${t.slice(0, n)}...` : t
}

const SOURCES: Source[] = [
  {
    key: 'orders', table: 'orders', select: 'id,customer_name,total_amount,created_at',
    title: () => 'New order',
    body: r => `${r.customer_name || 'A customer'} placed an order for ${money(r.total_amount)}`,
    href: '/admin/orders',
  },
  {
    key: 'enquiries', table: 'enquiry_messages', select: 'id,customer_name,message,is_from_admin,created_at',
    accept: r => !r.is_from_admin,
    title: r => `New enquiry from ${r.customer_name || 'a visitor'}`,
    body: r => short(r.message),
    href: '/admin/enquiries',
  },
  {
    key: 'custom', table: 'custom_orders', select: 'id,name,category,created_at',
    title: () => 'New custom order request',
    body: r => `${r.name || 'A customer'} asked for a custom ${r.category || 'piece'}`,
    href: '/admin/custom-orders',
  },
  {
    key: 'reviews', table: 'product_reviews', select: 'id,customer_name,rating,status,created_at',
    accept: r => r.status === 'pending',
    title: () => 'New review waiting',
    body: r => `${r.customer_name || 'A customer'} left ${r.rating || ''} star${r.rating === 1 ? '' : 's'} for approval`,
    href: '/admin/reviews',
  },
  {
    key: 'tribe', table: 'tribe_looks', select: 'id,name,piece_name,status,created_at',
    accept: r => r.status === 'pending',
    title: () => 'New Tribe photo waiting',
    body: r => `${r.name || 'A customer'} shared a photo of ${r.piece_name || 'a piece'} for approval`,
    href: '/admin/tribe-looks',
  },
]

/**
 * Pops up a notification inside the admin panel whenever a new order,
 * enquiry, custom order, review or Tribe photo arrives. Anything that already
 * existed when the panel opened is not announced.
 */
export function useAdminAlerts(enabled: boolean) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!enabled) return
    const seen = new Map<string, Set<string>>()
    let stopped = false
    let busy = false

    const poll = async () => {
      if (busy || stopped) return
      busy = true
      try {
        for (const src of SOURCES) {
          const { data, error } = await supabase
            .from(src.table)
            .select(src.select)
            .order('created_at', { ascending: false })
            .limit(20)
          if (error || !Array.isArray(data) || stopped) continue
          const rows = data as any[]
          const known = seen.get(src.key)
          if (!known) {
            seen.set(src.key, new Set(rows.map(r => String(r.id))))
            continue
          }
          const fresh = rows.filter(r => !known.has(String(r.id)))
          fresh.forEach(r => known.add(String(r.id)))
          const announce = fresh.filter(r => (src.accept ? src.accept(r) : true)).slice(0, 3)
          for (const row of announce) {
            const title = src.title(row)
            const body = src.body(row)
            playChime()
            toast(title, {
              description: body,
              duration: 12000,
              action: { label: 'View', onClick: () => navigate(src.href) },
            })
            showDesktopAlert(title, body, () => navigate(src.href))
          }
        }
      } finally {
        busy = false
      }
    }

    void poll()
    const timer = window.setInterval(poll, POLL_MS)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [enabled, navigate])
}
