import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Search, ShoppingBag, Shield, Facebook, Instagram, Youtube, MessageCircle, User, LogOut, Package, Home, BookOpen, Store, Palette, Users, Truck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCart } from '@/contexts/CartContext'
import { supabase } from '@/integrations/supabase/client'

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'The Chronicle', href: '/about-us' },
  { label: 'Shop', href: '/shop' },
  { label: 'Create Yours', href: '/custom-order' },
  { label: 'Tribe Looks', href: '/tribe-looks' },
  { label: 'Wholesale', href: '/wholesale-gifting' },
]

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState<any>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { totalItems, setIsOpen: setCartOpen } = useCart()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data } = await supabase.from('admin_users').select('id').eq('user_id', session.user.id).maybeSingle()
        setIsAdmin(!!data)
      } else {
        setIsAdmin(false)
      }
    }
    checkAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => checkAuth())
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setIsOpen(false)
    setSearchOpen(false)
  }, [location.pathname])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
    }
  }

  return (
    <header className="w-full z-50">
      {/* Top Bar - announcement + social icons */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 flex items-center justify-between h-10">
          <div className="hidden md:flex items-center gap-3">
            <a href="https://www.instagram.com/ushanga_chronicles/" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity" aria-label="Instagram">
              <Instagram className="w-3.5 h-3.5" />
            </a>
            <a href="https://www.facebook.com/ushangachronicles" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity" aria-label="Facebook">
              <Facebook className="w-3.5 h-3.5" />
            </a>
            <a href="https://www.youtube.com/@ushangachronicles" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity" aria-label="YouTube">
              <Youtube className="w-3.5 h-3.5" />
            </a>
            <a href="https://wa.me/254748207000" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity" aria-label="WhatsApp">
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          </div>
          <p className="flex-1 text-center text-xs md:text-sm font-medium tracking-wide">
            One bead. A thousand stories. | Handcrafted in Nairobi, Kenya
          </p>
          <div className="hidden md:block">
            <a href="tel:+254748207000" className="text-xs hover:opacity-70 transition-opacity">
              +254 748 207 000
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav className="bg-background border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-[70px]">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <img src="/logo.jpeg" alt="Ushanga Chronicles" className="h-12 md:h-14 w-auto" />
            </Link>

            {/* Desktop Nav Links - centered */}
            <div className="hidden lg:flex items-center gap-7 mx-6">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`text-sm font-medium transition-colors hover:text-primary relative py-1 whitespace-nowrap ${
                    location.pathname === link.href ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {link.label}
                  {location.pathname === link.href && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-primary"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* Right side: search + admin + cart + mobile menu */}
            <div className="flex items-center gap-0.5">
              {/* Search - inline on desktop */}
              <div className="hidden lg:block relative mr-2">
                <form onSubmit={handleSearch} className="flex items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search products"
                    className="w-44 h-9 pl-3 pr-9 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all focus:w-56"
                  />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Search">
                    <Search className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Mobile search toggle */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="lg:hidden p-2.5 hover:bg-accent rounded-full transition-colors"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Admin */}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="p-2.5 hover:bg-accent rounded-full transition-colors text-primary"
                  aria-label="Admin Panel"
                  title="Admin Panel"
                >
                  <Shield className="w-5 h-5" />
                </Link>
              )}

              {/* User Account */}
              {user ? (
                <div className="hidden lg:flex items-center gap-1">
                  <Link to="/my-orders" className="p-2.5 hover:bg-accent rounded-full transition-colors" aria-label="My Orders" title="My Orders">
                    <Package className="w-5 h-5" />
                  </Link>
                  <button
                    onClick={async () => { await supabase.auth.signOut(); setUser(null); setIsAdmin(false) }}
                    className="p-2.5 hover:bg-accent rounded-full transition-colors text-muted-foreground"
                    aria-label="Sign Out"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="hidden lg:flex p-2.5 hover:bg-accent rounded-full transition-colors"
                  aria-label="Sign In"
                  title="Sign In"
                >
                  <User className="w-5 h-5" />
                </Link>
              )}

              {/* Cart */}
              <button
                onClick={() => setCartOpen(true)}
                className="p-2.5 hover:bg-accent rounded-full transition-colors relative"
                aria-label="Cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </button>

              {/* Mobile hamburger */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden p-2.5 hover:bg-accent rounded-full transition-colors"
                aria-label="Menu"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Search Bar */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden lg:hidden"
              >
                <form onSubmit={handleSearch} className="pb-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search products..."
                      className="flex-1 h-10 px-4 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="h-10 px-6 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Search
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Mobile Sidebar Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 bg-black/40 z-50"
              onClick={() => setIsOpen(false)}
            />
            {/* Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 w-[280px] bg-background z-50 flex flex-col shadow-2xl"
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <Link to="/" onClick={() => setIsOpen(false)} className="flex-shrink-0">
                  <img src="/logo.jpeg" alt="Ushanga Chronicles" className="h-10 w-auto" />
                </Link>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-accent rounded-full transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav Links */}
              <nav className="flex-1 overflow-y-auto py-4">
                {[
                  { ...navLinks[0], icon: Home },
                  { ...navLinks[1], icon: BookOpen },
                  { ...navLinks[2], icon: Store },
                  { ...navLinks[3], icon: Palette },
                  { ...navLinks[4], icon: Users },
                  { ...navLinks[5], icon: Truck },
                ].map((link) => {
                  const Icon = link.icon
                  return (
                    <Link
                      key={link.label}
                      to={link.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-5 py-3.5 text-base font-medium transition-colors ${
                        location.pathname === link.href
                          ? 'text-primary bg-primary/10 border-r-2 border-primary'
                          : 'text-foreground hover:bg-accent'
                      }`}
                      style={{ minHeight: '44px' }}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {link.label}
                    </Link>
                  )
                })}

                <div className="my-3 mx-5 border-t border-border" />

                {/* Auth links */}
                {user ? (
                  <>
                    <Link
                      to="/my-orders"
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-5 py-3.5 text-base font-medium transition-colors ${
                        location.pathname === '/my-orders' ? 'text-primary bg-primary/10 border-r-2 border-primary' : 'text-foreground hover:bg-accent'
                      }`}
                      style={{ minHeight: '44px' }}
                    >
                      <Package className="w-5 h-5 flex-shrink-0" />
                      My Orders
                    </Link>
                    <button
                      onClick={async () => { await supabase.auth.signOut(); setUser(null); setIsOpen(false) }}
                      className="flex items-center gap-3 px-5 py-3.5 text-base font-medium text-muted-foreground hover:bg-accent w-full text-left transition-colors"
                      style={{ minHeight: '44px' }}
                    >
                      <LogOut className="w-5 h-5 flex-shrink-0" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-5 py-3.5 text-base font-medium text-primary hover:bg-accent transition-colors"
                    style={{ minHeight: '44px' }}
                  >
                    <User className="w-5 h-5 flex-shrink-0" />
                    Sign In
                  </Link>
                )}
              </nav>

              {/* Bottom CTA */}
              <div className="p-4 border-t border-border">
                <a
                  href="https://wa.me/254748207000"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-3 font-semibold text-sm w-full rounded-md"
                  style={{ minHeight: '44px' }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Start a Conversation
                </a>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <a href="https://www.instagram.com/ushanga_chronicles/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Instagram">
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a href="https://www.facebook.com/ushangachronicles" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Facebook">
                    <Facebook className="w-5 h-5" />
                  </a>
                  <a href="https://www.youtube.com/@ushangachronicles" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="YouTube">
                    <Youtube className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  )
}
