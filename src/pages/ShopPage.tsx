import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import catWearIt from '@/assets/cat-wear-it.jpg'
import catLiveWithIt from '@/assets/cat-live-with-it.jpg'
import catCollectibles from '@/assets/cat-collectibles.jpg'
import catPet from '@/assets/cat-pet.jpg'
import catTable from '@/assets/cat-table.jpg'

const categories = [
  { name: 'All', image: catWearIt },
  { name: 'Wear It', image: catWearIt },
  { name: 'Live With It', image: catLiveWithIt },
  { name: 'For Your Table', image: catTable },
  { name: 'Collectibles', image: catCollectibles },
  { name: 'For Your Pet', image: catPet },
  { name: 'Wholesale & Gifting', image: catWearIt },
]

interface Product {
  id: string
  name: string
  price: number
  image_url: string | null
  stock: number
  category: string
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      let query = supabase.from('products').select('id, name, price, image_url, stock, category').eq('is_active', true)
      if (activeCategory !== 'All') query = query.eq('category', activeCategory)
      const { data } = await query.order('created_at', { ascending: false })
      setProducts(data || [])
      setLoading(false)
    }
    fetchProducts()
  }, [activeCategory])

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

      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`px-5 py-2 border text-sm font-medium transition-colors ${
                  activeCategory === cat.name
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-primary hover:text-primary-foreground hover:border-primary'
                }`}
                style={{ minHeight: '44px' }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 pb-24">
        <div className="container mx-auto px-4">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No products found. Check back soon!</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
              {products.map((product) => (
                <div key={product.id} className="group">
                  <div className="overflow-hidden bg-card mb-4 relative">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground text-sm">No image</div>
                    )}
                    {product.stock <= 3 && product.stock > 0 && (
                      <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-xs px-2 py-1 font-semibold">
                        Only {product.stock} left
                      </span>
                    )}
                    {product.stock === 0 && (
                      <span className="absolute top-2 left-2 bg-foreground text-background text-xs px-2 py-1 font-semibold">
                        Sold Out
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-sm md:text-base font-semibold text-foreground mb-1">
                    {product.name}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-3">KSh {product.price.toLocaleString()}</p>
                  <button
                    className="w-full bg-foreground text-white py-2.5 text-xs font-bold tracking-wider uppercase hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50"
                    style={{ minHeight: '44px' }}
                    disabled={product.stock === 0}
                  >
                    {product.stock === 0 ? 'Sold Out' : 'Claim This'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
