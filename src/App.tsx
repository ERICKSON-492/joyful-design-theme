import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { WhatsAppButton } from './components/WhatsAppButton'
import HomePage from './pages/HomePage'
import TheChronicle from './pages/TheChronicle'
import ShopPage from './pages/ShopPage'
import CustomOrderPage from './pages/CustomOrderPage'
import TribeLooksPage from './pages/TribeLooksPage'
import WholesalePage from './pages/WholesalePage'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about-us" element={<TheChronicle />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/custom-order" element={<CustomOrderPage />} />
            <Route path="/tribe-looks" element={<TribeLooksPage />} />
            <Route path="/wholesale-gifting" element={<WholesalePage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        <WhatsAppButton />
      </div>
    </BrowserRouter>
  )
}
