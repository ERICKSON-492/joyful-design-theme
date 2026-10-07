import { ScrollReveal } from './ScrollReveal'
import { useSiteContent } from '@/hooks/useSiteContent'

export function HomepageIntro() {
  const content = useSiteContent('homepage_intro')
  if (!content || !(content.title || content.subtitle || content.body)) return null

  return (
    <section className="py-10 md:py-14 bg-background" aria-label="Homepage introduction">
      <div className="container mx-auto px-4 max-w-4xl text-center">
        <ScrollReveal>
          {content.title && (
            <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-3">
              {content.title}
            </h2>
          )}
          {content.subtitle && (
            <p className="text-primary font-display text-lg md:text-xl italic mb-3">
              {content.subtitle}
            </p>
          )}
          {content.body && (
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed whitespace-pre-line">
              {content.body}
            </p>
          )}
        </ScrollReveal>
      </div>
    </section>
  )
}
