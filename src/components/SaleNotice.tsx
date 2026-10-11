import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/dbClient'
import { freshSales, saleNoticeKey, type SaleNoticeProduct } from '@/lib/shopNotifications'
import { getActiveSalePrice } from '@/lib/salePrice'
import { productPath } from '@/lib/slug'
import { playChime, showDesktopAlert } from '@/lib/notify'

const SEEN_KEY = 'ushanga-sales-seen'

export function SaleNotice() {
  const navigate = useNavigate()
  useEffect(() => {
    let stopped = false
    let busy = false
    let seen: string[] = []
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')
      if (Array.isArray(saved)) seen = saved.filter((key): key is string => typeof key === 'string')
    } catch { /* Storage may be unavailable. */ }
    const check = async () => {
      if (busy || stopped) return
      busy = true
      try {
        const { data, error } = await supabase.from('products')
          .select('id,name,price,sale_price,sale_starts_at,sale_ends_at,is_active')
          .eq('is_active', true)
        if (error || stopped || !Array.isArray(data)) return
        const sales = freshSales(data as SaleNoticeProduct[], seen)
        const first = sales[0]
        if (!first) return
        seen = [...seen, ...sales.map(saleNoticeKey)]
        try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)) } catch { /* Keep in-memory marker. */ }
        const title = sales.length === 1 ? 'New sale now live' : `${sales.length} new sales now live`
        const description = sales.length === 1
          ? `${first.name}: KSh ${getActiveSalePrice(first)?.toLocaleString('en-KE')} (was KSh ${Number(first.price).toLocaleString('en-KE')})`
          : `${first.name} and more at special prices`
        const openSale = () => navigate(sales.length === 1 ? productPath(first) : '/shop')
        playChime()
        toast(title, { description, duration: 12000, action: { label: 'Shop now', onClick: openSale } })
        showDesktopAlert(title, description, openSale)
      } catch { /* Retry on the next check after a network failure. */ }
      finally { busy = false }
    }
    const initial = window.setTimeout(() => { void check() }, 4000)
    const timer = window.setInterval(() => { void check() }, 15000)
    const onFocus = () => { void check() }
    window.addEventListener('focus', onFocus)
    return () => {
      stopped = true
      window.clearTimeout(initial)
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [navigate])
  return null
}