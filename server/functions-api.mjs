// Background jobs that used to be hosted edge functions: transactional email,
// the newsletter digest, M-Pesa STK push and unsubscribe handling. Plus the two
// coupon database calls the checkout makes.

const resendKey = () => process.env.RESEND_API_KEY || ''
const fromAddress = () => process.env.EMAIL_FROM || 'Ushanga Chronicles <orders@ushangachronicles.com>'

export async function queueEmail(pool, { to, subject, html, label = 'generic', attachments = [] }) {
  const r = await pool.query(
    `INSERT INTO public.email_outbox (recipient_email,subject,html_body,template_label,attachments)
     VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [to, subject, html, label, JSON.stringify(attachments || [])],
  )
  return r.rows[0].id
}

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]))
const money = value => `KSh ${Number(value || 0).toLocaleString('en-KE')}`

export async function queueOrderNotification(pool, { orderId, eventKey, to, subject, html, label }) {
  if (!to) return false
  const claim = await pool.query(
    `INSERT INTO public.order_email_notifications (order_id,event_key,recipient_email)
     VALUES ($1,$2,$3) ON CONFLICT (order_id,event_key,recipient_email) DO NOTHING RETURNING id`,
    [orderId, eventKey, to],
  )
  if (!claim.rowCount) return false
  try {
    await queueEmail(pool, { to, subject, html, label })
    return true
  } catch (error) {
    await pool.query('DELETE FROM public.order_email_notifications WHERE id=$1', [claim.rows[0].id]).catch(() => {})
    throw error
  }
}

export async function queueOrderConfirmation(pool, order) {
  if (!order?.email) return false
  const items = Array.isArray(order.items) ? order.items : []
  const rows = items.map(item => `<tr><td style="padding:6px 0;">${escapeHtml(item.name)} × ${Number(item.quantity || 0)}</td><td style="padding:6px 0;text-align:right;">${money(Number(item.price) * Number(item.quantity || 0))}</td></tr>`).join('')
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1a1a1a"><h2 style="color:#b8860b">Thank you for your order, ${escapeHtml(order.customer_name || 'there')}!</h2><p>We received order <strong>#${escapeHtml(String(order.id).slice(0, 8))}</strong>.</p><table style="width:100%;border-collapse:collapse">${rows}<tr><td style="border-top:1px solid #ddd;padding-top:10px"><strong>Total</strong></td><td style="border-top:1px solid #ddd;padding-top:10px;text-align:right"><strong>${money(order.total_amount)}</strong></td></tr></table><p>We will email you again when your order status changes.</p><p>Questions? Reply to this email or WhatsApp +254 748 207 000.</p></div>`
  return queueOrderNotification(pool, { orderId: order.id, eventKey: 'order-confirmed', to: order.email, subject: `Order #${String(order.id).slice(0, 8)} received - Ushanga Chronicles`, html, label: 'order-confirmation' })
}

export async function queuePaymentNotification(pool, order, status) {
  if (!order?.email) return false
  const paid = status === 'paid'
  const failed = status === 'failed'
  const title = paid ? 'Payment received' : failed ? 'Payment was not completed' : 'Payment prompt sent'
  const detail = paid ? 'Your M-Pesa payment was received and your order is being processed.' : failed ? 'Your M-Pesa payment was not completed. Please try again or contact us for help.' : 'Check your phone and enter your M-Pesa PIN to complete payment.'
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1a1a1a"><h2 style="color:#b8860b">${title}</h2><p>Order <strong>#${escapeHtml(String(order.id).slice(0, 8))}</strong></p><p>${detail}</p><p>Order total: <strong>${money(order.total_amount)}</strong></p><p>Questions? Reply to this email or WhatsApp +254 748 207 000.</p></div>`
  return queueOrderNotification(pool, { orderId: order.id, eventKey: `payment-${status}`, to: order.email, subject: `${title} - Order #${String(order.id).slice(0, 8)}`, html, label: `payment-${status}` })
}

export async function processScheduledSaleNotifications(pool) {
  const subscribers = (await pool.query('SELECT email FROM public.newsletter_subscribers')).rows
  if (!subscribers.length) return 0
  const products = (await pool.query(
    `SELECT id,name,price,sale_price,sale_starts_at,sale_ends_at
     FROM public.products
     WHERE is_active=true AND sale_price IS NOT NULL AND sale_price < price
       AND ((sale_starts_at IS NOT NULL AND sale_starts_at > now() - interval '2 minutes' AND sale_starts_at <= now())
         OR (sale_ends_at IS NOT NULL AND sale_ends_at > now() AND sale_ends_at <= now() + interval '24 hours'))`,
  )).rows
  let queued = 0
  for (const product of products) {
    const windowKey = `${product.sale_starts_at?.toISOString?.() || product.sale_starts_at || ''}|${product.sale_ends_at?.toISOString?.() || product.sale_ends_at || ''}`
    const events = []
    if (product.sale_starts_at && new Date(product.sale_starts_at) <= new Date()) events.push(['sale-start', `Sale now live: ${product.name}`])
    if (product.sale_ends_at && new Date(product.sale_ends_at) > new Date() && new Date(product.sale_ends_at) <= new Date(Date.now() + 24 * 60 * 60 * 1000)) events.push(['sale-ending', `Sale ends soon: ${product.name}`])
    for (const [eventKey, subject] of events) {
      const claim = await pool.query(
        `INSERT INTO public.sale_email_notifications (product_id,event_key,window_key)
         VALUES ($1,$2,$3) ON CONFLICT (product_id,event_key,window_key) DO NOTHING RETURNING id`,
        [product.id, eventKey, windowKey],
      )
      if (!claim.rowCount) continue
      const endText = product.sale_ends_at ? new Date(product.sale_ends_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : 'while stocks last'
      const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1a1a1a"><h2 style="color:#b8860b">${escapeHtml(eventKey === 'sale-start' ? 'A special price is now live' : 'Sale ending soon')}</h2><h3>${escapeHtml(product.name)}</h3><p><strong>${money(product.sale_price)}</strong> <span style="text-decoration:line-through;color:#777">${money(product.price)}</span></p><p>${eventKey === 'sale-start' ? 'Enjoy this special price while it lasts.' : `The sale ends ${escapeHtml(endText)}.`}</p><p><a href="https://ushangachronicles.com/shop" style="background:#b8860b;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px">Shop now</a></p></div>`
      for (const subscriber of subscribers) {
        await queueEmail(pool, { to: subscriber.email, subject, html, label: `sale-${eventKey}` })
        queued += 1
      }
    }
  }
  if (queued) drainOutbox(pool).catch(() => {})
  return queued
}

async function deliver(pool, row) {
  if (!resendKey()) throw new Error('Email sending is not configured (RESEND_API_KEY missing)')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${resendKey()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: fromAddress(), to: [row.recipient_email], subject: row.subject, html: row.html_body }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.message || `Email provider returned ${res.status}`)
  await pool.query('INSERT INTO public.email_send_log (message_id,template_name,recipient_email,status) VALUES ($1,$2,$3,$4)',
    [data.id || null, row.template_label, row.recipient_email, 'sent'])
}

// Drains the outbox; called on a timer and right after each queue insert.
export async function drainOutbox(pool) {
  const r = await pool.query(
    `SELECT id,recipient_email,subject,html_body,template_label FROM public.email_outbox
     WHERE status='pending' AND attempts < 5 ORDER BY created_at LIMIT 10`,
  )
  for (const row of r.rows) {
    const suppressed = await pool.query('SELECT 1 FROM public.suppressed_emails WHERE lower(email)=lower($1)', [row.recipient_email])
    if (suppressed.rowCount) {
      await pool.query("UPDATE public.email_outbox SET status='suppressed' WHERE id=$1", [row.id])
      continue
    }
    try {
      await deliver(pool, row)
      await pool.query("UPDATE public.email_outbox SET status='sent', sent_at=now() WHERE id=$1", [row.id])
    } catch (e) {
      await pool.query("UPDATE public.email_outbox SET attempts=attempts+1, last_error=$2, status=CASE WHEN attempts+1>=5 THEN 'failed' ELSE 'pending' END WHERE id=$1",
        [row.id, String(e.message).slice(0, 500)])
      await pool.query('INSERT INTO public.email_send_log (template_name,recipient_email,status,error_message) VALUES ($1,$2,$3,$4)',
        [row.template_label, row.recipient_email, 'error', String(e.message).slice(0, 500)])
    }
  }
}

const digestHtml = (products) => `
  <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1A1A1A;">
    <div style="text-align:center;padding:14px 0;border-bottom:3px solid #D4A017;margin-bottom:18px;">
      <div style="font-size:22px;font-weight:800;letter-spacing:0.04em;">USHANGA CHRONICLES</div>
    </div>
    <h2 style="color:#D4A017;text-align:center;">Crafted this week</h2>
    ${products.map(p => `
      <div style="margin-bottom:16px;">
        ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" width="560" style="max-width:100%;border-radius:8px;" />` : ''}
        <h3 style="margin:8px 0 4px;">${p.name}</h3>
        <p style="margin:0;color:#444;">KSh ${Number(p.price).toLocaleString()}</p>
      </div>`).join('')}
    <p style="text-align:center;margin-top:22px;">
      <a href="https://ushangachronicles.com/shop" style="background:#D4A017;color:#fff;padding:12px 22px;border-radius:8px;font-weight:700;text-decoration:none;">Explore the Tribe</a>
    </p>
  </div>`

export async function handleFunction({ pool, req, res, url, json, body, user, isAdmin }) {
  const name = decodeURIComponent(url.pathname.slice('/api/functions/'.length))
  if (name === 'handle-email-unsubscribe' && req.method === 'GET') {
    const token = String(url.searchParams.get('token') || '')
    const r = await pool.query('SELECT email FROM public.email_unsubscribe_tokens WHERE token=$1 AND (used_at IS NULL OR used_at > now())', [token])
    if (!r.rowCount) return json(res, 200, { valid: false })
    const suppressed = await pool.query('SELECT 1 FROM public.suppressed_emails WHERE lower(email)=lower($1)', [r.rows[0].email])
    return json(res, 200, suppressed.rowCount ? { valid: false, reason: 'already_unsubscribed' } : { valid: true })
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })
  const payload = await body(req)

  if (name === 'send-emails' || name === 'send-transactional-email') {
    const to = String(payload.to || '').trim()
    if (!/^\S+@\S+\.\S+$/.test(to)) return json(res, 400, { error: 'A valid recipient email is required' })
    const id = await queueEmail(pool, {
      to, subject: String(payload.subject || 'Ushanga Chronicles'),
      html: String(payload.html || ''), label: String(payload.label || payload.template || 'generic'),
      attachments: payload.attachments || [],
    })
    drainOutbox(pool).catch(() => {})
    return json(res, 202, { queued: true, id })
  }

  if (name === 'send-newsletter-digest') {
    if (!isAdmin) return json(res, 403, { error: 'Admin access required' })
    const since = payload.since || null
    const products = (await pool.query(
      `SELECT name, price, image_url FROM public.products WHERE is_active=true
       AND created_at > COALESCE($1::timestamptz, now() - interval '7 days') ORDER BY created_at DESC LIMIT 8`,
      [since],
    )).rows
    if (!products.length) return json(res, 200, { sent: 0, message: 'No new pieces to announce' })
    const subs = (await pool.query('SELECT email FROM public.newsletter_subscribers')).rows
    const html = digestHtml(products)
    for (const s of subs) await queueEmail(pool, { to: s.email, subject: 'Crafted this week - Ushanga Chronicles', html, label: 'newsletter-digest' })
    await pool.query('INSERT INTO public.newsletter_digest_state (id,last_sent_at) VALUES (1,now()) ON CONFLICT (id) DO UPDATE SET last_sent_at=now(),updated_at=now()')
    drainOutbox(pool).catch(() => {})
    return json(res, 202, { sent: subs.length, products: products.length })
  }

  if (name === 'handle-email-unsubscribe') {
    const token = String(payload.token || '')
    const r = await pool.query('SELECT email FROM public.email_unsubscribe_tokens WHERE token=$1', [token])
    const email = r.rows[0]?.email || String(payload.email || '').trim()
    if (!email) return json(res, 400, { error: 'This unsubscribe link is no longer valid' })
    await pool.query("INSERT INTO public.suppressed_emails (email,reason) VALUES ($1,'unsubscribe') ON CONFLICT (email) DO NOTHING", [email])
    await pool.query('DELETE FROM public.newsletter_subscribers WHERE lower(email)=lower($1)', [email])
    if (token) await pool.query('UPDATE public.email_unsubscribe_tokens SET used_at=now() WHERE token=$1', [token])
    return json(res, 200, { unsubscribed: true, email })
  }

  if (name === 'mpesa-stk-push') return mpesa({ pool, res, json, payload, user })

  return json(res, 404, { error: `Unknown job: ${name}` })
}

// ------------------------------------------------------------------- M-Pesa
const mpesaBase = () => (process.env.MPESA_ENV === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke')
async function mpesaToken() {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64')
  const res = await fetch(`${mpesaBase()}/oauth/v1/generate?grant_type=client_credentials`, { headers: { authorization: `Basic ${auth}` } })
  const data = await res.json()
  if (!data.access_token) throw new Error('M-Pesa authentication failed')
  return data.access_token
}
const stamp = () => new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14)

async function mpesa({ pool, res, json, payload }) {
  if (!process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_SHORTCODE || !process.env.MPESA_PASSKEY) {
    return json(res, 503, { error: 'M-Pesa is not configured on the server yet' })
  }
  try {
    const token = await mpesaToken()
    const timestamp = stamp()
    const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64')

    if (payload.action === 'query') {
      const r = await fetch(`${mpesaBase()}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ BusinessShortCode: process.env.MPESA_SHORTCODE, Password: password, Timestamp: timestamp, CheckoutRequestID: payload.checkout_request_id }),
      })
      const data = await r.json()
      if (String(data.ResultCode) === '0' && payload.checkout_request_id) {
        const updated = await pool.query("UPDATE public.joyful_orders SET status='paid',updated_at=now() WHERE mpesa_checkout_request_id=$1 RETURNING id,total_amount,email,customer_name", [payload.checkout_request_id])
        if (updated.rowCount) await queuePaymentNotification(pool, updated.rows[0], 'paid')
      }
      return json(res, 200, data)
    }

    const phone = String(payload.phone || '').replace(/\D/g, '').replace(/^0/, '254').replace(/^(?!254)/, '254')
    const amount = Math.max(1, Math.round(Number(payload.amount || 0)))
    const callback = process.env.MPESA_CALLBACK_URL || `${process.env.PUBLIC_API_URL || ''}/api/mpesa/callback`
    const r = await fetch(`${mpesaBase()}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: process.env.MPESA_SHORTCODE, Password: password, Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline', Amount: amount, PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE, PhoneNumber: phone, CallBackURL: callback,
        AccountReference: `UC-${String(payload.orderId || '').slice(0, 8) || 'ORDER'}`,
        TransactionDesc: 'Ushanga Chronicles order',
      }),
    })
    const data = await r.json()
    if (data.CheckoutRequestID && payload.orderId) {
      const updated = await pool.query('UPDATE public.joyful_orders SET mpesa_checkout_request_id=$1,updated_at=now() WHERE id=$2 RETURNING id,total_amount,email,customer_name', [data.CheckoutRequestID, payload.orderId])
      if (updated.rowCount) await queuePaymentNotification(pool, updated.rows[0], 'initiated')
    }
    if (data.ResponseCode && String(data.ResponseCode) !== '0') return json(res, 400, { success: false, error: data.errorMessage || data.ResponseDescription || 'M-Pesa request failed' })
    return json(res, 200, { success: true, mpesa_response: data, checkoutRequestId: data.CheckoutRequestID })
  } catch (e) {
    return json(res, 502, { success: false, error: e.message })
  }
}

export async function handleMpesaCallback({ pool, req, res, json, body }) {
  const payload = await body(req).catch(() => ({}))
  const cb = payload?.Body?.stkCallback
  if (!cb) return json(res, 200, { ok: true })
  const items = cb.CallbackMetadata?.Item || []
  const receipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value || null
  const paid = String(cb.ResultCode) === '0'
  const updated = await pool.query(
    `UPDATE public.joyful_orders SET status=$1, mpesa_receipt_number=COALESCE($2,mpesa_receipt_number), updated_at=now()
     WHERE mpesa_checkout_request_id=$3 RETURNING id,total_amount,email,customer_name`,
    [paid ? 'paid' : 'failed', receipt, cb.CheckoutRequestID],
  )
  if (updated.rowCount) await queuePaymentNotification(pool, updated.rows[0], paid ? 'paid' : 'failed')
  return json(res, 200, { ok: true })
}

// --------------------------------------------------------------------- RPCs
export async function handleRpc({ pool, req, res, url, json, body }) {
  const name = decodeURIComponent(url.pathname.slice('/api/rpc/'.length))
  const payload = await body(req)

  if (name === 'validate_coupon') {
    const code = String(payload.p_code || '').trim()
    const amount = Number(payload.p_order_amount || 0)
    const r = await pool.query('SELECT * FROM public.coupons WHERE lower(code)=lower($1)', [code])
    const c = r.rows[0]
    if (!c || !c.is_active) return json(res, 200, [{ valid: false, message: 'That code is not valid' }])
    if (c.expires_at && new Date(c.expires_at) < new Date()) return json(res, 200, [{ valid: false, message: 'That code has expired' }])
    if (c.usage_limit != null && c.times_used >= c.usage_limit) return json(res, 200, [{ valid: false, message: 'That code has been fully used' }])
    if (c.min_order_amount != null && amount < Number(c.min_order_amount)) {
      return json(res, 200, [{ valid: false, message: `Spend at least KSh ${Number(c.min_order_amount).toLocaleString()} to use this code` }])
    }
    const discount = c.discount_type === 'fixed'
      ? Math.min(Number(c.discount_value), amount)
      : Math.round((amount * Number(c.discount_value)) / 100)
    return json(res, 200, [{
      valid: true, coupon_id: c.id, code: c.code, discount_type: c.discount_type,
      discount_value: Number(c.discount_value), discount_amount: discount, message: 'Coupon applied',
    }])
  }

  if (name === 'redeem_coupon') {
    await pool.query('UPDATE public.coupons SET times_used=times_used+1, updated_at=now() WHERE id=$1', [payload.p_coupon_id])
    return json(res, 200, [])
  }

  return json(res, 404, { message: `Unknown function ${name}`, code: '42883' })
}
