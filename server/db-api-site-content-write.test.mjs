import assert from 'node:assert/strict'
import test from 'node:test'
import { handleDb } from './db-api.mjs'

const contentColumns = [
  { column_name: 'id', data_type: 'uuid' },
  { column_name: 'section_key', data_type: 'text' },
  { column_name: 'title', data_type: 'text' },
  { column_name: 'body', data_type: 'text' },
  { column_name: 'updated_at', data_type: 'timestamp with time zone' },
]

async function patchSiteContent({ isAdmin }) {
  let updateSql = ''
  let updateValues = []
  const pool = {
    async query(sql, values = []) {
      if (sql.includes('information_schema.columns')) return { rows: contentColumns }
      updateSql = sql
      updateValues = values
      return { rows: [{ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', section_key: 'homepage_intro', title: 'Updated title', body: 'Updated body' }] }
    },
  }
  const res = { writeHead() {}, end() {} }
  let response
  const json = (_res, status, body) => { response = { status, body }; return response }
  await handleDb({
    pool,
    req: { method: 'PATCH' },
    res,
    url: new URL('https://local/api/db/site_content?section_key=eq.homepage_intro'),
    json,
    body: async () => ({ title: 'Updated title', body: 'Updated body' }),
    user: null,
    isAdmin,
  })
  return { ...response, updateSql, updateValues }
}

test('admin can update a Site Content row by its unique section_key', async () => {
  const result = await patchSiteContent({ isAdmin: true })
  assert.equal(result.status, 200)
  assert.match(result.updateSql, /UPDATE public\.site_content/)
  assert.match(result.updateSql, /WHERE section_key = \$3 RETURNING \*/)
  assert.deepEqual(result.updateValues, ['Updated title', 'Updated body', 'homepage_intro'])
})

test('non-admin cannot update Site Content', async () => {
  const result = await patchSiteContent({ isAdmin: false })
  assert.equal(result.status, 403)
  assert.equal(result.updateSql, '')
})
