import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = Deno.env.get('SITE_URL') || 'https://ushangachronicles.lovable.app'

function escapeHtml(s: string): string {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

function buildEmail(opts: {
  products: any[]
  posts: any[]
  unsubscribeUrl: string
}): { subject: string; html: string } {
  const { products, posts, unsubscribeUrl } = opts
  const count = products.length + posts.length
  let subject: string
  if (count === 1 && products.length === 1) subject = `New from Ushanga Chronicles: ${products[0].name}`
  else if (count === 1 && posts.length === 1) subject = `From the Chronicle: ${posts[0].title}`
  else subject = `${count} new from Ushanga Chronicles`

  const productCards = products.map((p) => {
    const img = (p.image_urls && p.image_urls[0]) || p.image_url || ''
    const price = p.price_min && p.price_max && p.price_min !== p.price_max
      ? `KSh ${Number(p.price_min).toLocaleString()} – ${Number(p.price_max).toLocaleString()}`
      : `KSh ${Number(p.price || p.price_min || 0).toLocaleString()}`
    const link = `${SITE_URL}/product/${p.id}`
    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 20px 0; border:1px solid #ecdfc7; border-radius:8px; overflow:hidden;">
        <tr>
          ${img ? `<td width="140" style="padding:0;"><a href="${link}"><img src="${escapeHtml(img)}" width="140" height="140" alt="${escapeHtml(p.name)}" style="display:block; width:140px; height:140px; object-fit:cover; border:0;"></a></td>` : ''}
          <td style="padding:16px 18px; vertical-align:top; font-family: Georgia, 'Playfair Display', serif;">
            <span style="display:inline-block; background:#D4A017; color:#1A1A1A; font-family:Arial,sans-serif; font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:3px 8px; border-radius:3px; margin-bottom:8px;">New Piece</span>
            <a href="${link}" style="color:#1A1A1A; text-decoration:none;">
              <h3 style="margin:0 0 6px 0; font-size:18px; font-weight:700;">${escapeHtml(p.name)}</h3>
            </a>
            <p style="margin:0 0 10px 0; color:#D4A017; font-family: Arial, sans-serif; font-weight:700; font-size:14px;">${price}</p>
            <p style="margin:0 0 12px 0; color:#555; font-family: Arial, sans-serif; font-size:13px; line-height:1.5;">${escapeHtml((p.description || '').slice(0, 140))}${(p.description || '').length > 140 ? '…' : ''}</p>
            <a href="${link}" style="display:inline-block; background:#D4A017; color:#1A1A1A; text-decoration:none; padding:8px 16px; font-family: Arial, sans-serif; font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; border-radius:4px;">Claim This</a>
          </td>
        </tr>
      </table>`
  }).join('')

  const postCards = posts.map((post) => {
    const link = `${SITE_URL}/chronicle/${post.slug}`
    return `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 20px 0; border:1px solid #ecdfc7; border-radius:8px; overflow:hidden;">
        <tr>
          ${post.cover_image_url ? `<td width="140" style="padding:0;"><a href="${link}"><img src="${escapeHtml(post.cover_image_url)}" width="140" height="140" alt="${escapeHtml(post.title)}" style="display:block; width:140px; height:140px; object-fit:cover; border:0;"></a></td>` : ''}
          <td style="padding:16px 18px; vertical-align:top; font-family: Georgia, 'Playfair Display', serif;">
            <span style="display:inline-block; background:#1A1A1A; color:#FFFDF7; font-family:Arial,sans-serif; font-size:10px; font-weight:700; letter-spacing:1px; text-transform:uppercase; padding:3px 8px; border-radius:3px; margin-bottom:8px;">From the Chronicle</span>
            <a href="${link}" style="color:#1A1A1A; text-decoration:none;">
              <h3 style="margin:0 0 6px 0; font-size:18px; font-weight:700;">${escapeHtml(post.title)}</h3>
            </a>
            <p style="margin:0 0 12px 0; color:#555; font-family: Arial, sans-serif; font-size:13px; line-height:1.5;">${escapeHtml((post.excerpt || '').slice(0, 180))}</p>
            <a href="${link}" style="display:inline-block; background:#1A1A1A; color:#FFFDF7; text-decoration:none; padding:8px 16px; font-family: Arial, sans-serif; font-size:12px; font-weight:700; letter-spacing:1px; text-transform:uppercase; border-radius:4px;">Read Story</a>
          </td>
        </tr>
      </table>`
  }).join('')

  const html = `<!doctype html><html><body style="margin:0; padding:0; background:#FFFDF7;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FFFDF7;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;">
          <tr><td style="text-align:center; padding-bottom:24px;">
            <h1 style="font-family: Georgia, 'Playfair Display', serif; color:#1A1A1A; font-size:28px; margin:0 0 6px 0;">Ushanga Chronicles</h1>
            <p style="font-family: Arial, sans-serif; color:#D4A017; font-style:italic; margin:0; font-size:14px;">One bead. A thousand stories.</p>
          </td></tr>
          <tr><td style="padding-bottom:18px; text-align:center;">
            <h2 style="font-family: Georgia, serif; color:#1A1A1A; font-size:22px; margin:0 0 8px 0;">${count === 1 ? 'A new piece for the Tribe' : 'New pieces for the Tribe'}</h2>
            <p style="font-family: Arial, sans-serif; color:#444; font-size:14px; line-height:1.5; margin:0;">Freshly handcrafted in Nairobi and just added to the collection.</p>
          </td></tr>
          <tr><td>${productCards}${postCards}</td></tr>
          <tr><td style="text-align:center; padding:24px 0 12px 0;">
            <a href="${SITE_URL}/shop" style="display:inline-block; background:#1A1A1A; color:#FFFDF7; text-decoration:none; padding:12px 28px; font-family: Arial, sans-serif; font-size:12px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; border-radius:4px;">Explore the Tribe</a>
          </td></tr>
          <tr><td style="padding-top:32px; border-top:1px solid #ecdfc7; text-align:center; font-family: Arial, sans-serif; color:#888; font-size:11px; line-height:1.6;">
            <p style="margin:0 0 8px 0;">You're receiving this because you joined The Ushanga Tribe newsletter.</p>
            <p style="margin:0;"><a href="${unsubscribeUrl}" style="color:#888; text-decoration:underline;">Unsubscribe</a> · <a href="${SITE_URL}" style="color:#888; text-decoration:underline;">ushangachronicles.com</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`

  return { subject, html }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    // 1. Read last sent timestamp
    const { data: state } = await supabase
      .from('newsletter_digest_state').select('last_sent_at').eq('id', 1).single()
    const since = state?.last_sent_at || new Date(Date.now() - 24 * 3600 * 1000).toISOString()

    // 2. New products since last digest
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, name, description, price, price_min, price_max, image_url, image_urls')
      .eq('is_active', true)
      .gt('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)
    if (prodErr) throw prodErr

    // 2b. New Chronicle posts since last digest
    const { data: posts } = await supabase
      .from('chronicle_posts')
      .select('id, title, slug, excerpt, cover_image_url, published_at')
      .eq('is_published', true)
      .gt('published_at', since)
      .order('published_at', { ascending: false })
      .limit(10)

    const productList = products || []
    const postList = posts || []

    if (productList.length === 0 && postList.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'no_new_content' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Subscribers minus suppressed
    const { data: subs } = await supabase.from('newsletter_subscribers').select('email')
    const { data: suppressed } = await supabase.from('suppressed_emails').select('email')
    const blocked = new Set((suppressed || []).map((s: any) => s.email.toLowerCase()))
    const recipients = (subs || [])
      .map((s: any) => s.email)
      .filter((e: string) => e && !blocked.has(e.toLowerCase()))

    let sent = 0
    let failed = 0

    // 4. For each recipient: create unsubscribe token, enqueue email
    for (const email of recipients) {
      try {
        const token = crypto.randomUUID().replace(/-/g, '')
        await supabase.from('email_unsubscribe_tokens').insert({ email, token })
        const unsubscribeUrl = `${SITE_URL}/unsubscribe?token=${token}`
        const { subject, html } = buildEmail({ products: productList, posts: postList, unsubscribeUrl })

        const { error: rpcErr } = await supabase.rpc('enqueue_transactional_email', {
          recipient_email: email,
          subject_text: subject,
          html_body: html,
          template_label: 'newsletter-digest',
        })
        if (rpcErr) { failed++; console.error('enqueue failed', email, rpcErr.message) }
        else sent++
      } catch (e) {
        failed++
        console.error('recipient error', email, e)
      }
    }

    // 5. Update last_sent_at
    await supabase.from('newsletter_digest_state')
      .update({ last_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', 1)

    return new Response(JSON.stringify({ ok: true, products: productList.length, posts: postList.length, sent, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('digest error', e)
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})