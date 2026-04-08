import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, X, Upload, ArrowUp, ArrowDown } from 'lucide-react'

interface HeroSlide {
  id: string
  image_url: string
  title: string
  subtitle: string
  cta_text: string
  cta_link: string
  display_order: number
  is_active: boolean
}

export default function AdminHeroSlides() {
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    image_url: '', title: '', subtitle: '', cta_text: 'Shop Now', cta_link: '/shop', is_active: true
  })

  const fetchSlides = async () => {
    const { data } = await supabase.from('hero_slides').select('*').order('display_order')
    if (data) setSlides(data)
  }

  useEffect(() => { fetchSlides() }, [])

  const resetForm = () => {
    setForm({ image_url: '', title: '', subtitle: '', cta_text: 'Shop Now', cta_link: '/shop', is_active: true })
    setEditId(null)
    setShowForm(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `hero/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file)
    if (error) { toast.error('Upload failed'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    setForm(prev => ({ ...prev, image_url: publicUrl }))
    setUploading(false)
    toast.success('Image uploaded!')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.image_url) { toast.error('Please upload an image'); return }
    setLoading(true)
    const payload = {
      image_url: form.image_url,
      title: form.title,
      subtitle: form.subtitle,
      cta_text: form.cta_text,
      cta_link: form.cta_link,
      is_active: form.is_active,
      display_order: editId ? undefined : slides.length,
    }

    if (editId) {
      const { display_order, ...updatePayload } = payload
      const { error } = await supabase.from('hero_slides').update(updatePayload).eq('id', editId)
      if (error) toast.error(error.message)
      else toast.success('Slide updated!')
    } else {
      const { error } = await supabase.from('hero_slides').insert(payload)
      if (error) toast.error(error.message)
      else toast.success('Slide added!')
    }
    setLoading(false)
    resetForm()
    fetchSlides()
  }

  const handleEdit = (s: HeroSlide) => {
    setForm({
      image_url: s.image_url,
      title: s.title,
      subtitle: s.subtitle,
      cta_text: s.cta_text,
      cta_link: s.cta_link,
      is_active: s.is_active,
    })
    setEditId(s.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this slide?')) return
    const { error } = await supabase.from('hero_slides').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Slide deleted'); fetchSlides() }
  }

  const moveSlide = async (id: string, direction: 'up' | 'down') => {
    const idx = slides.findIndex(s => s.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= slides.length) return
    
    await Promise.all([
      supabase.from('hero_slides').update({ display_order: swapIdx }).eq('id', slides[idx].id),
      supabase.from('hero_slides').update({ display_order: idx }).eq('id', slides[swapIdx].id),
    ])
    fetchSlides()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Hero Slides</h1>
        <Button onClick={() => { resetForm(); setShowForm(true) }} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" /> Add Slide
        </Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">{editId ? 'Edit Slide' : 'Add Slide'}</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Slide Image *</label>
                {form.image_url && (
                  <img src={form.image_url} alt="Preview" className="w-full h-40 object-cover rounded mb-2 border border-border" />
                )}
                <label className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-md cursor-pointer hover:bg-accent transition-colors text-sm">
                  <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Image'}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Title</label>
                <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="USHANGA CHRONICLES" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Subtitle</label>
                <Input value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} placeholder="One bead. A thousand stories." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Button Text</label>
                  <Input value={form.cta_text} onChange={e => setForm(p => ({ ...p, cta_text: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Button Link</label>
                  <Input value={form.cta_link} onChange={e => setForm(p => ({ ...p, cta_link: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} id="active" />
                <label htmlFor="active" className="text-sm">Active</label>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold">
                {loading ? 'Saving...' : editId ? 'Update Slide' : 'Add Slide'}
              </Button>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {slides.map((s, i) => (
          <div key={s.id} className="bg-card border border-border rounded-lg p-4 flex gap-4 items-center">
            <img src={s.image_url} alt={s.title} className="w-24 h-16 object-cover rounded" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm truncate">{s.title || '(No title)'}</h3>
              <p className="text-xs text-muted-foreground truncate">{s.subtitle}</p>
              <span className={`text-xs px-2 py-0.5 rounded ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {s.is_active ? 'Active' : 'Hidden'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => moveSlide(s.id, 'up')} disabled={i === 0} className="p-1.5 hover:bg-accent rounded disabled:opacity-30">
                <ArrowUp className="w-4 h-4" />
              </button>
              <button onClick={() => moveSlide(s.id, 'down')} disabled={i === slides.length - 1} className="p-1.5 hover:bg-accent rounded disabled:opacity-30">
                <ArrowDown className="w-4 h-4" />
              </button>
              <Button size="sm" variant="outline" onClick={() => handleEdit(s)}><Edit className="w-3 h-3" /></Button>
              <Button size="sm" variant="outline" onClick={() => handleDelete(s.id)} className="text-destructive hover:text-destructive">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
        {slides.length === 0 && (
          <p className="text-center py-16 text-muted-foreground">No hero slides yet. Add your first slide above.</p>
        )}
      </div>
    </div>
  )
}
