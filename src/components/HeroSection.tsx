import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'

// ==========================================
// 1. STATIC ASSET IMPORTS
// ==========================================
import heroTribeImg from '@/assets/hero/1781724309331.jpeg'
import heroJewelryImg from '@/assets/hero/1781724828046.jpg'
import heroDecorImg from '@/assets/hero/1781965391751.png'
import variant3 from '@/assets/hero/1781724604664.jpg'
import variant4 from '@/assets/hero/1781965440352.png'
import variant5 from '@/assets/hero/1781965498095.jpg'

// ==========================================
// 2. TYPES & DATA CONFIGURATION
// ==========================================
interface Slide {
  id: string
  image_url: string
  title: string
  subtitle: string
  cta_text: string
  cta_link: string
}

const localSlides: Slide[] = [
  {
    id: 'hero-tribe',
    image_url: heroTribeImg,
    title: 'USHANGA CHRONICLES',
    subtitle: 'One bead. A thousand stories.',
    cta_text: 'Explore the Tribe',
    cta_link: '/shop',
  },
  {
    id: 'hero-jewelry',
    image_url: heroJewelryImg,
    title: 'HERITAGE INSPIRED',
    subtitle: 'Handcrafted African jewelry.',
    cta_text: 'Shop Collection',
    cta_link: '/jewelry',
  },
  {
    id: 'hero-decor',
    image_url: heroDecorImg,
    title: 'NAIROBI ARTISANS',
    subtitle: 'Stunning home decor and pet accessories.',
    cta_text: 'View Decor',
    cta_link: '/decor',
  },
  {
    id: 'hero-variant3',
    image_url: variant3,
    title: 'CRAFTED WITH PRIDE',
    subtitle: 'Every piece tells a story.',
    cta_text: 'Discover More',
    cta_link: '/shop',
  },
  {
    id: 'hero-variant4',
    image_url: variant4,
    title: 'TIMELESS TRADITIONS',
    subtitle: 'Where culture meets craft.',
    cta_text: 'Shop the Look',
    cta_link: '/jewelry',
  },
  {
    id: 'hero-variant5',
    image_url: variant5,
    title: 'MADE FOR EVERY HOME',
    subtitle: 'Bring artisan beauty indoors.',
    cta_text: 'See Collection',
    cta_link: '/decor',
  },
]

export function HeroSection() {
  const [current, setCurrent] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({})

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Slide advancement
  const nextSlide = useCallback(() => {
    setCurrent((prev) => {
      const next = (prev + 1) % localSlides.length
      console.log('Moving to slide:', next) // Debug
      return next
    })
  }, [])

  // Auto-play
  useEffect(() => {
    if (localSlides.length <= 1) return
    const timer = window.setInterval(nextSlide, 4500)
    return () => window.clearInterval(timer)
  }, [nextSlide])

  const handleImageLoad = (id: string) => {
    console.log('Image loaded:', id) // Debug
    setImagesLoaded((prev) => ({ ...prev, [id]: true }))
  }

  const activeSlide = localSlides[current]
  console.log('Current slide index:', current, 'Slide data:', activeSlide) // Debug

  return (
    <section
      className="relative w-full h-[70vh] sm:h-[80vh] md:h-screen overflow-hidden"
      aria-label="Hero"
      style={{
        background:
          'linear-gradient(135deg, hsl(var(--primary) / 0.3) 0%, hsl(var(--accent) / 0.5) 50%, hsl(var(--primary) / 0.2) 100%)',
      }}
    >
      {/* Skeleton shimmer */}
      {!imagesLoaded[localSlides[0]?.id] && (
        <div className="absolute inset-0 z-[1] animate-pulse bg-gradient-to-br from-[hsl(var(--primary)/0.15)] via-[hsl(var(--accent)/0.25)] to-[hsl(var(--primary)/0.1)]" />
      )}

      {/* ========================================== */}
      {/* FIXED: Image rendering with proper z-index */}
      {/* ========================================== */}
      {localSlides.map((slide, index) => {
        const isActive = index === current

        return (
          <img
            key={slide.id}
            src={slide.image_url}
            alt={slide.subtitle || slide.title}
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding={index === 0 ? 'sync' : 'async'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            onLoad={() => handleImageLoad(slide.id)}
            className="absolute inset-0 h-full w-full transition-opacity duration-700 ease-out object-cover"
            style={{
              zIndex: isActive ? 1 : 0,
              opacity: isActive ? 1 : 0, // <-- KEY FIX: Removed conditional for imagesLoaded
              objectPosition: isMobile ? 'center 25%' : 'center center',
            }}
          />
        )
      })}

      {/* Decorative Dark Overlay */}
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.40) 50%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Content */}
      <div className="absolute inset-0 z-[3] flex items-center justify-center px-4 sm:px-6 text-center">
        <div className="max-w-3xl">
          <h1 className="font-display text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-3 sm:mb-4 leading-[1.1] tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            {activeSlide.title}
          </h1>
          <p className="text-[#F0D878] text-lg sm:text-xl md:text-2xl lg:text-3xl font-display italic mb-6 sm:mb-10 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]">
            {activeSlide.subtitle}
          </p>
          <p className="text-white/90 text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
            Handcrafted, heritage-inspired African jewelry, pet accessories, and home decor made by artisans in Nairobi.
          </p>
          <Link
            to={activeSlide.cta_link}
            className="inline-block bg-primary hover:bg-primary/85 text-primary-foreground px-8 sm:px-10 py-3.5 sm:py-4 text-xs sm:text-sm font-bold tracking-widest uppercase transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            style={{ minHeight: '44px' }}
          >
            {activeSlide.cta_text}
          </Link>
        </div>
      </div>

      {/* Carousel Indicators */}
      {localSlides.length > 1 && (
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 z-[4] flex -translate-x-1/2 gap-3">
          {localSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                console.log('Manual slide change to:', index)
                setCurrent(index)
              }}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index === current ? 'w-10 bg-primary shadow-md' : 'w-5 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      
    </section>
  )
}
