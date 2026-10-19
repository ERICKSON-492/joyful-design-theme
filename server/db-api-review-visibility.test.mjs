import assert from 'node:assert/strict'
import test from 'node:test'
import { handleDb } from './db-api.mjs'

const reviewColumns = [
  { column_name: 'id', data_type: 'uuid' },
  { column_name: 'user_id', data_type: 'uuid' },
  { column_name: 'status', data_type: 'text' },
  { column_name: 'product_id', data_type: 'uuid' },
  { column_name: 'is_verified_buyer', data_type: 'boolean' },
  { column_name: 'admin_response', data_type: 'text' },
]

async function captureReviewRead({ user = null, isAdmin = false, query = '' } = {}) {
  let selectSql = ''
  let selectValues = []
  const pool = {
    async query(sql, values = []) {
      if (sql.includes('information_schema.columns')) return { rows: reviewColumns }
      selectSql = sql
      selectValues = values
      return { rows: [] }
    },
  }
  const res = { writeHead() {}, end() {} }
  let response
  const json = (_res, status, body) => { response = { status, body }; return response }

  await handleDb({
    pool,
    req: { method: 'GET' },
    res,
    url: new URL(`https://local/api/db/product_reviews${query}`),
    json,
    body: async () => ({}),
    user,
    isAdmin,
  })
  return { ...response, selectSql, selectValues }
}

test('anonymous readers cannot request pending reviews', async () => {
  const result = await captureReviewRead({ query: '?status=eq.pending' })
  assert.equal(result.status, 200)
  assert.match(result.selectSql, /status = 'approved'/)
  assert.deepEqual(result.selectValues, ['pending'])
})

test('signed-in customers can read approved reviews and their own non-approved reviews only', async () => {
  const customerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const result = await captureReviewRead({ user: { id: customerId }, query: '?status=eq.pending' })
  assert.equal(result.status, 200)
  assert.match(result.selectSql, /status = 'approved' OR user_id = \$2::uuid/)
  assert.deepEqual(result.selectValues, ['pending', customerId])
})

test('administrators retain access to all review statuses for moderation', async () => {
  const result = await captureReviewRead({ isAdmin: true, query: '?status=eq.pending' })
  assert.equal(result.status, 200)
  assert.doesNotMatch(result.selectSql, /status = 'approved'/)
  assert.deepEqual(result.selectValues, ['pending'])
})

test('customer review submissions are automatically approved and cannot forge moderation fields', async () => {
  const customerId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  let insertSql = ''
  let insertValues = []
  let response
  const pool = {
    async query(sql, values = []) {
      if (sql.includes('information_schema.columns')) return { rows: reviewColumns }
      insertSql = sql
      insertValues = values
      return { rows: [{ id: 'review-id', status: 'approved' }] }
    },
  }
  const json = (_res, status, body) => { response = { status, body }; return response }

  await handleDb({
    pool,
    req: { method: 'POST' },
    res: { writeHead() {}, end() {} },
    url: new URL('https://local/api/db/product_reviews'),
    json,
    body: async () => ({
      user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      product_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      status: 'rejected',
      is_verified_buyer: true,
      admin_response: 'forged response',
    }),
    user: { id: customerId },
    isAdmin: false,
  })

  const columns = insertSql.match(/INSERT INTO public\.product_reviews \(([^)]+)\)/)?.[1].split(',') || []
  assert.equal(response.status, 201)
  assert.equal(insertValues[columns.indexOf('user_id')], customerId)
  assert.equal(insertValues[columns.indexOf('status')], 'approved')
  assert.equal(insertValues[columns.indexOf('is_verified_buyer')], false)
  assert.equal(insertValues[columns.indexOf('admin_response')], null)
})

test('customers cannot change review status or other moderation-owned fields', async () => {
  let writeSql = ''
  let response
  const pool = {
    async query(sql) {
      if (sql.includes('information_schema.columns')) return { rows: reviewColumns }
      writeSql = sql
      return { rows: [] }
    },
  }
  const json = (_res, status, body) => { response = { status, body }; return response }

  await handleDb({
    pool,
    req: { method: 'PATCH' },
    res: { writeHead() {}, end() {} },
    url: new URL('https://local/api/db/product_reviews?id=eq.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    json,
    body: async () => ({ status: 'rejected' }),
    user: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    isAdmin: false,
  })

  assert.equal(response.status, 403)
  assert.equal(writeSql, '')
})
