import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import heroHotels from '@/assets/hero-hotels.jpg'
import heroCorporate from '@/assets/hero-corporate.jpg'

// Create mobile versions of images (you'll need to add these to your assets)
// Or use the same images but with better loading strategy
const slides = [
  {
    image: heroCorporate,
    imageMobile: heroCorporate, // Replace with actual mobile image if you have one
    imageTablet: heroCorporate, // Replace with actual tablet image if you have one
    title: 'Corporate Gifting',
    subtitle: 'Curated, Customizable Gift Sets Hand Crafted by Artisans',
    cta: 'View Catalog',
    href: '#corporate',
  },
  {
    image: heroHotels,
    imageMobile: heroHotels, // Replace with actual mobile image if you have one
    imageTablet: heroHotels, // Replace with actual tablet image if you have one
    title: 'Hotels & Lodges',
    subtitle: 'Crafted for Remarkable Guest Experiences',
    cta: 'View Catalog',
    href: '#collections',
  },
]

export function Hero() {
  const [current, setCurrent] = useState(0)
  const [imagesLoaded, setImagesLoaded] = useState<boolean[]>([false, false])

  // Preload all critical images
  useEffect(() => {
    // Preload first slide images
    const preloadImages = () => {
      slides.forEach((slide, index) => {
        const link = document.createElement('link')
        link.rel = 'preload'
        link.as = 'image'
        link.href = slide.image
        link.imageSrcset = `${slide.image} 1920w`
        // Only preload first slide immediately, others lazy
        if (index === 0) {
          document.head.appendChild(link)
        }
      })
    }
    
    preloadImages()
  }, [])

  // Preload next slide when current changes
  useEffect(() => {
    const nextIndex = (current + 1) % slides.length
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = slides[nextIndex].image
    document.head.appendChild(link)
    
    return () => {
      document.head.removeChild(link)
    }
  }, [current])

  // Slider interval logic
  useEffect(() => {
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
            {/* Responsive picture element for different screen sizes */}
            <picture className="block w-full h-full">
              {/* Mobile (up to 640px) */}
              <source
                media="(max-width: 640px)"
                srcSet={slide.imageMobile}
                width="640"
                height="640"
              />
              {/* Tablet (641px - 1024px) */}
              <source
                media="(max-width: 1024px)"
                srcSet={slide.imageTablet}
                width="1024"
                height="768"
              />
              {/* Desktop (1025px and above) */}
              <source
                media="(min-width: 1025px)"
                srcSet={slide.image}
                width="1920"
                height="1080"
              />
              <img
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover object-center"
                width={1920}
                height={1080}
                fetchPriority={i === 0 ? "high" : "auto"}
                loading={i === 0 ? "eager" : "lazy"}
                onLoad={() => handleImageLoad(i)}
                style={{
                  transform: 'translateZ(0)', // Hardware acceleration
                  willChange: 'transform',
                }}
              />
            </picture>
            
            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent" />
            
            {/* Content container - responsive padding and positioning */}
            <div className="absolute inset-0 flex items-center justify-center text-center px-4 sm:px-6 md:px-8 z-20">
              <div className="max-w-2xl mx-auto">
                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold text-white mb-2 sm:mb-3 md:mb-4 leading-tight animate-fade-in">
                  {slide.title}
                </h2>
                <p className="text-white/90 text-sm sm:text-base md:text-lg lg:text-xl mb-4 sm:mb-6 md:mb-8 font-body font-light max-w-xl mx-auto px-2">
                  {slide.subtitle}
                </p>
                <a
                  href={slide.href}
                  className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-8 py-2 sm:py-3 text-xs sm:text-sm font-semibold tracking-wider uppercase transition-all duration-300 rounded-md hover:scale-105"
                >
                  {slide.cta}
                </a>
              </div>
            </div>
            
            {/* Loading skeleton (optional) */}
            {!imagesLoaded[i] && isCurrent && (
              <div className="absolute inset-0 bg-gray-800 animate-pulse z-5" />
            )}
          </div>
        )
      })}

      {/* Navigation arrows - responsive sizing */}
      <button 
        onClick={prev} 
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 backdrop-blur-sm p-1.5 sm:p-2 rounded-full transition-all duration-300 z-30 hover:scale-110" 
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
      </button>
      <button 
        onClick={next} 
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 backdrop-blur-sm p-1.5 sm:p-2 rounded-full transition-all duration-300 z-30 hover:scale-110" 
        aria-label="Next slide"
      >
        <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
      </button>

      {/* Dots - responsive sizing */}
      <div className="absolute bottom-3 sm:bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-3 z-30">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`transition-all duration-300 ${
              i === current 
                ? 'w-6 sm:w-8 h-1.5 sm:h-2 bg-white' 
                : 'w-2 sm:w-3 h-1.5 sm:h-2 bg-white/50 hover:bg-white/70'
            } rounded-full`}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === current ? 'true' : 'false'}
          />
        ))}
      </div>
    </section>
  )
}
