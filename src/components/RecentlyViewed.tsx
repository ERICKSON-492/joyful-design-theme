import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchPublicTable } from '@/lib/publicContent'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import { useCurrency } from '@/contexts/CurrencyContext'

interface Product {
  id: string
  name: string
  price: number
  price_min: number | null
  image_url: string | null
}

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const { ids } = useRecentlyViewed()
  const [products, setProducts] = useState<Product[]>([])
  const { format } = useCurrency()

  useEffect(() => {
    const filtered = ids.filter(id => id !== excludeId).slice(0, 4)
    if (filtered.length === 0) { setProducts([]); return }
    const list = filtered.map(id => `"${id}"`).join(',')
    fetchPublicTable<Product>('products', `select=id,name,price,price_min,image_url&id=in.(${list})&is_active=eq.true`)
      .then(data => {
        if (!data) return
        // preserve order from localStorage
        const ordered = filtered.map(id => data.find(p => p.id === id)).filter(Boolean) as Product[]
        setProducts(ordered)
      })
  }, [ids, excludeId])

  if (products.length === 0) return null

  return (
    <section className="mt-12 border-t border-border pt-10">
      <h2 className="font-display text-xl md:text-2xl font-bold text-foreground mb-4">Recently Viewed</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map(p => (
          <Link key={p.id} to={`/product/${p.id}`} className="group">
            <div className="product-image-frame mb-2">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} loading="lazy" className="product-image"
                  onLoad={(e) => e.currentTarget.classList.add('product-image-loaded')} />
              ) : (
                <div className="w-full aspect-square bg-muted" />
              )}
            </div>
            <h3 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">{p.name}</h3>
            <p className="text-sm text-primary font-semibold mt-0.5">
              {p.price_min ? `From ${format(p.price_min)}` : format(p.price)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  )
}
