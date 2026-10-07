import test from 'node:test'
import assert from 'node:assert/strict'
import { createGoogleOAuthRoutes, safeGoogleReturnTo } from './google-oauth.mjs'

const siteOrigin = 'https://www.example.test'
const env = {
  NODE_ENV: 'test',
  PUBLIC_SITE_URL: siteOrigin,
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_REDIRECT_URI: `${siteOrigin}/api/auth/google/callback`,
}

function responseRecorder() {
  return {
    status: null,
    headers: {},
    ended: false,
    writeHead(status, headers) { this.status = status; this.headers = headers },
    end() { this.ended = true },
  }
}

function cookiePairs(setCookies) {
  return setCookies.map(value => value.split(';', 1)[0]).join('; ')
}

function cookieFromHeader(header, name) {
  const item = header.split('; ').find(part => part.startsWith(`${name}=`))
  return item?.slice(name.length + 1)
}

function makeHarness({ claims = {}, pool, envOverrides = {} } = {}) {
  let authOptions
  let requestedTokenOptions
  let sessionCalls = 0
  class FakeOAuthClient {
    constructor(clientId, clientSecret, redirectUri) {
      assert.equal(clientId, env.GOOGLE_CLIENT_ID)
      assert.equal(clientSecret, env.GOOGLE_CLIENT_SECRET)
      assert.equal(redirectUri, env.GOOGLE_REDIRECT_URI)
    }
    generateAuthUrl(options) {
      authOptions = options
      const target = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      for (const [key, value] of Object.entries(options)) target.searchParams.set(key, Array.isArray(value) ? value.join(' ') : String(value))
      return target.toString()
    }
    async getToken(options) {
      requestedTokenOptions = options
      return { tokens: { id_token: 'fake-id-token' } }
    }
    async verifyIdToken(options) {
      assert.equal(options.idToken, 'fake-id-token')
      assert.equal(options.audience, env.GOOGLE_CLIENT_ID)
      return { getPayload: () => ({ sub: 'google-subject', email: 'person@example.test', email_verified: true, name: 'Ada Example', nonce: authOptions?.nonce, ...claims }) }
    }
  }
  const handler = createGoogleOAuthRoutes({
    pool: pool || { async query() { throw new Error('Unexpected database query') } },
    createSession: async (_req, userId) => { sessionCalls += 1; return `session-for-${userId}` },
    sessionCookie: token => `ushanga_session=${token}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned`,
    env: { ...env, ...envOverrides },
    OAuth2ClientClass: FakeOAuthClient,
    hashPassword: async () => 'random-unusable-bcrypt-hash',
    logger: { error() {} },
  })
  return {
    handler,
    authOptions: () => authOptions,
    tokenOptions: () => requestedTokenOptions,
    sessionCalls: () => sessionCalls,
  }
}

async function beginLogin(harness, returnTo = '/orders?tab=recent') {
  const response = responseRecorder()
  await harness.handler({ method: 'GET', headers: {} }, response, new URL(`${siteOrigin}/api/auth/google?return_to=${encodeURIComponent(returnTo)}`))
  const authorizationUrl = new URL(response.headers.location)
  return { response, authorizationUrl, cookies: cookiePairs(response.headers['set-cookie']) }
}

test('safeGoogleReturnTo only accepts same-site path destinations', () => {
  assert.equal(safeGoogleReturnTo('/orders?tab=recent'), '/orders?tab=recent')
  assert.equal(safeGoogleReturnTo('//outside.example/path'), '/')
  assert.equal(safeGoogleReturnTo('/\\\\outside.example/path'), '/')
  assert.equal(safeGoogleReturnTo('/auth?loop=1'), '/')
  assert.equal(safeGoogleReturnTo('https://outside.example/path'), '/')
})

test('start redirects to Google with state, nonce, PKCE and minimal scopes', async () => {
  const harness = makeHarness()
  const { response, authorizationUrl } = await beginLogin(harness)
  assert.equal(response.status, 302)
  assert.equal(authorizationUrl.origin, 'https://accounts.google.com')
  assert.equal(authorizationUrl.searchParams.get('scope'), 'openid email profile')
  assert.equal(authorizationUrl.searchParams.get('code_challenge_method'), 'S256')
  assert.ok(authorizationUrl.searchParams.get('state'))
  assert.ok(authorizationUrl.searchParams.get('nonce'))
  assert.equal(response.headers['set-cookie'].length, 4)
})

test('callback rejects a mismatched state without exchanging the code or creating a session', async () => {
  const harness = makeHarness()
  const started = await beginLogin(harness)
  const response = responseRecorder()
  await harness.handler(
    { method: 'GET', headers: { cookie: started.cookies } },
    response,
    new URL(`${siteOrigin}/api/auth/google/callback?code=stolen-code&state=wrong-state`),
  )
  assert.equal(response.status, 302)
  assert.equal(new URL(response.headers.location).searchParams.get('google_error'), 'failed')
  assert.equal(harness.tokenOptions(), undefined)
  assert.equal(harness.sessionCalls(), 0)
})

test('callback creates a Neon-backed session for a verified Google account', async () => {
  const queryCalls = []
  const pool = {
    async query(sql, values) {
      queryCalls.push({ sql, values })
      if (sql.startsWith('SELECT')) return { rows: [] }
      if (sql.startsWith('INSERT')) return { rows: [{ id: 'local-user-1', email: values[0], display_name: values[2], role: 'user', is_active: true }] }
      if (sql.includes('UPDATE auth_users')) return { rows: [{ id: 'local-user-1', email: 'person@example.test', display_name: 'Ada Example', role: 'user' }] }
      throw new Error(`Unexpected query: ${sql}`)
    },
  }
  const harness = makeHarness({ pool })
  const started = await beginLogin(harness)
  const state = started.authorizationUrl.searchParams.get('state')
  const verifier = cookieFromHeader(started.cookies, 'ushanga_google_verifier')
  const response = responseRecorder()
  await harness.handler(
    { method: 'GET', headers: { cookie: started.cookies, 'user-agent': 'test-agent' }, socket: { remoteAddress: '127.0.0.1' } },
    response,
    new URL(`${siteOrigin}/api/auth/google/callback?code=valid-code&state=${encodeURIComponent(state)}`),
  )
  const redirectUrl = new URL(response.headers.location)
  assert.equal(response.status, 302)
  assert.equal(redirectUrl.origin, siteOrigin)
  assert.equal(redirectUrl.pathname, '/auth')
  assert.equal(redirectUrl.searchParams.get('google_login'), 'success')
  assert.equal(redirectUrl.searchParams.get('return_to'), '/orders?tab=recent')
  assert.ok(response.headers['set-cookie'].some(value => value.startsWith('ushanga_session=session-for-local-user-1;')))
  assert.equal(harness.tokenOptions().code, 'valid-code')
  assert.equal(harness.tokenOptions().codeVerifier, verifier)
  assert.equal(harness.sessionCalls(), 1)
  assert.equal(queryCalls.length, 3)
  assert.equal(queryCalls[0].values[0], 'person@example.test')
})

test('callback refuses an unverified Google email before touching the user database', async () => {
  let queries = 0
  const pool = { async query() { queries += 1; throw new Error('Database should not be called') } }
  const harness = makeHarness({ pool, claims: { email_verified: false } })
  const started = await beginLogin(harness)
  const state = started.authorizationUrl.searchParams.get('state')
  const response = responseRecorder()
  await harness.handler(
    { method: 'GET', headers: { cookie: started.cookies } },
    response,
    new URL(`${siteOrigin}/api/auth/google/callback?code=valid-code&state=${encodeURIComponent(state)}`),
  )
  assert.equal(new URL(response.headers.location).searchParams.get('google_error'), 'failed')
  assert.equal(queries, 0)
  assert.equal(harness.sessionCalls(), 0)
})

test('callback does not reactivate a disabled local account', async () => {
  let queryCount = 0
  const pool = {
    async query(sql) {
      queryCount += 1
      if (sql.startsWith('SELECT')) return { rows: [{ id: 'disabled-user', email: 'person@example.test', display_name: null, role: 'user', is_active: false }] }
      throw new Error('Disabled user must not be updated')
    },
  }
  const harness = makeHarness({ pool })
  const started = await beginLogin(harness)
  const state = started.authorizationUrl.searchParams.get('state')
  const response = responseRecorder()
  await harness.handler(
    { method: 'GET', headers: { cookie: started.cookies } },
    response,
    new URL(`${siteOrigin}/api/auth/google/callback?code=valid-code&state=${encodeURIComponent(state)}`),
  )
  assert.equal(new URL(response.headers.location).searchParams.get('google_error'), 'account_unavailable')
  assert.equal(queryCount, 1)
  assert.equal(harness.sessionCalls(), 0)
})

test('start returns a clear redirect when Google credentials are not configured', async () => {
  const harness = makeHarness({ envOverrides: { GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '' } })
  const response = responseRecorder()
  await harness.handler({ method: 'GET', headers: {} }, response, new URL(`${siteOrigin}/api/auth/google?return_to=%2Fcart`))
  const redirectUrl = new URL(response.headers.location)
  assert.equal(redirectUrl.searchParams.get('google_error'), 'not_configured')
  assert.equal(redirectUrl.searchParams.get('return_to'), '/cart')
})
