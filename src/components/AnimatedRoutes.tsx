import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { PageTransition } from './PageTransition'
import AdminLayout from '../components/AdminLayout'

const HomePage = lazy(() => import('../pages/HomePage'))
const TheChronicle = lazy(() => import('../pages/TheChronicle'))
const ShopPage = lazy(() => import('../pages/ShopPage'))
const CustomOrderPage = lazy(() => import('../pages/CustomOrderPage'))
const TribeLooksPage = lazy(() => import('../pages/TribeLooksPage'))
const WholesalePage = lazy(() => import('../pages/WholesalePage'))
const AdminLogin = lazy(() => import('../pages/AdminLogin'))
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'))
const AdminProducts = lazy(() => import('../pages/AdminProducts'))
const AdminEnquiries = lazy(() => import('../pages/AdminEnquiries'))
const AdminHeroSlides = lazy(() => import('../pages/AdminHeroSlides'))
const AdminOrders = lazy(() => import('../pages/AdminOrders'))
const AdminCategories = lazy(() => import('../pages/AdminCategories'))
const AdminContent = lazy(() => import('../pages/AdminContent'))
const CheckoutPage = lazy(() => import('../pages/CheckoutPage'))
const NotFound = lazy(() => import('../pages/NotFound'))
const AuthPage = lazy(() => import('../pages/AuthPage'))
const MyOrdersPage = lazy(() => import('../pages/MyOrdersPage'))
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'))
const UnsubscribePage = lazy(() => import('../pages/UnsubscribePage'))

function RouteLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-background text-muted-foreground">
      Loading...
    </div>
  )
}

export function AnimatedRoutes() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  if (isAdmin) {
    return (
      <Suspense fallback={<RouteLoader />}>
        <Routes location={location}>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="hero" element={<AdminHeroSlides />} />
            <Route path="enquiries" element={<AdminEnquiries />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="categories" element={<AdminCategories />} />
          </Route>
        </Routes>
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<RouteLoader />}>
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
    </Suspense>
  )
}
