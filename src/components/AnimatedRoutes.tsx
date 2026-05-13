import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { PageTransition } from './PageTransition'
import AdminLayout from '../components/AdminLayout'

const HomePage = lazy(() => import('../pages/HomePage'))
const TheChronicle = lazy(() => import('../pages/TheChronicle'))
const ShopPage = lazy(() => import('../pages/ShopPage'))
const SearchPage = lazy(() => import('../pages/SearchPage'))
const ProductDetailPage = lazy(() => import('../pages/ProductDetailPage'))
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
const AdminTribeLooks = lazy(() => import('../pages/AdminTribeLooks'))
const AdminShipping = lazy(() => import('../pages/AdminShipping'))
const AdminPayments = lazy(() => import('../pages/AdminPayments'))
const AdminReviews = lazy(() => import('../pages/AdminReviews'))
const AdminInventory = lazy(() => import('../pages/AdminInventory'))
const CheckoutPage = lazy(() => import('../pages/CheckoutPage'))
const NotFound = lazy(() => import('../pages/NotFound'))
const AuthPage = lazy(() => import('../pages/AuthPage'))
const MyOrdersPage = lazy(() => import('../pages/MyOrdersPage'))
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'))
const UnsubscribePage = lazy(() => import('../pages/UnsubscribePage'))
const FAQPage = lazy(() => import('../pages/FAQPage'))

function RouteLoader() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-background text-muted-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm tracking-wide">Loading...</span>
      </div>
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
            <Route path="content" element={<AdminContent />} />
            <Route path="tribe-looks" element={<AdminTribeLooks />} />
            <Route path="shipping" element={<AdminShipping />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="inventory" element={<AdminInventory />} />
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
          <Route path="/search" element={<PageTransition><SearchPage /></PageTransition>} />
          <Route path="/product/:id" element={<PageTransition><ProductDetailPage /></PageTransition>} />
          <Route path="/custom-order" element={<PageTransition><CustomOrderPage /></PageTransition>} />
          <Route path="/tribe-looks" element={<PageTransition><TribeLooksPage /></PageTransition>} />
          <Route path="/wholesale-gifting" element={<PageTransition><WholesalePage /></PageTransition>} />
          <Route path="/checkout" element={<PageTransition><CheckoutPage /></PageTransition>} />
          <Route path="/auth" element={<PageTransition><AuthPage /></PageTransition>} />
          <Route path="/my-orders" element={<PageTransition><MyOrdersPage /></PageTransition>} />
          <Route path="/reset-password" element={<PageTransition><ResetPasswordPage /></PageTransition>} />
          <Route path="/unsubscribe" element={<PageTransition><UnsubscribePage /></PageTransition>} />
          <Route path="/faq" element={<PageTransition><FAQPage /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  )
}
