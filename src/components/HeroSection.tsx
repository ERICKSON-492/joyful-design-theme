import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/integrations/supabase/client'

interface Slide {
  id: string
  image_url: string
  title: string
  subtitle: string
  cta_text: string
  cta_link: string
}

const fallbackSlides: Slide[] = [
  { id: '1', image_url: '', title: 'USHANGA CHRONICLES', subtitle: 'One bead. A thousand stories.', cta_text: 'Explore the Tribe', cta_link: '/shop' },
]

export function HeroSection() {
  const [slides, setSlides] = useState<Slide[]>(fallbackSlides)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('hero_slides')
        .select('id, image_url, title, subtitle, cta_text, cta_link')
        .eq('is_active', true)
        .order('display_order')
      setSlides(data && data.length > 0 ? data : fallbackSlides)
    }
    fetch()
  }, [])

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % (slides.length || 1))
  }, [slides.length])

  useEffect(() => {
    if (slides.length <= 1) return
    const timer = setInterval(nextSlide, 4500)
    return () => clearInterval(timer)
  }, [nextSlide, slides.length])

  if (slides.length === 0) return null

  const slide = slides[current]

  return (
    <section className="relative w-full h-[85vh] md:h-screen overflow-hidden bg-foreground">
      {slides.map((s, i) => (
        s.image_url ? (
          <motion.img
            key={s.id}
            src={s.image_url}
            alt={s.subtitle}
            className="absolute inset-0 w-full h-full object-cover"
            initial={false}
            animate={{
              opacity: i === current ? 1 : 0,
              scale: i === current ? 1 : 1.05,
            }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            style={{ zIndex: i === current ? 1 : 0 }}
          />
        ) : (
          <div
            key={s.id}
            className="absolute inset-0 w-full h-full bg-foreground"
            style={{ zIndex: i === current ? 1 : 0 }}
          />
        )
      ))}

      <div
        className="absolute inset-0 z-[2]"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.30) 50%, rgba(0,0,0,0.50) 100%)',
        }}
      />

      <div className="absolute inset-0 z-[3] flex items-center justify-center text-center px-6">
        <div className="max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-4 leading-[1.1] tracking-wide drop-shadow-lg">
                {slide.title}
              </h1>
              <p className="text-primary text-xl md:text-2xl lg:text-3xl font-display italic mb-10 drop-shadow-md">
                {slide.subtitle}
              </p>
              <Link
                to={slide.cta_link}
                className="inline-block bg-primary hover:bg-primary/85 text-primary-foreground px-10 py-4 text-sm font-bold tracking-widest uppercase transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                style={{ minHeight: '44px' }}
              >
                {slide.cta_text}
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-[4]">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === current ? 'w-10 bg-primary shadow-md' : 'w-5 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
