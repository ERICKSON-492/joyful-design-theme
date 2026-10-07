import { supabase as legacySupabase } from '@/integrations/supabase/client'
import { apiUrl } from './apiBase'
import { r2ObjectUrl } from './r2ObjectUrl'

export interface R2UploadResult {
  key: string
  publicUrl: string
}

const LEGACY_BUCKET = 'product-images'
const FALLBACK_MARKER = '#supabase-fallback'
const ALLOW_LEGACY_FALLBACK = true
const MAX_IMAGE_UPLOAD_BYTES = 1_500_000
const MAX_IMAGE_EDGE = 1800
const OPTIMIZABLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png'])

async function optimizeImageUpload(file: Blob): Promise<Blob> {
  if (!OPTIMIZABLE_IMAGE_TYPES.has(file.type) || file.size <= MAX_IMAGE_UPLOAD_BYTES || typeof createImageBitmap === 'undefined') return file

  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.82))
    return blob?.type === 'image/webp' && blob.size < file.size ? blob : file
  } finally {
    bitmap.close()
  }
}

function webpObjectKey(key: string) {
  return /\.[a-z0-9]+$/i.test(key) ? key.replace(/\.[^.]+$/, '.webp') : `${key}.webp`
}

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
  // The fragment is preserved in the database but is not sent with image requests.
  // It prevents legacy-URL mapping from redirecting this fallback object to R2.
  return { key: storageKey, publicUrl: `${data.publicUrl}${FALLBACK_MARKER}` }
}

function canFallback(folder: string) {
  return ALLOW_LEGACY_FALLBACK && folder !== 'order-receipts'
}

export async function uploadToR2(folder: string, file: Blob, key: string, contentType = file.type || 'application/octet-stream'): Promise<R2UploadResult> {
  let uploadFile = file
  try {
    uploadFile = await optimizeImageUpload(file)
    if (uploadFile !== file) {
      key = webpObjectKey(key)
      contentType = 'image/webp'
    }
  } catch (error) {
    console.warn('Image optimization skipped:', error)
  }

  let signResponse: Response
  let signed: Record<string, unknown>
  try {
    signResponse = await fetch(apiUrl('/api/storage/upload-url'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ folder, key, contentType, size: uploadFile.size }),
    })
    signed = await signResponse.json().catch(() => ({}))
  } catch (error) {
    if (canFallback(folder)) return uploadToLegacySupabase(folder, uploadFile, key, contentType)
    throw error
  }
  if (!signResponse.ok) {
    if (signResponse.status >= 500 && canFallback(folder)) {
      return uploadToLegacySupabase(folder, uploadFile, key, contentType)
    }
    throw new Error(typeof signed.error === 'string' ? signed.error : 'Could not prepare the upload')
  }

  const uploadUrl = typeof signed.uploadUrl === 'string' ? signed.uploadUrl : ''
  const r2Key = typeof signed.key === 'string' ? signed.key : ''
  if (!uploadUrl || !r2Key) throw new Error('Could not prepare the upload')

  let uploadResponse: Response
  try {
    uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': contentType },
      body: uploadFile,
    })
  } catch (error) {
    if (canFallback(folder)) return uploadToLegacySupabase(folder, uploadFile, key, contentType)
    throw error
  }
  if (!uploadResponse.ok) {
    if (uploadResponse.status >= 500 && canFallback(folder)) {
      return uploadToLegacySupabase(folder, uploadFile, key, contentType)
    }
    throw new Error('Cloudflare R2 upload failed')
  }

  const publicUrl = r2ObjectUrl(r2Key)
  if (!publicUrl) throw new Error('The R2 object key is not in an allowed public media folder')
  return { key: r2Key, publicUrl }
}

export async function deleteFromR2(key: string): Promise<void> {
  if (key.endsWith(FALLBACK_MARKER)) {
    const { error } = await legacySupabase.storage.from(LEGACY_BUCKET).remove([key.slice(0, -FALLBACK_MARKER.length)])
    if (error) throw new Error(error.message || 'Could not delete the fallback image')
    return
  }

  const response = await fetch(apiUrl('/api/storage/delete'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    if (response.status === 503 && !key.includes('order-receipts/')) {
      const sourcePath = key.replace(/^product-images\//, '')
      const { error } = await legacySupabase.storage.from(LEGACY_BUCKET).remove([sourcePath])
      if (!error) return
    }
    throw new Error(data.error || 'Could not delete the file')
  }
}

export async function uploadReceiptToR2(orderId: string, file: Blob): Promise<string> {
  const response = await fetch(apiUrl('/api/storage/receipt-upload-url'), {
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
