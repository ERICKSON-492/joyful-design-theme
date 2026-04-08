import { Link } from 'react-router-dom'
import catWearIt from '@/assets/cat-wear-it.jpg'
import catLiveWithIt from '@/assets/cat-live-with-it.jpg'
import catCollectibles from '@/assets/cat-collectibles.jpg'
import catPet from '@/assets/cat-pet.jpg'
import catTable from '@/assets/cat-table.jpg'

const categories = [
  { name: 'Wear It', image: catWearIt, href: '/shop?cat=wear-it' },
  { name: 'Live With It', image: catLiveWithIt, href: '/shop?cat=live-with-it' },
  { name: 'Collectibles', image: catCollectibles, href: '/shop?cat=collectibles' },
  { name: 'For Your Pet', image: catPet, href: '/shop?cat=pet' },
  { name: 'For Your Table', image: catTable, href: '/shop?cat=table' },
]

export function ShopByCategory() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl md:text-5xl font-bold text-center text-foreground mb-14">
          Find Your Chronicle
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 max-w-6xl mx-auto">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={cat.href}
              className="group relative overflow-hidden aspect-square"
            >
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                width={800}
                height={800}
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-primary/60 transition-colors duration-300" />
              <div className="absolute inset-0 flex items-center justify-center">
                <h3 className="text-white font-display text-lg md:text-xl font-bold text-center px-2">
                  {cat.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
