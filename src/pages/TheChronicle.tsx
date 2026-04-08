import lindaPortrait from '@/assets/linda-portrait.jpg'
import artisanWorking from '@/assets/artisan-working.jpg'

export default function TheChronicle() {
  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-6">
            The Chronicle
          </h1>
          <p className="text-primary font-display text-xl italic">
            One bead. A thousand stories.
          </p>
        </div>
      </section>

      {/* Linda's Story */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
            <img
              src={lindaPortrait}
              alt="Linda, founder of Ushanga Chronicles"
              className="w-full max-w-md mx-auto"
              loading="lazy"
            />
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                Where It All Began
              </h2>
              <div className="space-y-4 text-muted-foreground text-base leading-relaxed">
                <p>
                  In 2018, Linda received a single beaded necklace on her graduation day. 
                  It wasn't just a gift — it was a spark. That one bead carried the weight 
                  of centuries of African craftsmanship, the stories of hands that wove it, 
                  and the promise of something greater.
                </p>
                <p>
                  From that moment, Linda began learning the art herself — studying under 
                  Maasai artisans, understanding the language of beads, colors, and patterns 
                  that had been passed down through generations.
                </p>
                <p>
                  Ushanga Chronicles was born from that passion. Every piece is handcrafted 
                  in Nairobi, Kenya, rooted in African heritage but designed for modern life. 
                  Each creation carries a story — not just of the artisan who made it, but 
                  of the person who wears it.
                </p>
                <p>
                  Today, the Ushanga Tribe spans the globe. What started with one bead has 
                  become a thousand stories, and counting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Craft */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
            <div className="order-2 lg:order-1">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                The Craft
              </h2>
              <div className="space-y-4 text-muted-foreground text-base leading-relaxed">
                <p>
                  Every piece begins with intention. The beads are carefully selected — 
                  each color holding meaning, each pattern telling a different chapter.
                </p>
                <p>
                  Our artisans work by hand, using techniques that have been refined over 
                  generations. There are no machines, no shortcuts. Just skilled hands, 
                  quality materials, and the patience to create something extraordinary.
                </p>
                <p>
                  From sisal to leather, cowrie shells to glass beads — every material is 
                  sourced with care, ensuring that each piece is not just beautiful, but 
                  built to last.
                </p>
              </div>
            </div>
            <img
              src={artisanWorking}
              alt="Artisan handcrafting a beaded piece"
              className="w-full max-w-md mx-auto order-1 lg:order-2"
              loading="lazy"
            />
          </div>
        </div>
      </section>
    </div>
  )
}
