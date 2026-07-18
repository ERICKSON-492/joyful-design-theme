import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Plus, Trash2, Search, MapPin, Pencil, Check, X } from 'lucide-react'

interface Area {
  id: string
  name: string
  doorstep_price: number
  super_metro_route: string | null
  super_metro_only: boolean
  is_active: boolean
}

const emptyNewArea = { name: '', doorstep_price: '', super_metro_route: '', super_metro_only: false }

export default function AdminNairobiAreas() {
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newArea, setNewArea] = useState(emptyNewArea)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', doorstep_price: '', super_metro_route: '' })

  const fetchAreas = async () => {
    setLoading(true)
    setLoadError(null)
    const { data, error } = await (supabase as any).from('nairobi_areas').select('*').order('name', { ascending: true })
    if (error) {
      setLoadError(
        error.message.toLowerCase().includes('does not exist') || error.code === '42P01'
          ? 'The nairobi_areas table doesn\'t exist in your database yet. The migration that creates it (supabase/migrations/20260707140000_add_nairobi_areas.sql) needs to be applied to your live Supabase project.'
          : error.message
      )
      setLoading(false)
      return
    }
    if (data) setAreas(data as unknown as Area[])
    setLoading(false)
  }

  useEffect(() => { fetchAreas() }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return areas
    return areas.filter(a => a.name.toLowerCase().includes(q))
  }, [areas, search])

  const addArea = async () => {
    if (!newArea.name.trim()) { toast.error('Enter an area name'); return }
    if (!newArea.doorstep_price || parseFloat(newArea.doorstep_price) < 0) { toast.error('Enter a valid price'); return }
    setSaving(true)
    const { error } = await (supabase as any).from('nairobi_areas').insert({
      name: newArea.name.trim(),
      doorstep_price: parseFloat(newArea.doorstep_price),
      super_metro_route: newArea.super_metro_route.trim() || null,
    })
    setSaving(false)
    if (error) {
      toast.error(error.code === '23505' ? 'That area already exists' : error.message)
      return
    }
    toast.success('Area added')
    setNewArea(emptyNewArea)
    setShowAdd(false)
    fetchAreas()
  }

  const startEdit = (a: Area) => {
    setEditingId(a.id)
    setEditForm({ name: a.name, doorstep_price: String(a.doorstep_price), super_metro_route: a.super_metro_route || '' })
  }

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim()) { toast.error('Name cannot be empty'); return }
    if (!editForm.doorstep_price || parseFloat(editForm.doorstep_price) < 0) { toast.error('Enter a valid price'); return }
    const { error } = await (supabase as any).from('nairobi_areas').update({
      name: editForm.name.trim(),
      doorstep_price: parseFloat(editForm.doorstep_price),
      super_metro_route: editForm.super_metro_route.trim() || null,
    }).eq('id', id)
    if (error) { toast.error(error.code === '23505' ? 'That area name already exists' : error.message); return }
    toast.success('Updated')
    setEditingId(null)
    fetchAreas()
  }

  const toggleActive = async (a: Area) => {
    const { error } = await (supabase as any).from('nairobi_areas').update({ is_active: !a.is_active }).eq('id', a.id)
    if (error) { toast.error(error.message); return }
    fetchAreas()
  }

  const deleteArea = async (id: string) => {
    if (!confirm('Delete this delivery area?')) return
    const { error } = await (supabase as any).from('nairobi_areas').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Area deleted')
    fetchAreas()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Nairobi Delivery Areas</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Door-to-door delivery pricing by area, shown to customers at checkout. Doorstep delivery
            is always offered for every area — Super Metro route below is just an additional option
            alongside it where available, never a replacement.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(s => !s)}>
          <Plus className="w-4 h-4 mr-1" /> Add Area
        </Button>
      </div>

      {loadError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-4 mb-6 text-sm">
          <p className="font-semibold mb-1">Couldn't load delivery areas</p>
          <p>{loadError}</p>
        </div>
      )}

      {showAdd && (
        <div className="bg-card border border-border rounded-lg p-4 mb-6 max-w-lg space-y-3">
          <h3 className="font-semibold text-sm text-foreground">New Delivery Area</h3>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Area Name</label>
            <Input
              value={newArea.name}
              onChange={e => setNewArea(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Kileleshwa"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Doorstep Price (KSh)</label>
            <Input
              type="number" min="0" step="1"
              value={newArea.doorstep_price}
              onChange={e => setNewArea(f => ({ ...f, doorstep_price: e.target.value }))}
              placeholder="e.g. 350"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Super Metro Route (optional)</label>
            <Input
              value={newArea.super_metro_route}
              onChange={e => setNewArea(f => ({ ...f, super_metro_route: e.target.value }))}
              placeholder="e.g. Super Metro - Ngong"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={addArea} disabled={saving} className="flex-1">
              {saving ? 'Adding...' : 'Add Area'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setNewArea(emptyNewArea) }}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="relative max-w-sm mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search areas..."
          className="w-full border border-border bg-background rounded-lg pl-9 pr-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : loadError ? null : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>{search ? 'No areas match your search.' : 'No delivery areas yet.'}</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <p className="text-xs text-muted-foreground px-4 pt-3">{filtered.length} of {areas.length} areas</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="px-4 py-2 font-medium">Area</th>
                <th className="px-4 py-2 font-medium">Doorstep Price</th>
                <th className="px-4 py-2 font-medium">Super Metro Route</th>
                <th className="px-4 py-2 font-medium">Active</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                  {editingId === a.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full border border-border bg-background rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number" min="0"
                          value={editForm.doorstep_price}
                          onChange={e => setEditForm(f => ({ ...f, doorstep_price: e.target.value }))}
                          className="w-24 border border-border bg-background rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          value={editForm.super_metro_route}
                          onChange={e => setEditForm(f => ({ ...f, super_metro_route: e.target.value }))}
                          placeholder="—"
                          className="w-full border border-border bg-background rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{a.is_active ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => saveEdit(a.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground hover:bg-accent rounded"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 font-medium text-foreground">{a.name}</td>
                      <td className="px-4 py-2 text-foreground">KSh {a.doorstep_price.toLocaleString()}</td>
                      <td className="px-4 py-2 text-muted-foreground">{a.super_metro_route || '—'}</td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => toggleActive(a)}
                          className={`text-xs px-2 py-0.5 rounded font-medium ${a.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {a.is_active ? 'Yes' : 'No'}
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEdit(a)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-accent rounded"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteArea(a.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-accent rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
