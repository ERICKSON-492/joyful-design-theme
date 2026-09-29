import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPublicTable } from '@/lib/publicContent'
import { useCurrency } from '@/contexts/CurrencyContext'
import { productThumb, productSrcSet, GRID_SIZES, handleImageFallback } from '@/lib/imageUrl'
import { getActiveSalePrice } from '@/lib/salePrice'
import { productPath } from '@/lib/slug'

interface Product {
  id: string
  name: string
  price: number
  sale_price: number | null
  sale_starts_at: string | null
  sale_ends_at: string | null
  price_min: number | null
  image_url: string | null
  category: string
}

export function RelatedProducts({ productId, category }: { productId: string; category: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())
  const { format } = useCurrency()

  useEffect(() => {
    fetchPublicTable<Product>(
      'products',
      `select=id,name,price,sale_price,sale_starts_at,sale_ends_at,price_min,image_url,category&category=eq.${encodeURIComponent(category)}&id=neq.${productId}&is_active=eq.true&limit=4`
    ).then(data => setProducts(data || []))
  }, [productId, category])

  if (products.length === 0) return null

  return (
    <section className="mt-16 border-t border-border pt-12">
      <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">Complete the Look</h2>
      <p className="text-muted-foreground text-sm mb-6">More from {category}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map(p => (
          <Link key={p.id} to={productPath(p)} className="group">
            <div className="product-image-frame mb-2">
              {p.image_url && !failedImages.has(p.id) ? (
                <img src={productThumb(p.image_url)} alt={p.name} loading="lazy" decoding="async"
                  srcSet={productSrcSet(p.image_url)} sizes={GRID_SIZES}
                  width={400} height={400} className="product-image"
                  onLoad={(e) => e.currentTarget.classList.add('product-image-loaded')}
                  onError={(e) => {
                    handleImageFallback(e, p.image_url)
                    if (e.currentTarget.dataset.fallbackFailed) {
                      setFailedImages(prev => new Set(prev).add(p.id))
                    }
                  }} />
              ) : (
                <div className="w-full aspect-square bg-muted" />
              )}
            </div>
            <h3 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">{p.name}</h3>
            <p className="text-sm text-primary font-semibold mt-0.5">
              {p.price_min ? `From ${format(p.price_min)}` : getActiveSalePrice(p) !== null ? <><span>{format(getActiveSalePrice(p)!)}</span> <span className="text-muted-foreground line-through text-xs">{format(p.price)}</span></> : format(p.price)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
