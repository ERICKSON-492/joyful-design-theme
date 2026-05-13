import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { AlertTriangle, History, Package, Plus, Minus, X, Search } from 'lucide-react'

interface Product {
  id: string
  name: string
  category: string
  image_url: string | null
  stock: number
  low_stock_threshold: number
  is_active: boolean
}

interface Variant {
  id: string
  product_id: string
  variant_label: string
  size: string | null
  color: string | null
  stock: number
  is_active: boolean
}

interface Adjustment {
  id: string
  product_id: string
  variant_id: string | null
  change: number
  previous_stock: number
  new_stock: number
  reason: string
  notes: string | null
  adjusted_by_email: string | null
  created_at: string
}

const REASONS = ['Restock', 'Manual correction', 'Damage / loss', 'Customer return', 'Sale (offline)', 'Other']

export default function AdminInventory() {
  const [products, setProducts] = useState<Product[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [adjustments, setAdjustments] = useState<Adjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all')
  const [tab, setTab] = useState<'stock' | 'history'>('stock')
  const [adjTarget, setAdjTarget] = useState<{ product: Product; variant?: Variant } | null>(null)
  const [adjForm, setAdjForm] = useState({ change: '', reason: REASONS[0], notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const [p, v, a] = await Promise.all([
      supabase.from('products').select('id,name,category,image_url,stock,low_stock_threshold,is_active').order('name'),
      supabase.from('product_variants').select('id,product_id,variant_label,size,color,stock,is_active'),
      supabase.from('stock_adjustments').select('*').order('created_at', { ascending: false }).limit(200),
    ])
    if (p.data) setProducts(p.data as Product[])
    if (v.data) setVariants(v.data as Variant[])
    if (a.data) setAdjustments(a.data as Adjustment[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const variantsByProduct = useMemo(() => {
    const m: Record<string, Variant[]> = {}
    variants.forEach(v => { (m[v.product_id] ||= []).push(v) })
    return m
  }, [variants])

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      const totalStock = (variantsByProduct[p.id]?.reduce((s, v) => s + v.stock, 0)) || p.stock
      if (filter === 'low') return totalStock > 0 && totalStock <= p.low_stock_threshold
      if (filter === 'out') return totalStock <= 0
      return true
    })
  }, [products, variantsByProduct, search, filter])

  const stats = useMemo(() => {
    let low = 0, out = 0, totalUnits = 0
    products.forEach(p => {
      const total = (variantsByProduct[p.id]?.reduce((s, v) => s + v.stock, 0)) || p.stock
      totalUnits += total
      if (total <= 0) out++
      else if (total <= p.low_stock_threshold) low++
    })
    return { low, out, totalUnits, totalProducts: products.length }
  }, [products, variantsByProduct])

  const openAdjust = (product: Product, variant?: Variant) => {
    setAdjTarget({ product, variant })
    setAdjForm({ change: '', reason: REASONS[0], notes: '' })
  }

  const updateThreshold = async (id: string, value: number) => {
    const { error } = await supabase.from('products').update({ low_stock_threshold: value }).eq('id', id)
    if (error) return toast.error(error.message)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, low_stock_threshold: value } : p))
  }

  const submitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjTarget) return
    const change = parseInt(adjForm.change, 10)
    if (!change || isNaN(change)) return toast.error('Enter a non-zero change amount (use - to remove stock)')
    setSaving(true)
    const { product, variant } = adjTarget
    const previous = variant ? variant.stock : product.stock
    const next = previous + change
    if (next < 0) { setSaving(false); return toast.error('Stock cannot go below 0') }

    // Update stock
    const upd = variant
      ? await supabase.from('product_variants').update({ stock: next }).eq('id', variant.id)
      : await supabase.from('products').update({ stock: next }).eq('id', product.id)
    if (upd.error) { setSaving(false); return toast.error(upd.error.message) }

    // Log adjustment
    const { data: { user } } = await supabase.auth.getUser()
    const { error: logErr } = await supabase.from('stock_adjustments').insert({
      product_id: product.id,
      variant_id: variant?.id || null,
      change,
      previous_stock: previous,
      new_stock: next,
      reason: adjForm.reason,
      notes: adjForm.notes || null,
      adjusted_by: user?.id || null,
      adjusted_by_email: user?.email || null,
    })
    if (logErr) toast.error('Stock updated but log failed: ' + logErr.message)
    else toast.success('Stock adjusted')

    setSaving(false)
    setAdjTarget(null)
    fetchData()
  }

  const productNameMap = useMemo(() => Object.fromEntries(products.map(p => [p.id, p.name])), [products])
  const variantLabelMap = useMemo(() => Object.fromEntries(variants.map(v => [v.id, [v.size, v.color].filter(Boolean).join(' / ') || v.variant_label])), [variants])

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Inventory</h1>
        <div className="flex gap-2">
          <Button variant={tab === 'stock' ? 'default' : 'outline'} size="sm" onClick={() => setTab('stock')}>
            <Package className="w-4 h-4 mr-1" /> Stock
          </Button>
          <Button variant={tab === 'history' ? 'default' : 'outline'} size="sm" onClick={() => setTab('history')}>
            <History className="w-4 h-4 mr-1" /> History
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Products" value={stats.totalProducts} />
        <StatCard label="Total units" value={stats.totalUnits} />
        <StatCard label="Low stock" value={stats.low} accent={stats.low > 0 ? 'warn' : undefined} />
        <StatCard label="Out of stock" value={stats.out} accent={stats.out > 0 ? 'danger' : undefined} />
      </div>

      {tab === 'stock' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-1">
              {(['all','low','out'] as const).map(f => (
                <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
                  {f === 'all' ? 'All' : f === 'low' ? 'Low' : 'Out'}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-muted-foreground text-center py-12">Loading inventory…</p>
          ) : (
            <div className="space-y-3">
              {filtered.map(p => {
                const pVariants = variantsByProduct[p.id] || []
                const total = pVariants.length ? pVariants.reduce((s, v) => s + v.stock, 0) : p.stock
                const status = total <= 0 ? 'out' : total <= p.low_stock_threshold ? 'low' : 'ok'
                return (
                  <div key={p.id} className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-14 h-14 rounded object-cover shrink-0" />
                        : <div className="w-14 h-14 rounded bg-muted shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground text-sm truncate">{p.name}</h3>
                          {status === 'out' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">OUT</span>}
                          {status === 'low' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" />LOW</span>}
                          {!p.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Hidden</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.category} · {pVariants.length ? `${pVariants.length} variants` : `${p.stock} in stock`}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className={`font-bold ${status === 'out' ? 'text-destructive' : status === 'low' ? 'text-amber-600' : 'text-foreground'}`}>{total}</p>
                        </div>
                        <label className="text-[10px] text-muted-foreground flex flex-col items-end">
                          Low ≤
                          <Input
                            type="number" min="0" value={p.low_stock_threshold}
                            onChange={e => updateThreshold(p.id, parseInt(e.target.value) || 0)}
                            className="h-7 w-14 text-xs px-2"
                          />
                        </label>
                        {pVariants.length === 0 && (
                          <Button size="sm" onClick={() => openAdjust(p)}>Adjust</Button>
                        )}
                      </div>
                    </div>

                    {pVariants.length > 0 && (
                      <div className="border-t border-border bg-muted/30 px-3 py-2 space-y-1">
                        {pVariants.map(v => {
                          const vStatus = v.stock <= 0 ? 'out' : v.stock <= p.low_stock_threshold ? 'low' : 'ok'
                          return (
                            <div key={v.id} className="flex items-center justify-between gap-2 text-sm py-1">
                              <div className="flex-1 min-w-0">
                                <span className="text-foreground">{[v.size, v.color].filter(Boolean).join(' / ') || v.variant_label}</span>
                              </div>
                              <span className={`text-xs font-medium ${vStatus === 'out' ? 'text-destructive' : vStatus === 'low' ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                {v.stock} units
                              </span>
                              <Button size="sm" variant="outline" onClick={() => openAdjust(p, v)} className="h-7 text-xs">Adjust</Button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
              {filtered.length === 0 && <p className="text-muted-foreground text-center py-12">No products match.</p>}
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {loading ? (
            <p className="text-muted-foreground text-center py-12">Loading…</p>
          ) : adjustments.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">No stock adjustments yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {adjustments.map(a => (
                <div key={a.id} className="p-3 flex items-start gap-3 text-sm">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${a.change > 0 ? 'bg-green-500/15 text-green-700 dark:text-green-400' : 'bg-destructive/15 text-destructive'}`}>
                    {a.change > 0 ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">
                      {productNameMap[a.product_id] || 'Product'}
                      {a.variant_id && <span className="text-muted-foreground font-normal"> · {variantLabelMap[a.variant_id] || 'variant'}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.reason}{a.notes ? ` - ${a.notes}` : ''}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(a.created_at).toLocaleString()} {a.adjusted_by_email ? `· ${a.adjusted_by_email}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold ${a.change > 0 ? 'text-green-600' : 'text-destructive'}`}>{a.change > 0 ? '+' : ''}{a.change}</p>
                    <p className="text-[11px] text-muted-foreground">{a.previous_stock} → {a.new_stock}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Adjustment modal */}
      {adjTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-bold">Adjust Stock</h2>
                <p className="text-xs text-muted-foreground">
                  {adjTarget.product.name}
                  {adjTarget.variant && ` · ${[adjTarget.variant.size, adjTarget.variant.color].filter(Boolean).join(' / ') || adjTarget.variant.variant_label}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Current stock: <span className="font-semibold text-foreground">{adjTarget.variant ? adjTarget.variant.stock : adjTarget.product.stock}</span>
                </p>
              </div>
              <button onClick={() => setAdjTarget(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={submitAdjustment} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Change <span className="text-muted-foreground text-xs">(use negative to remove, e.g. -3)</span></label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setAdjForm(p => ({ ...p, change: String((parseInt(p.change) || 0) - 1) }))}><Minus className="w-3 h-3" /></Button>
                  <Input type="number" value={adjForm.change} onChange={e => setAdjForm(p => ({ ...p, change: e.target.value }))} placeholder="e.g. 10 or -2" required className="text-center" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setAdjForm(p => ({ ...p, change: String((parseInt(p.change) || 0) + 1) }))}><Plus className="w-3 h-3" /></Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Reason</label>
                <select value={adjForm.reason} onChange={e => setAdjForm(p => ({ ...p, reason: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Notes <span className="text-muted-foreground text-xs">(optional)</span></label>
                <textarea value={adjForm.notes} onChange={e => setAdjForm(p => ({ ...p, notes: e.target.value }))} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]" placeholder="PO #, supplier, etc." />
              </div>
              <Button type="submit" disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
                {saving ? 'Saving…' : 'Save Adjustment'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: 'warn' | 'danger' }) {
  const color = accent === 'danger' ? 'text-destructive' : accent === 'warn' ? 'text-amber-600' : 'text-foreground'
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-display text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}