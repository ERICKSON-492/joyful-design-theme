import { Link } from 'react-router-dom'
import { Instagram, Facebook, Phone, Mail } from 'lucide-react'
import { InstallAppButton } from './InstallAppButton'
import { useSiteContent } from '@/hooks/useSiteContent'

export function Footer() {
  const brand = useSiteContent('footer_brand')
  const contact = useSiteContent('footer_contact')
  const brandDescription = brand?.body ?? 'One bead. A thousand stories. Handcrafted African jewelry, home decor, and accessories made in Nairobi, Kenya.'
  const contactTitle = contact?.title?.trim() ? contact.title : 'Start a Conversation'
  const contactLines = (contact ? contact.body : '+254 748 207 000\nadmin@ushangachronicles.com\nNairobi, Kenya')
    .split(/\r?\n/).map(line => line.trim()).filter(Boolean)

  return (
    <footer className="bg-foreground text-white/70 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <Link to="/" className="block mb-4">
              <img src="/logo.jpeg" alt="Ushanga Chronicles" className="h-14 w-auto rounded-md" />
            </Link>
            {brand?.title && <h3 className="text-white font-display font-semibold mb-2">{brand.title}</h3>}
            <p className="text-sm leading-relaxed mb-4">{brandDescription}</p>
            <div className="flex items-center gap-4">
              <a href="https://www.instagram.com/ushanga_chronicles/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" aria-label="Facebook" className="hover:text-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="https://wa.me/254748207000" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="hover:text-primary transition-colors">
                <Phone className="w-5 h-5" />
              </a>
              <a href="mailto:admin@ushangachronicles.com" aria-label="Email" className="hover:text-primary transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
            <div className="mt-5">
              <InstallAppButton />
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/shop" className="hover:text-primary transition-colors">All Products</Link></li>
              <li><Link to="/shop?cat=wear-it" className="hover:text-primary transition-colors">Jewelry & Apparel</Link></li>
              <li><Link to="/shop?cat=live-with-it" className="hover:text-primary transition-colors">Home Decor & Tableware</Link></li>
              <li><Link to="/shop?cat=for-your-pet" className="hover:text-primary transition-colors">Pet Accessories</Link></li>
              <li><Link to="/shop?cat=collectibles" className="hover:text-primary transition-colors">Collectibles</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about-us" className="hover:text-primary transition-colors">The Chronicle</Link></li>
              <li><Link to="/custom-order" className="hover:text-primary transition-colors">Create Yours</Link></li>
              <li><Link to="/tribe-looks" className="hover:text-primary transition-colors">Tribe Looks</Link></li>
              <li><Link to="/wholesale-gifting" className="hover:text-primary transition-colors">Wholesale & Gifting</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ & Help</Link></li>
              <li><Link to="/shipping-returns" className="hover:text-primary transition-colors">Shipping & Returns</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">{contactTitle}</h4>
            {contact?.subtitle && <p className="text-xs text-white/60 mb-3">{contact.subtitle}</p>}
            <ul className="space-y-2 text-sm">
              {contactLines.map((line, index) => {
                const email = line.includes('@')
                const phone = /^[+\d][\d\s().-]+$/.test(line)
                return <li key={`${line}-${index}`}>{email ? <a href={`mailto:${line}`} className="hover:text-primary transition-colors">{line}</a> : phone ? <a href={`tel:${line.replace(/[^+\d]/g, '')}`} className="hover:text-primary transition-colors">{line}</a> : line}</li>
              })}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 text-center text-xs">
          <p>© {new Date().getFullYear()} Ushanga Chronicles. One bead. A thousand stories.</p>
          <p className="mt-2">
            <Link to="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <span className="mx-2">·</span>
            <Link to="/shipping-returns" className="hover:text-primary transition-colors">Shipping & Returns</Link>
            <span className="mx-2">·</span>
            <Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}
