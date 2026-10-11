import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { enablePushNotifications, listenForForegroundPush, pushNotificationsConfigured } from '@/lib/pushNotifications'
import { toast } from 'sonner'

export function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!pushNotificationsConfigured() || !('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission === 'denied' || localStorage.getItem('ushanga_push_dismissed') === 'true' || localStorage.getItem('ushanga_push_enabled') === 'true') return
    setVisible(true)
    let cleanup = () => {}
    listenForForegroundPush(payload => {
      if (payload.title) toast(payload.title, { description: payload.body, action: payload.url ? { label: 'View', onClick: () => { window.location.href = payload.url! } } : undefined })
    }).then(unsubscribe => { cleanup = unsubscribe })
    return () => cleanup()
  }, [])

  if (!visible) return null

  const enable = async () => {
    setBusy(true)
    try {
      await enablePushNotifications()
      setVisible(false)
      toast.success('Product alerts enabled')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not enable product alerts')
    } finally {
      setBusy(false)
    }
  }

  const dismiss = () => {
    localStorage.setItem('ushanga_push_dismissed', 'true')
    setVisible(false)
  }

  return (
    <aside className="fixed bottom-6 left-4 z-[65] w-[calc(100%-2rem)] max-w-sm rounded-xl border border-primary/30 bg-background p-4 shadow-xl" role="dialog" aria-label="Product alerts">
      <button onClick={dismiss} className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label="Dismiss product alerts"><X className="h-4 w-4" /></button>
      <div className="flex gap-3 pr-5">
        <Bell className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="font-semibold">Get instant new-product alerts</h2>
          <p className="mt-1 text-sm text-muted-foreground">Be the first to know when a new handcrafted piece is published. You can turn this off in your browser settings.</p>
          <Button onClick={enable} disabled={busy} className="mt-3">{busy ? 'Enabling…' : 'Enable alerts'}</Button>
        </div>
      </div>
    </aside>
  )
}
