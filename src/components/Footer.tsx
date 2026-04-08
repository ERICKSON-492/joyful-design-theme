import { Facebook, Instagram, Youtube, Phone } from 'lucide-react'
import mawuLogo from '@/assets/mawu-logo.png'

export function Footer() {
  const footerLinks = {
    Shop: [
      'Corporate Gifting Catalog',
      'Hotel & Lodges Catalog',
      'Shop Retail',
      'Track my order',
    ],
    Sell: [
      'Sell on Mawu',
      'Seller Login',
      'Seller FAQ',
      'Seller Policies',
    ],
    Policies: [
      'Terms of Service',
      'Privacy & Sharing',
      'Return & Refund Policy',
      'Shipping & Delivery',
    ],
    Company: [
      'About Us',
      'Contact Us',
      'Maker Stories',
      'Experience Africa',
    ],
  }

  return (
    <footer className="bg-foreground text-background/80 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Logo & Contact */}
          <div className="lg:col-span-1">
            <img src={mawuLogo} alt="Mawu Africa" className="h-12 w-auto mb-4 brightness-200" />
            <p className="text-sm leading-relaxed mb-4 font-body">
              +254 790 867 733
            </p>
            <p className="text-sm mb-6 font-body">sales@mawuafrica.com</p>
            <div className="flex items-center gap-4">
              <a href="#" aria-label="Facebook"><Facebook className="w-4 h-4 hover:text-white transition-colors" /></a>
              <a href="#" aria-label="Instagram"><Instagram className="w-4 h-4 hover:text-white transition-colors" /></a>
              <a href="#" aria-label="Youtube"><Youtube className="w-4 h-4 hover:text-white transition-colors" /></a>
              <a href="#" aria-label="WhatsApp"><Phone className="w-4 h-4 hover:text-white transition-colors" /></a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-white font-body font-semibold text-sm mb-4 uppercase tracking-wider">
                {heading}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm font-body hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-background/20 pt-6 text-center">
          <p className="text-xs font-body text-background/50">
            © MAWU AFRICA 2023. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
