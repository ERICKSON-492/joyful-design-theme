import { apiUrl } from './apiBase'

/**
 * Prefixes whose contents are intended to be served as public media.
 * `order-receipts` is deliberately excluded: the migration put it in the same
 * R2 bucket, but receipts must only be read through the signed receipt flow.
 */
const PUBLIC_MEDIA_PREFIXES = new Set([
  'product-images',
  'site_images',
  'site-images',
  'review-photos',
  'category-images',
  'custom-orders',
  'tribe-looks',
])

// These two legacy seed URLs were not present in the source bucket listing
// during the migration. Leave them on their original host instead of creating
// broken R2 links; replace/remove these exceptions after the assets are copied.
const NOT_MIGRATED_KEYS = new Set([
  'product-images/categories/wear-it-1781032558106.jpg',
  'product-images/hero/1780565881534.jpg',
])

const PUBLIC_OBJECT_PATH = /^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/
const configuredPublicBase = String(import.meta.env.VITE_R2_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '')
const SUPABASE_FALLBACK_MARKER = '#supabase-fallback'

function encodeKey(key: string): string {
  return key.split('/').map((segment) => encodeURIComponent(segment)).join('/')
}

/** Build a browser-safe URL for an object already copied into the `ushanga` R2 bucket. */
export function r2ObjectUrl(key: string): string {
  const normalizedKey = key.replace(/^\/+/, '')
  const prefix = normalizedKey.split('/')[0]
  if (!PUBLIC_MEDIA_PREFIXES.has(prefix) || !normalizedKey.includes('/')) return ''
  const encodedKey = encodeKey(normalizedKey)
  return configuredPublicBase
    ? `${configuredPublicBase}/${encodedKey}`
    : apiUrl(`/api/storage/public/${encodedKey}`)
}

/** Redirect legacy Supabase public Storage URLs to the matching migrated R2 key. */
export function migratedStorageUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return value
  }

  // Supabase fallback uploads keep their original URL; fragments are not sent in HTTP.
  if (parsed.hash === SUPABASE_FALLBACK_MARKER) return value
  const match = parsed.pathname.match(PUBLIC_OBJECT_PATH)
  if (!match) return value

  let bucket: string
  let objectPath: string
  try {
    bucket = decodeURIComponent(match[1])
    objectPath = match[2].split('/').map((part) => decodeURIComponent(part)).join('/')
  } catch {
    return value
  }
  if (!PUBLIC_MEDIA_PREFIXES.has(bucket)) return value
  if (NOT_MIGRATED_KEYS.has(`${bucket}/${objectPath}`)) return value

  const rewritten = r2ObjectUrl(`${bucket}/${objectPath}`)
  return rewritten ? `${rewritten}${parsed.search}${parsed.hash}` : value
}

/** Extract a storage key from a Supabase, API-proxy, or direct R2 media URL. */
export function storageKeyFromPublicUrl(value: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(value, typeof window === 'undefined' ? 'https://local.invalid' : window.location.origin)
  } catch {
    return null
  }
  const fallback = parsed.hash === SUPABASE_FALLBACK_MARKER
  const supabaseMatch = parsed.pathname.match(PUBLIC_OBJECT_PATH)
  if (supabaseMatch) {
    let bucket: string
    let objectPath: string
    try {
      bucket = decodeURIComponent(supabaseMatch[1])
      objectPath = supabaseMatch[2].split('/').map((part) => decodeURIComponent(part)).join('/')
    } catch {
      return null
    }
    if (!PUBLIC_MEDIA_PREFIXES.has(bucket)) return null
    return fallback ? `${objectPath}${SUPABASE_FALLBACK_MARKER}` : `${bucket}/${objectPath}`
  }

  const proxyMatch = parsed.pathname.match(/^\/api\/storage\/public\/(.+)$/)
  const rawKey = proxyMatch?.[1] || parsed.pathname.replace(/^\/+/, '')
  let key: string
  try {
    key = rawKey.split('/').map((part) => decodeURIComponent(part)).join('/')
  } catch {
    return null
  }
  return PUBLIC_MEDIA_PREFIXES.has(key.split('/')[0]) && key.includes('/') ? key : null
}

/** Normalize data responses without changing ordinary URLs or private receipt URLs. */
export function migrateStorageUrls<T>(value: T): T {
  if (typeof value === 'string') return migratedStorageUrl(value) as T
  if (Array.isArray(value)) return value.map((item) => migrateStorageUrls(item)) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, migrateStorageUrls(item)]),
    ) as T
  }
  return value
}
