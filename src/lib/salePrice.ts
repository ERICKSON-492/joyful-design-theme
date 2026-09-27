export interface ScheduledSaleProduct {
  price: number
  sale_price?: number | null
  sale_starts_at?: string | null
  sale_ends_at?: string | null
}

/** Returns the sale price only while the scheduled sale window is active. */
export function getActiveSalePrice(product: ScheduledSaleProduct, at = Date.now()): number | null {
  const sale = Number(product.sale_price)
  const original = Number(product.price)
  if (!Number.isFinite(sale) || !Number.isFinite(original) || sale <= 0 || sale >= original) return null

  const startsAt = product.sale_starts_at ? Date.parse(product.sale_starts_at) : null
  const endsAt = product.sale_ends_at ? Date.parse(product.sale_ends_at) : null
  if (startsAt !== null && !Number.isFinite(startsAt)) return null
  if (endsAt !== null && !Number.isFinite(endsAt)) return null
  if (startsAt !== null && at < startsAt) return null
  if (endsAt !== null && at >= endsAt) return null
  return sale
}

/** Convert an API timestamp to the value expected by <input type="datetime-local">. */
export function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Convert a datetime-local value to an ISO timestamp for PostgreSQL. */
export function toIsoTimestamp(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : null
}
