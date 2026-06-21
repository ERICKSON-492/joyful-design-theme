import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'

// ==========================================
// 1. STATIC ASSET IMPORTS (ALL LOWERCASE)
// ==========================================
import heroTribeImg from '@/assets/hero/1781724309331.jpeg'
import heroJewelryImg from '@/assets/hero/1781724828046.jpg'
import heroDecorImg from '@/assets/hero/1781965391751.png'
// Additional imported variants if you want to expand slides later:
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
]

// ==========================================
// 3. COMPONENT IMPLEMENTATION
// ==========================================
export function HeroSection() {
  const [current, setCurrent] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({})

  // Detect mobile viewport for art-direction adjustments
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Slide advancement mechanics
  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % localSlides.length)
  }, [])

  // Auto-play presentation timer
  useEffect(() => {
    if (typeof window === 'undefined' || localSlides.length <= 1) return

    const timer = window.setInterval(nextSlide, 4500)
    return () => window.clearInterval(timer)
  }, [nextSlide])

  const handleImageLoad = (id: string) => {
    setImagesLoaded((prev) => ({ ...prev, [id]: true }))
  }

  const activeSlide = localSlides[current]

  return (
    <section
      className="relative w-full h-[70vh] sm:h-[80vh] md:h-screen overflow-hidden"
      aria-label="Hero"
      style={{
        background:
          'linear-gradient(135deg, hsl(var(--primary) / 0.3) 0%, hsl(var(--accent) / 0.5) 50%, hsl(var(--primary) / 0.2) 100%)',
      }}
    >
      {/* Skeleton shimmer shown while first image finishes loading */}
      {!imagesLoaded[localSlides[0]?.id] && (
        <div className="absolute inset-0 z-[1] animate-pulse bg-gradient-to-br from-[hsl(var(--primary)/0.15)] via-[hsl(var(--accent)/0.25)] to-[hsl(var(--primary)/0.1)]" />
      )}

      {/* Image layer rendering */}
      {localSlides.map((slide, index) => {
        const isActive = index === current

        return (
          <img
            key={slide.id}
            src={slide.image_url}
            alt={slide.subtitle || slide.title}
            // Performance attributes for instantaneous loading of the LCP image
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding={index === 0 ? 'sync' : 'async'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            onLoad={() => handleImageLoad(slide.id)}
            className="hero-slide-img absolute inset-0 h-full w-full transition-opacity duration-700 ease-out"
            style={{
              zIndex: isActive ? 1 : 0,
              opacity: isActive ? (imagesLoaded[slide.id] ? 1 : 0) : 0,
              objectFit: 'cover',
              objectPosition: isMobile ? 'center 25%' : 'center center',
            }}
          />
        )
      })}

      {/* Decorative Dark Overlay for text legibility */}
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.40) 50%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      {/* Slide Content Display */}
      <div className="absolute inset-0 z-[3] flex items-center justify-center px-4 sm:px-6 text-center">
        <div className="max-w-3xl">
          <div key={activeSlide.id}>
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
      </div>

      {/* Carousel Indicator Track */}
      {localSlides.length > 1 && (
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 z-[4] flex -translate-x-1/2 gap-3">
          {localSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
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
