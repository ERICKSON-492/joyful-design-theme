#!/usr/bin/env node
import pg from 'pg'

const { Pool } = pg
const apply = process.argv.includes('--apply')
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
const neonUrl = process.env.NEON_DATABASE_URL
const ownerId = process.env.MIGRATION_OWNER_USER_ID || ''

if (!supabaseUrl || !supabaseKey || (apply && !neonUrl)) {
  throw new Error(apply
    ? 'Set VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, and NEON_DATABASE_URL first.'
    : 'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY first.')
}

async function legacyRows(table) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&order=created_at.asc`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  })
  if (!response.ok) throw new Error(`Supabase ${table} request failed: ${response.status}`)
  return response.json()
}

const pool = apply ? new Pool({ connectionString: neonUrl, ssl: { rejectUnauthorized: false } }) : null
try {
  const [content, posts, looks] = await Promise.all([
    legacyRows('site_content'),
    legacyRows('chronicle_posts'),
    legacyRows('tribe_looks'),
  ])
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', siteContent: content.length, chroniclePosts: posts.length, tribeLooks: looks.length }, null, 2))

  if (!apply) {
    console.log('\nDry-run only. Add --apply to import records into Neon.')
    process.exit(0)
  }

  for (const row of content) {
    await pool.query(
      `INSERT INTO public.site_content (id,section_key,title,subtitle,body,image_url,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (section_key) DO UPDATE SET title=EXCLUDED.title,subtitle=EXCLUDED.subtitle,body=EXCLUDED.body,image_url=COALESCE(EXCLUDED.image_url,public.site_content.image_url),updated_at=EXCLUDED.updated_at`,
      [row.id, row.section_key, row.title || '', row.subtitle || null, row.body || '', row.image_url || null, row.created_at, row.updated_at || row.created_at],
    )
  }

  for (const row of posts) {
    await pool.query(
      `INSERT INTO public.chronicle_posts (id,title,slug,excerpt,content,cover_image_url,author,is_published,published_at,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title,excerpt=EXCLUDED.excerpt,content=EXCLUDED.content,cover_image_url=COALESCE(EXCLUDED.cover_image_url,public.chronicle_posts.cover_image_url),author=EXCLUDED.author,is_published=EXCLUDED.is_published,published_at=EXCLUDED.published_at,updated_at=EXCLUDED.updated_at`,
      [row.id, row.title, row.slug, row.excerpt || null, row.content || null, row.cover_image_url || null, row.author || null, Boolean(row.is_published), row.published_at || null, row.created_at, row.updated_at || row.created_at],
    )
  }

  if (looks.length && !ownerId) {
    console.warn('Skipped Tribe Looks import: set MIGRATION_OWNER_USER_ID to an existing Neon auth user UUID.')
  } else {
    for (const row of looks) {
      await pool.query(
        `INSERT INTO public.tribe_looks (id,user_id,image_url,name,piece_name,status,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET image_url=EXCLUDED.image_url,name=EXCLUDED.name,piece_name=EXCLUDED.piece_name,status=EXCLUDED.status`,
        [row.id, ownerId, row.image_url, row.name, row.piece_name || '', row.status || 'pending', row.created_at],
      )
    }
  }
  console.log(`Imported ${content.length} site-content rows, ${posts.length} Chronicle posts, and ${ownerId ? looks.length : 0} Tribe Looks.`)
} finally {
  await pool?.end()
}
