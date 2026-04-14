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

function SectionFallback() {
  return <div className="min-h-[200px]" />
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <Suspense fallback={<SectionFallback />}>
        <ShopByCategory />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <TheMaker />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <FeaturedProducts />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <TribeLooksSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <CustomOrderTeaser />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <InstagramFeed />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <JoinTheTribe />
      </Suspense>
    </>
  )
}
