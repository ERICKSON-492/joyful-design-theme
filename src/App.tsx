import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { TopBar } from './components/TopBar'
import { Footer } from './components/Footer'
import { AnimatedRoutes } from './components/AnimatedRoutes'
import { CartProvider } from './contexts/CartContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { Toaster } from 'sonner'
import { supabase } from './integrations/supabase/client'

const ChatWidget = lazy(() => import('./components/ChatWidget').then(m => ({ default: m.ChatWidget })))
const CartDrawer = lazy(() => import('./components/CartDrawer').then(m => ({ default: m.CartDrawer })))
const InstallAppPrompt = lazy(() => import('./components/InstallAppPrompt').then(m => ({ default: m.InstallAppPrompt })))
const BackButton = lazy(() => import('./components/BackButton').then(m => ({ default: m.BackButton })))
const CartReminder = lazy(() => import('./components/CartReminder').then(m => ({ default: m.CartReminder })))
const CookieConsent = lazy(() => import('./components/CookieConsent').then(m => ({ default: m.CookieConsent })))
const CustomerAlerts = lazy(() => import('./components/CustomerAlerts').then(m => ({ default: m.CustomerAlerts })))
const NewArrivalNotice = lazy(() => import('./components/NewArrivalNotice').then(m => ({ default: m.NewArrivalNotice })))
const SaleNotice = lazy(() => import('./components/SaleNotice').then(m => ({ default: m.SaleNotice })))
const PushNotificationPrompt = lazy(() => import('./components/PushNotificationPrompt').then(m => ({ default: m.PushNotificationPrompt })))

function DeferredPublicFeatures() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 1500)
    return () => window.clearTimeout(timer)
  }, [])

  if (!ready) return null
  return (
    <Suspense fallback={null}>
      <ChatWidget />
      <CartDrawer />
      <InstallAppPrompt />
      <BackButton />
      <CartReminder />
      <CustomerAlerts />
      <NewArrivalNotice />
      <SaleNotice />
      <PushNotificationPrompt />
      <CookieConsent />
    </Suspense>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const isAdmin = location.pathname.startsWith('/admin')
  const isBooks = location.pathname.startsWith('/books')

  useEffect(() => {
    let pending: string | null = null
    try { pending = sessionStorage.getItem('ushanga-auth-return-to') } catch {}
    if (!pending) return

    let target: URL
    try {
      if (!pending.startsWith('/') || pending.startsWith('//') || pending.includes('\\')) throw new Error('invalid return path')
      target = new URL(pending, window.location.origin)
      if (target.origin !== window.location.origin || target.pathname === '/auth') throw new Error('invalid return path')
    } catch {
      try { sessionStorage.removeItem('ushanga-auth-return-to') } catch {}
      return
    }

    let cancelled = false
    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (cancelled || !data.session) return
      const targetPath = `${target.pathname}${target.search}${target.hash}`
      const currentPath = `${location.pathname}${location.search}${location.hash}`
      try { sessionStorage.removeItem('ushanga-auth-return-to') } catch {}
      if (currentPath !== targetPath) navigate(targetPath, { replace: true })
    })()

    return () => { cancelled = true }
  }, [location.hash, location.pathname, location.search, navigate])

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col isolation-isolate">
      <ScrollToTop />
      {!isAdmin && !isBooks && <TopBar />}
      {!isAdmin && !isBooks && <Navbar />}
      <main className="flex-1 flex flex-col min-h-[75vh] w-full relative"><AnimatedRoutes /></main>
      {!isAdmin && !isBooks && <Footer />}
      {!isAdmin && !isBooks && <DeferredPublicFeatures />}
      <Toaster position="top-center" richColors closeButton />
    </div>
  )
}

export default function App() {
  return <BrowserRouter><CurrencyProvider><CartProvider><AppContent /></CartProvider></CurrencyProvider></BrowserRouter>
}
