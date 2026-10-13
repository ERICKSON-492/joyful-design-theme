import { getApp, getApps, initializeApp } from 'firebase/app'
import { deleteToken, getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging'
import { apiUrl } from './apiBase'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
let messaging: Messaging | null = null

export function pushNotificationsConfigured() {
  return Boolean(config.apiKey && config.projectId && config.messagingSenderId && config.appId && vapidKey)
}

async function getMessagingClient() {
  if (!pushNotificationsConfigured() || !(await isSupported())) return null
  const app = getApps().length ? getApp() : initializeApp(config)
  messaging ||= getMessaging(app)
  return messaging
}

export async function enablePushNotifications() {
  const client = await getMessagingClient()
  if (!client || !('Notification' in window) || !('serviceWorker' in navigator)) throw new Error('Push notifications are not supported in this browser.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Browser notification permission was not granted.')
  let registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
  await registration.update().catch(() => {})
  // Registration can resolve while the worker is still installing. Use the
  // exact Firebase worker registration rather than an unrelated ready worker.
  if (!registration.active) {
    await new Promise<void>((resolve, reject) => {
      const worker = registration.installing || registration.waiting
      if (!worker) { reject(new Error('Firebase service worker did not activate.')); return }
      worker.addEventListener('statechange', () => {
        if (worker.state === 'activated') resolve()
        if (worker.state === 'redundant') reject(new Error('Firebase service worker became inactive.'))
      })
    })
  }
  let token: string
  try {
    token = await getToken(client, { vapidKey, serviceWorkerRegistration: registration })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : ''
    if (code !== 'messaging/token-subscribe-failed' && !message.toLowerCase().includes('push service error')) throw error
    // A token created with an older Firebase/VAPID configuration can make
    // Chrome reject the next subscription. Remove it and retry once.
    await deleteToken(client).catch(() => {})
    registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
    await registration.update().catch(() => {})
    token = await getToken(client, { vapidKey, serviceWorkerRegistration: registration })
  }
  if (!token) throw new Error('Firebase did not return a browser token.')
  const response = await fetch(apiUrl('/api/push/register'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Could not register this browser for alerts.')
  localStorage.setItem('ushanga_push_enabled', 'true')
  return token
}

export async function listenForForegroundPush(handler: (payload: { title?: string; body?: string; url?: string }) => void) {
  const client = await getMessagingClient()
  if (!client) return () => {}
  return onMessage(client, payload => handler({
    title: payload.notification?.title || String(payload.data?.title || ''),
    body: payload.notification?.body || String(payload.data?.body || ''),
    url: String(payload.data?.url || '/shop'),
  }))
}
