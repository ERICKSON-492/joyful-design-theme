# Neon migration roadmap

API server: https://joyful-design-theme.onrender.com (Node, `server/index.mjs`, Neon Postgres)

## Done
- [x] Site now calls the Render API by absolute address (`src/lib/apiBase.ts`), so products, variants, sign-in, admin products and order creation reach Neon from any origin.
- [x] Cross-origin support on the API: CORS allow-list + `SameSite=None; Secure` session cookie so login persists.
- [x] Neon schema for products, variants, orders, and email/password auth (`server/neon-schema.sql`, `server/auth-schema.sql`).

## Still on the old (blocked) Supabase project
The `.env` points at project `qokwavhqqqzjbmyshhfo`, which is suspended for
exceeding its cached-egress quota. Every feature below still reads/writes
there and is therefore broken in production:

- [ ] Categories & subcategories, site content, hero slides, chronicle posts
- [ ] Orders history / My Orders, admin orders, inventory & stock adjustments
- [ ] Reviews, tribe looks, enquiry chat, newsletter, coupons, shipping methods, Nairobi areas
- [ ] Image/file storage buckets (product images, review photos, order receipts)
- [ ] Edge functions: M-Pesa STK push + callback, transactional email queue, newsletter digest
- [ ] Google sign-in (was Supabase OAuth; no equivalent on the Neon API yet)

## Decisions needed from the owner
- [ ] Move the remaining tables + storage + background jobs onto Neon/Render, or point the client at the working Lovable Cloud backend for them?
- [ ] Where should uploaded images live once Supabase storage is dropped?
- [ ] Keep Google sign-in? It needs an OAuth flow built into the Render API.
