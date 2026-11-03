import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMerchantFeed, MERCHANT_FEED_HEADERS } from './merchant-feed.mjs'

const standardProduct = {
  id: 'abc-123',
  name: 'Handmade Necklace & Bracelet',
  description: 'Handmade\nbeaded jewelry',
  price: 2500,
  sale_price: null,
  stock: 3,
  is_preorder: false,
  preorder_available_date: null,
  image_url: '/media/product-images/item.webp',
  image_urls: [],
  category: 'Wear It',
}

function rowsFrom(feed) {
  return feed.trimEnd().split('\n').map(line => line.split('\t'))
}

test('writes a TSV header and canonical product URL with KES price', () => {
  const rows = rowsFrom(buildMerchantFeed([standardProduct]))
  assert.deepEqual(rows[0], MERCHANT_FEED_HEADERS)
  assert.equal(rows.length, 2)
  assert.equal(rows[1][0], 'abc-123')
  assert.equal(rows[1][3], 'https://ushangachronicles.com/products/handmade-necklace-and-bracelet/')
  assert.equal(rows[1][4], 'https://ushangachronicles.com/media/product-images/item.webp')
  assert.equal(rows[1][5], 'in_stock')
  assert.equal(rows[1][6], '')
  assert.equal(rows[1][8], '2500.00 KES')
})

test('formats preorder date in Google ISO-8601 format and normalizes migrated image URLs', () => {
  const product = {
    ...standardProduct,
    is_preorder: true,
    preorder_available_date: '2026-12-01',
    image_url: 'https://qokwavhqqqzjbmyshhfo.supabase.co/storage/v1/object/public/product-images/item image.jpg',
  }
  const row = rowsFrom(buildMerchantFeed([product]))[1]
  assert.equal(row[5], 'preorder')
  assert.equal(row[6], '2026-12-01T00:00+0300')
  assert.equal(row[4], 'https://joyful-design-theme.onrender.com/api/storage/public/product-images/item%20image.jpg')
})

test('rejects preorder products without a ship date', () => {
  assert.throws(() => buildMerchantFeed([{ ...standardProduct, is_preorder: true }]), /missing preorder_available_date/)
})

test('rejects invalid availability dates and prices', () => {
  assert.throws(() => buildMerchantFeed([{ ...standardProduct, is_preorder: true, preorder_available_date: '2026-02-30' }]), /Invalid preorder availability date/)
  assert.throws(() => buildMerchantFeed([{ ...standardProduct, price: 0 }]), /Invalid product price/)
  assert.throws(() => buildMerchantFeed([{ ...standardProduct, name: 'x'.repeat(151) }]), /150-character limit/)
})

test('emits a sale price only when the sale is currently active', () => {
  const row = rowsFrom(buildMerchantFeed([standardProduct], { activeSalePrice: () => 2000 }))[1]
  assert.equal(row[8], '2500.00 KES')
  assert.equal(row[9], '2000.00 KES')
})
