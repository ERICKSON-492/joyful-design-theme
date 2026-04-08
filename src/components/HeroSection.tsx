import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import heroMain from '@/assets/hero-main.jpg'
import heroCorporate from '@/assets/hero-corporate.jpg'
import heroHotels from '@/assets/hero-hotels.jpg'

const slides = [
  {
    image: heroMain,
    title: 'USHANGA CHRONICLES',
    subtitle: 'One bead. A thousand stories.',
    cta: 'Explore the Tribe',
    link: '/shop',
  },
  {
    image: heroCorporate,
    title: 'CRAFTED BY HAND',
    subtitle: 'Rooted in heritage. Made for the modern world.',
    cta: 'Create Yours',
    link: '/custom-order',
  },
  {
    image: heroHotels,
    title: 'FOR EVERY SPACE',
    subtitle: 'Jewelry. Home. Table. Culture.',
    cta: 'Shop Now',
    link: '/shop',
  },
]

export function HeroSection() {
  const [current, setCurrent] = useState(0)

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length)
  }, [])

  useEffect(() => {
    const timer = setInterval(nextSlide, 5500)
    return () => clearInterval(timer)
  }, [nextSlide])

  const slide = slides[current]

  return (
    <section className="relative w-full h-[85vh] md:h-screen overflow-hidden">
      {/* Sliding background images */}
      <AnimatePresence mode="wait">
        <motion.img
          key={current}
          src={slide.image}
          alt={slide.subtitle}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </AnimatePresence>

      <div className="absolute inset-0 bg-black/45" />

      <div className="absolute inset-0 flex items-center justify-center text-center px-6">
        <div className="max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-4 leading-[1.1] tracking-wide">
                {slide.title}
              </h1>
              <p className="text-primary text-xl md:text-2xl lg:text-3xl font-display italic mb-10">
                {slide.subtitle}
              </p>
              <Link
                to={slide.link}
                className="inline-block bg-primary hover:bg-[#c49515] text-primary-foreground px-10 py-4 text-sm font-bold tracking-widest uppercase transition-colors"
                style={{ minHeight: '44px' }}
              >
                {slide.cta}
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1 rounded-full transition-all duration-500 ${
              i === current ? 'w-10 bg-primary' : 'w-5 bg-white/40 hover:bg-white/60'
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
