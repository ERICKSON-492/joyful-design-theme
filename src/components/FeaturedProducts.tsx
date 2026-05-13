import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '@/contexts/CartContext'
import { ShoppingBag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchPublicTable } from '@/lib/publicContent'

interface Product {
  id: string
  name: string
  price: number
  image_url: string | null
  stock: number
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function FeaturedProducts() {
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [offset, setOffset] = useState(0)
  const [hasLoaded, setHasLoaded] = useState(false)
  const { addToCart } = useCart()
  const preloadedRef = useRef<Set<string>>(new Set())

  // Preload a list of image URLs into the browser cache
  const preloadImages = (urls: (string | null)[]) => {
    urls.forEach(url => {
      if (!url || preloadedRef.current.has(url)) return
      preloadedRef.current.add(url)
      const img = new Image()
      img.decoding = 'async'
      img.src = url
    })
  }

  useEffect(() => {
    let mounted = true

    const loadProducts = async () => {
      try {
        const data = await fetchPublicTable<Product>(
          'products',
          'select=id,name,price,image_url,stock&is_active=eq.true&order=created_at.desc&limit=24'
        )

        if (!mounted) return
        setAllProducts(shuffle(data || []))
        // Warm the browser cache with EVERY product image up-front so
        // subsequent rotations swap instantly with no flash/blank state.
        preloadImages((data || []).map(p => p.image_url))
      } catch (err) {
        console.error('FeaturedProducts fetch error:', err)
        if (!mounted) return
        setAllProducts([])
      } finally {
        if (mounted) setHasLoaded(true)
      }
    }

    loadProducts()
    return () => {
      mounted = false
    }
  }, [])

  // Rotation disabled - products stay static so clicking doesn't trigger
  // a flash/reload of the bottom row.
  void setOffset

  const products = allProducts.length === 0
    ? []
    : Array.from({ length: Math.min(4, allProducts.length) }, (_, i) =>
        allProducts[(offset + i) % allProducts.length]
      )

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
    addToCart({ id: product.id, name: product.name, price: product.price, image_url: product.image_url })
  }

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="font-display text-3xl md:text-5xl font-bold text-center text-foreground mb-14">Crafted This Week</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
          {products.map((product, i) => (
            <AnimatePresence key={`slot-${i}`} mode="wait">
              <motion.div
                key={product.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <div className="group">
                  <Link to={`/product/${product.id}`} className="product-image-frame block mb-3">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="product-image product-image-loaded"
                        loading="eager"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground text-sm">No image</div>
                    )}
                  </Link>
                <Link to={`/product/${product.id}`}>
                  <h3 className="font-display text-xs md:text-sm font-semibold text-foreground mb-1 hover:text-primary transition-colors line-clamp-1">{product.name}</h3>
                  <p className="text-muted-foreground text-xs mb-2">
                    KSh {product.price.toLocaleString()}
                  </p>
                </Link>
                <button
                  onClick={() => handleAdd(product)}
                  className="w-full bg-primary text-primary-foreground py-2 text-[11px] font-bold tracking-wider uppercase hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 rounded"
                  style={{ minHeight: '44px' }}
                  disabled={product.stock === 0}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  {product.stock === 0 ? 'Sold Out' : 'Add to Cart'}
                </button>
                </div>
              </motion.div>
            </AnimatePresence>
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
