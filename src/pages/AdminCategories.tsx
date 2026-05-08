import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Upload, Plus, Trash2, Edit, X, ChevronDown, ChevronRight } from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
  display_order: number
  is_active: boolean
}
interface Subcategory {
  id: string
  category_id: string
  name: string
  slug: string
  display_order: number
  is_active: boolean
}
interface CategoryImage {
  id: string
  category: string
  image_url: string
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [subs, setSubs] = useState<Subcategory[]>([])
  const [images, setImages] = useState<Record<string, CategoryImage>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [newCat, setNewCat] = useState('')
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [newSub, setNewSub] = useState<Record<string, string>>({})
  const [editSubId, setEditSubId] = useState<string | null>(null)
  const [editSubName, setEditSubName] = useState('')

  const fetchAll = async () => {
    const [c, s, ci] = await Promise.all([
      supabase.from('categories').select('*').order('display_order'),
      supabase.from('subcategories').select('*').order('display_order'),
      supabase.from('category_images').select('*'),
    ])
    if (c.data) setCategories(c.data)
    if (s.data) setSubs(s.data)
    if (ci.data) {
      const map: Record<string, CategoryImage> = {}
      ci.data.forEach(x => { map[x.category] = x })
      setImages(map)
    }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  const handleAddCategory = async () => {
    if (!newCat.trim()) return
    const slug = slugify(newCat)
    const order = categories.length ? Math.max(...categories.map(c => c.display_order)) + 1 : 1
    const { error } = await supabase.from('categories').insert({ name: newCat.trim(), slug, display_order: order })
    if (error) toast.error(error.message)
    else { toast.success('Category added'); setNewCat(''); fetchAll() }
  }

  const handleSaveCategory = async (id: string) => {
    if (!editCatName.trim()) return
    const { error } = await supabase.from('categories').update({ name: editCatName.trim(), slug: slugify(editCatName) }).eq('id', id)
    if (error) toast.error(error.message); else { toast.success('Updated'); setEditCatId(null); fetchAll() }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category and all its subcategories?')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) toast.error(error.message); else { toast.success('Deleted'); fetchAll() }
  }

  const handleAddSub = async (categoryId: string) => {
    const name = (newSub[categoryId] || '').trim()
    if (!name) return
    const order = subs.filter(s => s.category_id === categoryId).length + 1
    const { error } = await supabase.from('subcategories').insert({ category_id: categoryId, name, slug: slugify(name), display_order: order })
    if (error) toast.error(error.message)
    else { toast.success('Subcategory added'); setNewSub(p => ({ ...p, [categoryId]: '' })); fetchAll() }
  }

  const handleSaveSub = async (id: string) => {
    if (!editSubName.trim()) return
    const { error } = await supabase.from('subcategories').update({ name: editSubName.trim(), slug: slugify(editSubName) }).eq('id', id)
    if (error) toast.error(error.message); else { toast.success('Updated'); setEditSubId(null); fetchAll() }
  }

  const handleDeleteSub = async (id: string) => {
    if (!confirm('Delete this subcategory?')) return
    const { error } = await supabase.from('subcategories').delete().eq('id', id)
    if (error) toast.error(error.message); else { toast.success('Deleted'); fetchAll() }
  }

  const handleUpload = async (catName: string, file: File) => {
    setUploading(catName)
    const ext = file.name.split('.').pop()
    const path = `categories/${slugify(catName)}-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('product-images').upload(path, file)
    if (upErr) { toast.error('Upload failed: ' + upErr.message); setUploading(null); return }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    const existing = images[catName]
    if (existing) {
      await supabase.from('category_images').update({ image_url: publicUrl }).eq('id', existing.id)
    } else {
      await supabase.from('category_images').insert({ category: catName, image_url: publicUrl })
    }
    toast.success('Image saved')
    setUploading(null)
    fetchAll()
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Categories & Subcategories</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your shop taxonomy and category images.</p>
      </div>

      {/* Add new category */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6 flex gap-2">
        <Input placeholder="New category name (e.g. Wear It)" value={newCat} onChange={e => setNewCat(e.target.value)} />
        <Button onClick={handleAddCategory} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1" /> Add</Button>
      </div>

      {/* Categories list */}
      <div className="space-y-3">
        {categories.map(cat => {
          const catSubs = subs.filter(s => s.category_id === cat.id)
          const isOpen = expanded[cat.id] !== false
          const img = images[cat.name]
          return (
            <div key={cat.id} className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="p-4 flex items-center gap-3 flex-wrap">
                <button onClick={() => setExpanded(p => ({ ...p, [cat.id]: !isOpen }))} className="text-muted-foreground">
                  {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                {img?.image_url ? (
                  <img src={img.image_url} alt={cat.name} className="w-12 h-12 object-cover rounded" />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">No img</div>
                )}
                {editCatId === cat.id ? (
                  <>
                    <Input value={editCatName} onChange={e => setEditCatName(e.target.value)} className="max-w-xs" />
                    <Button size="sm" onClick={() => handleSaveCategory(cat.id)}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditCatId(null)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <h3 className="font-semibold text-foreground flex-1">{cat.name} <span className="text-xs text-muted-foreground font-normal">({catSubs.length} subs)</span></h3>
                    <label className="inline-flex items-center gap-1 px-3 py-1.5 border border-border rounded-md cursor-pointer hover:bg-accent text-xs">
                      <Upload className="w-3 h-3" /> {uploading === cat.name ? 'Uploading...' : img ? 'Change image' : 'Upload image'}
                      <input type="file" accept="image/*" className="hidden" disabled={uploading === cat.name}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(cat.name, f) }} />
                    </label>
                    <Button size="sm" variant="ghost" onClick={() => { setEditCatId(cat.id); setEditCatName(cat.name) }}><Edit className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteCategory(cat.id)} className="text-destructive"><Trash2 className="w-3 h-3" /></Button>
                  </>
                )}
              </div>

              {isOpen && (
                <div className="border-t border-border bg-muted/30 p-4 space-y-2">
                  {catSubs.map(sub => (
                    <div key={sub.id} className="flex items-center gap-2 bg-background rounded p-2">
                      {editSubId === sub.id ? (
                        <>
                          <Input value={editSubName} onChange={e => setEditSubName(e.target.value)} className="max-w-xs h-8" />
                          <Button size="sm" onClick={() => handleSaveSub(sub.id)} className="h-8">Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditSubId(null)} className="h-8">Cancel</Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm">{sub.name}</span>
                          <span className="text-xs text-muted-foreground">{sub.slug}</span>
                          <Button size="sm" variant="ghost" onClick={() => { setEditSubId(sub.id); setEditSubName(sub.name) }}><Edit className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteSub(sub.id)} className="text-destructive"><Trash2 className="w-3 h-3" /></Button>
                        </>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <Input placeholder="Add subcategory" value={newSub[cat.id] || ''} onChange={e => setNewSub(p => ({ ...p, [cat.id]: e.target.value }))} className="h-9" />
                    <Button size="sm" onClick={() => handleAddSub(cat.id)} className="bg-primary text-primary-foreground h-9"><Plus className="w-3 h-3 mr-1" /> Add</Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {categories.length === 0 && <p className="text-muted-foreground text-center py-8">No categories yet.</p>}
      </div>
    </div>
  )
}
