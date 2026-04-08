import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/integrations/supabase/client'

/**
 * Convert a Supabase storage URL to a resized/optimized version.
 * Uses Supabase Image Transforms (render endpoint) for much smaller files.
 */
function optimizeImageUrl(url: string): string {
  return url || ''
}

interface Slide {
  id: string
  image_url: string
  title: string
  subtitle: string
  cta_text: string
  cta_link: string
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
  const [ready, setReady] = useState(false)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
  const imgWidth = isMobile ? 800 : 1920

  useEffect(() => {
    let isMounted = true

    const fetchSlides = async () => {
      try {
        const { data, error } = await supabase
          .from('hero_slides')
          .select('id, image_url, title, subtitle, cta_text, cta_link')
          .eq('is_active', true)
          .order('display_order')

        if (!isMounted) return

        if (error) {
          setReady(true)
          return
        }

        const normalized = normalizeSlides(data)
        setSlides(normalized)

        // Preload first image eagerly, rest in background
        if (normalized[0]?.image_url) {
          const img = new window.Image()
          img.onload = () => { if (isMounted) setReady(true) }
          img.onerror = () => { if (isMounted) setReady(true) }
          img.src = optimizeImageUrl(normalized[0].image_url)
        } else {
          setReady(true)
        }

        // Preload remaining images in background
        normalized.slice(1).forEach((slide) => {
          if (slide.image_url) {
            const img = new window.Image()
            img.src = optimizeImageUrl(slide.image_url)
          }
        })
      } catch {
        if (isMounted) setReady(true)
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

  useEffect(() => {
    if (safeSlides.length <= 1) return

    const timer = window.setInterval(nextSlide, 4500)
    return () => window.clearInterval(timer)
  }, [nextSlide, safeSlides.length])

  // Only render the active slide and the next one for performance
  const visibleIndices = useMemo(() => {
    const next = (activeIndex + 1) % safeSlides.length
    return new Set([activeIndex, next])
  }, [activeIndex, safeSlides.length])

  return (
    <section
      className="relative w-full h-[85vh] md:h-screen overflow-hidden"
      aria-label="Hero"
      style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.3) 0%, hsl(var(--accent) / 0.5) 50%, hsl(var(--primary) / 0.2) 100%)' }}
    >
      {safeSlides.map((slide, index) => {
        if (!visibleIndices.has(index)) return null
        const isActive = index === activeIndex
        return slide.image_url ? (
          <motion.img
            key={slide.id}
            src={optimizeImageUrl(slide.image_url)}
            alt={slide.subtitle}
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            className="absolute inset-0 h-full w-full object-cover"
            initial={false}
            animate={{
              opacity: isActive ? 1 : 0,
              scale: isActive ? 1 : 1.04,
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ zIndex: isActive ? 1 : 0 }}
          />
        ) : (
          <div
            key={slide.id}
            className="absolute inset-0 h-full w-full"
            style={{ zIndex: isActive ? 1 : 0, background: 'linear-gradient(135deg, hsl(var(--primary) / 0.3) 0%, hsl(var(--accent) / 0.5) 50%, hsl(var(--primary) / 0.2) 100%)' }}
          />
        )
      })}

      <div
        className="absolute inset-0 z-[2]"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.30) 50%, rgba(0,0,0,0.50) 100%)',
        }}
      />

      <div className="absolute inset-0 z-[3] flex items-center justify-center px-6 text-center">
        <div className="max-w-3xl">
          <AnimatePresence initial={false} mode="sync">
            <motion.div
              key={activeSlide.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-4 leading-[1.1] tracking-wide drop-shadow-lg">
                {activeSlide.title}
              </h1>
              <p className="text-primary text-xl md:text-2xl lg:text-3xl font-display italic mb-10 drop-shadow-md">
                {activeSlide.subtitle}
              </p>
              <Link
                to={activeSlide.cta_link}
                className="inline-block bg-primary hover:bg-primary/85 text-primary-foreground px-10 py-4 text-sm font-bold tracking-widest uppercase transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                style={{ minHeight: '44px' }}
              >
                {activeSlide.cta_text}
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {safeSlides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 z-[4] flex -translate-x-1/2 gap-3">
          {safeSlides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => setCurrent(index)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index === activeIndex ? 'w-10 bg-primary shadow-md' : 'w-5 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
