import collectionRoomDecor from '@/assets/collection-room-decor.jpg'
import collectionDining from '@/assets/collection-dining.jpg'
import collectionBoutique from '@/assets/collection-boutique.jpg'

const collections = [
  {
    image: collectionRoomDecor,
    title: 'In-Room Decor & Accessories',
    description: 'A curated selection of artisan-made pieces designed to add warmth, texture, and authenticity to every stay; featuring soapstone décor, candle holders, woven baskets, art prints, bedding, rugs and more.',
  },
  {
    image: collectionDining,
    title: 'Restaurant & Dining',
    description: 'Handcrafted dining pieces that elevate presentation and guest experience; featuring hand-carved tableware, beaded coasters, placemats, serving boards, napkin rings and more.',
  },
  {
    image: collectionBoutique,
    title: 'Boutique & Gift Shop Collections',
    description: 'Authentic, artisan-made souvenirs that guests will cherish featuring keychains, fridge magnets, openers, animal figurines, jewelry, and more.',
  },
]

export function HospitalityCollections() {
  return (
    <section id="collections" className="py-16 md:py-24 bg-card">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl md:text-5xl font-semibold text-primary text-center mb-16">
          Hospitality Collections
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {collections.map((col) => (
            <div key={col.title} className="group cursor-pointer">
              <div className="overflow-hidden rounded-lg mb-6">
                <img
                  src={col.image}
                  alt={col.title}
                  className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  width={800}
                  height={800}
                />
              </div>
              <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-3">
                {col.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-body">
                {col.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
