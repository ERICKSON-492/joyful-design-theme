import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { PageTransition } from './PageTransition'
import HomePage from '../pages/HomePage'
import TheChronicle from '../pages/TheChronicle'
import ShopPage from '../pages/ShopPage'
import CustomOrderPage from '../pages/CustomOrderPage'
import TribeLooksPage from '../pages/TribeLooksPage'
import WholesalePage from '../pages/WholesalePage'
import NotFound from '../pages/NotFound'

export function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/about-us" element={<PageTransition><TheChronicle /></PageTransition>} />
        <Route path="/shop" element={<PageTransition><ShopPage /></PageTransition>} />
        <Route path="/custom-order" element={<PageTransition><CustomOrderPage /></PageTransition>} />
        <Route path="/tribe-looks" element={<PageTransition><TribeLooksPage /></PageTransition>} />
        <Route path="/wholesale-gifting" element={<PageTransition><WholesalePage /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  )
}
