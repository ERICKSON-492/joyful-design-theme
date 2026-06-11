import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'

const SITE_URL = window.location.origin

function escapeHtml(s: string): string {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function buildPreviewHtml(products: any[], posts: any[]): string {
  const count = products.length + posts.length
  const productCards = products.map((p) => {
    const img = (p.image_urls && p.image_urls[0]) || p.image_url || ''
    const price = p.price_min && p.price_max && p.price_min !== p.price_max
      ? `KSh ${Number(p.price_min).toLocaleString()} – ${Number(p.price_max).toLocaleString()}`
      : `KSh ${Number(p.price || p.price_min || 0).toLocaleString()}`
    const link = `${SITE_URL}/product/${p.id}`
    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px 0; border:1px solid #ecdfc7; border-radius:8px; overflow:hidden;">
        <tr>
          ${img ? `<td width="140"><a href="${link}"><img src="${escapeHtml(img)}" width="140" height="140" alt="" style="display:block; width:140px; height:140px; object-fit:cover; border:0;"></a></td>` : ''}
          <td style="padding:16px 18px; vertical-align:top;">
            <span style="display:inline-block; background:#D4A017; color:#1A1A1A; font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:3px 8px; border-radius:3px; margin-bottom:8px;">New Piece</span>
            <h3 style="margin:0 0 6px 0; font-family:Georgia,serif; font-size:18px;"><a href="${link}" style="color:#1A1A1A; text-decoration:none;">${escapeHtml(p.name)}</a></h3>
            <p style="margin:0 0 10px 0; color:#D4A017; font-family:Arial,sans-serif; font-weight:700; font-size:14px;">${price}</p>
            <p style="margin:0 0 12px 0; color:#555; font-family:Arial,sans-serif; font-size:13px; line-height:1.5;">${escapeHtml((p.description || '').slice(0, 140))}${(p.description || '').length > 140 ? '…' : ''}</p>
            <a href="${link}" style="display:inline-block; background:#D4A017; color:#1A1A1A; text-decoration:none; padding:8px 16px; font-family:Arial,sans-serif; font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; border-radius:4px;">Claim This</a>
          </td>
        </tr>
      </table>`
  }).join('')

  const postCards = posts.map((post) => {
    const link = `${SITE_URL}/chronicle/${post.slug}`
    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 20px 0; border:1px solid #ecdfc7; border-radius:8px; overflow:hidden;">
        <tr>
          ${post.cover_image_url ? `<td width="140"><a href="${link}"><img src="${escapeHtml(post.cover_image_url)}" width="140" height="140" alt="" style="display:block; width:140px; height:140px; object-fit:cover; border:0;"></a></td>` : ''}
          <td style="padding:16px 18px; vertical-align:top;">
            <span style="display:inline-block; background:#1A1A1A; color:#FFFDF7; font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:3px 8px; border-radius:3px; margin-bottom:8px;">From the Chronicle</span>
            <h3 style="margin:0 0 6px 0; font-family:Georgia,serif; font-size:18px;"><a href="${link}" style="color:#1A1A1A; text-decoration:none;">${escapeHtml(post.title)}</a></h3>
            <p style="margin:0 0 12px 0; color:#555; font-family:Arial,sans-serif; font-size:13px; line-height:1.5;">${escapeHtml((post.excerpt || '').slice(0, 180))}</p>
            <a href="${link}" style="display:inline-block; background:#1A1A1A; color:#FFFDF7; text-decoration:none; padding:8px 16px; font-family:Arial,sans-serif; font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; border-radius:4px;">Read Story</a>
          </td>
        </tr>
      </table>`
  }).join('')

  if (count === 0) {
    return `<div style="padding:40px; text-align:center; font-family:Arial,sans-serif; color:#888;">No new products or Chronicle posts in the last 24h — no email would be sent today.</div>`
  }

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FFFDF7;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;">
        <tr><td style="text-align:center; padding-bottom:24px;">
          <h1 style="font-family:Georgia,serif; color:#1A1A1A; font-size:28px; margin:0 0 6px 0;">Ushanga Chronicles</h1>
          <p style="font-family:Arial,sans-serif; color:#D4A017; font-style:italic; margin:0; font-size:14px;">One bead. A thousand stories.</p>
        </td></tr>
        <tr><td style="padding-bottom:18px; text-align:center;">
          <h2 style="font-family:Georgia,serif; color:#1A1A1A; font-size:22px; margin:0 0 8px 0;">${count === 1 ? 'A new addition for the Tribe' : 'New for the Tribe'}</h2>
          <p style="font-family:Arial,sans-serif; color:#444; font-size:14px; line-height:1.5; margin:0;">Freshly handcrafted in Nairobi and just added to the collection.</p>
        </td></tr>
        <tr><td>${productCards}${postCards}</td></tr>
        <tr><td style="text-align:center; padding:24px 0 12px 0;">
          <a href="${SITE_URL}/shop" style="display:inline-block; background:#1A1A1A; color:#FFFDF7; text-decoration:none; padding:12px 28px; font-family:Arial,sans-serif; font-size:12px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; border-radius:4px;">Explore the Tribe</a>
        </td></tr>
        <tr><td style="padding-top:32px; border-top:1px solid #ecdfc7; text-align:center; font-family:Arial,sans-serif; color:#888; font-size:11px; line-height:1.6;">
          <p style="margin:0 0 8px 0;">You're receiving this because you joined The Ushanga Tribe newsletter.</p>
          <p style="margin:0;"><a href="#" style="color:#888;">Unsubscribe</a> · <a href="${SITE_URL}" style="color:#888;">ushangachronicles.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>`
}

export default function AdminNewsletterPreview() {
  const [products, setProducts] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [since, setSince] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      const { data: state } = await supabase.from('newsletter_digest_state').select('last_sent_at').eq('id', 1).maybeSingle()
      const sinceTs = state?.last_sent_at || new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      setSince(sinceTs)

      const { data: prods } = await supabase
        .from('products')
        .select('id, name, description, price, price_min, price_max, image_url, image_urls')
        .eq('is_active', true)
        .gt('created_at', sinceTs)
        .order('created_at', { ascending: false })
        .limit(20)
      setProducts(prods || [])

      // chronicle_posts may not exist yet — fail soft
      try {
        const { data: cp } = await (supabase as any)
          .from('chronicle_posts')
          .select('id, title, slug, excerpt, cover_image_url, published_at')
          .eq('is_published', true)
          .gt('published_at', sinceTs)
          .order('published_at', { ascending: false })
          .limit(10)
        setPosts(cp || [])
      } catch { setPosts([]) }
      setLoading(false)
    }
    load()
  }, [])

  const html = buildPreviewHtml(products, posts)

  return (
    <div>
      <Link to="/admin/newsletter" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Newsletter
      </Link>
      <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">Digest Preview</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Showing content created since <strong>{since ? new Date(since).toLocaleString() : '—'}</strong> ·
        {' '}{products.length} product{products.length !== 1 ? 's' : ''}, {posts.length} post{posts.length !== 1 ? 's' : ''}
      </p>
      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading preview...</div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <iframe
            title="Newsletter preview"
            srcDoc={`<!doctype html><html><body style="margin:0;">${html}</body></html>`}
            className="w-full"
            style={{ height: '85vh', border: 0, background: '#FFFDF7' }}
          />
        </div>
      )}
    </div>
  )
}