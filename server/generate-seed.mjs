// Turns the JSON exports in /tmp/dump into server/neon-seed.sql.
// Usage: node server/generate-seed.mjs /tmp/dump
import fs from 'node:fs'
import path from 'node:path'

const dir = process.argv[2] || '/tmp/dump'
const arrayColumns = new Set(['regions', 'colors', 'photo_urls', 'image_urls', 'reference_image_urls'])
const jsonColumns = new Set(['config', 'items', 'shipping_address', 'metadata'])

// table -> destination table name (orders live in joyful_orders on Neon)
const tables = [
  ['categories', 'categories'],
  ['subcategories', 'subcategories'],
  ['category_images', 'category_images'],
  ['site_content', 'site_content'],
  ['hero_slides', 'hero_slides'],
  ['chronicle_posts', 'chronicle_posts'],
  ['shipping_methods', 'shipping_methods'],
  ['payment_methods', 'payment_methods'],
  ['product_reviews', 'product_reviews'],
  ['tribe_looks', 'tribe_looks'],
  ['enquiry_messages', 'enquiry_messages'],
  ['custom_orders', 'custom_orders'],
  ['contact_messages', 'contact_messages'],
  ['newsletter_subscribers', 'newsletter_subscribers'],
  ['stock_adjustments', 'stock_adjustments'],
  ['profiles', 'profiles'],
  ['orders', 'joyful_orders'],
]

const lit = (col, value) => {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    if (jsonColumns.has(col)) return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`
    return `ARRAY[${value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',')}]::text[]`
  }
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`
  const text = `'${String(value).replace(/'/g, "''")}'`
  return arrayColumns.has(col) ? `${text}::text[]` : text
}

const out = ['-- Data exported from the previous backend. Safe to re-run: existing ids are skipped.', 'BEGIN;']

for (const [file, target] of tables) {
  const filePath = path.join(dir, `${file}.json`)
  if (!fs.existsSync(filePath)) continue
  const rows = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  if (!Array.isArray(rows) || rows.length === 0) continue
  out.push(`\n-- ${target}: ${rows.length} rows`)
  for (const row of rows) {
    const cols = Object.keys(row).filter(c => row[c] !== undefined)
    const values = cols.map(c => lit(c, row[c]))
    out.push(`INSERT INTO public.${target} (${cols.join(',')}) VALUES (${values.join(',')}) ON CONFLICT DO NOTHING;`)
  }
}

out.push('\nCOMMIT;')
fs.writeFileSync('server/neon-seed.sql', out.join('\n'))
console.log(`Wrote server/neon-seed.sql (${out.length} statements)`)
