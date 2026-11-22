import { supabase } from '@/integrations/supabase/client'

export async function invokeFunction<T = any>(name: string, body: unknown = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    let message = error.message || 'Request failed'
    // FunctionsHttpError may carry the function's JSON error body.
    const context = (error as { context?: Response }).context
    if (context) {
      const payload = await context.clone().json().catch(() => null) as { error?: string; message?: string } | null
      message = payload?.error || payload?.message || message
    }
    throw new Error(message)
  }
  return data as T
}

export const sendEmail = (payload: { to: string; subject: string; html: string; label?: string }) =>
  invokeFunction<{ queued?: boolean; success?: boolean; id?: string }>('send-emails', payload)
