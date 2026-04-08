import { Link } from 'react-router-dom'
import lindaPortrait from '@/assets/linda-portrait.jpg'
import { ScrollReveal } from './ScrollReveal'

export function TheMaker() {
  return (
    <section className="py-16 md:py-24 bg-card">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
          <ScrollReveal direction="right" className="order-2 lg:order-1">
            <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-6">The Chronicle Begins</h2>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-4">
              It started with one bead. A single beaded necklace, gifted to Linda on her graduation day in 2018. That moment sparked something — a deep connection to the craft, the culture, and the stories each bead carries.
            </p>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed mb-8">
              What began as a passion project grew into Ushanga Chronicles — a brand rooted in African heritage, handcrafted by skilled artisans, and worn by the Ushanga Tribe across the world.
            </p>
            <Link to="/about-us" className="inline-block border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-3 text-sm font-bold tracking-widest uppercase transition-colors" style={{ minHeight: '44px' }}>
              Read the Full Story
            </Link>
          </ScrollReveal>
          <ScrollReveal direction="left" className="order-1 lg:order-2">
            <img src={lindaPortrait} alt="Linda, founder of Ushanga Chronicles, wearing a traditional Maasai beaded necklace" className="w-full max-w-md mx-auto lg:max-w-none" loading="lazy" width={600} height={800} />
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
