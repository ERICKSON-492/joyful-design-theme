import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'

const GOOGLE_START_PATH = '/api/auth/google'
const GOOGLE_CALLBACK_PATH = '/api/auth/google/callback'
const STATE_COOKIE = 'ushanga_google_state'
const NONCE_COOKIE = 'ushanga_google_nonce'
const VERIFIER_COOKIE = 'ushanga_google_verifier'
const RETURN_TO_COOKIE = 'ushanga_google_return_to'
const OAUTH_COOKIE_NAMES = [STATE_COOKIE, NONCE_COOKIE, VERIFIER_COOKIE, RETURN_TO_COOKIE]
const OAUTH_COOKIE_MAX_AGE = 600
const DEFAULT_SITE_ORIGIN = 'https://www.ushangachronicles.com'

export function safeGoogleReturnTo(value) {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/'
  try {
    const target = new URL(value, 'https://return.invalid')
    if (target.origin !== 'https://return.invalid' || target.pathname === '/auth') return '/'
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return '/'
  }
}

function getSiteOrigin(env) {
  const raw = String(env.PUBLIC_SITE_URL || DEFAULT_SITE_ORIGIN).split(',')[0].trim()
  const site = new URL(raw)
  if (!['https:', 'http:'].includes(site.protocol) || (site.protocol !== 'https:' && env.NODE_ENV === 'production')) {
    throw new Error('PUBLIC_SITE_URL must use HTTPS in production')
  }
  return site.origin
}

function getGoogleConfig(env) {
  const siteOrigin = getSiteOrigin(env)
  const redirectUri = String(env.GOOGLE_REDIRECT_URI || `${siteOrigin}${GOOGLE_CALLBACK_PATH}`).trim()
  const redirect = new URL(redirectUri)
  if (redirect.origin !== siteOrigin || redirect.pathname !== GOOGLE_CALLBACK_PATH || redirect.search || redirect.hash) {
    throw new Error('GOOGLE_REDIRECT_URI must be the same-origin Google callback URL')
  }
  return {
    siteOrigin,
    clientId: String(env.GOOGLE_CLIENT_ID || '').trim(),
    clientSecret: String(env.GOOGLE_CLIENT_SECRET || '').trim(),
    redirectUri,
  }
}

function cookieValue(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    if (part.slice(0, separator).trim() !== name) continue
    try { return decodeURIComponent(part.slice(separator + 1).trim()) } catch { return null }
  }
  return null
}

function setOAuthCookie(name, value, maxAge = OAUTH_COOKIE_MAX_AGE) {
  return `${name}=${encodeURIComponent(value)}; Path=${GOOGLE_CALLBACK_PATH}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`
}

function clearOAuthCookies() {
  return OAUTH_COOKIE_NAMES.map(name => setOAuthCookie(name, '', 0))
}

function sameSecret(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function decodeReturnTo(value) {
  if (!value) return '/'
  try { return safeGoogleReturnTo(Buffer.from(value, 'base64url').toString('utf8')) } catch { return '/' }
}

function authPageUrl(siteOrigin, returnTo, statusKey, statusValue) {
  const target = new URL('/auth', siteOrigin)
  target.searchParams.set(statusKey, statusValue)
  target.searchParams.set('return_to', returnTo)
  return target.toString()
}

function redirect(res, location, cookies = []) {
  res.writeHead(302, {
    location,
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
    ...(cookies.length ? { 'set-cookie': cookies } : {}),
  })
  res.end()
}

async function getOrCreateVerifiedUser({ pool, email, displayName, hashPassword }) {
  let user = (await pool.query(
    'SELECT id,email,display_name,role,is_active FROM auth_users WHERE lower(email)=lower($1) LIMIT 1',
    [email],
  )).rows[0]

  if (!user) {
    const passwordHash = await hashPassword(crypto.randomBytes(48).toString('base64url'))
    try {
      user = (await pool.query(
        'INSERT INTO auth_users (email,password_hash,display_name,email_verified_at) VALUES ($1,$2,$3,now()) RETURNING id,email,display_name,role,is_active',
        [email, passwordHash, displayName || null],
      )).rows[0]
    } catch (error) {
      if (error?.code !== '23505') throw error
      user = (await pool.query(
        'SELECT id,email,display_name,role,is_active FROM auth_users WHERE lower(email)=lower($1) LIMIT 1',
        [email],
      )).rows[0]
    }
  }

  if (!user || user.is_active !== true) return null
  const updated = await pool.query(
    `UPDATE auth_users
       SET email_verified_at=COALESCE(email_verified_at,now()),
           display_name=COALESCE(NULLIF(BTRIM(display_name),''),$2),
           updated_at=now()
     WHERE id=$1 AND is_active=true
     RETURNING id,email,display_name,role`,
    [user.id, displayName || null],
  )
  return updated.rows[0] || null
}

export function createGoogleOAuthRoutes({
  pool,
  createSession,
  sessionCookie,
  env = process.env,
  OAuth2ClientClass = OAuth2Client,
  hashPassword = value => bcrypt.hash(value, 12),
  logger = console,
}) {
  return async function handleGoogleOAuth(req, res, url) {
    if (req.method !== 'GET' || ![GOOGLE_START_PATH, GOOGLE_CALLBACK_PATH].includes(url.pathname)) return false

    let config
    try {
      config = getGoogleConfig(env)
    } catch (error) {
      logger.error?.('Google OAuth configuration is invalid:', error.message)
      const origin = (() => { try { return getSiteOrigin({ ...env, PUBLIC_SITE_URL: env.PUBLIC_SITE_URL || DEFAULT_SITE_ORIGIN }) } catch { return DEFAULT_SITE_ORIGIN } })()
      const returnTo = safeGoogleReturnTo(url.searchParams.get('return_to'))
      redirect(res, authPageUrl(origin, returnTo, 'google_error', 'configuration'))
      return true
    }

    if (url.pathname === GOOGLE_START_PATH) {
      const returnTo = safeGoogleReturnTo(url.searchParams.get('return_to'))
      if (!config.clientId || !config.clientSecret) {
        redirect(res, authPageUrl(config.siteOrigin, returnTo, 'google_error', 'not_configured'))
        return true
      }

      const state = crypto.randomBytes(32).toString('base64url')
      const nonce = crypto.randomBytes(32).toString('base64url')
      const codeVerifier = crypto.randomBytes(48).toString('base64url')
      const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
      const oauth = new OAuth2ClientClass(config.clientId, config.clientSecret, config.redirectUri)
      const authorizationUrl = oauth.generateAuthUrl({
        access_type: 'online',
        scope: ['openid', 'email', 'profile'],
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        prompt: 'select_account',
      })
      const returnCookie = Buffer.from(returnTo).toString('base64url')
      redirect(res, authorizationUrl, [
        setOAuthCookie(STATE_COOKIE, state),
        setOAuthCookie(NONCE_COOKIE, nonce),
        setOAuthCookie(VERIFIER_COOKIE, codeVerifier),
        setOAuthCookie(RETURN_TO_COOKIE, returnCookie),
      ])
      return true
    }

    const clearCookies = clearOAuthCookies()
    const returnTo = decodeReturnTo(cookieValue(req, RETURN_TO_COOKIE))
    const state = url.searchParams.get('state')
    if (!sameSecret(state, cookieValue(req, STATE_COOKIE))) {
      redirect(res, authPageUrl(config.siteOrigin, returnTo, 'google_error', 'failed'), clearCookies)
      return true
    }
    if (url.searchParams.get('error')) {
      const error = url.searchParams.get('error') === 'access_denied' ? 'cancelled' : 'failed'
      redirect(res, authPageUrl(config.siteOrigin, returnTo, 'google_error', error), clearCookies)
      return true
    }

    const code = url.searchParams.get('code')
    const nonce = cookieValue(req, NONCE_COOKIE)
    const codeVerifier = cookieValue(req, VERIFIER_COOKIE)
    if (!code || !nonce || !codeVerifier || !config.clientId || !config.clientSecret) {
      redirect(res, authPageUrl(config.siteOrigin, returnTo, 'google_error', 'failed'), clearCookies)
      return true
    }

    try {
      const oauth = new OAuth2ClientClass(config.clientId, config.clientSecret, config.redirectUri)
      const { tokens } = await oauth.getToken({ code, codeVerifier })
      if (!tokens?.id_token) throw new Error('Google did not return an ID token')
      const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId })
      const claims = ticket.getPayload()
      const email = String(claims?.email || '').trim().toLowerCase()
      const displayName = String(claims?.name || '').trim().slice(0, 200)
      if (!claims?.sub || !email || email.length > 320 || claims.email_verified !== true || claims.nonce !== nonce) {
        throw new Error('Google identity token claims are incomplete or invalid')
      }

      const user = await getOrCreateVerifiedUser({ pool, email, displayName, hashPassword })
      if (!user) {
        redirect(res, authPageUrl(config.siteOrigin, returnTo, 'google_error', 'account_unavailable'), clearCookies)
        return true
      }
      const token = await createSession(req, user.id)
      redirect(res, authPageUrl(config.siteOrigin, returnTo, 'google_login', 'success'), [sessionCookie(token), ...clearCookies])
      return true
    } catch (error) {
      logger.error?.('Google OAuth sign-in failed:', error.message)
      redirect(res, authPageUrl(config.siteOrigin, returnTo, 'google_error', 'failed'), clearCookies)
      return true
    }
  }
}
