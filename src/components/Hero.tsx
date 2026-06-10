import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import heroHotels from '@/assets/hero-hotels.jpg'
import heroCorporate from '@/assets/hero-corporate.jpg'

const slides = [
  {
    image: heroCorporate,
    title: 'Corporate Gifting',
    subtitle: 'Curated, Customizable Gift Sets Hand Crafted by Artisans',
    cta: 'View Catalog',
    href: '#corporate',
  },
  {
    image: heroHotels,
    title: 'Hotels & Lodges',
    subtitle: 'Crafted for Remarkable Guest Experiences',
    cta: 'View Catalog',
    href: '#collections',
  },
]

export function Hero() {
  const [current, setCurrent] = useState(0)
  const [imagesLoaded, setImagesLoaded] = useState<boolean[]>([false, false])
  const [imageErrors, setImageErrors] = useState<boolean[]>([false, false])

  // Preload first slide
  useEffect(() => {
    if (slides[0]?.image) {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = slides[0].image
      document.head.appendChild(link)
    }
  }, [])

  // Preload next slide when current changes
  useEffect(() => {
    const nextIndex = (current + 1) % slides.length
    if (slides[nextIndex]?.image) {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = slides[nextIndex].image
      document.head.appendChild(link)
      
      return () => {
        document.head.removeChild(link)
      }
    }
  }, [current])

  // Auto-rotate slides
  useEffect(() => {
    if (slides.length <= 1) return
    
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length)
    }, 5000)
    
    return () => clearInterval(timer)
  }, [])

  const handleImageLoad = (index: number) => {
    setImagesLoaded(prev => {
      const newState = [...prev]
      newState[index] = true
      return newState
    })
  }

  const handleImageError = (index: number) => {
    setImageErrors(prev => {
      const newState = [...prev]
      newState[index] = true
      return newState
    })
  }

  const goTo = (index: number) => setCurrent(index)
  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length)
  const next = () => setCurrent((c) => (c + 1) % slides.length)

  return (
    <section className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[80vh] overflow-hidden bg-gray-950">
      {slides.map((slide, i) => {
        const isCurrent = i === current
        
        return (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ${
              isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            aria-hidden={!isCurrent}
          >
            {/* Image */}
            {slide.image && !imageErrors[i] ? (
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover object-center"
                fetchPriority={i === 0 ? "high" : "auto"}
                loading={i === 0 ? "eager" : "lazy"}
                onLoad={() => handleImageLoad(i)}
                onError={() => handleImageError(i)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/30 via-accent/50 to-primary/20" />
            )}
            
            {/* Lighter gradient overlay for better text visibility */}
            <div className="absolute inset-0 bg-black/30" />
            
            {/* Content - with better text styling */}
            <div className="absolute inset-0 flex items-center justify-center text-center px-4 sm:px-6 md:px-8 z-20">
              <div className="max-w-3xl mx-auto">
                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-3 sm:mb-4 md:mb-6 leading-tight drop-shadow-lg">
                  {slide.title}
                </h2>
                <p className="text-white text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 md:mb-10 font-body max-w-xl mx-auto px-2 drop-shadow-md">
                  {slide.subtitle}
                </p>
                <a
                  href={slide.href}
                  className="inline-block bg-primary hover:bg-primary/90 text-white px-8 sm:px-10 py-3 sm:py-4 text-sm sm:text-base font-semibold tracking-wider uppercase transition-all duration-300 rounded-md hover:scale-105 shadow-lg"
                >
                  {slide.cta}
                </a>
              </div>
            </div>
            
            {/* Loading skeleton */}
            {!imagesLoaded[i] && isCurrent && !imageErrors[i] && (
              <div className="absolute inset-0 bg-gray-800 animate-pulse z-5" />
            )}
          </div>
        )
      })}

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button 
            onClick={prev} 
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 backdrop-blur-sm p-2 sm:p-3 rounded-full transition-all duration-300 z-30 hover:scale-110" 
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
          <button 
            onClick={next} 
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 backdrop-blur-sm p-2 sm:p-3 rounded-full transition-all duration-300 z-30 hover:scale-110" 
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-3 z-30">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`transition-all duration-300 ${
                i === current 
                  ? 'w-8 sm:w-10 h-2 bg-primary' 
                  : 'w-2 sm:w-3 h-2 bg-white/60 hover:bg-white/80'
              } rounded-full`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
