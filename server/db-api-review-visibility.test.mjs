import assert from 'node:assert/strict'
import test from 'node:test'
import { handleDb } from './db-api.mjs'

const reviewColumns = [
  { column_name: 'id', data_type: 'uuid' },
  { column_name: 'user_id', data_type: 'uuid' },
  { column_name: 'status', data_type: 'text' },
  { column_name: 'product_id', data_type: 'uuid' },
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
