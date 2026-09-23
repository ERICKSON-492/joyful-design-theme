# Neon migration roadmap

API server: https://joyful-design-theme.onrender.com (Node, `server/index.mjs`, Neon Postgres)

## Done
- [x] Site calls the Render API by absolute address (`src/lib/apiBase.ts`) for products, variants, sign-in, admin products and orders.
- [x] Cross-origin support: CORS allow-list + `SameSite=None; Secure` session cookie so login persists.
- [x] Full Neon schema: catalog, orders, auth, plus categories, subcategories, site content, hero slides, chronicle, shipping, Nairobi areas, coupons, payments, reviews, tribe looks, chat, custom orders, profiles, inventory, newsletter and email tables (`server/neon-schema.sql`, `auth-schema.sql`, `neon-migration-schema.sql`).
- [x] Exported all data from the old backend into `server/neon-seed.sql` (147 statements).
- [x] Generic data routes (`/api/db/:table`), file storage (`/api/files/...`), signed links, live-chat polling (`/api/realtime/...`).
- [x] Background jobs wired in: order emails + outbox drain, newsletter digest, unsubscribe, M-Pesa STK push and callback, coupon validate/redeem (`/api/functions/:name`, `/api/rpc/:name`, `/api/mpesa/callback`).
- [x] Every page in the app now talks to the new server (`src/lib/dbClient.ts`); no page imports the old client any more.
- [x] Live chat read/typing indicators work over the new server (table polling replaces realtime).
- [x] Sign-up and sign-in redirect immediately to the requested page; Cloudflare Pages uses its same-origin API proxy so session cookies persist reliably.

## Blocked on a Render deploy
The live server is running older code with empty tables, so these only work after
a redeploy of the `main` branch on Render (start-up automatically creates the
tables and loads the exported data):
- [ ] Categories, site content, hero slides, chronicle, shipping, coupons, delivery areas
- [ ] Orders history, admin orders, inventory, reviews, tribe looks, chat, newsletter
- [ ] Order emails, newsletter digest, M-Pesa payments

Render environment variables to set: `NEON_DATABASE_URL`, `RESEND_API_KEY`,
`MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`,
`MPESA_PASSKEY`, `MPESA_CALLBACK_URL`, `FILE_SIGNING_SECRET`.

## Still open
- [ ] Existing product photos, review photos and receipts still sit in the old backend's storage; new uploads go to the new server. They need a one-time copy across.
- [ ] Google sign-in: needs an OAuth flow built into the Render API. Email and password work today.
