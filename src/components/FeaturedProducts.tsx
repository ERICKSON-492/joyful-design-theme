import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useCart } from '@/contexts/CartContext'
import { ShoppingBag } from 'lucide-react'
import { motion } from 'framer-motion'

interface Product {
  id: string
  name: string
  price: number
  image_url: string | null
  stock: number
}

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const { addToCart } = useCart()

  useEffect(() => {
    let mounted = true
    const loadProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, price, image_url, stock')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(4)
        if (!mounted) return
        if (error) {
          console.error('FeaturedProducts fetch error:', error)
          setProducts([])
          return
        }
        setProducts(data || [])
      } catch (err) {
        console.error('FeaturedProducts exception:', err)
        if (mounted) setProducts([])
      }
    }
    loadProducts()
    return () => { mounted = false }
  }, [])

  if (products === null || products.length === 0) return null

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl md:text-5xl font-bold text-center text-foreground mb-14">Crafted This Week</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <div className="group">
                <div className="overflow-hidden bg-card mb-4">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground text-sm">No image</div>
                  )}
                </div>
                <h3 className="font-display text-sm md:text-base font-semibold text-foreground mb-1">{product.name}</h3>
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
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link to="/shop" className="inline-block border-2 border-foreground text-foreground hover:bg-foreground hover:text-white px-10 py-3 text-sm font-bold tracking-widest uppercase transition-colors">
            See All Products
          </Link>
        </div>
      </div>
    </section>
  )
}
