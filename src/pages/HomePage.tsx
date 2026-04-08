import { HeroSection } from '@/components/HeroSection'
import { ShopByCategory } from '@/components/ShopByCategory'
import { TheMaker } from '@/components/TheMaker'
import { FeaturedProducts } from '@/components/FeaturedProducts'
import { TribeLooksSection } from '@/components/TribeLooksSection'
import { CustomOrderTeaser } from '@/components/CustomOrderTeaser'
import { InstagramFeed } from '@/components/InstagramFeed'
import { JoinTheTribe } from '@/components/JoinTheTribe'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ShopByCategory />
      <TheMaker />
      <FeaturedProducts />
      <TribeLooksSection />
      <CustomOrderTeaser />
      <InstagramFeed />
      <JoinTheTribe />
    </>
  )
}
