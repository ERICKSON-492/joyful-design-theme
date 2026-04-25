import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * Floating back arrow shown on all non-home, non-admin pages.
 * Uses browser history when available, otherwise falls back to home.
 */
export function BackButton() {
  const location = useLocation()
  const navigate = useNavigate()

  // Hide on home page and admin routes
  if (location.pathname === '/' || location.pathname.startsWith('/admin')) {
    return null
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/')
    }
  }

  return (
    <button
      onClick={handleBack}
      aria-label="Go back"
      className="fixed top-24 left-4 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-background/90 backdrop-blur px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-foreground shadow-md hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors md:top-28 md:left-6"
      style={{ minHeight: '40px' }}
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="hidden sm:inline">Back</span>
    </button>
  )
}
