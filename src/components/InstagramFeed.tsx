import { Instagram } from 'lucide-react'

export function InstagramFeed() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 text-center">
        <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
          Follow the Journey
        </h2>
        <a
          href="https://www.instagram.com/ushanga_chronicles/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary font-semibold text-lg mb-12 hover:underline"
        >
          <Instagram className="w-5 h-5" />
          @ushanga_chronicles
        </a>

        {/* Placeholder grid — replace with live feed integration */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 max-w-5xl mx-auto">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square bg-accent flex items-center justify-center"
            >
              <Instagram className="w-8 h-8 text-muted-foreground/30" />
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-6">
          Connect your Instagram to display your latest posts here
        </p>
      </div>
    </section>
  )
}
