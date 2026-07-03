import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Camera, Upload, Loader2, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchPublicTable } from '@/lib/publicContent'
import { useSEO } from '@/hooks/useSEO'

// Static fallback looks
import tribeTess from '@/assets/tribe-tess.jpeg'
import tribeAnne from '@/assets/tribe-anne.jpeg'
import tribeLuna from '@/assets/tribe-luna.jpeg'
import tribe1 from '@/assets/tribe-1.jpg'

const fallbackLooks = [
  { image: tribeTess, name: 'Tess', piece: 'Beaded Dress' },
  { image: tribeAnne, name: 'Anne', piece: 'Beaded Bracelet' },
  { image: tribeLuna, name: 'Luna', piece: 'Beaded Dog Collar' },
  { image: tribe1, name: 'Amani K.', piece: 'Layered Beaded Necklace' },
]

interface TribeLook {
  id: string
  image_url: string
  name: string
  piece_name: string
  status: string
}

export default function TribeLooksPage() {
  useSEO('Tribe Looks', 'See how the Ushanga Chronicles community styles their handcrafted pieces — and share your own look.', '/tribe-looks')
  const [looks, setLooks] = useState<TribeLook[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: '', piece_name: '', image_url: '' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
      if (session?.user) {
        setForm(f => ({ ...f, name: session.user.user_metadata?.full_name || '' }))
      }
    })
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchPublicTable<TribeLook>('tribe_looks', 'select=*&status=eq.approved&order=created_at.desc')
        setLooks(data || [])
      } catch { setLooks([]) }
      setLoading(false)
    }
    load()
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `tribe-looks/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('product-images').upload(path, file)
    if (error) { toast.error('Upload failed'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
    setForm(f => ({ ...f, image_url: publicUrl }))
    setUploading(false)
    toast.success('Image uploaded!')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) { toast.error('Please log in first'); return }
    if (!form.image_url) { toast.error('Please upload an image'); return }
    if (!form.name.trim()) { toast.error('Please enter your name'); return }

    const { error } = await supabase.from('tribe_looks').insert({
      user_id: userId,
      image_url: form.image_url,
      name: form.name,
      piece_name: form.piece_name,
      status: 'pending',
    })
    if (error) { toast.error('Failed to submit. Please try again.'); return }
    setSubmitted(true)
    toast.success('Look submitted! It will appear after approval.')
  }

  const allLooks = [
    ...looks.map(l => ({ image: l.image_url, name: l.name, piece: l.piece_name })),
    ...fallbackLooks,
  ]

  return (
    <div className="bg-background">
      <section className="py-12 md:py-16 bg-card">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-4">
            Tribe Looks
          </h1>
          <p className="text-muted-foreground text-lg">
            Real Tribe Members. Real pieces. Real stories.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          {/* Upload section */}
          <div className="max-w-2xl mx-auto mb-12">
            {!userId ? (
              <div className="text-center bg-card border border-border rounded-lg p-8">
                <Camera className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold text-foreground mb-2">Share Your Look</h2>
                <p className="text-muted-foreground mb-4">Log in to share how you wear your Ushanga pieces!</p>
                <Link to="/auth" state={{ returnTo: '/tribe-looks' }}
                  className="inline-block bg-primary text-primary-foreground px-8 py-3 text-sm font-bold tracking-wider uppercase hover:bg-primary/90 transition-colors">
                  Log In to Share
                </Link>
              </div>
            ) : submitted ? (
              <div className="text-center bg-card border border-border rounded-lg p-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold text-foreground mb-2">Look Submitted!</h2>
                <p className="text-muted-foreground">Your look will appear here once it's been approved. Asante! 🎉</p>
                <button onClick={() => { setSubmitted(false); setForm({ name: '', piece_name: '', image_url: '' }) }}
                  className="mt-4 text-primary text-sm font-semibold hover:underline">Share Another Look</button>
              </div>
            ) : !showUpload ? (
              <div className="text-center">
                <button onClick={() => setShowUpload(true)}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 text-sm font-bold tracking-wider uppercase hover:bg-primary/90 transition-colors">
                  <Camera className="w-5 h-5" /> Share Your Look
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-foreground">Share Your Look</h2>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Your Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Your name" className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">What piece are you wearing?</label>
                  <input type="text" value={form.piece_name} onChange={e => setForm(f => ({ ...f, piece_name: e.target.value }))}
                    placeholder="e.g. Beaded Necklace" className="w-full border border-border bg-background text-foreground rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Your Photo</label>
                  {form.image_url && (
                    <img src={form.image_url} alt="Preview" className="w-32 h-32 object-cover rounded-lg mb-3 border border-border" />
                  )}
                  <label className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors text-sm">
                    {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Photo</>}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={uploading || !form.image_url}
                    className="flex-1 bg-primary text-primary-foreground py-3 font-bold text-sm tracking-wider uppercase hover:bg-primary/90 transition-colors disabled:opacity-50 rounded-lg">
                    Submit Your Look
                  </button>
                  <button type="button" onClick={() => setShowUpload(false)}
                    className="px-4 py-3 border border-border text-muted-foreground rounded-lg text-sm hover:bg-accent transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Gallery */}
          {loading ? (
            <p className="text-center text-muted-foreground">Loading looks...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
              {allLooks.map((look, i) => (
                <div key={i} className="group relative overflow-hidden rounded-lg">
                  <img src={look.image} alt={`${look.name} wearing ${look.piece}`}
                    className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <p className="text-white font-semibold text-sm">{look.name}</p>
                    {look.piece && <p className="text-white/80 text-xs">{look.piece}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
