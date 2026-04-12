import { BrowserRouter, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { WhatsAppButton } from './components/WhatsAppButton'
import { AnimatedRoutes } from './components/AnimatedRoutes'
import { CartProvider } from './contexts/CartContext'
import { CartDrawer } from './components/CartDrawer'
import { InstallAppPrompt } from './components/InstallAppPrompt'

function AppContent() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!isAdmin && <Navbar />}
      <main>
        <AnimatedRoutes />
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <WhatsAppButton />}
      {!isAdmin && <CartDrawer />}
      {!isAdmin && <InstallAppPrompt />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </BrowserRouter>
  )
}
