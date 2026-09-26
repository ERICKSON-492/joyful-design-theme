import { supabase as legacySupabase } from '@/integrations/supabase/client'

export interface R2UploadResult {
  key: string
  publicUrl: string
}

const LEGACY_BUCKET = 'product-images'
const TEMPORARY_SUPABASE_IMAGE_FALLBACK = true

function legacyStorageKey(folder: string, key: string) {
  const prefix = folder === 'site-images' ? 'site-content' : folder
  return `${prefix.replace(/^\/+|\/+$/g, '')}/${key.replace(/^\/+/, '')}`
}

async function uploadToLegacySupabase(folder: string, file: Blob, key: string, contentType: string): Promise<R2UploadResult> {
  const storageKey = legacyStorageKey(folder, key)
  const { error } = await legacySupabase.storage.from(LEGACY_BUCKET).upload(storageKey, file, {
    cacheControl: '3600',
    contentType,
    upsert: true,
  })
  if (error) throw new Error(error.message || 'Supabase image upload failed')
  const { data } = legacySupabase.storage.from(LEGACY_BUCKET).getPublicUrl(storageKey)
  return { key: storageKey, publicUrl: data.publicUrl }
}

export async function uploadToR2(folder: string, file: Blob, key: string, contentType = file.type || 'application/octet-stream'): Promise<R2UploadResult> {
  const signResponse = await fetch('/api/storage/upload-url', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ folder, key, contentType, size: file.size }),
  })
  const signed = await signResponse.json().catch(() => ({}))
  if (!signResponse.ok) {
    // Temporary bridge: existing image records still use Supabase Storage while
    // R2 billing and credentials are being configured. Keep receipts private
    // and never send those through this public image fallback.
    if (TEMPORARY_SUPABASE_IMAGE_FALLBACK && signResponse.status === 503 && folder !== 'order-receipts') {
      return uploadToLegacySupabase(folder, file, key, contentType)
    }
    throw new Error(signed.error || 'Could not prepare the upload')
  }

  const uploadResponse = await fetch(signed.uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': contentType },
    body: file,
  })
  if (!uploadResponse.ok) throw new Error('Cloudflare R2 upload failed')
  return { key: signed.key, publicUrl: signed.publicUrl }
}

export async function deleteFromR2(key: string): Promise<void> {
  const response = await fetch('/api/storage/delete', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    if (TEMPORARY_SUPABASE_IMAGE_FALLBACK && response.status === 503 && !key.includes('order-receipts/')) {
      const { error } = await legacySupabase.storage.from(LEGACY_BUCKET).remove([key.replace(/^product-images\//, '')])
      if (!error) return
    }
    throw new Error(data.error || 'Could not delete the file')
  }
}

export async function uploadReceiptToR2(orderId: string, file: Blob): Promise<string> {
  const response = await fetch('/api/storage/receipt-upload-url', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ orderId }),
  })
  const signed = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(signed.error || 'Could not prepare the receipt upload')
  const upload = await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'content-type': 'application/pdf' }, body: file })
  if (!upload.ok) throw new Error('Cloudflare R2 receipt upload failed')
  return signed.downloadUrl
}
