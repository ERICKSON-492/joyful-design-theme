import { Instagram } from 'lucide-react'
import { ScrollReveal } from './ScrollReveal'

export function InstagramFeed() {
  return (
    <section className="relative py-20 md:py-28 bg-background overflow-hidden">
      {/* Decorative background accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-20 blur-3xl"
        style={{ background: 'hsl(var(--primary) / 0.5)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -right-20 w-80 h-80 rounded-full opacity-20 blur-3xl"
        style={{ background: 'hsl(var(--accent) / 0.5)' }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
            <div className="inline-flex items-center gap-2 mb-5 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Instagram className="w-4 h-4 text-primary" strokeWidth={2} />
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary">
                @ushangachronicles
              </span>
            </div>
            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 leading-tight">
              From the Tribe
            </h2>
            <div className="w-16 h-[2px] bg-primary mx-auto mb-5" />
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
              Beads in the wild. Stories in motion. Follow our journey and join the conversation.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="relative max-w-5xl mx-auto">
            {/* Framed widget container */}
            <div className="relative bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden p-2 md:p-4">
              <iframe
                src="https://emb.fouita.com/widget/0x420ec3/ftvh8go8y"
                title="Ushanga Chronicles Instagram Feed"
                className="w-full border-0 rounded-xl block"
                style={{ minHeight: '600px' }}
                loading="lazy"
                allow="clipboard-write"
              />
            </div>

            {/* Decorative corner accents */}
            <div className="hidden md:block absolute -top-3 -left-3 w-12 h-12 border-t-2 border-l-2 border-primary rounded-tl-2xl" />
            <div className="hidden md:block absolute -bottom-3 -right-3 w-12 h-12 border-b-2 border-r-2 border-primary rounded-br-2xl" />
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="text-center mt-10 md:mt-14">
            <a
              href="https://www.instagram.com/ushangachronicles"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 text-sm font-bold tracking-widest uppercase transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 rounded-full"
              style={{ minHeight: '44px' }}
            >
              <Instagram className="w-5 h-5" strokeWidth={2} />
              Follow Us on Instagram
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
