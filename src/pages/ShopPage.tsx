import { Link } from 'react-router-dom'
import product1 from '@/assets/product-1.jpg'
import product2 from '@/assets/product-2.jpg'
import product3 from '@/assets/product-3.jpg'
import product4 from '@/assets/product-4.jpg'
import catWearIt from '@/assets/cat-wear-it.jpg'
import catLiveWithIt from '@/assets/cat-live-with-it.jpg'
import catCollectibles from '@/assets/cat-collectibles.jpg'
import catPet from '@/assets/cat-pet.jpg'
import catTable from '@/assets/cat-table.jpg'

const categories = [
  { name: 'Wear It', image: catWearIt },
  { name: 'Live With It', image: catLiveWithIt },
  { name: 'For Your Table', image: catTable },
  { name: 'Collectibles', image: catCollectibles },
  { name: 'For Your Pet', image: catPet },
  { name: 'Wholesale & Gifting', image: catWearIt },
]

const products = [
  { name: 'Maasai Beaded Necklace', price: 'KSh 3,500', image: product1, stock: 3 },
  { name: 'Mandala Drop Earrings', price: 'KSh 1,800', image: product2, stock: 7 },
  { name: 'Sisal Storage Basket', price: 'KSh 2,200', image: product3, stock: 2 },
  { name: 'Beaded Leather Sandals', price: 'KSh 4,500', image: product4, stock: 5 },
  { name: 'Maasai Beaded Necklace', price: 'KSh 3,500', image: product1, stock: 4 },
  { name: 'Mandala Drop Earrings', price: 'KSh 1,800', image: product2, stock: 8 },
  { name: 'Sisal Storage Basket', price: 'KSh 2,200', image: product3, stock: 1 },
  { name: 'Beaded Leather Sandals', price: 'KSh 4,500', image: product4, stock: 6 },
]

export default function ShopPage() {
  return (
    <div className="bg-background">
      <section className="py-12 md:py-16 bg-card">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-4">
            Find Your Piece
          </h1>
          <p className="text-muted-foreground text-lg">Every piece tells a story</p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
              <button
                key={cat.name}
                className="px-5 py-2 border border-border text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                style={{ minHeight: '44px' }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-10 pb-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
            {products.map((product, i) => (
              <div key={`${product.name}-${i}`} className="group">
                <div className="overflow-hidden bg-card mb-4 relative">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  {product.stock <= 3 && (
                    <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs px-2 py-1 font-semibold">
                      Only {product.stock} left
                    </span>
                  )}
                </div>
                <h3 className="font-display text-sm md:text-base font-semibold text-foreground mb-1">
                  {product.name}
                </h3>
                <p className="text-muted-foreground text-sm mb-3">{product.price}</p>
                <button
                  className="w-full bg-foreground text-white py-2.5 text-xs font-bold tracking-wider uppercase hover:bg-primary hover:text-primary-foreground transition-colors"
                  style={{ minHeight: '44px' }}
                >
                  Claim This
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
