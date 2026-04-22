import { Link } from 'react-router-dom'
import { Instagram, Facebook, Phone, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-foreground text-white/70 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <Link to="/" className="block mb-4">
              <img src="/logo.jpeg" alt="Ushanga Chronicles" className="h-14 w-auto rounded-md" />
            </Link>
            <p className="text-sm leading-relaxed mb-4">
              One bead. A thousand stories. Handcrafted African jewelry, home decor, 
              and accessories made in Nairobi, Kenya.
            </p>
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
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/shop?cat=wear-it" className="hover:text-primary transition-colors">Wear It</Link></li>
              <li><Link to="/shop?cat=live-with-it" className="hover:text-primary transition-colors">Live With It</Link></li>
              <li><Link to="/shop?cat=table" className="hover:text-primary transition-colors">For Your Table</Link></li>
              <li><Link to="/shop?cat=collectibles" className="hover:text-primary transition-colors">Collectibles</Link></li>
              <li><Link to="/shop?cat=pet" className="hover:text-primary transition-colors">For Your Pet</Link></li>
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
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Start a Conversation</h4>
            <ul className="space-y-2 text-sm">
              <li>+254 748 207 000</li>
              <li>admin@ushangachronicles.com</li>
              <li>Nairobi, Kenya</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 text-center text-xs">
          <p>© {new Date().getFullYear()} Ushanga Chronicles. One bead. A thousand stories.</p>
        </div>
      </div>
    </footer>
  )
}
