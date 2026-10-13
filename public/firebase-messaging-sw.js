/* Firebase web-push service worker. Replace the placeholder values with the Firebase web app config. */
importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js')

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()))
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

firebase.initializeApp({
  apiKey: '__VITE_FIREBASE_API_KEY__',
  authDomain: '__VITE_FIREBASE_AUTH_DOMAIN__',
  projectId: '__VITE_FIREBASE_PROJECT_ID__',
  storageBucket: '__VITE_FIREBASE_STORAGE_BUCKET__',
  messagingSenderId: '__VITE_FIREBASE_MESSAGING_SENDER_ID__',
  appId: '__VITE_FIREBASE_APP_ID__',
})

const messaging = firebase.messaging()
messaging.onBackgroundMessage(payload => {
  const notification = payload.notification || {}
  const title = notification.title || payload.data?.title || 'Ushanga Chronicles'
  const options = {
    body: notification.body || payload.data?.body || 'A new handcrafted piece is available.',
    icon: '/favicon.png',
    badge: '/favicon.png',
    data: { url: payload.data?.url || '/shop' },
  }
  self.registration.showNotification(title, options)
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/shop', self.location.origin).href
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(existing => {
    const open = existing.find(client => client.url.startsWith(self.location.origin))
    if (open) return open.focus().then(() => open.navigate(target))
    return clients.openWindow(target)
  }))
})
