import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { fetchPublicTable } from '@/lib/publicContent'

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

const normalizeSlides = (
  data: Partial<Slide>[] | null | undefined
): Slide[] => {
  if (!data || data.length === 0) return fallbackSlides

  const cleanedSlides = data.map((slide, index) => ({
    id: slide.id || `hero-slide-${index}`,
    image_url: slide.image_url || '',
    title: slide.title?.trim() || fallbackSlides[0].title,
    subtitle: slide.subtitle?.trim() || fallbackSlides[0].subtitle,
    cta_text: slide.cta_text?.trim() || fallbackSlides[0].cta_text,
    cta_link: slide.cta_link?.trim() || fallbackSlides[0].cta_link,
  }))

  return cleanedSlides.length > 0
    ? cleanedSlides
    : fallbackSlides
}

export function HeroSection() {
  const [slides, setSlides] = useState<Slide[]>(fallbackSlides)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    let isMounted = true

    const fetchSlides = async () => {
      try {
        const data = await fetchPublicTable<Slide>(
          'hero_slides',
          'select=id,image_url,title,subtitle,cta_text,cta_link&is_active=eq.true&order=display_order.asc'
        )

        if (!isMounted) return

        const normalized = normalizeSlides(data)
        setSlides(normalized)

        if (typeof window !== 'undefined') {
          normalized.slice(0, 2).forEach((slide, index) => {
            if (!slide.image_url) return

            const href = optimizeImageUrl(slide.image_url)

            if (
              index === 0 &&
              typeof document !== 'undefined'
            ) {
              document
                .querySelectorAll(
                  'link[data-hero-preload="true"]'
                )
                .forEach((el) => el.remove())

              const preloadLink =
                document.createElement('link')

              preloadLink.rel = 'preload'
              preloadLink.as = 'image'
              preloadLink.href = href
              preloadLink.setAttribute(
                'fetchpriority',
                'high'
              )
              preloadLink.setAttribute(
                'data-hero-preload',
                'true'
              )

              document.head.appendChild(preloadLink)
            }

            const img = new Image()
            img.src = href
          })
        }
      } catch (error) {
        console.error(
          'HeroSection fetch error:',
          error
        )

        if (isMounted) {
          setSlides(fallbackSlides)
        }
      }
    }

    fetchSlides()

    return () => {
      isMounted = false
    }
  }, [])

  const safeSlides = useMemo(
    () =>
      slides.length > 0
        ? slides
        : fallbackSlides,
    [slides]
  )

  useEffect(() => {
    if (current >= safeSlides.length) {
      setCurrent(0)
    }
  }, [current, safeSlides.length])

  const activeIndex =
    current < safeSlides.length ? current : 0

  const activeSlide =
    safeSlides[activeIndex] || fallbackSlides[0]

  const nextSlide = useCallback(() => {
    setCurrent((prev) =>
      safeSlides.length > 0
        ? (prev + 1) % safeSlides.length
        : 0
    )
  }, [safeSlides.length])

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      safeSlides.length <= 1
    ) {
      return
    }

    const timer = window.setInterval(
      nextSlide,
      4500
    )

    return () => {
      window.clearInterval(timer)
    }
  }, [nextSlide, safeSlides.length])

  const visibleIndices = useMemo(() => {
    if (safeSlides.length === 1) {
      return new Set([0])
    }

    return new Set([
      activeIndex,
      (activeIndex + 1) % safeSlides.length,
    ])
  }, [activeIndex, safeSlides.length])

  return (
    <section
      className="relative w-full h-[85vh] md:h-screen overflow-hidden"
      aria-label="Hero"
      style={{
        background:
          'linear-gradient(135deg, hsl(var(--primary) / 0.3) 0%, hsl(var(--accent) / 0.5) 50%, hsl(var(--primary) / 0.2) 100%)',
      }}
    >
      {safeSlides.map((slide, index) => {
        if (!visibleIndices.has(index)) return null

        const isActive =
          index === activeIndex

        return slide.image_url ? (
          <img
            key={slide.id}
            src={optimizeImageUrl(
              slide.image_url
            )}
            alt={
              slide.subtitle || slide.title
            }
            loading={
              index === 0
                ? 'eager'
                : 'lazy'
            }
            decoding={
              index === 0
                ? 'sync'
                : 'async'
            }
            fetchPriority={
              index === 0
                ? 'high'
                : 'auto'
            }
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-out"
            style={{
              zIndex: isActive ? 1 : 0,
              opacity: isActive ? 1 : 0,
            }}
          />
        ) : (
          <div
            key={slide.id}
            className="absolute inset-0 h-full w-full"
            style={{
              zIndex: isActive ? 1 : 0,
              background:
                'linear-gradient(135deg, hsl(var(--primary) / 0.3) 0%, hsl(var(--accent) / 0.5) 50%, hsl(var(--primary) / 0.2) 100%)',
            }}
          />
        )
      })}

      <div
        className="absolute inset-0 z-[2]"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.30) 50%, rgba(0,0,0,0.50) 100%)',
        }}
      />

      <div className="absolute inset-0 z-[3] flex items-center justify-center px-6 text-center">
        <div className="max-w-3xl">
          <div
            key={activeSlide.id}
            className="animate-fade-in"
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
              style={{
                minHeight: '44px',
              }}
            >
              {activeSlide.cta_text}
            </Link>
          </div>
        </div>
      </div>

      {safeSlides.length > 1 && (
        <div className="absolute bottom-8 left-1/2 z-[4] flex -translate-x-1/2 gap-3">
          {safeSlides.map(
            (slide, index) => (
              <button
                key={slide.id}
                onClick={() =>
                  setCurrent(index)
                }
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  index === activeIndex
                    ? 'w-10 bg-primary shadow-md'
                    : 'w-5 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${
                  index + 1
                }`}
              />
            )
          )}
        </div>
      )}
    </section>
  )
}
