// Forwards website chat enquiries to the shop owner's WhatsApp (Meta WhatsApp
// Cloud API) and turns the owner's WhatsApp replies back into chat replies.
// Env: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ADMIN_NUMBER,
// WHATSAPP_VERIFY_TOKEN. Without them everything here is a no-op.

const GRAPH = 'https://graph.facebook.com/v21.0'
const enabled = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ADMIN_NUMBER)
let ready = false

async function ensureTable(pool) {
  if (ready) return
  await pool.query(`CREATE TABLE IF NOT EXISTS public.whatsapp_links (
    wa_message_id text PRIMARY KEY,
    conversation_id uuid NOT NULL,
    customer_name text,
    created_at timestamptz NOT NULL DEFAULT now())`)
  ready = true
}

async function sendText(to, text) {
  const r = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text.slice(0, 4000) } }),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data?.error?.message || `WhatsApp send failed (${r.status})`)
  return data?.messages?.[0]?.id
}

/** Called after a customer chat message is saved. Never throws. */
export async function forwardEnquiryToWhatsApp(pool, row) {
  if (!enabled() || !row || row.is_from_admin) return
  try {
    await ensureTable(pool)
    const who = [row.customer_name, row.customer_phone].filter(Boolean).join(' · ')
    const text = `New website chat from ${who || 'a visitor'}:\n\n${row.message}\n\nReply to (swipe) this message to answer them in the website chat.`
    const id = await sendText(process.env.WHATSAPP_ADMIN_NUMBER, text)
    if (id) await pool.query('INSERT INTO public.whatsapp_links (wa_message_id, conversation_id, customer_name) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [id, row.conversation_id, row.customer_name || null])
  } catch (e) {
    console.error('whatsapp forward:', e.message)
  }
}

/** GET = Meta verification handshake, POST = incoming messages from the owner. */
export async function handleWhatsAppWebhook({ pool, req, res, url, json, body }) {
  if (req.method === 'GET') {
    const ok = url.searchParams.get('hub.mode') === 'subscribe' && process.env.WHATSAPP_VERIFY_TOKEN && url.searchParams.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN
    if (!ok) return json(res, 403, { error: 'Forbidden' })
    res.writeHead(200, { 'content-type': 'text/plain' })
    return res.end(url.searchParams.get('hub.challenge') || '')
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
  const payload = await body(req).catch(() => ({}))
  try {
    await ensureTable(pool)
    const admin = String(process.env.WHATSAPP_ADMIN_NUMBER || '').replace(/\D/g, '')
    for (const entry of payload?.entry || []) for (const change of entry?.changes || []) {
      for (const msg of change?.value?.messages || []) {
        if (String(msg.from).replace(/\D/g, '') !== admin || msg.type !== 'text') continue
        const ctx = msg.context?.id
        let link = ctx ? (await pool.query('SELECT * FROM public.whatsapp_links WHERE wa_message_id=$1', [ctx])).rows[0] : null
        if (!link) {
          await sendText(admin, 'To answer a customer, swipe to reply on their chat message so I know who it is for.').catch(() => {})
          continue
        }
        await pool.query('INSERT INTO public.enquiry_messages (conversation_id, customer_name, message, is_from_admin) VALUES ($1,$2,$3,true)', [link.conversation_id, link.customer_name || 'Ushanga Chronicles', msg.text.body])
      }
    }
  } catch (e) {
    console.error('whatsapp webhook:', e.message)
  }
  return json(res, 200, { ok: true })
}
