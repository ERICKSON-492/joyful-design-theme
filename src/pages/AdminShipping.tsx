import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, Edit, X } from 'lucide-react'

interface ShippingMethod {
  id: string
  name: string
  type: string
  provider: string
  estimated_days: string | null
  price: number
  is_active: boolean
  regions: string[]
}

export default function AdminShipping() {
  const [methods, setMethods] = useState<ShippingMethod[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'local', provider: '', estimated_days: '', price: '', is_active: true, regions: '' })

  const fetch_ = async () => {
    const { data } = await supabase.from('shipping_methods').select('*').order('type', { ascending: true })
    if (data) setMethods(data as any)
  }
  useEffect(() => { fetch_() }, [])

  const resetForm = () => { setForm({ name: '', type: 'local', provider: '', estimated_days: '', price: '', is_active: true, regions: '' }); setEditId(null); setShowForm(false) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const payload = {
      name: form.name, type: form.type, provider: form.provider,
      estimated_days: form.estimated_days || null,
      price: parseFloat(form.price) || 0, is_active: form.is_active,
      regions: form.regions.split(',').map(r => r.trim()).filter(Boolean),
    }
    if (editId) {
      const { error } = await supabase.from('shipping_methods').update(payload).eq('id', editId)
      if (error) toast.error(error.message); else toast.success('Updated!')
    } else {
      const { error } = await supabase.from('shipping_methods').insert(payload)
      if (error) toast.error(error.message); else toast.success('Added!')
    }
    setLoading(false); resetForm(); fetch_()
  }

  const handleEdit = (m: ShippingMethod) => {
    setForm({ name: m.name, type: m.type, provider: m.provider, estimated_days: m.estimated_days || '', price: String(m.price), is_active: m.is_active, regions: (m.regions || []).join(', ') })
    setEditId(m.id); setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this shipping method?')) return
    await supabase.from('shipping_methods').delete().eq('id', id)
    toast.success('Deleted'); fetch_()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Shipping Methods</h1>
        <Button onClick={() => { resetForm(); setShowForm(true) }}><Plus className="w-4 h-4 mr-1" /> Add Method</Button>
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold">{editId ? 'Edit' : 'Add'} Shipping Method</h2>
              <button onClick={resetForm}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="text-sm font-medium block mb-1">Name</label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div><label className="text-sm font-medium block mb-1">Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="local">Local (Kenya)</option><option value="international">International</option>
                </select>
              </div>
              <div><label className="text-sm font-medium block mb-1">Provider</label><Input value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-medium block mb-1">Estimated Days</label><Input value={form.estimated_days} onChange={e => setForm(p => ({ ...p, estimated_days: e.target.value }))} placeholder="2-5 days" /></div>
                <div><label className="text-sm font-medium block mb-1">Price (KSh)</label><Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Regions (comma-separated)</label><Input value={form.regions} onChange={e => setForm(p => ({ ...p, regions: e.target.value }))} placeholder="Nairobi, Mombasa, Nationwide" /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} id="active" />
                <label htmlFor="active" className="text-sm">Active</label>
              </div>
              <Button type="submit" disabled={loading} className="w-full">{loading ? 'Saving...' : editId ? 'Update' : 'Add'}</Button>
            </form>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {['local', 'international'].map(type => {
          const group = methods.filter(m => m.type === type)
          if (group.length === 0) return null
          return (
            <div key={type}>
              <h2 className="font-display text-lg font-bold text-foreground mb-2 capitalize">{type === 'local' ? '🇰🇪 Local Couriers' : '🌍 International'}</h2>
              <div className="grid gap-3">
                {group.map(m => (
                  <div key={m.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{m.name}</h3>
                      <p className="text-xs text-muted-foreground">{m.estimated_days} · KSh {m.price.toLocaleString()} · {(m.regions || []).join(', ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{m.is_active ? 'Active' : 'Off'}</span>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(m)}><Edit className="w-3 h-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(m.id)} className="text-destructive"><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
