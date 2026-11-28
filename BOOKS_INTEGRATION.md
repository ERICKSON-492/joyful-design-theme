# Ushanga Books integration

Ushanga Books is kept as a companion application in [`books-app/`](books-app/). The app is served to customers and administrators at:

- `https://ushangachronicles.com/books`
- `https://ushangachronicles.com/books/catalogue/view?token=...`

The root Netlify configuration rewrites `/books` and `/books/*` to the published Books service while preserving the browser URL on `ushangachronicles.com`. The Books app is path-aware: its browser routes, static assets, tRPC API, OAuth callback, signed store-sync endpoint, and customer catalogue links use the `/books` prefix.

## Source and deployment

The Books source can be checked independently from this repository:

```bash
cd books-app
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

The live companion service uses the same source and must retain its server-only configuration. Do not commit secret values. Required runtime values include the Books database connection, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `STORE_SYNC_SECRET`.

The storefront remains the source of truth for products, orders, and customer-facing pages. Books reads live storefront records server-side and provides the protected bookkeeping and catalogue views.

## Authentication

When opened under `ushangachronicles.com/books`, Books uses the normal Ushanga Chronicles Supabase login. The storefront portal sends the current Supabase access token to the Books iframe over a fixed-origin `postMessage` handshake; Books validates that token server-side with the configured Supabase credentials and applies the same admin role metadata used by the storefront. Embedded login and logout requests return to the storefront session. Direct access to the published Books service retains its existing Manus OAuth fallback.
