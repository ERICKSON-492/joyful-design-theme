import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Search, ShoppingBag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/95 backdrop-blur-md shadow-sm border-b border-border'
          : 'bg-background border-b border-border'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="font-display text-xl md:text-2xl font-bold text-foreground tracking-wide">
            USHANGA <span className="font-light">CHRONICLES</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary relative py-1 ${
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

          {/* Right Actions */}
          <div className="flex items-center gap-1">
            <button className="p-2.5 hover:bg-accent rounded-full transition-colors" aria-label="Search">
              <Search className="w-5 h-5" />
            </button>
            <Link to="/shop" className="p-2.5 hover:bg-accent rounded-full transition-colors relative" aria-label="Cart">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute top-0.5 right-0.5 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">0</span>
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2.5 hover:bg-accent rounded-full transition-colors"
              aria-label="Menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Full-screen Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="lg:hidden fixed inset-0 top-16 bg-background z-50 flex flex-col"
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
    </nav>
  )
}
