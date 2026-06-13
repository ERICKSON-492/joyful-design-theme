import { useEffect } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { ChatWidget } from './components/ChatWidget'
import { AnimatedRoutes } from './components/AnimatedRoutes'
import { CartProvider } from './contexts/CartContext'
import { CurrencyProvider } from './contexts/CurrencyContext'
import { CartDrawer } from './components/CartDrawer'
import { InstallAppPrompt } from './components/InstallAppPrompt'
import { BackButton } from './components/BackButton'

// ⚡ 1. Inline Scroll Restoration Helper
// This resets the scroll tracking instantly when navigating between pages.
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

function AppContent() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col isolation-isolate">
      {/* Scroll to top handles window positioning before transitions complete */}
      <ScrollToTop />

      {!isAdmin && <Navbar />}
      
      {/* ⚡ 2. FIX: Added dynamic layout safety to the main wrapper */}
      {/* h-full and min-h-[70vh] guarantees that even if AnimatePresence completely empties 
          the routes wrapper during a transition, the footer stays anchored below the fold. */}
      <main className="flex-1 flex flex-col min-h-[75vh] w-full relative">
        <AnimatedRoutes />
      </main>

      {!isAdmin && <Footer />}
      {!isAdmin && <ChatWidget />}
      {!isAdmin && <CartDrawer />}
      {!isAdmin && <InstallAppPrompt />}
      {!isAdmin && <BackButton />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <CurrencyProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </CurrencyProvider>
    </BrowserRouter>
  )
}
