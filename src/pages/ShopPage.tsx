import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useCart } from '@/contexts/CartContext'
import { ShoppingBag, Clock } from 'lucide-react'
import { fetchPublicTable } from '@/lib/publicContent'
import { ProductCardVariants } from '@/components/ProductCardVariants'
import { useCurrency } from '@/contexts/CurrencyContext'

interface Product {
  id: string
  name: string
  price: number
  price_min: number | null
  price_max: number | null
  image_url: string | null
  stock: number
  category: string
  subcategory: string | null
  is_preorder: boolean
  preorder_label: string | null
}

interface Category { id: string; name: string }
interface Subcategory { id: string; category_id: string; name: string }

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categoryList, setCategoryList] = useState<string[]>(['All'])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [categoriesData, setCategoriesData] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeSub, setActiveSub] = useState<string>('All')
  const [loading, setLoading] = useState(true)
  const [variantState, setVariantState] = useState<Record<string, { price: number; canOrder: boolean; label: string | null; selected: boolean; hasVariants: boolean }>>({})
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const catParam = searchParams.get('cat')
  const { addToCart } = useCart()
  const { format } = useCurrency()
  const navigate = useNavigate()

  useEffect(() => {
    const titleByCat: Record<string, string> = {
      'wear-it': 'Jewelry & Apparel – Handmade Maasai Beaded Pieces | Ushanga Chronicles',
      'live-with-it': 'African Home Decor & Tableware – Ushanga Chronicles',
      'for-your-pet': 'Beaded Pet Accessories – Ushanga Chronicles',
    }
    document.title = (catParam && titleByCat[catParam])
      || 'Handmade Maasai Beaded Jewelry & Home Decor – Ushanga Chronicles'
  }, [catParam])

  useEffect(() => {
    // Load taxonomy from DB
    Promise.all([
      fetchPublicTable<Category>('categories', 'select=id,name&is_active=eq.true&order=display_order.asc'),
      fetchPublicTable<Subcategory>('subcategories', 'select=id,category_id,name&is_active=eq.true&order=display_order.asc'),
    ]).then(([cats, subs]) => {
      setCategoriesData(cats || [])
      setSubcategories(subs || [])
      setCategoryList(['All', ...(cats || []).map(c => c.name)])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (catParam) {
      const match = categoryList.find(c => c.toLowerCase().replace(/\s+/g, '-') === catParam.toLowerCase())
      if (match) setActiveCategory(match)
    }
  }, [catParam, categoryList])

  // Reset subcategory when category changes
  useEffect(() => { setActiveSub('All') }, [activeCategory])

  useEffect(() => {
    let mounted = true
    const loadProducts = async () => {
      setLoading(true)
      try {
        let query = 'select=id,name,price,price_min,price_max,image_url,stock,category,subcategory,is_preorder,preorder_label&is_active=eq.true&order=created_at.desc'
        if (activeCategory !== 'All') query += `&category=eq.${encodeURIComponent(activeCategory)}`
        if (activeSub !== 'All') query += `&subcategory=eq.${encodeURIComponent(activeSub)}`
        if (searchQuery) query += `&name=ilike.*${encodeURIComponent(searchQuery)}*`

        const data = await fetchPublicTable<Product>('products', query)
        if (mounted) {
          // Shuffle so each visit feels fresh
          const arr = [...(data || [])]
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[arr[i], arr[j]] = [arr[j], arr[i]]
          }
          setProducts(arr)
        }
      } catch {
        if (mounted) setProducts([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadProducts()
    return () => { mounted = false }
  }, [activeCategory, activeSub, searchQuery])

  const activeCategoryId = categoriesData.find(c => c.name === activeCategory)?.id
  const visibleSubs = activeCategoryId ? subcategories.filter(s => s.category_id === activeCategoryId) : []

  const getButtonLabel = (product: Product) => {
    if (product.is_preorder) return 'Pre-Order'
    if (product.stock === 0) return 'Sold Out'
    if (variantState[product.id]?.hasVariants) return 'Select Options'
    return 'Add to Cart'
  }

  const canOrder = (product: Product) => product.is_preorder || product.stock > 0

  const handleAdd = (product: Product) => {
    const state = variantState[product.id]
    if (state?.hasVariants) {
      navigate(`/product/${product.id}`)
      return
    }
    const finalPrice = state?.price ?? product.price
    const finalName = state?.label ? `${product.name} (${state.label})` : product.name
    const finalId = state?.label ? `${product.id}::${state.label}` : product.id
    addToCart({ id: finalId, name: finalName, price: finalPrice, image_url: product.image_url })
  }

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
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 border text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-primary hover:text-primary-foreground hover:border-primary'
                }`} style={{ minHeight: '44px' }}>
                {cat}
              </button>
            ))}
          </div>
          {visibleSubs.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <button onClick={() => setActiveSub('All')} className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${activeSub === 'All' ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-primary'}`}>All</button>
              {visibleSubs.map(s => (
                <button key={s.id} onClick={() => setActiveSub(s.name)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${activeSub === s.name ? 'bg-foreground text-background border-foreground' : 'border-border hover:border-primary'}`}>
                  {s.name}
                </button>
              ))}
            </div>
          )}
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
                  <Link to={`/product/${product.id}`} className="product-image-frame block mb-4">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name}
                        className="product-image" loading="lazy"
                        onLoad={(e) => e.currentTarget.classList.add('product-image-loaded')} />
                    ) : (
                      <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground text-sm">No image</div>
                    )}
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                      {product.is_preorder && (
                        <span className="bg-black text-white text-xs px-2 py-1 font-semibold flex items-center gap-1 rounded">
                          <Clock className="w-3 h-3" /> Pre-Order
                        </span>
                      )}
                      {!product.is_preorder && product.stock <= 3 && product.stock > 0 && (
                        <span className="bg-destructive text-destructive-foreground text-xs px-2 py-1 font-semibold rounded">
                          Only {product.stock} left
                        </span>
                      )}
                      {!product.is_preorder && product.stock === 0 && (
                        <span className="bg-foreground text-background text-xs px-2 py-1 font-semibold rounded">
                          Sold Out
                        </span>
                      )}
                    </div>
                  </Link>
                  <Link to={`/product/${product.id}`}>
                    <h3 className="font-display text-sm md:text-base font-semibold text-foreground mb-1 hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="mb-1">
                    {variantState[product.id]?.hasVariants ? (
                      <p className="text-foreground font-bold text-sm">
                        {format(variantState[product.id]?.price ?? product.price)}
                      </p>
                    ) : product.price_min && product.price_max ? (
                      <p className="text-foreground font-bold text-sm">
                        {format(product.price_min)} - {format(product.price_max)}
                      </p>
                    ) : (
                      <p className="text-foreground font-bold text-sm">{format(product.price)}</p>
                    )}
                  </div>
                  {product.is_preorder && product.preorder_label && (
                    <p className="text-black text-xs font-medium mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {product.preorder_label}
                    </p>
                  )}
                  {!product.is_preorder && !product.preorder_label && <div className="mb-2" />}
                  <div className="hidden">
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
                          hasVariants: s.hasVariants,
                        }
                      }))}
                    />
                  </div>
                  <button
                    onClick={() => handleAdd(product)}
                    className={`w-full py-2.5 text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-lg ${
                      product.is_preorder
                        ? 'bg-black hover:bg-neutral-800 text-white'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                    style={{ minHeight: '44px' }}
                    disabled={!canOrder(product)}>
                    <ShoppingBag className="w-4 h-4" />
                    {getButtonLabel(product)}
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
