#!/usr/bin/env node
import pg from 'pg'

const { Pool } = pg
const apply = process.argv.includes('--apply')
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const neonUrl = process.env.NEON_DATABASE_URL

if (!supabaseUrl || !supabaseKey || (apply && !neonUrl)) {
  throw new Error(apply
    ? 'Set VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, and NEON_DATABASE_URL first.'
    : 'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY first.')
}

async function legacyRows(table) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&order=created_at.asc`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  })
  if (response.status === 404) return []
  if (!response.ok) throw new Error(`Legacy ${table} request failed: ${response.status}`)
  return response.json()
}

const pool = apply ? new Pool({ connectionString: neonUrl, ssl: { rejectUnauthorized: false } }) : null
try {
  const [methods, areas] = await Promise.all([
    legacyRows('shipping_methods'),
    legacyRows('nairobi_areas'),
  ])
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', shippingMethods: methods.length, nairobiAreas: areas.length }, null, 2))

  if (!apply) {
    console.log('\nDry-run only. Add --apply to import missing rows into Neon.')
    process.exit(0)
  }

  let methodInserted = 0
  let areaInserted = 0
  for (const row of methods) {
    const result = await pool.query(
      `INSERT INTO public.shipping_methods (id,name,type,provider,estimated_days,price,is_active,regions,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name,type=EXCLUDED.type,provider=EXCLUDED.provider,
         estimated_days=EXCLUDED.estimated_days,price=EXCLUDED.price,is_active=EXCLUDED.is_active,
         regions=EXCLUDED.regions,updated_at=EXCLUDED.updated_at
       WHERE public.shipping_methods.updated_at <= EXCLUDED.updated_at`,
      [row.id, row.name, row.type || 'local', row.provider || '', row.estimated_days || null, row.price || 0, row.is_active !== false, row.regions || [], row.created_at, row.updated_at || row.created_at],
    )
    if (result.rowCount) methodInserted++
  }

  for (const row of areas) {
    const result = await pool.query(
      `INSERT INTO public.nairobi_areas (id,name,doorstep_price,super_metro_route,super_metro_only,is_active,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name,doorstep_price=EXCLUDED.doorstep_price,super_metro_route=EXCLUDED.super_metro_route,
         super_metro_only=EXCLUDED.super_metro_only,is_active=EXCLUDED.is_active,updated_at=EXCLUDED.updated_at
       WHERE public.nairobi_areas.updated_at <= EXCLUDED.updated_at`,
      [row.id, row.name, row.doorstep_price || 0, row.super_metro_route || null, row.super_metro_only === true, row.is_active !== false, row.created_at, row.updated_at || row.created_at],
    )
    if (result.rowCount) areaInserted++
  }
  console.log(`Applied ${methodInserted} shipping-method changes and ${areaInserted} Nairobi-area changes.`)
} finally {
  await pool?.end()
}
