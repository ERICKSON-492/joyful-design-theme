import { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Don't show in iframes (Lovable preview)
    try {
      if (window.self !== window.top) return
    } catch { return }

    // Check if already dismissed recently
    const dismissed = localStorage.getItem('app-install-dismissed')
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // iOS detection
    const ua = navigator.userAgent
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    setIsIOS(isiOS)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Show iOS prompt after 5 seconds
    if (isiOS) {
      const timer = setTimeout(() => setShowBanner(true), 5000)
      return () => { clearTimeout(timer); window.removeEventListener('beforeinstallprompt', handler) }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setShowBanner(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('app-install-dismissed', String(Date.now()))
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-24 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-card border border-border rounded-2xl shadow-xl p-5 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-bold text-foreground text-sm mb-1">
              Get the Ushanga App
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              {isIOS
                ? 'Tap the share button, then "Add to Home Screen" for the best experience.'
                : 'Install our app for quick access, offline browsing & a native feel.'}
            </p>
            {!isIOS && (
              <Button size="sm" onClick={handleInstall} className="gap-2 text-xs">
                <Download className="w-3.5 h-3.5" /> Install App
              </Button>
            )}
            {isIOS && (
              <p className="text-xs font-medium text-primary">
                Tap <span className="inline-block align-middle">⎋</span> → "Add to Home Screen"
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
