#!/usr/bin/env node
import pg from 'pg'
import { drainOutbox, queueEmail } from '../server/functions-api.mjs'

const { Pool } = pg
const args = process.argv.slice(2)
const valueFor = flag => {
  const index = args.indexOf(flag)
  return index >= 0 ? args[index + 1] : undefined
}
const has = flag => args.includes(flag)

if (has('--help')) {
  console.log(`Usage:
  npm run test:scheduled-sale-email -- --to customer@example.com [--send]
  npm run test:scheduled-sale-email -- --product-id PRODUCT_UUID --to customer@example.com --send

Options:
  --product-id ID  Use a real product from Neon; otherwise a sample sale is previewed
  --to EMAIL       Recipient email; required with --send
  --send           Queue the email and attempt delivery through Resend
  --help           Show this help

Default behavior is a dry-run. The --send flag is required to enqueue an email.`)
  process.exit(0)
}

const recipient = valueFor('--to') || process.env.TEST_NOTIFICATION_EMAIL || ''
const productId = valueFor('--product-id')
const send = has('--send')
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } })

try {
  let product = {
    id: 'debug-sample',
    name: 'Debug Sale Product',
    price: 39,
    sale_price: 20,
    sale_ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }

  if (productId) {
    const result = await pool.query(
      'SELECT id,name,price,sale_price,sale_ends_at FROM public.products WHERE id=$1',
      [productId],
    )
    if (!result.rowCount) throw new Error(`Product not found: ${productId}`)
    product = result.rows[0]
  }

  const subject = `Test scheduled sale notification: ${product.name}`
  const endText = product.sale_ends_at
    ? new Date(product.sale_ends_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
    : 'while stocks last'
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1a1a1a"><p style="font-size:12px;color:#b8860b;font-weight:bold">DEBUG TEST EMAIL</p><h2 style="color:#b8860b">A special price is now live</h2><h3>${product.name}</h3><p><strong>KSh ${Number(product.sale_price).toLocaleString()}</strong> <span style="text-decoration:line-through;color:#777">KSh ${Number(product.price).toLocaleString()}</span></p><p>This is a manual test of the scheduled-sale notification flow. The sale ends ${endText}.</p><p><a href="https://ushangachronicles.com/shop" style="background:#b8860b;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px">Shop now</a></p></div>`

  console.log(JSON.stringify({ mode: send ? 'send' : 'dry-run', recipient: recipient || '(not specified)', subject, product: product.name, originalPrice: Number(product.price), salePrice: Number(product.sale_price), saleEndsAt: product.sale_ends_at }, null, 2))

  if (!send) {
    console.log('\nDry-run only. Add --send and --to customer@example.com to queue this email.')
    process.exit(0)
  }
  if (!recipient || !/^\S+@\S+\.\S+$/.test(recipient)) throw new Error('--to must be a valid email address when using --send')
  if (!process.env.RESEND_API_KEY) console.warn('Warning: RESEND_API_KEY is not set; the email will be queued but delivery will remain pending.')

  const id = await queueEmail(pool, { to: recipient, subject, html, label: 'scheduled-sale-test' })
  await drainOutbox(pool)
  console.log(`Queued test notification ${id} for ${recipient}.`)
} finally {
  await pool.end()
}
