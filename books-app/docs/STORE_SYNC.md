# Ushanga Chronicles → Ushanga Books connection

Ushanga Books reads the Ushanga Chronicles Supabase database directly for live products, orders, and custom orders. The public store remains the source of truth for those records, while Books owns materials, supplier prices, usage, expenses, production cost, and profitability. A signed snapshot endpoint is retained as an optional repair or scheduled-worker bridge.

## Books environment

The Books project keeps these values as server-only secrets:

```text
SUPABASE_URL=<the storefront Supabase URL>
SUPABASE_SERVICE_ROLE_KEY=<the storefront server-only service-role key>
STORE_SYNC_SECRET=<optional signed snapshot credential>
```

Books reads the `products`, `orders`, and `custom_orders` tables through the Supabase REST API. The service-role key is never sent to browser code.

## Optional store bridge environment

Add these server-only environment values to the Ushanga Chronicles runtime:

```text
USHANGA_BOOKS_SYNC_URL=<the deployed Ushanga Books origin>
STORE_SYNC_SECRET=<the same protected value configured in Ushanga Books>
SUPABASE_URL=<existing Supabase URL>
SUPABASE_SERVICE_ROLE_KEY=<existing server-only Supabase service role key>
```

Never expose `STORE_SYNC_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` in browser code. The ready-to-copy adapter is [`ushanga-store-sync.mjs`](./ushanga-store-sync.mjs). It uses the existing Supabase tables and is safe to run from a server route, a scheduled worker, or a protected admin action.

## Mapped storefront records

- `products.id` → Books `storeProducts.externalId`; name, category, subcategory, live sale price, active state, and stock are preserved.
- `orders.id` → Books `storeOrders.externalId`; customer name, email, phone, order total, shipping cost, payment/order status, item payload, and created time are preserved. The current storefront schema has no per-order currency column, so imported orders default to `KES`.
- `custom_orders.id` → Books `customOrders.externalId`; request category, vision, colors, requested materials, customer details, delivery location, status, and created time are preserved.

The import is idempotent: repeated snapshots update the same external IDs rather than creating duplicate product, order, or custom-order rows. Each received snapshot creates a traceable sync event in Books.

## First activation

1. Add the server-only environment values above to the existing storefront.
2. Copy `docs/ushanga-store-sync.mjs` into the storefront server or scheduled-job directory.
3. Invoke `pushUshangaBooksSnapshot()` after a product/order/custom-order write, or run it on a short scheduled interval. A full snapshot is recommended because it repairs missed events.
4. Confirm the Books **Store connection** screen shows a successful sync event and non-zero record counts. Direct Supabase counts are shown separately from bridge history.
5. Keep storefront records in Supabase; record materials, supplier prices, usage, expenses, and production costs in Books.

If the storefront is not available for source edits in the current workspace, this document and the adapter are the complete handoff needed to activate the bridge in that store repository.
