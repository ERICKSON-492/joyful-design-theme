import assert from 'node:assert/strict'
import test from 'node:test'
import { handleAdminCustomers } from './admin-customer-api.mjs'

const customerId = '123e4567-e89b-42d3-a456-426614174000'
const orderId = '223e4567-e89b-42d3-a456-426614174000'

async function invoke({ method = 'GET', path = '/api/admin/customers', isAdmin = true, payload = {}, pool }) {
  let response
  const json = (_res, status, body) => { response = { status, body }; return response }
  await handleAdminCustomers({
    pool,
    req: { method },
    res: {},
    url: new URL(`https://local${path}`),
    json,
    body: async () => payload,
    isAdmin,
  })
  return response
}

test('customer list is admin-only and reads auth/profile data with order counts', async () => {
  let sql = ''
  const pool = { async query(query) { sql = query; return { rows: [{ user_id: customerId, email: 'shopper@example.test', order_count: 2 }] } } }
  const denied = await invoke({ isAdmin: false, pool })
  assert.equal(denied.status, 403)
  assert.equal(sql, '')

  const allowed = await invoke({ pool })
  assert.equal(allowed.status, 200)
  assert.equal(allowed.body.customers[0].order_count, 2)
  assert.match(sql, /public\.auth_users/)
  assert.match(sql, /public\.profiles/)
  assert.match(sql, /public\.joyful_orders/)
  assert.match(sql, /public\.admin_users/)
})

test('archive deactivates a customer and invalidates existing sessions and reset links', async () => {
  const statements = []
  const client = {
    async query(sql, values) {
      statements.push({ sql, values })
      if (sql.includes('UPDATE public.auth_users')) return { rowCount: 1, rows: [{ id: customerId, is_active: false }] }
      return { rowCount: 0, rows: [] }
    },
    release() {},
  }
  const pool = { async connect() { return client } }
  const result = await invoke({ method: 'PATCH', path: `/api/admin/customers/${customerId}`, payload: { action: 'archive' }, pool })
  assert.equal(result.status, 200)
  assert.equal(result.body.is_active, false)
  assert.ok(statements.some(({ sql }) => sql.includes('DELETE FROM public.auth_sessions')))
  assert.ok(statements.some(({ sql }) => sql.includes('DELETE FROM public.auth_reset_tokens')))
  assert.ok(statements.some(({ sql }) => sql === 'COMMIT'))
})

test('account removal anonymizes linked orders and related contact records in one transaction', async () => {
  const statements = []
  const client = {
    async query(sql, values) {
      statements.push({ sql, values })
      if (sql.includes('SELECT u.id, u.email FROM public.auth_users u')) {
        return { rowCount: 1, rows: [{ id: customerId, email: 'shopper@example.test' }] }
      }
      if (sql.includes('UPDATE public.joyful_orders')) return { rowCount: 1, rows: [{ id: orderId }] }
      return { rowCount: 0, rows: [] }
    },
    release() {},
  }
  const pool = { async connect() { return client } }
  const result = await invoke({ method: 'DELETE', path: `/api/admin/customers/${customerId}`, pool })
  assert.equal(result.status, 200)
  assert.equal(result.body.anonymizedOrders, 1)
  assert.ok(statements.some(({ sql }) => sql.includes("customer_name='Removed customer'") && sql.includes('shipping_address=NULL')))
  assert.ok(statements.some(({ sql }) => sql.includes('UPDATE public.product_reviews') && sql.includes('user_id=NULL')))
  assert.ok(statements.some(({ sql }) => sql.includes('UPDATE public.contact_messages')))
  assert.ok(statements.some(({ sql }) => sql.includes('DELETE FROM public.profiles')))
  assert.ok(statements.some(({ sql }) => sql.includes('DELETE FROM public.auth_users')))
  assert.ok(statements.some(({ sql }) => sql === 'COMMIT'))
})

test('account removal cannot delete admin accounts', async () => {
  const statements = []
  const client = {
    async query(sql) {
      statements.push(sql)
      if (sql.includes('SELECT u.id, u.email FROM public.auth_users u')) return { rowCount: 0, rows: [] }
      return { rowCount: 0, rows: [] }
    },
    release() {},
  }
  const pool = { async connect() { return client } }
  const result = await invoke({ method: 'DELETE', path: `/api/admin/customers/${customerId}`, pool })
  assert.equal(result.status, 404)
  assert.ok(statements.includes('ROLLBACK'))
  assert.ok(statements.some(sql => sql.includes('public.admin_users')))
  assert.ok(!statements.some(sql => sql.includes('DELETE FROM public.auth_users')))
})
