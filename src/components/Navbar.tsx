import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, Search, ShoppingBag, Shield, Facebook, Instagram, Youtube, MessageCircle, User, LogOut, Package } from 'lucide-react'
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
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchOpen(false)
    }
  }

  return (
    <header className="w-full z-50">
      {/* Top Bar — announcement + social icons */}
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

            {/* Desktop Nav Links — centered */}
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
              {/* Search — inline on desktop */}
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

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden fixed inset-0 top-[106px] bg-background z-50 flex flex-col"
          >
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                >
                  <Link
                    to={link.href}
                    onClick={() => setIsOpen(false)}
                    className={`text-2xl font-display font-semibold transition-colors ${
                      location.pathname === link.href ? 'text-primary' : 'text-foreground'
                    }`}
                    style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              {/* Mobile auth links */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: navLinks.length * 0.06 }}>
                {user ? (
                  <div className="flex flex-col items-center gap-4">
                    <Link to="/my-orders" onClick={() => setIsOpen(false)} className="text-2xl font-display font-semibold text-foreground" style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                      My Orders
                    </Link>
                    <button
                      onClick={async () => { await supabase.auth.signOut(); setUser(null); setIsOpen(false) }}
                      className="text-lg text-muted-foreground"
                      style={{ minHeight: '44px' }}
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <Link to="/auth" onClick={() => setIsOpen(false)} className="text-2xl font-display font-semibold text-primary" style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                    Sign In
                  </Link>
                )}
              </motion.div>
            </div>
            <div className="p-8 text-center">
              <a
                href="https://wa.me/254748207000"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-primary text-primary-foreground px-8 py-4 font-semibold text-sm w-full"
                style={{ minHeight: '44px' }}
              >
                Start a Conversation
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
