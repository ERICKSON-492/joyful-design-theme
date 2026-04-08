import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, X, Upload } from 'lucide-react'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  image_url: string | null
  stock: number
  is_active: boolean
}

const categories = ['Wear It', 'Live With It', 'For Your Table', 'Collectibles', 'For Your Pet', 'Wholesale & Gifting']

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', price: '', category: categories[0], stock: '', image_url: '', is_active: true
  })

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (data) setProducts(data)
  }

  useEffect(() => { fetchProducts() }, [])

  const resetForm = () => {
    setForm({ name: '', description: '', price: '', category: categories[0], stock: '', image_url: '', is_active: true })
    setEditId(null)
    setShowForm(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file)
    if (error) {
      toast.error('Upload failed: ' + error.message)
      setUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    setForm(prev => ({ ...prev, image_url: publicUrl }))
    setUploading(false)
    toast.success('Image uploaded!')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const payload = {
      name: form.name,
      description: form.description || null,
      price: parseFloat(form.price),
      category: form.category,
      stock: parseInt(form.stock) || 0,
      image_url: form.image_url || null,
      is_active: form.is_active,
    }

    if (editId) {
      const { error } = await supabase.from('products').update(payload).eq('id', editId)
      if (error) toast.error(error.message)
      else toast.success('Product updated!')
    } else {
      const { error } = await supabase.from('products').insert(payload)
      if (error) toast.error(error.message)
      else toast.success('Product added!')
    }
    setLoading(false)
    resetForm()
    fetchProducts()
  }

  const handleEdit = (p: Product) => {
    setForm({
      name: p.name,
      description: p.description || '',
      price: String(p.price),
      category: p.category,
      stock: String(p.stock),
      image_url: p.image_url || '',
      is_active: p.is_active,
    })
    setEditId(p.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Product deleted'); fetchProducts() }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Products</h1>
        <Button onClick={() => { resetForm(); setShowForm(true) }} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> Add Product
        </Button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">{editId ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Name</label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Price (KSh)</label>
                  <Input type="number" step="0.01" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Stock</label>
                  <Input type="number" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Product Image</label>
                {form.image_url && (
                  <img src={form.image_url} alt="Preview" className="w-24 h-24 object-cover rounded mb-2 border border-border" />
                )}
                <label className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md cursor-pointer hover:bg-accent transition-colors text-sm">
                  <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Image'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} id="active" />
                <label htmlFor="active" className="text-sm">Active (visible in shop)</label>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
                {loading ? 'Saving...' : editId ? 'Update Product' : 'Add Product'}
              </Button>
            </form>
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
