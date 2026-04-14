import { lazy, Suspense } from 'react'
import { HeroSection } from '@/components/HeroSection'

// Lazy-load below-the-fold sections for faster initial paint
const ShopByCategory = lazy(() => import('@/components/ShopByCategory').then(m => ({ default: m.ShopByCategory })))
const TheMaker = lazy(() => import('@/components/TheMaker').then(m => ({ default: m.TheMaker })))
const FeaturedProducts = lazy(() => import('@/components/FeaturedProducts').then(m => ({ default: m.FeaturedProducts })))
const TribeLooksSection = lazy(() => import('@/components/TribeLooksSection').then(m => ({ default: m.TribeLooksSection })))
const CustomOrderTeaser = lazy(() => import('@/components/CustomOrderTeaser').then(m => ({ default: m.CustomOrderTeaser })))
const InstagramFeed = lazy(() => import('@/components/InstagramFeed').then(m => ({ default: m.InstagramFeed })))
const JoinTheTribe = lazy(() => import('@/components/JoinTheTribe').then(m => ({ default: m.JoinTheTribe })))

function SectionFallback({ className = "min-h-[400px]" }: { className?: string }) {
  return <div className={className} />
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <Suspense fallback={<SectionFallback className="min-h-[500px] md:min-h-[600px]" />}>
        <ShopByCategory />
      </Suspense>
      <Suspense fallback={<SectionFallback className="min-h-[500px] md:min-h-[650px]" />}>
        <TheMaker />
      </Suspense>
      <Suspense fallback={<SectionFallback className="min-h-[450px] md:min-h-[550px]" />}>
        <FeaturedProducts />
      </Suspense>
      <Suspense fallback={<SectionFallback className="min-h-[400px] md:min-h-[500px]" />}>
        <TribeLooksSection />
      </Suspense>
      <Suspense fallback={<SectionFallback className="min-h-[300px] md:min-h-[400px] bg-primary" />}>
        <CustomOrderTeaser />
      </Suspense>
      <Suspense fallback={<SectionFallback className="min-h-[400px] md:min-h-[500px]" />}>
        <InstagramFeed />
      </Suspense>
      <Suspense fallback={<SectionFallback className="min-h-[350px] md:min-h-[400px]" />}>
        <JoinTheTribe />
      </Suspense>
    </>
  )
}
