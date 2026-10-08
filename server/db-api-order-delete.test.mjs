import assert from 'node:assert/strict'
import test from 'node:test'
import { handleDb } from './db-api.mjs'

const orderId = '223e4567-e89b-42d3-a456-426614174000'
const columns = [
  { column_name: 'id', data_type: 'uuid' },
  { column_name: 'user_id', data_type: 'uuid' },
]

async function invoke({ path, isAdmin = true, pool }) {
  let response
  const json = (_res, status, body) => { response = { status, body }; return response }
  await handleDb({
    pool,
    req: { method: 'DELETE' },
    res: {},
    url: new URL(`https://local${path}`),
    json,
    body: async () => ({}),
    user: null,
    isAdmin,
  })
  return response
}

test('admin deletion of one order removes notification rows and order in one transaction', async () => {
  const statements = []
  const client = {
    async query(sql, values) {
      statements.push({ sql, values })
      if (sql.startsWith('DELETE FROM public.joyful_orders')) return { rowCount: 1, rows: [{ id: orderId }] }
      return { rowCount: 0, rows: [] }
    },
    release() {},
  }
  const pool = {
    async query() { return { rows: columns } },
    async connect() { return client },
  }

  const result = await invoke({ path: `/api/db/orders?id=eq.${orderId}`, pool })
  assert.equal(result.status, 200)
  assert.equal(result.body[0].id, orderId)
  assert.ok(statements.some(({ sql }) => sql.includes('DELETE FROM public.order_email_notifications')))
  assert.ok(statements.some(({ sql }) => sql.startsWith('DELETE FROM public.joyful_orders')))
  assert.ok(statements.some(({ sql }) => sql === 'COMMIT'))
})

test('admin order deletion rejects a bulk request without one exact order ID', async () => {
  let connected = false
  const pool = {
    async query() { return { rows: columns } },
    async connect() { connected = true; throw new Error('should not connect') },
  }
  const result = await invoke({ path: '/api/db/orders', pool })
  assert.equal(result.status, 400)
  assert.equal(connected, false)
})

test('non-admin users cannot delete orders', async () => {
  let connected = false
  const pool = {
    async query() { return { rows: columns } },
    async connect() { connected = true; throw new Error('should not connect') },
  }
  const result = await invoke({ path: `/api/db/orders?id=eq.${orderId}`, isAdmin: false, pool })
  assert.equal(result.status, 403)
  assert.equal(connected, false)
})
