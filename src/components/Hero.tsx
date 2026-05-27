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

  // Optimization: Preload the very first hero image in the document head instantly
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = slides[0].image
    link.imageSrcset = `${slides[0].image}`
    document.head.appendChild(link)

    return () => {
      document.head.removeChild(link)
    }
  }, [])

  // Slider interval logic
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const goTo = (index: number) => setCurrent(index)
  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length)
  const next = () => setCurrent((c) => (c + 1) % slides.length)

  return (
    <section className="relative w-full h-[60vh] md:h-[80vh] overflow-hidden bg-gray-950">
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
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
              width={1920}
              height={1080}
              // Performance critical properties:
              fetchPriority={i === 0 ? "high" : "auto"}
              loading={i === 0 ? "eager" : "lazy"}
            />
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-0 flex items-center justify-center text-center px-4 z-20">
              <div className="max-w-2xl">
                <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-semibold text-white mb-4 leading-tight">
                  {slide.title}
                </h2>
                <p className="text-white/90 text-lg md:text-xl mb-8 font-body font-light">
                  {slide.subtitle}
                </p>
                <a
                  href={slide.href}
                  className="inline-block bg-primary hover:bg-gold-dark text-primary-foreground px-8 py-3 text-sm font-semibold tracking-wider uppercase transition-colors"
                >
                  {slide.cta}
                </a>
              </div>
            </div>
          </div>
        )
      })}

      {/* Navigation arrows */}
      <button 
        onClick={prev} 
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm p-2 rounded-full transition-colors z-30" 
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button 
        onClick={next} 
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm p-2 rounded-full transition-colors z-30" 
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-30">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`w-3 h-3 rounded-full transition-all ${
              i === current ? 'bg-white scale-110' : 'bg-white/50'
            }`}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === current ? 'true' : 'false'}
          />
        ))}
      </div>
    </section>
  )
}
