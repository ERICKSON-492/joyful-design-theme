import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, X, Upload, Layers, GripVertical } from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  price_min: number | null
  price_max: number | null
  category: string
  subcategory: string | null
  image_url: string | null
  image_urls: string[] | null
  stock: number
  is_active: boolean
  is_preorder: boolean
  preorder_label: string | null
}

interface Variant {
  id: string
  product_id: string
  variant_label: string
  size: string | null
  color: string | null
  price: number
  stock: number
  is_active: boolean
}

interface Category { id: string; name: string }
interface Subcategory { id: string; category_id: string; name: string }

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', price: '', price_min: '', price_max: '', category: '', subcategory: '', stock: '', image_urls: [] as string[], is_active: true, is_preorder: false, preorder_label: ''
  })

  // Variant management
  const [variantProductId, setVariantProductId] = useState<string | null>(null)
  const [variants, setVariants] = useState<Variant[]>([])
  const [variantForm, setVariantForm] = useState({ variant_label: '', size: '', color: '', price: '', stock: '0' })
  const [editVariantId, setEditVariantId] = useState<string | null>(null)

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (data) setProducts(data)
  }

  const fetchTaxonomy = async () => {
    const [c, s] = await Promise.all([
      supabase.from('categories').select('id,name').order('display_order'),
      supabase.from('subcategories').select('id,category_id,name').order('display_order'),
    ])
    if (c.data) setCategories(c.data)
    if (s.data) setSubcategories(s.data)
  }

  const fetchVariants = async (productId: string) => {
    const { data } = await supabase.from('product_variants').select('*').eq('product_id', productId).order('price', { ascending: true })
    if (data) setVariants(data)
  }

  useEffect(() => { fetchProducts(); fetchTaxonomy() }, [])

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', price_min: '', price_max: '', category: categories[0]?.name || '', subcategory: '', stock: '', image_urls: [], is_active: true, is_preorder: false, preorder_label: '' })
    setEditId(null)
    setShowForm(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    const uploaded: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2,7)}.${ext}`
      const { error } = await supabase.storage.from('product-images').upload(path, file)
      if (error) { toast.error('Upload failed: ' + error.message); continue }
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
      uploaded.push(publicUrl)
    }
    setForm(prev => ({ ...prev, image_urls: [...prev.image_urls, ...uploaded] }))
    setUploading(false)
    if (uploaded.length) toast.success(`${uploaded.length} image(s) uploaded`)
    e.target.value = ''
  }

  const removeImage = (idx: number) => {
    setForm(prev => ({ ...prev, image_urls: prev.image_urls.filter((_, i) => i !== idx) }))
  }

  const moveImage = (idx: number, dir: -1 | 1) => {
    setForm(prev => {
      const arr = [...prev.image_urls]
      const j = idx + dir
      if (j < 0 || j >= arr.length) return prev
      ;[arr[idx], arr[j]] = [arr[j], arr[idx]]
      return { ...prev, image_urls: arr }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const payload = {
      name: form.name, description: form.description || null,
      price: parseFloat(form.price), price_min: form.price_min ? parseFloat(form.price_min) : null,
      price_max: form.price_max ? parseFloat(form.price_max) : null, category: form.category,
      subcategory: form.subcategory || null,
      stock: parseInt(form.stock) || 0,
      image_url: form.image_urls[0] || null,
      image_urls: form.image_urls,
      is_active: form.is_active, is_preorder: form.is_preorder, preorder_label: form.preorder_label || null,
    }
    if (editId) {
      const { error } = await supabase.from('products').update(payload).eq('id', editId)
      if (error) toast.error(error.message); else toast.success('Product updated!')
    } else {
      const { error } = await supabase.from('products').insert(payload)
      if (error) toast.error(error.message); else toast.success('Product added!')
    }
    setLoading(false); resetForm(); fetchProducts()
  }

  const handleEdit = (p: Product) => {
    const urls = (p.image_urls && p.image_urls.length) ? p.image_urls : (p.image_url ? [p.image_url] : [])
    setForm({
      name: p.name, description: p.description || '', price: String(p.price),
      price_min: p.price_min ? String(p.price_min) : '', price_max: p.price_max ? String(p.price_max) : '',
      category: p.category, subcategory: p.subcategory || '',
      stock: String(p.stock), image_urls: urls,
      is_active: p.is_active, is_preorder: p.is_preorder, preorder_label: p.preorder_label || '',
    })
    setEditId(p.id); setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) toast.error(error.message); else { toast.success('Product deleted'); fetchProducts() }
  }

  // Variant handlers
  const openVariants = (productId: string) => {
    setVariantProductId(productId)
    fetchVariants(productId)
  }

  const resetVariantForm = () => {
    setVariantForm({ variant_label: '', size: '', color: '', price: '', stock: '0' })
    setEditVariantId(null)
  }

  const handleVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!variantProductId) return
    const payload = {
      product_id: variantProductId,
      variant_label: variantForm.variant_label || `${variantForm.size || ''} ${variantForm.color || ''}`.trim(),
      size: variantForm.size || null, color: variantForm.color || null,
      price: parseFloat(variantForm.price) || 0, stock: parseInt(variantForm.stock) || 0,
    }
    if (editVariantId) {
      const { error } = await supabase.from('product_variants').update(payload).eq('id', editVariantId)
      if (error) toast.error(error.message); else toast.success('Variant updated!')
    } else {
      const { error } = await supabase.from('product_variants').insert(payload)
      if (error) toast.error(error.message); else toast.success('Variant added!')
    }
    resetVariantForm()
    fetchVariants(variantProductId)
  }

  const handleDeleteVariant = async (id: string) => {
    if (!variantProductId) return
    await supabase.from('product_variants').delete().eq('id', id)
    toast.success('Variant deleted')
    fetchVariants(variantProductId)
  }

  const variantProduct = products.find(p => p.id === variantProductId)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Products</h1>
        <Button onClick={() => { resetForm(); setShowForm(true) }} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> Add Product
        </Button>
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">{editId ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="text-sm font-medium block mb-1">Name</label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div><label className="text-sm font-medium block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium block mb-1">Base Price (KSh)</label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} required /></div>
                <div><label className="text-sm font-medium block mb-1">Stock</label><Input type="number" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium block mb-1">Min Price <span className="text-muted-foreground text-xs">optional</span></label><Input type="number" step="0.01" value={form.price_min} onChange={e => setForm(p => ({ ...p, price_min: e.target.value }))} placeholder="e.g. 500" /></div>
                <div><label className="text-sm font-medium block mb-1">Max Price <span className="text-muted-foreground text-xs">optional</span></label><Input type="number" step="0.01" value={form.price_max} onChange={e => setForm(p => ({ ...p, price_max: e.target.value }))} placeholder="e.g. 2000" /></div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">Set min & max to show a price range. Or add variants below for per-size/color pricing.</p>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium block mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value, subcategory: '' }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">— Select —</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div><label className="text-sm font-medium block mb-1">Subcategory</label>
                  <select value={form.subcategory} onChange={e => setForm(p => ({ ...p, subcategory: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!form.category}>
                    <option value="">— None —</option>
                    {subcategories.filter(s => {
                      const c = categories.find(c => c.name === form.category)
                      return c ? s.category_id === c.id : false
                    }).map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Product Images <span className="text-muted-foreground text-xs">(first is primary)</span></label>
                {form.image_urls.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {form.image_urls.map((url, i) => (
                      <div key={url + i} className="relative group">
                        <img src={url} alt="" className="w-full aspect-square object-cover rounded border border-border" />
                        {i === 0 && <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">Primary</span>}
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between p-1">
                          <button type="button" onClick={() => moveImage(i, -1)} className="text-white text-xs px-1">◀</button>
                          <button type="button" onClick={() => removeImage(i)} className="text-white text-xs px-1"><Trash2 className="w-3 h-3" /></button>
                          <button type="button" onClick={() => moveImage(i, 1)} className="text-white text-xs px-1">▶</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <label className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md cursor-pointer hover:bg-accent transition-colors text-sm">
                  <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Image(s)'}
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} id="active" />
                <label htmlFor="active" className="text-sm">Active (visible in shop)</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_preorder} onChange={e => setForm(p => ({ ...p, is_preorder: e.target.checked }))} id="preorder" />
                <label htmlFor="preorder" className="text-sm">Pre-Order</label>
              </div>
              {form.is_preorder && (
                <div><label className="text-sm font-medium block mb-1">Pre-Order Label</label><Input value={form.preorder_label} onChange={e => setForm(p => ({ ...p, preorder_label: e.target.value }))} placeholder="Made to order – 2 weeks" /></div>
              )}
              <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
                {loading ? 'Saving...' : editId ? 'Update Product' : 'Add Product'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Variant Management Modal */}
      {variantProductId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">Variants: {variantProduct?.name}</h2>
              <button onClick={() => { setVariantProductId(null); resetVariantForm() }}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            {/* Add variant form */}
            <form onSubmit={handleVariantSubmit} className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4 items-end">
              <div><label className="text-xs font-medium block mb-1">Size</label><Input value={variantForm.size} onChange={e => setVariantForm(p => ({ ...p, size: e.target.value }))} placeholder="e.g. S, M, L" /></div>
              <div><label className="text-xs font-medium block mb-1">Color</label><Input value={variantForm.color} onChange={e => setVariantForm(p => ({ ...p, color: e.target.value }))} placeholder="e.g. Red" /></div>
              <div><label className="text-xs font-medium block mb-1">Price (KSh)</label><Input type="number" value={variantForm.price} onChange={e => setVariantForm(p => ({ ...p, price: e.target.value }))} required /></div>
              <div><label className="text-xs font-medium block mb-1">Stock</label><Input type="number" value={variantForm.stock} onChange={e => setVariantForm(p => ({ ...p, stock: e.target.value }))} /></div>
              <Button type="submit" size="sm" className="h-10">{editVariantId ? 'Update' : 'Add'}</Button>
            </form>

            {/* Existing variants */}
            <div className="space-y-2">
              {variants.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No variants yet. Add sizes, colors, and prices above.</p>}
              {variants.map(v => (
                <div key={v.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                  <div>
                    <span className="font-medium text-foreground text-sm">
                      {[v.size, v.color].filter(Boolean).join(' / ') || v.variant_label}
                    </span>
                    <span className="text-primary font-bold text-sm ml-3">KSh {v.price.toLocaleString()}</span>
                    <span className="text-muted-foreground text-xs ml-2">Stock: {v.stock}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setVariantForm({ variant_label: v.variant_label, size: v.size || '', color: v.color || '', price: String(v.price), stock: String(v.stock) })
                      setEditVariantId(v.id)
                    }}><Edit className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteVariant(v.id)} className="text-destructive"><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(p => (
          <div key={p.id} className="bg-card border border-border rounded-lg overflow-hidden">
            {p.image_url ? (
              <img src={p.image_url} alt={p.name} className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 bg-muted flex items-center justify-center text-muted-foreground text-sm">No image</div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{p.name}</h3>
                  <p className="text-primary font-bold text-sm">KSh {p.price.toLocaleString()}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {p.is_active ? 'Active' : 'Hidden'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{p.category} · Stock: {p.stock}</p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => handleEdit(p)} className="flex-1">
                  <Edit className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => openVariants(p.id)} title="Manage variants">
                  <Layers className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(p.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            No products yet. Click "Add Product" to get started.
          </div>
        )}
      </div>
    </div>
  )
}
