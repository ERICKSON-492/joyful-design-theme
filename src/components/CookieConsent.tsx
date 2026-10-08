import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cookie } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { COOKIE_CONSENT_EVENT, getCookieConsent, setCookieConsent, type CookieConsent as Choice } from '@/lib/cookieConsent'
import { enableAnalytics } from '@/lib/analytics'

export function CookieConsent() {
  const [choice, setChoice] = useState(getCookieConsent)

  useEffect(() => {
    if (getCookieConsent() === 'accepted') enableAnalytics()
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<Choice | null>).detail
      setChoice(next)
      if (next === 'accepted') enableAnalytics()
    }
    window.addEventListener(COOKIE_CONSENT_EVENT, onChange)
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onChange)
  }, [])

  if (choice !== null) return null

  return (
    <section role="region" aria-labelledby="cookie-title" aria-describedby="cookie-description" className="fixed bottom-24 left-4 right-4 z-[70] max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-lg border border-border bg-background p-5 shadow-lg sm:bottom-6 sm:left-6 sm:right-auto sm:w-[420px]">
      <div className="flex items-center gap-3 mb-3">
        <Cookie className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <h2 id="cookie-title" className="font-display text-xl font-bold">Your cookie choice</h2>
      </div>
      <p id="cookie-description" className="text-base leading-relaxed text-muted-foreground">
        Essential cookies keep sign-in and shopping working. With your permission, we also use cookies for analytics and advertising.
      </p>
      <Link to="/privacy-policy" className="inline-flex min-h-11 items-center text-base text-primary underline underline-offset-4">Privacy policy</Link>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <Button variant="outline" className="min-h-11 text-base" onClick={() => setCookieConsent('declined')}>Decline</Button>
        <Button className="min-h-11 text-base" onClick={() => setCookieConsent('accepted')}>Accept</Button>
      </div>
    </section>
  )
}