import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useCart } from '@/contexts/CartContext'

const LAST_ACTIVITY_KEY = 'ushanga-cart-activity'
const LAST_REMINDER_KEY = 'ushanga-cart-reminder'

// Remind after 30 minutes of inactivity, and at most once every 6 hours.
const IDLE_MS = 30 * 60 * 1000
const REMINDER_COOLDOWN_MS = 6 * 60 * 60 * 1000
const CHECK_INTERVAL_MS = 60 * 1000

/**
 * Gentle abandoned-cart nudge: if items have been sitting in the cart for a
 * while, remind the shopper and offer a one-tap way back to checkout.
 */
export function CartReminder() {
  const { items, totalItems, setIsOpen } = useCart()
  const signature = items.map(i => `${i.id}x${i.quantity}`).join('|')
  const shownRef = useRef(false)

  // Track the last time the cart changed.
  useEffect(() => {
    if (totalItems === 0) {
      localStorage.removeItem(LAST_ACTIVITY_KEY)
      localStorage.removeItem(LAST_REMINDER_KEY)
      shownRef.current = false
      return
    }
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
    shownRef.current = false
  }, [signature, totalItems])

  useEffect(() => {
    if (totalItems === 0) return

    const maybeRemind = () => {
      if (shownRef.current) return
      const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0)
      const lastReminder = Number(localStorage.getItem(LAST_REMINDER_KEY) || 0)
      const now = Date.now()
      if (!last) return
      if (now - last < IDLE_MS) return
      if (now - lastReminder < REMINDER_COOLDOWN_MS) return

      shownRef.current = true
      localStorage.setItem(LAST_REMINDER_KEY, String(now))
      toast(
        totalItems === 1
          ? 'You left 1 piece in your cart'
          : `You left ${totalItems} pieces in your cart`,
        {
          description: 'Handcrafted pieces are one-of-a-kind. Complete your order before they go.',
          duration: 12000,
          action: {
            label: 'View cart',
            onClick: () => setIsOpen(true),
          },
        }
      )
    }

    // Check on mount (covers a return visit) and then periodically.
    const initial = window.setTimeout(maybeRemind, 4000)
    const interval = window.setInterval(maybeRemind, CHECK_INTERVAL_MS)
    return () => { window.clearTimeout(initial); window.clearInterval(interval) }
  }, [totalItems, setIsOpen])

  return null
}
