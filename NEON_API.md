# Joyful Neon API

The repository now includes a compatible Node API at `server/index.mjs`.

## Routes

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/product-variants`
- `GET /api/admin/products`
- `POST/PATCH/DELETE /api/admin/products/:id`
- `POST/PATCH/DELETE /api/admin/variants/:id`
- `POST /api/orders`

Public product and variant reads are routed through Neon by `src/lib/publicContent.ts`. `AdminProducts` uses the protected API for product and variant mutations. Checkout sends the cart to `POST /api/orders`; Neon re-reads product prices and stock, calculates subtotal/shipping/discount, decrements stock transactionally, and writes to `joyful_orders`.

## Runtime variables

```env
NEON_DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server-only-service-role-key
PORT=3001
```

The Supabase service-role key is currently used only to verify the existing Supabase Auth bearer token while authentication migration is still pending. It must be configured only on the server and never as a `VITE_` variable.

Apply `server/neon-schema.sql` to a new Neon project before starting the API. The current migration Neon database contains 90 products, 83 variants, 3 historical orders, and 2 admin identifiers.

## Local verification

```bash
npm run api
curl http://localhost:3001/api/health
npm run build
```

The existing Supabase Edge Functions remain responsible for M-Pesa STK push, payment callbacks, and transactional email until those functions are migrated separately.
