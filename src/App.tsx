import { BrowserRouter, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { ChatWidget } from './components/ChatWidget'
import { AnimatedRoutes } from './components/AnimatedRoutes'
import { CartProvider } from './contexts/CartContext'
import { CartDrawer } from './components/CartDrawer'
import { InstallAppPrompt } from './components/InstallAppPrompt'
import { BackButton } from './components/BackButton'

function AppContent() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {!isAdmin && <Navbar />}
      <main className="flex-1">
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
      <CartProvider>
        <AppContent />
      </CartProvider>
    </BrowserRouter>
  )
}
