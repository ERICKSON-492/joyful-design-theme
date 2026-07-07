import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useSEO } from '@/hooks/useSEO'

// The Supabase JS client coordinates auth-token refresh across browser tabs
// using the Navigator LockManager API. Occasionally — especially with
// multiple tabs open, or right after a page load — a request can lose that
// lock race and fail with "Lock ... was released because another request
// stole it". This is transient, not a real data/permission problem, so we
// retry once after a short pause instead of failing the whole submission.
async function withLockRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (retries > 0 && msg.toLowerCase().includes('lock')) {
      await new Promise(r => setTimeout(r, 500))
      return withLockRetry(fn, retries - 1)
    }
    throw err
  }
}

const steps = ['Category', 'Your Vision', 'Colors & Materials', 'Inspiration', 'Your Details']

const categoryOptions = ['Jewelry', 'Home Decor', 'Fashion Accessory', 'Pet Accessory', 'Other']

const colorSwatches = [
  { name: 'Red', color: '#DC2626' },
  { name: 'Orange', color: '#EA580C' },
  { name: 'Yellow', color: '#D4A017' },
  { name: 'Green', color: '#16A34A' },
  { name: 'Blue', color: '#2563EB' },
  { name: 'Purple', color: '#7C3AED' },
  { name: 'White', color: '#F5F5F0' },
  { name: 'Black', color: '#1A1A1A' },
  { name: 'Brown', color: '#92400E' },
  { name: 'Gold', color: '#D4A017' },
]

export default function CustomOrderPage() {
  useSEO('Custom Order', 'Commission a one-of-a-kind handcrafted piece from Ushanga Chronicles — tell us your vision and we\'ll bring it to life.', '/custom-order')
  const [currentStep, setCurrentStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    category: '',
    vision: '',
    colors: [] as string[],
    materials: '',
    file: null as File | null,
    name: '',
    phone: '',
    email: '',
    location: '',
  })

  const next = () => setCurrentStep((s) => Math.min(s + 1, 4))
  const prev = () => setCurrentStep((s) => Math.max(s - 1, 0))

  const toggleColor = (c: string) => {
    setFormData((prev) => ({
      ...prev,
      colors: prev.colors.includes(c)
        ? prev.colors.filter((x) => x !== c)
        : [...prev.colors, c],
    }))
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) return
    setSubmitting(true)
    try {
      let inspirationImageUrl: string | null = null
      if (formData.file) {
        const ext = formData.file.name.split('.').pop()
        const path = `custom-orders/${Date.now()}.${ext}`
        try {
          const { error: uploadError } = await withLockRetry(async () =>
            await supabase.storage.from('product-images').upload(path, formData.file as File)
          )
          if (uploadError) throw uploadError
          const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
          inspirationImageUrl = publicUrl
        } catch (uploadErr) {
          console.error('Inspiration photo upload failed:', uploadErr)
          toast.error('Could not upload your inspiration photo, but the rest of your request will still be sent.')
        }
      }

      const { data: order, error } = await withLockRetry(async () =>
        await supabase.from('custom_orders').insert({
          category: formData.category,
          vision: formData.vision || null,
          colors: formData.colors.length > 0 ? formData.colors : null,
          materials: formData.materials || null,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          delivery_location: formData.location.trim() || null,
          inspiration_image_url: inspirationImageUrl,
        }).select('id').single()
      )
      if (error) throw error
      setSubmitted(true)

      // Fire-and-forget notification emails — a delivery hiccup here
      // shouldn't block the customer from seeing the success screen,
      // since their request is already safely saved either way.
      const detailsHtml = `
        <p><strong>Category:</strong> ${formData.category || '—'}</p>
        ${formData.vision ? `<p><strong>Vision:</strong> ${formData.vision}</p>` : ''}
        ${formData.colors.length ? `<p><strong>Colors:</strong> ${formData.colors.join(', ')}</p>` : ''}
        ${formData.materials ? `<p><strong>Materials:</strong> ${formData.materials}</p>` : ''}
        ${formData.location ? `<p><strong>Delivery location:</strong> ${formData.location}</p>` : ''}
        ${inspirationImageUrl ? `<p><strong>Inspiration photo:</strong> <a href="${inspirationImageUrl}">${inspirationImageUrl}</a></p>` : ''}
        <p><strong>Name:</strong> ${formData.name}</p>
        <p><strong>Phone:</strong> ${formData.phone}</p>
        ${formData.email ? `<p><strong>Email:</strong> ${formData.email}</p>` : ''}
      `

      supabase.functions.invoke('send-emails', {
        body: {
          to: 'admin@ushangachronicles.com',
          subject: `New Custom Order Request${order?.id ? ` #${order.id.slice(0, 8)}` : ''}`,
          html: `<h2>New Chronicle request from ${formData.name}</h2>${detailsHtml}`,
        }
      }).catch(err => console.error('Admin notification email failed:', err))

      if (formData.email.trim()) {
        supabase.functions.invoke('send-emails', {
          body: {
            to: formData.email.trim(),
            subject: 'We received your Chronicle request — Ushanga Chronicles',
            html: `
              <h2>Thank you, ${formData.name}!</h2>
              <p>Your Chronicle is in Linda's hands. We'll follow up within 48 hours to confirm details and pricing.</p>
              <hr style="margin:16px 0;" />
              <h3>What you told us</h3>
              ${detailsHtml}
              <p style="margin-top:16px;color:#6B7280;font-size:13px;">If anything above needs correcting, just reply to this email or reach us on WhatsApp.</p>
            `,
          }
        }).catch(err => console.error('Customer confirmation email failed:', err))
      }
    } catch (err) {
      console.error('Custom order submission error:', err)
      const msg = err instanceof Error ? err.message : ''
      toast.error(
        msg.toLowerCase().includes('lock')
          ? 'Your browser is still finishing a background task — please wait a moment and tap submit again.'
          : 'Something went wrong. Please try again or reach out via WhatsApp.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-background min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="font-display text-3xl font-bold text-foreground mb-4">
            Your Chronicle is in Linda's hands
          </h2>
          <p className="text-muted-foreground">
            Expect a response within 48 hours. Thank you for trusting us with your story.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background">
      <section className="py-12 md:py-16 bg-card">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Create Your Chronicle
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Every piece Linda creates begins with your story. Tell us your vision - 
            a piece drawn from imagination, chosen materials, or a photo that inspires you. 
            We'll bring it to life by hand.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-2xl">
          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-12">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground'
                }`}>
                  {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`hidden sm:block w-12 lg:w-20 h-0.5 mx-1 ${
                    i < currentStep ? 'bg-primary' : 'bg-border'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mb-8 text-center">
            Step {currentStep + 1} of 5 - {steps[currentStep]}
          </p>

          {/* Step Content */}
          <div className="bg-card p-6 md:p-10 border border-border">
            {currentStep === 0 && (
              <div className="space-y-4">
                <h3 className="font-display text-xl font-bold mb-4">What are you looking for?</h3>
                {categoryOptions.map((opt) => (
                  <label key={opt} className="flex items-center gap-3 p-4 border border-border cursor-pointer hover:border-primary transition-colors" style={{ minHeight: '44px' }}>
                    <input type="radio" name="category" value={opt} checked={formData.category === opt} onChange={() => setFormData({ ...formData, category: opt })} className="accent-[#D4A017] w-5 h-5" />
                    <span className="text-sm font-medium">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {currentStep === 1 && (
              <div>
                <h3 className="font-display text-xl font-bold mb-4">Describe your vision</h3>
                <textarea value={formData.vision} onChange={(e) => setFormData({ ...formData, vision: e.target.value })} placeholder="Tell us what you're dreaming of. The more detail, the better." maxLength={2000} rows={6} className="w-full p-4 border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" style={{ minHeight: '160px' }} />
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h3 className="font-display text-xl font-bold mb-4">Colors & Materials</h3>
                <p className="text-sm text-muted-foreground mb-4">Select your preferred colors</p>
                <div className="flex flex-wrap gap-3 mb-6">
                  {colorSwatches.map((swatch) => (
                    <button key={swatch.name} onClick={() => toggleColor(swatch.name)} className={`w-10 h-10 rounded-full border-2 transition-all ${formData.colors.includes(swatch.name) ? 'border-foreground scale-110' : 'border-transparent'}`} style={{ backgroundColor: swatch.color }} aria-label={swatch.name} />
                  ))}
                </div>
                <label className="text-sm font-medium block mb-2">Any specific materials? (e.g. sisal, beads, leather, cowrie shells)</label>
                <input type="text" value={formData.materials} onChange={(e) => setFormData({ ...formData, materials: e.target.value })} maxLength={200} className="w-full p-3 border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ minHeight: '44px' }} />
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h3 className="font-display text-xl font-bold mb-4">Inspiration Photo</h3>
                <p className="text-sm text-muted-foreground mb-4">Upload a photo for inspiration (optional) - accepts JPG/PNG</p>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border p-10 cursor-pointer hover:border-primary transition-colors" style={{ minHeight: '120px' }}>
                  <span className="text-muted-foreground text-sm">{formData.file ? formData.file.name : 'Click to upload or drag & drop'}</span>
                  <input type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })} />
                </label>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="font-display text-xl font-bold mb-4">Your Details</h3>
                <div>
                  <label className="text-sm font-medium block mb-1">Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} maxLength={100} className="w-full p-3 border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ minHeight: '44px' }} required />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Phone Number *</label>
                  <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} maxLength={20} className="w-full p-3 border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ minHeight: '44px' }} required />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Email (optional)</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} maxLength={255} className="w-full p-3 border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ minHeight: '44px' }} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Delivery Location</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} maxLength={200} className="w-full p-3 border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" style={{ minHeight: '44px' }} />
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button onClick={prev} disabled={currentStep === 0} className="px-6 py-3 border border-border text-sm font-semibold disabled:opacity-30 hover:bg-accent transition-colors" style={{ minHeight: '44px' }}>
              Back
            </button>
            {currentStep < 4 ? (
              <button onClick={next} className="px-8 py-3 bg-primary text-primary-foreground text-sm font-bold tracking-wider uppercase hover:bg-[#c49515] transition-colors" style={{ minHeight: '44px' }}>
                Next
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="px-8 py-3 bg-primary text-primary-foreground text-sm font-bold tracking-wider uppercase hover:bg-[#c49515] transition-colors disabled:opacity-50 flex items-center gap-2" style={{ minHeight: '44px' }}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Send My Chronicle to Linda
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
