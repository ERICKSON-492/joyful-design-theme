import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fetchPublicTable } from '@/lib/publicContent'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function optimizeImageUrl(url: string): string {
  if (!url) return ''
  // If it's already a full URL, return it
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  // If it's a storage path, construct the full URL
  if (url.startsWith('/storage/') || url.startsWith('storage/')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    return `${supabaseUrl}/storage/v1/object/public/${url.replace(/^\/?storage\/v1\/object\/public\//, '')}`
  }
  return url
}

interface Slide {
  id: string
  image_url: string
  title: string
  subtitle: string
  cta_text: string
  cta_link: string
}

const fallbackImages = [
  'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=1920&h=1080&fit=crop', // African beads
  'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=1920&h=1080&fit=crop', // African art
]

const fallbackSlides: Slide[] = [
  {
    id: 'fallback-hero-1',
    image_url: fallbackImages[0],
    title: 'USHANGA CHRONICLES',
    subtitle: 'One bead. A thousand stories.',
    cta_text: 'Explore the Tribe',
    cta_link: '/shop',
  },
  {
    id: 'fallback-hero-2',
    image_url: fallbackImages[1],
    title: 'Handcrafted Excellence',
    subtitle: 'Authentic African Beads & Jewelry',
    cta_text: 'Shop Now',
    cta_link: '/shop',
  },
]

const normalizeSlides = (data: Partial<Slide>[] | null | undefined): Slide[] => {
  if (!data || data.length === 0) {
    console.log('No slides found, using fallback')
    return fallbackSlides
  }

  const cleanedSlides = data.map((slide, index) => ({
    id: slide.id || `hero-slide-${index}`,
    image_url: slide.image_url || fallbackSlides[index % fallbackSlides.length].image_url,
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
          'select=id,image_url,title,subtitle,cta_text,cta_link&is_active=eq.true&order=display_order.asc'
        )

        console.log('Fetched hero slides:', data)
        
        if (!isMounted) return
        const normalized = normalizeSlides(data)
        console.log('Normalized slides:', normalized)
        setSlides(normalized)

        // Preload first two images
        normalized.slice(0, 2).forEach((slide, index) => {
          if (!slide.image_url) return
          const href = optimizeImageUrl(slide.image_url)
          console.log(`Preloading image ${index}:`, href)
          
          if (index === 0 && typeof document !== 'undefined') {
            const existing = document.head.querySelector(
              `link[rel="preload"][as="image"][data-hero-preload="true"]`
            )
            if (existing) existing.remove()
            const link = document.createElement('link')
            link.rel = 'preload'
            link.as = 'image'
            link.href = href
            link.setAttribute('fetchpriority', 'high')
            link.setAttribute('data-hero-preload', 'true')
            document.head.appendChild(link)
          }
          const img = new window.Image()
          img.src = href
          img.onload = () => console.log(`Image ${index} loaded:`, href)
          img.onerror = () => console.error(`Image ${index} failed to load:`, href)
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
    console.log('Image loaded for slide:', slideId)
    setImagesLoaded(prev => ({ ...prev, [slideId]: true }))
  }

  const handleImageError = (slideId: string, url: string) => {
    console.error('Image failed to load for slide:', slideId, url)
    setImagesLoaded(prev => ({ ...prev, [slideId]: false }))
  }

  const visibleIndices = useMemo(() => {
    const next = (activeIndex + 1) % safeSlides.length
    return new Set([activeIndex, next])
  }, [activeIndex, safeSlides.length])

  return (
    <section
      className="relative w-full h-[70vh] sm:h-[80vh] md:h-screen overflow-hidden touch-pan-y"
      aria-label="Hero"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Images */}
      {safeSlides.map((slide, index) => {
        if (!visibleIndices.has(index)) return null
        const isActive = index === activeIndex
        const imageUrl = optimizeImageUrl(slide.image_url)
        
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={slide.subtitle || slide.title}
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                decoding={index === 0 ? 'sync' : 'async'}
                className="h-full w-full object-cover object-center"
                onLoad={() => handleImageLoad(slide.id)}
                onError={() => handleImageError(slide.id, imageUrl)}
                style={{
                  transform: 'translateZ(0)',
                }}
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/30 via-accent/50 to-primary/20" />
            )}
          </div>
        )
      })}

      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 z-[2]"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Content */}
      <div className="absolute inset-0 z-[3] flex items-center justify-center px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div key={activeSlide.id} className="transition-all duration-500 ease-out">
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-2 sm:mb-3 md:mb-4 leading-[1.1] tracking-wide drop-shadow-lg">
              {activeSlide.title}
            </h1>
            <p className="text-primary text-base sm:text-lg md:text-xl lg:text-2xl font-display italic mb-6 sm:mb-8 md:mb-10 drop-shadow-md px-2">
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

      {/* Navigation Arrows - Desktop only */}
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
              } rounded-full cursor-pointer`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {!imagesLoaded[activeSlide.id] && activeSlide.image_url && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center bg-black/20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </section>
  )
}
