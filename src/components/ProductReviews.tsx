import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Star, BadgeCheck, Upload, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Link } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'

interface Review {
  id: string
  user_id: string
  customer_name: string
  rating: number
  title: string | null
  comment: string
  photo_urls: string[] | null
  is_verified_buyer: boolean
  admin_response: string | null
  created_at: string
}

function StarRating({ value, onChange, size = 20 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          disabled={!onChange}
          className={onChange ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}
          aria-label={`${n} stars`}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= value ? 'fill-primary text-primary' : 'text-muted-foreground/30'}
          />
        </button>
      ))}
    </div>
  )
}

export function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)

  // form state
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
      setReviews((data as Review[]) || [])

      if (user) {
        const { data: own } = await supabase
          .from('product_reviews')
          .select('id')
          .eq('product_id', productId)
          .eq('user_id', user.id)
          .maybeSingle()
        setHasReviewed(!!own)
      }
      setLoading(false)
    }
    load()
  }, [productId, user])

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const ratingCounts = [5, 4, 3, 2, 1].map(n => ({ stars: n, count: reviews.filter(r => r.rating === n).length }))

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (photoUrls.length + files.length > 4) {
      toast.error('Max 4 photos per review')
      return
    }
    setUploading(true)
    const newUrls: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('review-photos').upload(path, file)
      if (error) { toast.error('Photo upload failed'); continue }
      const { data: urlData } = supabase.storage.from('review-photos').getPublicUrl(path)
      newUrls.push(urlData.publicUrl)
    }
    setPhotoUrls(prev => [...prev, ...newUrls])
    setUploading(false)
  }

  const handleSubmit = async () => {
    if (!user) return
    if (rating === 0) { toast.error('Please select a rating'); return }
    if (comment.trim().length < 10) { toast.error('Please write at least 10 characters'); return }
    setSubmitting(true)

    const { data: profile } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle()
    const customerName = profile?.display_name || user.email?.split('@')[0] || 'Tribe Member'

    const { error } = await supabase.from('product_reviews').insert({
      product_id: productId,
      user_id: user.id,
      customer_name: customerName,
      rating,
      title: title.trim() || null,
      comment: comment.trim(),
      photo_urls: photoUrls,
    })
    setSubmitting(false)
    if (error) {
      if (error.code === '23505') toast.error('You have already reviewed this product')
      else toast.error('Failed to submit review')
      return
    }
    toast.success("Review submitted! It'll appear after admin approval.")
    setShowForm(false)
    setRating(0); setTitle(''); setComment(''); setPhotoUrls([])
    setHasReviewed(true)
  }

  return (
    <section className="mt-16 border-t border-border pt-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Tribe Reviews</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-3 mt-2">
              <StarRating value={Math.round(avgRating)} size={18} />
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{avgRating.toFixed(1)}</span> · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        {!hasReviewed && (
          user ? (
            <Button onClick={() => setShowForm(s => !s)} variant={showForm ? 'outline' : 'default'}>
              {showForm ? 'Cancel' : 'Write a Review'}
            </Button>
          ) : (
            <Link to={`/auth?redirect=/product/${productId}`}>
              <Button>Sign in to review</Button>
            </Link>
          )
        )}
      </div>

      {/* Rating breakdown */}
      {reviews.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4 mb-8 max-w-md">
          {ratingCounts.map(({ stars, count }) => {
            const pct = reviews.length ? (count / reviews.length) * 100 : 0
            return (
              <div key={stars} className="flex items-center gap-3 text-xs py-1">
                <span className="w-3 text-muted-foreground">{stars}</span>
                <Star className="w-3 h-3 fill-primary text-primary" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-right text-muted-foreground">{count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Form */}
      {showForm && user && (
        <div className="bg-card border border-border rounded-lg p-6 mb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your rating *</label>
            <StarRating value={rating} onChange={setRating} size={28} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Title (optional)</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Stunning craftsmanship" maxLength={100} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Your review *</label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder="Share your experience with this piece..." maxLength={1000} />
            <p className="text-xs text-muted-foreground mt-1">{comment.length}/1000</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Photos (up to 4)</label>
            {photoUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {photoUrls.map((url, i) => (
                  <div key={i} className="relative w-20 h-20 rounded overflow-hidden border border-border">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotoUrls(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 bg-background/90 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {photoUrls.length < 4 && (
              <label className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded cursor-pointer hover:bg-accent text-sm">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Uploading...' : 'Add photos'}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
            )}
          </div>
          <Button onClick={handleSubmit} disabled={submitting || uploading} className="w-full md:w-auto">
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
          <p className="text-xs text-muted-foreground">Your review will appear after admin approval.</p>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <Star className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No reviews yet. Be the first to share your story.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map(r => (
            <article key={r.id} className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{r.customer_name}</span>
                    {r.is_verified_buyer && (
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        <BadgeCheck className="w-3 h-3" /> Verified Buyer
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating value={r.rating} size={14} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
              {r.title && <h4 className="font-semibold text-foreground mt-2">{r.title}</h4>}
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">{r.comment}</p>
              {r.photo_urls && r.photo_urls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {r.photo_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded overflow-hidden border border-border hover:opacity-80 transition-opacity">
                      <img src={url} alt={`Review photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
              {r.admin_response && (
                <div className="mt-4 pl-4 border-l-2 border-primary bg-primary/5 p-3 rounded">
                  <p className="text-xs font-semibold text-primary mb-1">Response from Ushanga</p>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{r.admin_response}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
