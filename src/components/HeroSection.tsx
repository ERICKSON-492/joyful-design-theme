import heroMain from '@/assets/hero-main.jpg'
import heroMobile from '@/assets/hero-main-mobile.jpg'
import { Link } from 'react-router-dom'

export function HeroSection() {
  return (
    <section className="relative w-full h-[85vh] md:h-screen overflow-hidden">
      {/* Desktop image */}
      <img
        src={heroMain}
        alt="Models wearing Ushanga beaded jewelry in Nairobi CBD"
        className="hidden md:block absolute inset-0 w-full h-full object-cover"
        width={1920}
        height={1080}
      />
      {/* Mobile image */}
      <img
        src={heroMobile}
        alt="Models wearing Ushanga beaded jewelry in Nairobi CBD"
        className="md:hidden absolute inset-0 w-full h-full object-cover"
        width={768}
        height={1024}
      />
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 flex items-center justify-center text-center px-6">
        <div className="max-w-3xl">
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-4 leading-[1.1] tracking-wide">
            USHANGA CHRONICLES
          </h1>
          <p className="text-primary text-xl md:text-2xl lg:text-3xl font-display italic mb-10">
            One bead. A thousand stories.
          </p>
          <Link
            to="/shop"
            className="inline-block bg-primary hover:bg-[#c49515] text-primary-foreground px-10 py-4 text-sm font-bold tracking-widest uppercase transition-colors"
            style={{ minHeight: '44px' }}
          >
            Explore the Tribe
          </Link>
        </div>
      </div>
    </section>
  )
}
