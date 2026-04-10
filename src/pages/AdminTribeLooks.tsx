import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Check, X, Trash2 } from 'lucide-react'

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

  const statusColor = (s: string) => {
    if (s === 'approved') return 'bg-green-100 text-green-700'
    if (s === 'rejected') return 'bg-red-100 text-red-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">Tribe Looks</h1>

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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground text-sm">{look.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${statusColor(look.status)}`}>{look.status}</span>
                </div>
                {look.piece_name && <p className="text-xs text-muted-foreground mb-2">{look.piece_name}</p>}
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
