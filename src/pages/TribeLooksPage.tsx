import tribe1 from '@/assets/tribe-1.jpg'
import tribe2 from '@/assets/tribe-2.jpg'
import tribe3 from '@/assets/tribe-3.jpg'
import tribe4 from '@/assets/tribe-4.jpg'
import catWearIt from '@/assets/cat-wear-it.jpg'
import catLiveWithIt from '@/assets/cat-live-with-it.jpg'

const looks = [
  { image: tribe1, name: 'Amani K.', piece: 'Layered Beaded Necklace' },
  { image: tribe2, name: 'Wanjiku M.', piece: 'Mandala Drop Earrings' },
  { image: tribe3, name: 'David O.', piece: 'Beaded Sun Mirror' },
  { image: tribe4, name: 'Nasra A.', piece: 'Stacked Bead Bracelets' },
  { image: catWearIt, name: 'Tribe Collection', piece: 'Various Pieces' },
  { image: catLiveWithIt, name: 'Home Feature', piece: 'Living Room Setup' },
]

export default function TribeLooksPage() {
  return (
    <div className="bg-background">
      <section className="py-12 md:py-16 bg-card">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-4">
            Tribe Looks
          </h1>
          <p className="text-muted-foreground text-lg">
            Real Tribe Members. Real pieces. Real stories.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            {looks.map((look, i) => (
              <div key={i} className="group relative overflow-hidden">
                <img
                  src={look.image}
                  alt={`${look.name} wearing ${look.piece}`}
                  className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <p className="text-white font-semibold text-sm">{look.name}</p>
                  <p className="text-white/80 text-xs">{look.piece}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">Want to be featured? Share your Ushanga look!</p>
            <a
              href="https://wa.me/254748207000?text=Hi! I'd like to share my Ushanga look."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-primary hover:bg-[#c49515] text-primary-foreground px-10 py-3 text-sm font-bold tracking-widest uppercase transition-colors"
            >
              Share Your Look
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
