import { MessageCircle } from 'lucide-react'
import { useLocation } from 'react-router-dom'

export function WhatsAppButton() {
  const location = useLocation()
  // Lift the button on mobile product pages so it doesn't overlap the sticky Add-to-Cart bar
  const onProductPage = location.pathname.startsWith('/product/')
  return (
    <a
      href="https://wa.me/254748207000"
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed right-6 z-50 bg-[#25D366] hover:bg-[#20BD5A] text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 ${
        onProductPage ? 'bottom-24 md:bottom-6' : 'bottom-6'
      }`}
      aria-label="Chat on WhatsApp"
      style={{ minWidth: '56px', minHeight: '56px' }}
    >
      <MessageCircle className="w-7 h-7" />
    </a>
  )
}
