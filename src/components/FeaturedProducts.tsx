import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '@/contexts/CartContext'
import { ShoppingBag } from 'lucide-react'
import { motion } from 'framer-motion'
import { fetchPublicTable } from '@/lib/publicContent'
import { ProductCardVariants } from './ProductCardVariants'
import { toast } from 'sonner'

interface Product {
  id: string
  name: string
  price: number
  image_url: string | null
  stock: number
}

export function FeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [variantState, setVariantState] = useState<Record<string, { price: number; canOrder: boolean; label: string | null; selected: boolean; hasVariants: boolean }>>({})
  const { addToCart } = useCart()

  useEffect(() => {
    let mounted = true

    const loadProducts = async () => {
      try {
        const data = await fetchPublicTable<Product>(
          'products',
          'select=id,name,price,image_url,stock&is_active=eq.true&order=created_at.desc&limit=4'
        )

        if (!mounted) return
        setProducts(data || [])
      } catch (err) {
        console.error('FeaturedProducts fetch error:', err)
        if (!mounted) return
        setProducts([])
      } finally {
        if (mounted) setHasLoaded(true)
      }
    }

    loadProducts()
    return () => {
      mounted = false
    }
  }, [])

  if (!hasLoaded && products.length === 0) {
    return (
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-center text-foreground mb-14">Crafted This Week</h2>
          <p className="text-center text-muted-foreground">Loading latest pieces...</p>
        </div>
      </section>
    )
  }

  if (products.length === 0) return null

  const handleAdd = (product: Product) => {
    const state = variantState[product.id]
    // If product has variants but user hasn't fully selected, prompt them
    if (state?.hasVariants && !state.selected) {
      toast.error('Please select all options first')
      return
    }
    const finalPrice = state?.price ?? product.price
    const finalName = state?.label ? `${product.name} (${state.label})` : product.name
    const finalId = state?.label ? `${product.id}::${state.label}` : product.id
    addToCart({ id: finalId, name: finalName, price: finalPrice, image_url: product.image_url })
  }

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
                <Link to={`/product/${product.id}`} className="product-image-frame block mb-4">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="product-image" loading="lazy"
                      onLoad={(e) => e.currentTarget.classList.add('product-image-loaded')} />
                  ) : (
                    <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground text-sm">No image</div>
                  )}
                </Link>
                <Link to={`/product/${product.id}`}>
                  <h3 className="font-display text-sm md:text-base font-semibold text-foreground mb-1 hover:text-primary transition-colors">{product.name}</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    KSh {(variantState[product.id]?.price ?? product.price).toLocaleString()}
                  </p>
                </Link>
                <ProductCardVariants
                  productId={product.id}
                  basePrice={product.price}
                  onVariantChange={(s) => setVariantState(prev => ({
                    ...prev,
                    [product.id]: {
                      price: s.price,
                      canOrder: s.canOrder,
                      label: s.label,
                      selected: !!s.variant,
                      hasVariants: s.label !== null || prev[product.id]?.hasVariants || false,
                    }
                  }))}
                />
                <button
                  onClick={() => handleAdd(product)}
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
