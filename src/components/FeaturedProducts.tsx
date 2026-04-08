import { Link } from 'react-router-dom'
import product1 from '@/assets/product-1.jpg'
import product2 from '@/assets/product-2.jpg'
import product3 from '@/assets/product-3.jpg'
import product4 from '@/assets/product-4.jpg'

const products = [
  { name: 'Maasai Beaded Necklace', price: 'KSh 3,500', image: product1 },
  { name: 'Mandala Drop Earrings', price: 'KSh 1,800', image: product2 },
  { name: 'Sisal Storage Basket', price: 'KSh 2,200', image: product3 },
  { name: 'Beaded Leather Sandals', price: 'KSh 4,500', image: product4 },
]

export function FeaturedProducts() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl md:text-5xl font-bold text-center text-foreground mb-14">
          Crafted This Week
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
          {products.map((product) => (
            <div key={product.name} className="group">
              <div className="overflow-hidden bg-card mb-4">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  width={800}
                  height={800}
                />
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
        <div className="text-center mt-12">
          <Link
            to="/shop"
            className="inline-block border-2 border-foreground text-foreground hover:bg-foreground hover:text-white px-10 py-3 text-sm font-bold tracking-widest uppercase transition-colors"
          >
            See All Products
          </Link>
        </div>
      </div>
    </section>
  )
}
