import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { PageTransition } from './PageTransition'
import HomePage from '../pages/HomePage'
import TheChronicle from '../pages/TheChronicle'
import ShopPage from '../pages/ShopPage'
import CustomOrderPage from '../pages/CustomOrderPage'
import TribeLooksPage from '../pages/TribeLooksPage'
import WholesalePage from '../pages/WholesalePage'
import AdminLogin from '../pages/AdminLogin'
import AdminLayout from '../components/AdminLayout'
import AdminDashboard from '../pages/AdminDashboard'
import AdminProducts from '../pages/AdminProducts'
import AdminEnquiries from '../pages/AdminEnquiries'
import AdminHeroSlides from '../pages/AdminHeroSlides'
import AdminOrders from '../pages/AdminOrders'
import CheckoutPage from '../pages/CheckoutPage'
import NotFound from '../pages/NotFound'
import AuthPage from '../pages/AuthPage'
import MyOrdersPage from '../pages/MyOrdersPage'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import UnsubscribePage from '../pages/UnsubscribePage'

export function AnimatedRoutes() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  if (isAdmin) {
    return (
      <Routes location={location}>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="hero" element={<AdminHeroSlides />} />
          <Route path="enquiries" element={<AdminEnquiries />} />
          <Route path="orders" element={<AdminOrders />} />
        </Route>
      </Routes>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/about-us" element={<PageTransition><TheChronicle /></PageTransition>} />
        <Route path="/shop" element={<PageTransition><ShopPage /></PageTransition>} />
        <Route path="/custom-order" element={<PageTransition><CustomOrderPage /></PageTransition>} />
        <Route path="/tribe-looks" element={<PageTransition><TribeLooksPage /></PageTransition>} />
        <Route path="/wholesale-gifting" element={<PageTransition><WholesalePage /></PageTransition>} />
        <Route path="/checkout" element={<PageTransition><CheckoutPage /></PageTransition>} />
        <Route path="/auth" element={<PageTransition><AuthPage /></PageTransition>} />
        <Route path="/my-orders" element={<PageTransition><MyOrdersPage /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPasswordPage /></PageTransition>} />
        <Route path="/unsubscribe" element={<PageTransition><UnsubscribePage /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  )
}
