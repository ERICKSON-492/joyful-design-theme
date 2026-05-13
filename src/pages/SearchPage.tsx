import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useCart } from '@/contexts/CartContext'
import { ShoppingBag, Clock, Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react'
import { fetchPublicTable } from '@/lib/publicContent'

const categoryList = ['Wear It', 'Live With It', 'For Your Table', 'Collectibles', 'For Your Pet', 'Wholesale & Gifting']

interface Product {
  id: string
  name: string
  price: number
  price_min: number | null
  price_max: number | null
  image_url: string | null
  stock: number
  category: string
  is_preorder: boolean
  preorder_label: string | null
}

type SortKey = 'relevance' | 'price-asc' | 'price-desc' | 'newest'

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()

  const initialQ = searchParams.get('q') || searchParams.get('search') || ''
  const initialCats = (searchParams.get('cats') || '').split(',').filter(Boolean)
  const initialMin = Number(searchParams.get('min') || 0)
  const initialMax = Number(searchParams.get('max') || 0)
  const initialInStock = searchParams.get('stock') === '1'
  const initialSort = (searchParams.get('sort') as SortKey) || 'relevance'

  const [queryInput, setQueryInput] = useState(initialQ)
  const [activeQuery, setActiveQuery] = useState(initialQ)
  const [selectedCats, setSelectedCats] = useState<string[]>(initialCats)
  const [minPrice, setMinPrice] = useState<number | ''>(initialMin || '')
  const [maxPrice, setMaxPrice] = useState<number | ''>(initialMax || '')
  const [inStockOnly, setInStockOnly] = useState(initialInStock)
  const [sort, setSort] = useState<SortKey>(initialSort)

  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Sync URL whenever filters change
  useEffect(() => {
    const next = new URLSearchParams()
    if (activeQuery) next.set('q', activeQuery)
    if (selectedCats.length) next.set('cats', selectedCats.join(','))
    if (minPrice !== '' && Number(minPrice) > 0) next.set('min', String(minPrice))
    if (maxPrice !== '' && Number(maxPrice) > 0) next.set('max', String(maxPrice))
    if (inStockOnly) next.set('stock', '1')
    if (sort !== 'relevance') next.set('sort', sort)
    setSearchParams(next, { replace: true })
  }, [activeQuery, selectedCats, minPrice, maxPrice, inStockOnly, sort, setSearchParams])

  // Fetch products (server-filter by query + categories; refine the rest client-side)
  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        let q = 'select=id,name,price,price_min,price_max,image_url,stock,category,is_preorder,preorder_label&is_active=eq.true&order=created_at.desc'
        if (activeQuery) {
          const escaped = activeQuery.replace(/[%_*]/g, ' ').trim()
          q += `&or=(name.ilike.*${encodeURIComponent(escaped)}*,description.ilike.*${encodeURIComponent(escaped)}*,category.ilike.*${encodeURIComponent(escaped)}*)`
        }
        if (selectedCats.length) {
          const list = selectedCats.map(c => `"${c}"`).join(',')
          q += `&category=in.(${encodeURIComponent(list)})`
        }
        const data = await fetchPublicTable<Product>('products', q)
        if (mounted) setAllProducts(data || [])
      } catch {
        if (mounted) setAllProducts([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [activeQuery, selectedCats])

  const products = useMemo(() => {
    const min = minPrice === '' ? 0 : Number(minPrice)
    const max = maxPrice === '' ? Infinity : Number(maxPrice)
    let list = allProducts.filter(p => {
      const effective = p.price_min ?? p.price
      const inStock = p.is_preorder || p.stock > 0
      if (inStockOnly && !inStock) return false
      if (effective < min) return false
      if (effective > max) return false
      return true
    })
    if (sort === 'price-asc') list = [...list].sort((a, b) => (a.price_min ?? a.price) - (b.price_min ?? b.price))
    else if (sort === 'price-desc') list = [...list].sort((a, b) => (b.price_min ?? b.price) - (a.price_min ?? a.price))
    return list
  }, [allProducts, minPrice, maxPrice, inStockOnly, sort])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveQuery(queryInput.trim())
  }

  const toggleCat = (c: string) => {
    setSelectedCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  const clearAll = () => {
    setSelectedCats([])
    setMinPrice('')
    setMaxPrice('')
    setInStockOnly(false)
    setSort('relevance')
  }

  const activeFilterCount =
    selectedCats.length +
    (minPrice !== '' && Number(minPrice) > 0 ? 1 : 0) +
    (maxPrice !== '' && Number(maxPrice) > 0 ? 1 : 0) +
    (inStockOnly ? 1 : 0)

  const canOrder = (p: Product) => p.is_preorder || p.stock > 0
  const buttonLabel = (p: Product) => p.is_preorder ? 'Pre-Order' : p.stock === 0 ? 'Sold Out' : 'Add to Cart'

  const FilterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-sm font-bold text-foreground mb-3 uppercase tracking-wider">Category</h3>
        <div className="space-y-2">
          {categoryList.map(c => (
            <label key={c} className="flex items-center gap-2 cursor-pointer text-sm" style={{ minHeight: '32px' }}>
              <input
                type="checkbox"
                checked={selectedCats.includes(c)}
                onChange={() => toggleCat(c)}
                className="w-4 h-4 accent-primary"
              />
              <span className="text-foreground">{c}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-display text-sm font-bold text-foreground mb-3 uppercase tracking-wider">Price (KSh)</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Min"
            value={minPrice}
            onChange={e => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-muted-foreground">-</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Max"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full h-10 px-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <h3 className="font-display text-sm font-bold text-foreground mb-3 uppercase tracking-wider">Availability</h3>
        <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ minHeight: '32px' }}>
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={e => setInStockOnly(e.target.checked)}
            className="w-4 h-4 accent-primary"
          />
          <span className="text-foreground">In stock only</span>
        </label>
      </div>

      {activeFilterCount > 0 && (
        <button
          onClick={clearAll}
          className="w-full py-2.5 text-xs font-bold uppercase tracking-wider border border-border rounded-lg hover:bg-accent transition-colors"
          style={{ minHeight: '44px' }}
        >
          Clear filters
        </button>
      )}
    </div>
  )

  return (
    <div className="bg-background min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4">
        {/* Header / search bar */}
        <div className="mb-6">
          <h1 className="font-display text-2xl md:text-4xl font-bold text-foreground mb-4">
            {activeQuery ? <>Results for <span className="text-primary">"{activeQuery}"</span></> : 'Search the Chronicle'}
          </h1>
          <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-2xl">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={queryInput}
                onChange={e => setQueryInput(e.target.value)}
                placeholder="Search beads, jewelry, baskets…"
                className="w-full h-11 pl-10 pr-3 rounded-md border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              className="h-11 px-5 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:bg-primary/90 transition-colors"
              style={{ minHeight: '44px' }}
            >
              Search
            </button>
          </form>
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Desktop sidebar filters */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="sticky top-28 bg-card border border-border rounded-lg p-5">
              {FilterPanel}
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading…' : `${products.length} ${products.length === 1 ? 'piece' : 'pieces'}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="md:hidden flex items-center gap-2 h-10 px-3 border border-border rounded-md text-sm font-medium hover:bg-accent transition-colors relative"
                  style={{ minHeight: '40px' }}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold bg-primary text-primary-foreground rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as SortKey)}
                  className="h-10 px-3 border border-border bg-card rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="relevance">Sort: Newest</option>
                  <option value="price-asc">Price: Low → High</option>
                  <option value="price-desc">Price: High → Low</option>
                </select>
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedCats.map(c => (
                  <button key={c} onClick={() => toggleCat(c)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-full hover:bg-primary/20 transition-colors">
                    {c} <X className="w-3 h-3" />
                  </button>
                ))}
                {(minPrice !== '' && Number(minPrice) > 0) && (
                  <button onClick={() => setMinPrice('')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-full hover:bg-primary/20 transition-colors">
                    Min KSh {Number(minPrice).toLocaleString()} <X className="w-3 h-3" />
                  </button>
                )}
                {(maxPrice !== '' && Number(maxPrice) > 0) && (
                  <button onClick={() => setMaxPrice('')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-full hover:bg-primary/20 transition-colors">
                    Max KSh {Number(maxPrice).toLocaleString()} <X className="w-3 h-3" />
                  </button>
                )}
                {inStockOnly && (
                  <button onClick={() => setInStockOnly(false)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary text-xs font-medium rounded-full hover:bg-primary/20 transition-colors">
                    In stock <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Grid */}
            {loading ? (
              <p className="text-center text-muted-foreground py-16">Loading products...</p>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">No pieces match your search.</p>
                <button onClick={() => navigate('/shop')} className="text-primary underline text-sm">Browse the full shop</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {products.map(p => (
                  <div key={p.id} className="group">
                    <Link to={`/product/${p.id}`} className="product-image-frame block mb-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name}
                          className="product-image" loading="lazy"
                          onLoad={(e) => e.currentTarget.classList.add('product-image-loaded')} />
                      ) : (
                        <div className="w-full aspect-square bg-muted flex items-center justify-center text-muted-foreground text-sm">No image</div>
                      )}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                        {p.is_preorder && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-1 font-semibold flex items-center gap-1 rounded">
                            <Clock className="w-3 h-3" /> Pre-Order
                          </span>
                        )}
                        {!p.is_preorder && p.stock <= 3 && p.stock > 0 && (
                          <span className="bg-destructive text-destructive-foreground text-xs px-2 py-1 font-semibold rounded">
                            Only {p.stock} left
                          </span>
                        )}
                        {!p.is_preorder && p.stock === 0 && (
                          <span className="bg-foreground text-background text-xs px-2 py-1 font-semibold rounded">Sold Out</span>
                        )}
                      </div>
                    </Link>
                    <Link to={`/product/${p.id}`}>
                      <h3 className="font-display text-sm md:text-base font-semibold text-foreground mb-1 hover:text-primary transition-colors">
                        {p.name}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{p.category}</p>
                    <div className="mb-2">
                      {p.price_min && p.price_max ? (
                        <p className="text-foreground font-bold text-sm">KSh {p.price_min.toLocaleString()} - {p.price_max.toLocaleString()}</p>
                      ) : (
                        <p className="text-foreground font-bold text-sm">KSh {p.price.toLocaleString()}</p>
                      )}
                    </div>
                    <button
                      onClick={() => addToCart({ id: p.id, name: p.name, price: p.price, image_url: p.image_url })}
                      className={`w-full py-2.5 text-xs font-bold tracking-wider uppercase transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-lg ${
                        p.is_preorder
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-foreground text-background hover:bg-primary hover:text-primary-foreground'
                      }`}
                      style={{ minHeight: '44px' }}
                      disabled={!canOrder(p)}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {buttonLabel(p)}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filters drawer */}
      {filtersOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setFiltersOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-background shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background">
              <h2 className="font-display text-lg font-bold">Filters</h2>
              <button onClick={() => setFiltersOpen(false)} className="p-2 hover:bg-accent rounded-full" aria-label="Close filters">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 pb-24">
              {FilterPanel}
            </div>
            <div className="fixed bottom-0 right-0 w-[85%] max-w-sm bg-background border-t border-border p-4">
              <button
                onClick={() => setFiltersOpen(false)}
                className="w-full py-3 bg-primary text-primary-foreground font-bold uppercase text-sm tracking-wider rounded-lg"
                style={{ minHeight: '48px' }}
              >
                Show {products.length} results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}