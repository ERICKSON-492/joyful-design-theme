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

  // Preload first image
  useEffect(() => {
    if (typeof document === 'undefined') return

    const existing = document.querySelector(
      'link[data-hero-preload="true"]'
    )

    if (existing) existing.remove()

    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = slides[0].image
    link.setAttribute('data-hero-preload', 'true')

    document.head.appendChild(link)

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link)
      }
    }
  }, [])

  // Preload next slide
  useEffect(() => {
    const nextIndex = (current + 1) % slides.length
    const img = new Image()
    img.src = slides[nextIndex].image
  }, [current])

  // Auto slider
  useEffect(() => {
    if (slides.length <= 1) return

    const timer = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [])

  const prev = () =>
    setCurrent((c) => (c - 1 + slides.length) % slides.length)

  const next = () =>
    setCurrent((c) => (c + 1) % slides.length)

  const goTo = (index: number) => setCurrent(index)

  return (
    <section
      className="relative w-full min-h-[500px] h-[70vh] sm:h-[75vh] md:h-[85vh] overflow-hidden bg-black"
      aria-label="Hero Banner"
    >
      {slides.map((slide, i) => {
        const nextIndex = (current + 1) % slides.length

        if (i !== current && i !== nextIndex) return null

        const isCurrent = i === current

        return (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              isCurrent
                ? 'opacity-100 z-10'
                : 'opacity-0 z-0'
            }`}
            aria-hidden={!isCurrent}
          >
            <img
              src={slide.image}
              alt={slide.title || 'Hero image'}
              width={1920}
              height={1080}
              loading={isCurrent ? 'eager' : 'lazy'}
              decoding={isCurrent ? 'sync' : 'async'}
              fetchPriority={isCurrent ? 'high' : 'auto'}
              className="
                w-full
                h-full
                object-cover
                object-center
                md:object-center
              "
            />

            <div className="absolute inset-0 bg-black/45" />

            <div className="absolute inset-0 z-20 flex items-center justify-center px-4 text-center">
              <div className="max-w-3xl">
                <h2 className="font-display text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-semibold text-white mb-4 leading-tight">
                  {slide.title}
                </h2>

                <p className="text-white/90 text-base sm:text-lg md:text-xl mb-8 font-body font-light max-w-2xl mx-auto">
                  {slide.subtitle}
                </p>

                <a
                  href={slide.href}
                  className="
                    inline-block
                    bg-primary
                    hover:bg-primary/90
                    text-primary-foreground
                    px-8
                    py-3
                    text-sm
                    md:text-base
                    font-semibold
                    tracking-wider
                    uppercase
                    transition-all
                    duration-300
                    rounded-sm
                    shadow-lg
                    hover:shadow-xl
                    hover:-translate-y-0.5
                  "
                >
                  {slide.cta}
                </a>
              </div>
            </div>
          </div>
        )
      })}

      {/* Previous */}
      <button
        onClick={prev}
        className="
          absolute
          left-3
          md:left-5
          top-1/2
          -translate-y-1/2
          bg-black/30
          hover:bg-black/50
          backdrop-blur-sm
          p-2
          md:p-3
          rounded-full
          transition-colors
          z-30
        "
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
      </button>

      {/* Next */}
      <button
        onClick={next}
        className="
          absolute
          right-3
          md:right-5
          top-1/2
          -translate-y-1/2
          bg-black/30
          hover:bg-black/50
          backdrop-blur-sm
          p-2
          md:p-3
          rounded-full
          transition-colors
          z-30
        "
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-30">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === current}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? 'w-8 h-3 bg-white'
                : 'w-3 h-3 bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
    </section>
  )
}
