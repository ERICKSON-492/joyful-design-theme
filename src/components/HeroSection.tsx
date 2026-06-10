import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fetchPublicTable } from '@/lib/publicContent'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function optimizeImageUrl(url: string, width?: number): string {
  if (!url) return ''
  // Add your image optimization logic here (Cloudinary, etc.)
  // Example with Cloudinary (if you have it):
  // if (width) {
  //   return url.replace('/upload/', `/upload/w_${width},q_80,f_auto/`)
  // }
  return url
}

interface Slide {
  id: string
  image_url: string
  title: string
  subtitle: string
  cta_text: string
  cta_link: string
  image_mobile?: string // Optional mobile-specific image
  image_tablet?: string // Optional tablet-specific image
}

const fallbackSlides: Slide[] = [
  {
    id: 'fallback-hero',
    image_url: '',
    title: 'USHANGA CHRONICLES',
    subtitle: 'One bead. A thousand stories.',
    cta_text: 'Explore the Tribe',
    cta_link: '/shop',
  },
]

const normalizeSlides = (data: Partial<Slide>[] | null | undefined): Slide[] => {
  if (!data || data.length === 0) return fallbackSlides

  const cleanedSlides = data.map((slide, index) => ({
    id: slide.id || `hero-slide-${index}`,
    image_url: slide.image_url || '',
    title: slide.title?.trim() || fallbackSlides[0].title,
    subtitle: slide.subtitle?.trim() || fallbackSlides[0].subtitle,
    cta_text: slide.cta_text?.trim() || fallbackSlides[0].cta_text,
    cta_link: slide.cta_link?.trim() || fallbackSlides[0].cta_link,
  }))

  return cleanedSlides.length > 0 ? cleanedSlides : fallbackSlides
}

export function HeroSection() {
  const [slides, setSlides] = useState<Slide[]>(fallbackSlides)
  const [current, setCurrent] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState<Record<string, boolean>>({})
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  // Check for mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    let isMounted = true

    const fetchSlides = async () => {
      try {
        const data = await fetchPublicTable<Slide>(
          'hero_slides',
          'select=id,image_url,title,subtitle,cta_text,cta_link,image_mobile,image_tablet&is_active=eq.true&order=display_order.asc'
        )

        if (!isMounted) return
        const normalized = normalizeSlides(data)
        setSlides(normalized)

        // Preload first two images
        normalized.slice(0, 2).forEach((slide, index) => {
          if (!slide.image_url) return
          
          const desktopSrc = optimizeImageUrl(slide.image_url)
          const mobileSrc = slide.image_mobile ? optimizeImageUrl(slide.image_mobile) : desktopSrc
          
          // Preload desktop image
          const linkDesktop = document.createElement('link')
          linkDesktop.rel = 'preload'
          linkDesktop.as = 'image'
          linkDesktop.href = desktopSrc
          linkDesktop.setAttribute('fetchpriority', index === 0 ? 'high' : 'auto')
          document.head.appendChild(linkDesktop)
          
          // Preload mobile image separately
          if (mobileSrc !== desktopSrc) {
            const linkMobile = document.createElement('link')
            linkMobile.rel = 'preload'
            linkMobile.as = 'image'
            linkMobile.href = mobileSrc
            linkMobile.setAttribute('media', '(max-width: 768px)')
            document.head.appendChild(linkMobile)
          }
        })
      } catch (err) {
        console.error('HeroSection fetch error:', err)
        if (isMounted) setSlides(fallbackSlides)
      }
    }

    fetchSlides()

    return () => {
      isMounted = false
    }
  }, [])

  const safeSlides = useMemo(() => (slides.length > 0 ? slides : fallbackSlides), [slides])
  const activeIndex = current < safeSlides.length ? current : 0
  const activeSlide = safeSlides[activeIndex] || fallbackSlides[0]

  useEffect(() => {
    if (current >= safeSlides.length) {
      setCurrent(0)
    }
  }, [current, safeSlides.length])

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % safeSlides.length)
  }, [safeSlides.length])

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + safeSlides.length) % safeSlides.length)
  }, [safeSlides.length])

  useEffect(() => {
    if (safeSlides.length <= 1) return

    const timer = window.setInterval(nextSlide, 5000)
    return () => window.clearInterval(timer)
  }, [nextSlide, safeSlides.length])

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50
    
    if (isLeftSwipe) {
      nextSlide()
    } else if (isRightSwipe) {
      prevSlide()
    }
    
    setTouchStart(0)
    setTouchEnd(0)
  }

  const handleImageLoad = (slideId: string) => {
    setImagesLoaded(prev => ({ ...prev, [slideId]: true }))
  }

  // Get responsive image URL based on screen size
  const getResponsiveImageUrl = (slide: Slide) => {
    if (isMobile && slide.image_mobile) {
      return optimizeImageUrl(slide.image_mobile)
    }
    return optimizeImageUrl(slide.image_url)
  }

  const visibleIndices = useMemo(() => {
    const prev = (activeIndex - 1 + safeSlides.length) % safeSlides.length
    const next = (activeIndex + 1) % safeSlides.length
    return new Set([prev, activeIndex, next])
  }, [activeIndex, safeSlides.length])

  return (
    <section
      className="relative w-full h-[70vh] sm:h-[80vh] md:h-screen overflow-hidden"
      aria-label="Hero"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.3) 0%, hsl(var(--accent) / 0.5) 50%, hsl(var(--primary) / 0.2) 100%)' }}
    >
      {/* Images */}
      {safeSlides.map((slide, index) => {
        if (!visibleIndices.has(index)) return null
        const isActive = index === activeIndex
        const imageUrl = getResponsiveImageUrl(slide)
        
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {imageUrl ? (
              <picture>
                {/* Mobile (up to 640px) */}
                <source
                  media="(max-width: 640px)"
                  srcSet={slide.image_mobile ? optimizeImageUrl(slide.image_mobile) : imageUrl}
                />
                {/* Tablet (641px - 1024px) */}
                <source
                  media="(max-width: 1024px)"
                  srcSet={slide.image_tablet ? optimizeImageUrl(slide.image_tablet) : imageUrl}
                />
                {/* Desktop (1025px and above) */}
                <source
                  media="(min-width: 1025px)"
                  srcSet={imageUrl}
                />
                <img
                  src={imageUrl}
                  alt={slide.subtitle || slide.title}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                  decoding={index === 0 ? 'sync' : 'async'}
                  className="h-full w-full object-cover object-center"
                  onLoad={() => handleImageLoad(slide.id)}
                  style={{
                    transform: 'translateZ(0)',
                    willChange: 'transform',
                  }}
                />
              </picture>
            ) : (
              <div
                className="h-full w-full"
                style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.3) 0%, hsl(var(--accent) / 0.5) 50%, hsl(var(--primary) / 0.2) 100%)' }}
              />
            )}
          </div>
        )
      })}

      {/* Gradient Overlay - responsive */}
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Content - responsive typography */}
      <div className="absolute inset-0 z-[3] flex items-center justify-center px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div key={activeSlide.id} className="animate-fade-in">
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-2 sm:mb-3 md:mb-4 leading-[1.1] tracking-wide drop-shadow-lg">
              {activeSlide.title}
            </h1>
            <p className="text-gold-400 text-base sm:text-lg md:text-xl lg:text-2xl font-display italic mb-6 sm:mb-8 md:mb-10 drop-shadow-md px-2">
              {activeSlide.subtitle}
            </p>
            <Link
              to={activeSlide.cta_link}
              className="inline-block bg-primary hover:bg-primary/85 text-primary-foreground px-6 sm:px-8 md:px-10 py-2.5 sm:py-3 md:py-4 text-xs sm:text-sm font-bold tracking-widest uppercase transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 rounded-md"
              style={{ minHeight: '44px' }}
            >
              {activeSlide.cta_text}
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Arrows - visible only on tablet/desktop, hidden on mobile */}
      {safeSlides.length > 1 && !isMobile && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 backdrop-blur-sm p-2 sm:p-3 rounded-full transition-all duration-300 z-[4] hover:scale-110"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 backdrop-blur-sm p-2 sm:p-3 rounded-full transition-all duration-300 z-[4] hover:scale-110"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
        </>
      )}

      {/* Dots Navigation */}
      {safeSlides.length > 1 && (
        <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 z-[4] flex -translate-x-1/2 gap-2 sm:gap-3">
          {safeSlides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => setCurrent(index)}
              className={`transition-all duration-500 ${
                index === activeIndex
                  ? 'w-6 sm:w-8 md:w-10 h-1.5 sm:h-2 bg-primary shadow-md'
                  : 'w-2 sm:w-3 h-1.5 sm:h-2 bg-white/40 hover:bg-white/60'
              } rounded-full`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Loading indicator for first slide */}
      {!imagesLoaded[activeSlide.id] && activeSlide.image_url && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </section>
  )
}
