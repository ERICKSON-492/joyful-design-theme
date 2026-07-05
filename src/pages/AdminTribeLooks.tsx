import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Check, X, Trash2, Upload, Loader2, Plus } from 'lucide-react'

interface TribeLook {
  id: string
  image_url: string
  name: string
  piece_name: string
  status: string
  created_at: string
}

export default function AdminTribeLooks() {
  const [looks, setLooks] = useState<TribeLook[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newLook, setNewLook] = useState({ image_url: '', name: '', piece_name: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', piece_name: '' })

  const fetchLooks = async () => {
    setLoading(true)
    const { data } = await supabase.from('tribe_looks').select('*').order('created_at', { ascending: false })
    if (data) setLooks(data)
    setLoading(false)
  }

  useEffect(() => { fetchLooks() }, [])

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('tribe_looks').update({ status }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success(`Look ${status}`); fetchLooks() }
  }

  const deleteLook = async (id: string) => {
    if (!confirm('Delete this look?')) return
    const { error } = await supabase.from('tribe_looks').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Look deleted'); fetchLooks() }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `tribe-looks/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file)
    if (error) { toast.error('Upload failed'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    setNewLook(f => ({ ...f, image_url: publicUrl }))
    setUploading(false)
  }

  const addFeaturedLook = async () => {
    if (!newLook.image_url) { toast.error('Please upload an image'); return }
    if (!newLook.name.trim()) { toast.error('Please enter a name'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('tribe_looks').insert({
      user_id: user?.id,
      image_url: newLook.image_url,
      name: newLook.name,
      piece_name: newLook.piece_name,
      status: 'approved', // curated by admin — goes live immediately
    })
    if (error) { toast.error(error.message); return }
    toast.success('Featured look added')
    setNewLook({ image_url: '', name: '', piece_name: '' })
    setShowAdd(false)
    fetchLooks()
  }

  const startEdit = (look: TribeLook) => {
    setEditingId(look.id)
    setEditForm({ name: look.name, piece_name: look.piece_name })
  }

  const saveEdit = async (id: string) => {
    const { error } = await supabase.from('tribe_looks').update({ name: editForm.name, piece_name: editForm.piece_name }).eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Updated')
    setEditingId(null)
    fetchLooks()
  }

  const statusColor = (s: string) => {
    if (s === 'approved') return 'bg-green-100 text-green-700'
    if (s === 'rejected') return 'bg-red-100 text-red-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Tribe Looks</h1>
        <Button size="sm" onClick={() => setShowAdd(s => !s)}>
          <Plus className="w-4 h-4 mr-1" /> Add Featured Look
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-6 max-w-2xl">
        This controls "The Tribe Wears It" section on the homepage. Approve or reject customer
        submissions below, or add your own curated photos directly — those go live immediately.
      </p>

      {showAdd && (
        <div className="bg-card border border-border rounded-lg p-4 mb-6 max-w-md space-y-3">
          <h3 className="font-semibold text-sm text-foreground">New Featured Look</h3>
          <div>
            {newLook.image_url ? (
              <img src={newLook.image_url} alt="" className="w-full h-40 object-cover rounded-lg mb-2" />
            ) : null}
            <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-lg py-2.5 text-sm cursor-pointer hover:border-primary transition-colors">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Photo</>}
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
          <input
            type="text" placeholder="Name (e.g. Amani K.)" value={newLook.name}
            onChange={e => setNewLook(f => ({ ...f, name: e.target.value }))}
            className="w-full border border-border bg-background rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="text" placeholder="Piece (e.g. Beaded Necklace)" value={newLook.piece_name}
            onChange={e => setNewLook(f => ({ ...f, piece_name: e.target.value }))}
            className="w-full border border-border bg-background rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={addFeaturedLook} disabled={uploading} className="flex-1">Add Look</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : looks.length === 0 ? (
        <p className="text-muted-foreground">No look submissions yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {looks.map(look => (
            <div key={look.id} className="bg-card border border-border rounded-lg overflow-hidden">
              <img src={look.image_url} alt={look.name} className="w-full h-48 object-cover" />
              <div className="p-4">
                {editingId === look.id ? (
                  <div className="space-y-2 mb-3">
                    <input
                      type="text" value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-border bg-background rounded px-2 py-1.5 text-sm"
                      placeholder="Name"
                    />
                    <input
                      type="text" value={editForm.piece_name}
                      onChange={e => setEditForm(f => ({ ...f, piece_name: e.target.value }))}
                      className="w-full border border-border bg-background rounded px-2 py-1.5 text-sm"
                      placeholder="Piece"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(look.id)} className="flex-1">Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => startEdit(look)}>
                    <h3 className="font-semibold text-foreground text-sm hover:text-primary transition-colors">{look.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor(look.status)}`}>{look.status}</span>
                  </div>
                )}
                {editingId !== look.id && look.piece_name && <p className="text-xs text-muted-foreground mb-2">{look.piece_name}</p>}
                <p className="text-xs text-muted-foreground mb-3">{new Date(look.created_at).toLocaleDateString()}</p>
                <div className="flex gap-2">
                  {look.status !== 'approved' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(look.id, 'approved')} className="flex-1 text-green-700">
                      <Check className="w-3 h-3 mr-1" /> Approve
                    </Button>
                  )}
                  {look.status !== 'rejected' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(look.id, 'rejected')} className="flex-1 text-yellow-700">
                      <X className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => deleteLook(look.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
