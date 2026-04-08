import { Link } from 'react-router-dom'
import tribe1 from '@/assets/tribe-1.jpg'
import tribe2 from '@/assets/tribe-2.jpg'
import tribe3 from '@/assets/tribe-3.jpg'
import tribe4 from '@/assets/tribe-4.jpg'
import { ScrollReveal, StaggerContainer, StaggerItem } from './ScrollReveal'

const tribeLooks = [
  { image: tribe1, name: 'Amani K.', piece: 'Layered Beaded Necklace' },
  { image: tribe2, name: 'Wanjiku M.', piece: 'Mandala Drop Earrings' },
  { image: tribe3, name: 'David O.', piece: 'Beaded Sun Mirror' },
  { image: tribe4, name: 'Nasra A.', piece: 'Stacked Bead Bracelets' },
]

export function TribeLooksSection() {
  return (
    <section className="py-16 md:py-24 bg-card">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-center text-foreground mb-14">The Tribe Wears It</h2>
        </ScrollReveal>
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto" staggerDelay={0.12}>
          {tribeLooks.map((look) => (
            <StaggerItem key={look.name}>
              <div className="group relative overflow-hidden">
                <img src={look.image} alt={`${look.name} wearing ${look.piece}`} className="w-full aspect-[3/4] object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" width={600} height={800} />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <p className="text-white font-semibold text-sm">{look.name}</p>
                  <p className="text-white/80 text-xs">{look.piece}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
        <ScrollReveal delay={0.3}>
          <div className="text-center mt-12">
            <Link to="/tribe-looks" className="inline-block bg-primary hover:bg-[#c49515] text-primary-foreground px-10 py-3 text-sm font-bold tracking-widest uppercase transition-colors">
              Share Your Look
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
