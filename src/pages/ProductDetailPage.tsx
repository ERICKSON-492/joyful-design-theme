import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCart } from '@/contexts/CartContext'
import { ShoppingBag, Clock, ArrowLeft, Minus, Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { fetchPublicTable } from '@/lib/publicContent'
import { ProductReviews } from '@/components/ProductReviews'
import { RelatedProducts } from '@/components/RelatedProducts'
import { RecentlyViewed } from '@/components/RecentlyViewed'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  price_min: number | null
  price_max: number | null
  image_url: string | null
  image_urls: string[] | null
  stock: number
  category: string
  subcategory?: string | null
  is_preorder: boolean
  preorder_label: string | null
}

interface Variant {
  id: string
  variant_label: string
  size: string | null
  color: string | null
  price: number
  stock: number
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { addToCart } = useCart()
  const { addProduct: trackView } = useRecentlyViewed()
  const [product, setProduct] = useState<Product | null>(null)
  const [variants, setVariants] = useState<Variant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [imgIdx, setImgIdx] = useState(0)

  useEffect(() => {
    if (id) trackView(id)
  }, [id, trackView])

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      try {
        const [products, variantsData] = await Promise.all([
          fetchPublicTable<Product>('products', `select=*&id=eq.${id}&is_active=eq.true`),
          fetchPublicTable<Variant>('product_variants', `select=*&product_id=eq.${id}&is_active=eq.true&order=price.asc`)
        ])
        if (products?.[0]) setProduct(products[0])
        if (variantsData) setVariants(variantsData)
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [id])

  // Get unique sizes and colors
  const sizes = [...new Set(variants.filter(v => v.size).map(v => v.size!))]
  const colors = [...new Set(variants.filter(v => v.color).map(v => v.color!))]

  // Auto-select variant when size/color chosen
  useEffect(() => {
    if (variants.length === 0) return
    const match = variants.find(v =>
      (!selectedSize || v.size === selectedSize) &&
      (!selectedColor || v.color === selectedColor)
    )
    setSelectedVariant(match || null)
  }, [selectedSize, selectedColor, variants])

  if (loading) {
    return (
      <div className="bg-background min-h-[80vh] pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="aspect-square bg-muted animate-pulse rounded-lg" />
            <div className="space-y-4">
              <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
              <div className="h-8 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-6 w-1/3 bg-muted animate-pulse rounded" />
              <div className="h-20 w-full bg-muted animate-pulse rounded" />
              <div className="h-12 w-full bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="bg-background min-h-[80vh] pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">Product not found</h1>
          <Link to="/shop" className="text-primary underline">Back to Shop</Link>
        </div>
      </div>
    )
  }

  const gallery: string[] = (product.image_urls && product.image_urls.length > 0)
    ? product.image_urls
    : (product.image_url ? [product.image_url] : [])
  const safeIdx = Math.min(imgIdx, Math.max(0, gallery.length - 1))
  const prevImg = () => setImgIdx(i => (i - 1 + gallery.length) % gallery.length)
  const nextImg = () => setImgIdx(i => (i + 1) % gallery.length)

  const currentPrice = selectedVariant ? selectedVariant.price : product.price
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock
  const canOrder = product.is_preorder || currentStock > 0
  const needsVariant = variants.length > 0 && !selectedVariant

  const handleAddToCart = () => {
    if (needsVariant) return
    const variantLabel = selectedVariant
      ? [selectedVariant.size, selectedVariant.color].filter(Boolean).join(' / ')
      : ''
    addToCart({
      id: selectedVariant ? `${product.id}_${selectedVariant.id}` : product.id,
      name: variantLabel ? `${product.name} (${variantLabel})` : product.name,
      price: currentPrice,
      image_url: product.image_url
    }, quantity)
  }

  const getButtonLabel = () => {
    if (needsVariant) return 'Select Options'
    if (product.is_preorder) return 'Pre-Order Now'
    if (currentStock === 0) return 'Sold Out'
    return 'Add to Cart'
  }

  return (
    <div className="bg-background min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <Link to="/shop" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Shop
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          {/* Image carousel */}
          <div>
            <div className="relative rounded-lg overflow-hidden bg-card border border-border">
              {gallery.length > 0 ? (
                <img src={gallery[safeIdx]} alt={product.name} className="w-full aspect-square object-cover transition-opacity" />
              ) : (
                <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground">No image</div>
              )}
              {gallery.length > 1 && (
                <>
                  <button onClick={prevImg} aria-label="Previous image" className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow-md">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={nextImg} aria-label="Next image" className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow-md">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                    {gallery.map((_, i) => (
                      <button key={i} onClick={() => setImgIdx(i)} aria-label={`Image ${i+1}`}
                        className={`w-2 h-2 rounded-full transition-all ${i === safeIdx ? 'bg-primary w-6' : 'bg-background/80'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="grid grid-cols-5 gap-2 mt-3">
                {gallery.map((url, i) => (
                  <button key={url + i} onClick={() => setImgIdx(i)}
                    className={`aspect-square rounded overflow-hidden border-2 transition-colors ${i === safeIdx ? 'border-primary' : 'border-border hover:border-primary/40'}`}>
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">{product.category}</p>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{product.name}</h1>
            </div>

            {/* Price */}
            <div>
              {variants.length > 0 && !selectedVariant ? (
                product.price_min && product.price_max ? (
                  <p className="text-2xl font-bold text-primary">KSh {product.price_min.toLocaleString()} - {product.price_max.toLocaleString()}</p>
                ) : (
                  <p className="text-2xl font-bold text-primary">From KSh {Math.min(...variants.map(v => v.price)).toLocaleString()}</p>
                )
              ) : (
                <p className="text-2xl font-bold text-primary">KSh {currentPrice.toLocaleString()}</p>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {product.is_preorder && (
                <span className="bg-blue-600 text-white text-xs px-3 py-1.5 font-semibold flex items-center gap-1 rounded">
                  <Clock className="w-3 h-3" /> Pre-Order
                </span>
              )}
              {!product.is_preorder && currentStock > 0 && currentStock <= 3 && (
                <span className="bg-destructive text-destructive-foreground text-xs px-3 py-1.5 font-semibold rounded">
                  Only {currentStock} left
                </span>
              )}
              {!product.is_preorder && currentStock === 0 && !needsVariant && (
                <span className="bg-foreground text-background text-xs px-3 py-1.5 font-semibold rounded">Sold Out</span>
              )}
            </div>

            {product.is_preorder && product.preorder_label && (
              <p className="text-blue-600 text-sm font-medium flex items-center gap-1">
                <Clock className="w-4 h-4" /> {product.preorder_label}
              </p>
            )}

            {product.description && (
              <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
            )}

            {/* Size Selection */}
            {sizes.length > 0 && (
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Size</label>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(size => (
                    <button key={size} onClick={() => setSelectedSize(prev => prev === size ? null : size)}
                      className={`px-4 py-2 border text-sm font-medium rounded-lg transition-colors ${
                        selectedSize === size
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:border-primary'
                      }`} style={{ minHeight: '40px' }}>
                      {size}
                      {selectedSize === size && <Check className="w-3 h-3 inline ml-1" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {colors.length > 0 && (
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {colors.map(color => (
                    <button key={color} onClick={() => setSelectedColor(prev => prev === color ? null : color)}
                      className={`px-4 py-2 border text-sm font-medium rounded-lg transition-colors ${
                        selectedColor === color
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border hover:border-primary'
                      }`} style={{ minHeight: '40px' }}>
                      {color}
                      {selectedColor === color && <Check className="w-3 h-3 inline ml-1" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected variant info */}
            {selectedVariant && selectedVariant.variant_label && (
              <p className="text-sm text-muted-foreground">Selected: <span className="font-medium text-foreground">{selectedVariant.variant_label}</span></p>
            )}

            {/* Quantity */}
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">Quantity</label>
              <div className="flex items-center border border-border rounded-lg w-fit">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-3 hover:bg-accent transition-colors rounded-l-lg">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-6 text-sm font-medium min-w-[3rem] text-center">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="p-3 hover:bg-accent transition-colors rounded-r-lg">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <button
              onClick={handleAddToCart}
              disabled={!canOrder || needsVariant}
              className={`w-full py-4 text-sm font-bold tracking-wider uppercase transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-lg ${
                product.is_preorder
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-foreground text-background hover:bg-primary hover:text-primary-foreground'
              }`}
              style={{ minHeight: '52px' }}>
              <ShoppingBag className="w-5 h-5" />
              {getButtonLabel()}
            </button>

            {/* Help links */}
            <div className="pt-4 border-t border-border flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <Link to="/faq#shipping" className="hover:text-primary transition-colors underline-offset-2 hover:underline">Shipping info</Link>
              <Link to="/faq#care" className="hover:text-primary transition-colors underline-offset-2 hover:underline">Care instructions</Link>
              <Link to="/faq#custom-orders" className="hover:text-primary transition-colors underline-offset-2 hover:underline">Custom orders</Link>
              <Link to="/faq" className="hover:text-primary transition-colors underline-offset-2 hover:underline">All FAQs</Link>
            </div>
          </div>
        </div>

        <ProductReviews productId={product.id} />
        <RelatedProducts productId={product.id} category={product.category} />
        <RecentlyViewed excludeId={product.id} />
      </div>

      {/* Sticky mobile Add-to-Cart bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">{product.name}</p>
            <p className="text-base font-bold text-primary leading-tight">
              {variants.length > 0 && !selectedVariant && product.price_min && product.price_max
                ? `KSh ${product.price_min.toLocaleString()} - ${product.price_max.toLocaleString()}`
                : `KSh ${currentPrice.toLocaleString()}`}
            </p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!canOrder || needsVariant}
            className={`shrink-0 px-5 py-3 text-xs font-bold tracking-wider uppercase rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
              product.is_preorder
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-foreground text-background hover:bg-primary hover:text-primary-foreground'
            }`}
            style={{ minHeight: '48px', minWidth: '160px' }}
          >
            <ShoppingBag className="w-4 h-4" />
            {getButtonLabel()}
          </button>
        </div>
      </div>

      {/* Spacer so content isn't hidden behind sticky bar on mobile */}
      <div className="md:hidden h-20" aria-hidden />
    </div>
  )
}
