import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useCart } from '@/contexts/CartContext'
import { ShoppingBag } from 'lucide-react'
import { fetchPublicTable } from '@/lib/publicContent'

const categoryList = ['All', 'Wear It', 'Live With It', 'For Your Table', 'Collectibles', 'For Your Pet', 'Wholesale & Gifting']

interface Product {
  id: string
  name: string
  price: number
  price_min: number | null
  price_max: number | null
  image_url: string | null
  stock: number
  category: string
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const catParam = searchParams.get('cat')
  const { addToCart } = useCart()

  useEffect(() => {
    if (catParam) {
      const match = categoryList.find(c => c.toLowerCase().replace(/\s+/g, '-') === catParam.toLowerCase())
      if (match) setActiveCategory(match)
    }
  }, [catParam])

  useEffect(() => {
    let mounted = true
    const loadProducts = async () => {
      setLoading(true)
      try {
        let query = 'select=id,name,price,price_min,price_max,image_url,stock,category&is_active=eq.true&order=created_at.desc'
        if (activeCategory !== 'All') query += `&category=eq.${encodeURIComponent(activeCategory)}`
        if (searchQuery) query += `&name=ilike.*${encodeURIComponent(searchQuery)}*`

        const data = await fetchPublicTable<Product>('products', query)
        if (mounted) setProducts(data || [])
      } catch {
        if (mounted) setProducts([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadProducts()
    return () => { mounted = false }
  }, [activeCategory, searchQuery])

  return (
    <div className="bg-background">
      <section className="py-12 md:py-16 bg-card">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-4">
            {searchQuery ? `Results for "${searchQuery}"` : 'Find Your Piece'}
          </h1>
          <p className="text-muted-foreground text-lg">Every piece tells a story</p>
        </div>
      </section>

      <section className="py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-3">
            {categoryList.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 border text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-primary hover:text-primary-foreground hover:border-primary'
                }`}
                style={{ minHeight: '44px' }}
              >
                {cat}
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
                    onClick={() => addToCart({ id: product.id, name: product.name, price: product.price, image_url: product.image_url })}
                    className="w-full bg-foreground text-white py-2.5 text-xs font-bold tracking-wider uppercase hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ minHeight: '44px' }}
                    disabled={product.stock === 0}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {product.stock === 0 ? 'Sold Out' : 'Add to Cart'}
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
