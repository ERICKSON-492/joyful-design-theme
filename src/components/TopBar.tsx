import { Facebook, Instagram, Youtube, Phone } from 'lucide-react'
import { useSiteContent } from '@/hooks/useSiteContent'

export function TopBar() {
  const content = useSiteContent('topbar_banner')
  const message = content?.body ?? 'Wholesale African Craft Sourcing Made Easy | Shipping to 55+ Countries'
  if (!message.trim()) return null

  return (
    <div className="bg-primary text-primary-foreground py-2 px-4 text-center text-sm font-body">
      <div className="container mx-auto flex items-center justify-between">
        <div className="hidden md:flex items-center gap-4">
          <a href="#" className="hover:opacity-80 transition-opacity" aria-label="Facebook">
            <Facebook className="w-4 h-4" />
          </a>
          <a href="#" className="hover:opacity-80 transition-opacity" aria-label="Instagram">
            <Instagram className="w-4 h-4" />
          </a>
          <a href="#" className="hover:opacity-80 transition-opacity" aria-label="Youtube">
            <Youtube className="w-4 h-4" />
          </a>
          <a href="#" className="hover:opacity-80 transition-opacity" aria-label="WhatsApp">
            <Phone className="w-4 h-4" />
          </a>
        </div>
        <p className="flex-1 text-center font-medium tracking-wide">
          {message}
        </p>
        <div className="hidden md:block">
          <span className="text-sm">English</span>
        </div>
      </div>
    </div>
  )
}
