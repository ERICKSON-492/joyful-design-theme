import { describe, expect, test } from 'bun:test'
import { freshSales, saleNoticeKey, whatsappOrderMessage } from './shopNotifications.ts'

const product = { id: 'bracelet', name: 'Beaded bracelet', price: 1000, sale_price: 800, is_active: true, sale_starts_at: '2026-10-11T13:00:00Z', sale_ends_at: '2026-10-12T13:00:00Z' }
describe('shopper sale alerts', () => {
  test('a newly active sale is announced', () => {
    expect(freshSales([product], [], Date.parse('2026-10-11T13:00:00Z'))).toEqual([product])
  })
  test('a scheduled sale is not announced early', () => {
    expect(freshSales([product], [], Date.parse('2026-10-11T12:59:59Z'))).toEqual([])
  })
  test('a sale seen on the previous visit is not repeated', () => {
    expect(freshSales([product], [saleNoticeKey(product)], Date.parse('2026-10-11T14:00:00Z'))).toEqual([])
  })
  test('a sale added while away is announced on return', () => {
    const newSale = { ...product, sale_price: 700 }
    expect(freshSales([newSale], [saleNoticeKey(product)], Date.parse('2026-10-11T14:00:00Z'))).toEqual([newSale])
  })
  test('expired and hidden sales are not announced', () => {
    expect(freshSales([product], [], Date.parse('2026-10-12T13:00:00Z'))).toEqual([])
    expect(freshSales([{ ...product, is_active: false }], [], Date.parse('2026-10-11T14:00:00Z'))).toEqual([])
  })
})
test('WhatsApp includes each item, quantity, line amount and full order total', () => {
  const message = whatsappOrderMessage({ items: [{ name: 'Bracelet', quantity: 2, price: 500 }, { name: 'Belt', quantity: 1, price: 2000 }], name: 'Shopper', phone: '', delivery: 'Nairobi', shippingName: 'Delivery', shippingCost: 200, subtotal: 3000, discount: 100, total: 3100 })
  expect(message).toContain('Bracelet x2 - KSh 1,000')
  expect(message).toContain('Belt x1 - KSh 2,000')
  expect(message).toContain('Total: KSh 3,100')
})