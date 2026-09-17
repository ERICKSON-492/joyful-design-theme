export interface R2UploadResult {
  key: string
  publicUrl: string
}

export async function uploadToR2(folder: string, file: Blob, key: string, contentType = file.type || 'application/octet-stream'): Promise<R2UploadResult> {
  const signResponse = await fetch('/api/storage/upload-url', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ folder, key, contentType, size: file.size }),
  })
  const signed = await signResponse.json().catch(() => ({}))
  if (!signResponse.ok) throw new Error(signed.error || 'Could not prepare the upload')

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
