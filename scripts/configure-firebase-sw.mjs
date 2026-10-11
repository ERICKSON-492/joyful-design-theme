import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const file = path.join(root, 'public', 'firebase-messaging-sw.js')
let source = fs.readFileSync(file, 'utf8')
const values = {
  VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || '__VITE_FIREBASE_API_KEY__',
  VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || '__VITE_FIREBASE_AUTH_DOMAIN__',
  VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || '__VITE_FIREBASE_PROJECT_ID__',
  VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || '__VITE_FIREBASE_STORAGE_BUCKET__',
  VITE_FIREBASE_MESSAGING_SENDER_ID: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '__VITE_FIREBASE_MESSAGING_SENDER_ID__',
  VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || '__VITE_FIREBASE_APP_ID__',
}
for (const [name, value] of Object.entries(values)) source = source.replaceAll(`__${name}__`, String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'"))
fs.writeFileSync(file, source)
console.log(`[firebase] service worker configured: ${values.VITE_FIREBASE_PROJECT_ID.startsWith('__') ? 'placeholders retained' : values.VITE_FIREBASE_PROJECT_ID}`)
