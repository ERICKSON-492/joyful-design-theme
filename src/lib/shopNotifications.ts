import { getActiveSalePrice, type ScheduledSaleProduct } from './salePrice'

export interface SaleNoticeProduct extends ScheduledSaleProduct {
  id: string
  name: string
  is_active: boolean
}

export function saleNoticeKey(product: SaleNoticeProduct): string {
  return JSON.stringify([product.id, Number(product.sale_price), product.sale_starts_at || '', product.sale_ends_at || ''])
}

export function freshSales(products: SaleNoticeProduct[], seen: string[], at = Date.now()): SaleNoticeProduct[] {
  const known = new Set(seen)
  return products.filter(product => product.is_active && getActiveSalePrice(product, at) !== null && !known.has(saleNoticeKey(product)))
}

export function whatsappOrderMessage(order: {
  items: { name: string; quantity: number; price: number }[]
  name: string
  phone: string
  delivery: string
  shippingName: string
  shippingCost: number
  subtotal: number
  discount: number
  total: number
}): string {
  const money = (value: number) => `KSh ${value.toLocaleString('en-KE')}`
  return `Hi! I'd like to order:\n${order.items.map(item => `• ${item.name} x${item.quantity} - ${money(item.price * item.quantity)}`).join('\n')}\n\nName: ${order.name}\nPhone: ${order.phone}\nDelivery: ${order.delivery}\nShipping: ${order.shippingName} - ${money(order.shippingCost)}\nSubtotal: ${money(order.subtotal)}${order.discount > 0 ? `\nDiscount: ${money(order.discount)}` : ''}\nTotal: ${money(order.total)}`
}