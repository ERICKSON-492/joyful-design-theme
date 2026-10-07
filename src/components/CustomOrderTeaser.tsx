import { Link } from 'react-router-dom'
import { ScrollReveal } from './ScrollReveal'
import { useSiteContent } from '@/hooks/useSiteContent'

const fallback = {
  title: 'Something made just for you',
  body: 'Every piece tells your story. Commission a custom creation from Linda. From imagination to your hands - handcrafted with intention.',
}

export function CustomOrderTeaser() {
  const content = useSiteContent('custom_order_teaser')
  const title = content?.title ?? fallback.title
  const body = content?.body ?? fallback.body

  return (
    <section className="py-16 md:py-24 bg-primary">
      <div className="container mx-auto px-4 text-center max-w-3xl">
        <ScrollReveal>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground mb-6">{title}</h2>
        </ScrollReveal>
        <ScrollReveal delay={0.15}>
          <p className="text-primary-foreground/80 text-base md:text-lg leading-relaxed mb-10">
            {body}
          </p>
          {content?.subtitle && <p className="text-primary-foreground/80 text-sm md:text-base mb-6">{content.subtitle}</p>}
        </ScrollReveal>
        <ScrollReveal delay={0.3}>
          <Link to="/custom-order" className="inline-block bg-foreground text-white hover:bg-foreground/90 px-10 py-4 text-sm font-bold tracking-widest uppercase transition-colors" style={{ minHeight: '44px' }}>
            Start Your Chronicle
          </Link>
        </ScrollReveal>
      </div>
    </section>
  )
}
