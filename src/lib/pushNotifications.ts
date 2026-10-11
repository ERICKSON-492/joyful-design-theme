import { getApp, getApps, initializeApp } from 'firebase/app'
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging'
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
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  const token = await getToken(client, { vapidKey, serviceWorkerRegistration: registration })
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
