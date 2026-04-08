import { ScrollReveal } from './ScrollReveal'

export function InstagramFeed() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="w-full max-w-5xl mx-auto">
            <iframe
              src="https://emb.fouita.com/widget/0x420ec3/ftvh8go8y"
              title="Ushanga Chronicles Instagram Feed"
              className="w-full border-0"
              style={{ minHeight: '600px' }}
              loading="lazy"
              allow="clipboard-write"
            />
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
