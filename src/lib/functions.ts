import { apiUrl } from '@/lib/apiBase'

export async function invokeFunction<T = any>(name: string, body: unknown = {}): Promise<T> {
  const response = await fetch(apiUrl(`/api/functions/${encodeURIComponent(name)}`), {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || data.message || 'Request failed')
  return data as T
}

export const sendEmail = (payload: { to: string; subject: string; html: string; label?: string }) =>
  invokeFunction<{ queued: boolean; id: string }>('send-emails', payload)
