import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { HeroSection } from '@/components/HeroSection'
import { HomepageIntro } from '@/components/HomepageIntro'
import { useSEO } from '@/hooks/useSEO'

// Lazy-load below-the-fold sections for faster initial paint
const ShopByCategory = lazy(() => import('@/components/ShopByCategory').then(m => ({ default: m.ShopByCategory })))
const TheMaker = lazy(() => import('@/components/TheMaker').then(m => ({ default: m.TheMaker })))
const FeaturedProducts = lazy(() => import('@/components/FeaturedProducts').then(m => ({ default: m.FeaturedProducts })))
const TribeLooksSection = lazy(() => import('@/components/TribeLooksSection').then(m => ({ default: m.TribeLooksSection })))
const CustomOrderTeaser = lazy(() => import('@/components/CustomOrderTeaser').then(m => ({ default: m.CustomOrderTeaser })))
const JoinTheTribe = lazy(() => import('@/components/JoinTheTribe').then(m => ({ default: m.JoinTheTribe })))

function SectionFallback({ className = "min-h-[400px]" }: { className?: string }) {
  return <div className={className} />
}

function DeferredSection({ children, fallbackClassName }: { children: React.ReactNode; fallbackClassName: string }) {
  const [shouldRender, setShouldRender] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return
    if (!('IntersectionObserver' in window)) {
      setShouldRender(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setShouldRender(true)
      observer.disconnect()
    }, { rootMargin: '800px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={sectionRef}>
      {shouldRender ? children : <SectionFallback className={fallbackClassName} />}
    </div>
  )
}

export default function HomePage() {
  useSEO(
    'Handcrafted African Jewelry & Home Decor',
    'Ushanga Chronicles — handcrafted African jewelry, pet accessories, and home decor made by artisans in Nairobi, Kenya. Every piece tells a story.',
    '/'
  )
  return (
    <>
      <HeroSection />
      <HomepageIntro />
      <DeferredSection fallbackClassName="min-h-[500px] md:min-h-[600px]">
        <Suspense fallback={<SectionFallback className="min-h-[500px] md:min-h-[600px]" />}><ShopByCategory /></Suspense>
      </DeferredSection>
      <DeferredSection fallbackClassName="min-h-[450px] md:min-h-[550px]">
        <Suspense fallback={<SectionFallback className="min-h-[450px] md:min-h-[550px]" />}><FeaturedProducts /></Suspense>
      </DeferredSection>
      <DeferredSection fallbackClassName="min-h-[500px] md:min-h-[650px]">
        <Suspense fallback={<SectionFallback className="min-h-[500px] md:min-h-[650px]" />}><TheMaker /></Suspense>
      </DeferredSection>
      <DeferredSection fallbackClassName="min-h-[400px] md:min-h-[500px]">
        <Suspense fallback={<SectionFallback className="min-h-[400px] md:min-h-[500px]" />}><TribeLooksSection /></Suspense>
      </DeferredSection>
      <DeferredSection fallbackClassName="min-h-[300px] md:min-h-[400px] bg-primary">
        <Suspense fallback={<SectionFallback className="min-h-[300px] md:min-h-[400px] bg-primary" />}><CustomOrderTeaser /></Suspense>
      </DeferredSection>
      <DeferredSection fallbackClassName="min-h-[350px] md:min-h-[400px]">
        <Suspense fallback={<SectionFallback className="min-h-[350px] md:min-h-[400px]" />}><JoinTheTribe /></Suspense>
      </DeferredSection>
    </>
  )
}
