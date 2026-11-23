import { supabase } from '@/integrations/supabase/client'
import { apiUrl } from './apiBase'
import { r2ObjectUrl } from './r2ObjectUrl'

export interface R2UploadResult {
  key: string
  publicUrl: string
}

// Keep public catalog media small enough for mobile connections. Existing R2
// originals are not rewritten automatically; every new upload is optimized.
const MAX_IMAGE_UPLOAD_BYTES = 0
const MAX_IMAGE_EDGE = 1400
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

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ? { authorization: `Bearer ${data.session.access_token}` } : {}
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
      headers: { 'content-type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ folder, key, contentType, size: uploadFile.size }),
    })
    signed = await signResponse.json().catch(() => ({}))
  } catch (error) { throw error }
  if (!signResponse.ok) {
    throw new Error(typeof signed.error === 'string' ? signed.error : 'Could not prepare the upload')
  }

  const uploadUrl = typeof signed.uploadUrl === 'string' ? signed.uploadUrl : ''
  const r2Key = typeof signed.key === 'string' ? signed.key : ''
  if (!uploadUrl || !r2Key) throw new Error('Could not prepare the upload')

  let uploadResponse: Response
  try {
    uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=31536000, immutable',
      },
      body: uploadFile,
    })
  } catch (error) { throw error }
  if (!uploadResponse.ok) {
    throw new Error('Cloudflare R2 upload failed')
  }

  const publicUrl = r2ObjectUrl(r2Key)
  if (!publicUrl) throw new Error('The R2 object key is not in an allowed public media folder')
  return { key: r2Key, publicUrl }
}

export async function deleteFromR2(key: string): Promise<void> {
  const response = await fetch(apiUrl('/api/storage/delete'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ key }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Could not delete the file')
  }
}

export async function uploadReceiptToR2(orderId: string, file: Blob): Promise<string> {
  const response = await fetch(apiUrl('/api/storage/receipt-upload-url'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ orderId }),
  })
  const signed = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(signed.error || 'Could not prepare the receipt upload')
  const upload = await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'content-type': 'application/pdf' }, body: file })
  if (!upload.ok) throw new Error('Cloudflare R2 receipt upload failed')
  return signed.downloadUrl
}
