import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Star, BadgeCheck, Check, X, Trash2, MessageSquare } from 'lucide-react'

interface Review {
  id: string
  product_id: string
  customer_name: string
  rating: number
  title: string | null
  comment: string
  photo_urls: string[] | null
  is_verified_buyer: boolean
  status: string
  admin_response: string | null
  created_at: string
  product?: { name: string } | null
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({})
  const [responding, setResponding] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    let query = supabase
      .from('product_reviews')
      .select('*, product:products(name)')
      .order('created_at', { ascending: false })
    if (filter !== 'all') query = query.eq('status', filter)
    const { data } = await query
    setReviews((data as Review[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('product_reviews').update({ status }).eq('id', id)
    if (error) toast.error('Failed to update')
    else { toast.success(`Review ${status}`); load() }
  }

  const deleteReview = async (id: string) => {
    if (!confirm('Delete this review permanently?')) return
    const { error } = await supabase.from('product_reviews').delete().eq('id', id)
    if (error) toast.error('Failed to delete')
    else { toast.success('Review deleted'); load() }
  }

  const saveResponse = async (id: string) => {
    const response = responseDrafts[id]?.trim() || null
    setResponding(id)
    const { error } = await supabase.from('product_reviews').update({ admin_response: response }).eq('id', id)
    setResponding(null)
    if (error) toast.error('Failed to save response')
    else { toast.success('Response saved'); load() }
  }

  return (
    <div>
      <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">Product Reviews</h1>
      <p className="text-muted-foreground mb-6">Moderate customer reviews and respond to feedback.</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm rounded-md capitalize transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-lg">
          <p className="text-muted-foreground">No {filter !== 'all' ? filter : ''} reviews.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-lg p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{r.product?.name || 'Unknown product'}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="font-semibold text-foreground">{r.customer_name}</span>
                    {r.is_verified_buyer && (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        <BadgeCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      r.status === 'approved' ? 'bg-green-500/10 text-green-600' :
                      r.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                      'bg-yellow-500/10 text-yellow-600'
                    }`}>{r.status}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} className={`w-4 h-4 ${n <= r.rating ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`} />
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {r.status !== 'approved' && (
                    <Button size="sm" onClick={() => updateStatus(r.id, 'approved')} className="gap-1">
                      <Check className="w-4 h-4" /> Approve
                    </Button>
                  )}
                  {r.status !== 'rejected' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'rejected')} className="gap-1">
                      <X className="w-4 h-4" /> Reject
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => deleteReview(r.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {r.title && <h4 className="font-semibold text-foreground mb-1">{r.title}</h4>}
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{r.comment}</p>
              {r.photo_urls && r.photo_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {r.photo_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 rounded overflow-hidden border border-border">
                      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-border">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
                  <MessageSquare className="w-3 h-3" /> Brand response (optional, public)
                </label>
                <Textarea
                  value={responseDrafts[r.id] ?? r.admin_response ?? ''}
                  onChange={e => setResponseDrafts(prev => ({ ...prev, [r.id]: e.target.value }))}
                  rows={2}
                  placeholder="Thank you for the kind words..."
                />
                <Button size="sm" onClick={() => saveResponse(r.id)} disabled={responding === r.id} className="mt-2">
                  {responding === r.id ? 'Saving...' : 'Save Response'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
