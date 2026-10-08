import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const proxySource = await readFile(new URL('../functions/api/[[path]].js', import.meta.url), 'utf8')
const proxyModuleUrl = `data:text/javascript;base64,${Buffer.from(proxySource).toString('base64')}`
const { onRequest } = await import(proxyModuleUrl)

test('Cloudflare API proxy preserves an upstream Google OAuth redirect and state cookie', async () => {
  const originalFetch = globalThis.fetch
  const expectedLocation = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=example'
  const expectedCookie = 'ushanga_google_state=opaque-state; Path=/api/auth/google/callback; HttpOnly; Secure; SameSite=Lax'
  let capturedRequest
  globalThis.fetch = async request => {
    capturedRequest = request
    return new Response(null, {
      status: 302,
      headers: {
        location: expectedLocation,
        'set-cookie': expectedCookie,
      },
    })
  }

  try {
    const response = await onRequest({
      request: new Request('https://www.example.test/api/auth/google?return_to=%2Fshop'),
      env: { API_ORIGIN: 'https://api.example.test' },
    })

    assert.equal(capturedRequest.url, 'https://api.example.test/api/auth/google?return_to=%2Fshop')
    assert.equal(capturedRequest.redirect, 'manual')
    assert.equal(response.status, 302)
    assert.equal(response.headers.get('location'), expectedLocation)
    assert.equal(response.headers.get('set-cookie'), expectedCookie)
  } finally {
    globalThis.fetch = originalFetch
  }
})
