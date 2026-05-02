import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Module-level cache so the event (which only fires once) is preserved
// even if this component mounts after it fired.
let cachedPrompt: BeforeInstallPromptEvent | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    cachedPrompt = e as BeforeInstallPromptEvent
    window.dispatchEvent(new Event('pwa-installable'))
  })
  window.addEventListener('appinstalled', () => {
    cachedPrompt = null
    window.dispatchEvent(new Event('pwa-installed'))
  })
}

export function InstallAppButton({ className = '' }: { className?: string }) {
  const [canInstall, setCanInstall] = useState<boolean>(!!cachedPrompt)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const ua = navigator.userAgent
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream)
    if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true)

    const onAvail = () => setCanInstall(true)
    const onInstalled = () => { setIsInstalled(true); setCanInstall(false) }
    window.addEventListener('pwa-installable', onAvail)
    window.addEventListener('pwa-installed', onInstalled)
    return () => {
      window.removeEventListener('pwa-installable', onAvail)
      window.removeEventListener('pwa-installed', onInstalled)
    }
  }, [])

  if (isInstalled) return null

  const handleClick = async () => {
    if (cachedPrompt) {
      try {
        await cachedPrompt.prompt()
        const { outcome } = await cachedPrompt.userChoice
        if (outcome === 'accepted') {
          toast.success('App installed!')
          cachedPrompt = null
          setCanInstall(false)
        }
      } catch {
        toast.error('Could not open install prompt')
      }
      return
    }
    if (isIOS) {
      toast('On iOS: tap Share → "Add to Home Screen"', { duration: 6000 })
      return
    }
    toast('Open this site in your browser (not embedded) to install. In Chrome, use the menu → "Install app".', {
      duration: 7000,
    })
  }

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium ${className}`}
      aria-label="Install Ushanga app"
    >
      <Download className="w-4 h-4" />
      Install App
    </button>
  )
}
