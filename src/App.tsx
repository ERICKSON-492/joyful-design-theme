import { useEffect } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { TopBar } from './components/TopBar'
import { Footer } from './components/Footer'
import { ChatWidget } from './components/ChatWidget'
import { AnimatedRoutes } from './components/AnimatedRoutes'
import { CartProvider } from './contexts/CartContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { CartDrawer } from './components/CartDrawer'
import { InstallAppPrompt } from './components/InstallAppPrompt'
import { BackButton } from './components/BackButton'
import { CartReminder } from './components/CartReminder'
import { useProfileSync } from './hooks/useProfileSync'
import { CookieConsent } from './components/CookieConsent'
import { Toaster } from 'sonner'
import { CustomerAlerts } from './components/CustomerAlerts'
import { NewArrivalNotice } from './components/NewArrivalNotice'
import { SaleNotice } from './components/SaleNotice'
import { PushNotificationPrompt } from './components/PushNotificationPrompt'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function AppContent() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  useProfileSync()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col isolation-isolate">
      <ScrollToTop />
      {!isAdmin && <TopBar />}
      {!isAdmin && <Navbar />}
      <main className="flex-1 flex flex-col min-h-[75vh] w-full relative"><AnimatedRoutes /></main>
      {!isAdmin && <Footer />}
      {!isAdmin && <ChatWidget />}
      {!isAdmin && <CartDrawer />}
      {!isAdmin && <InstallAppPrompt />}
      {!isAdmin && <BackButton />}
      {!isAdmin && <CartReminder />}
      {!isAdmin && <CustomerAlerts />}
      {!isAdmin && <NewArrivalNotice />}
      {!isAdmin && <SaleNotice />}
      {!isAdmin && <PushNotificationPrompt />}
      <CookieConsent />
      <Toaster position="top-center" richColors closeButton />
    </div>
  )
}

export default function App() {
  return <BrowserRouter><CurrencyProvider><CartProvider><AppContent /></CartProvider></CurrencyProvider></BrowserRouter>
}
