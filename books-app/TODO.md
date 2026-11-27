# Ushanga Books — Outcome TODO

## Separate secured admin app is usable
- Ushanga Books is a separate web app from the public Ushanga Chronicles storefront.
- The app has a branded admin shell with Overview, Materials, Inventory, Expenses, Sales & orders, Reports, and Store connection sections.
- Sensitive data access and all write actions require an authenticated admin role.

## Dashboard reports business position
- The dashboard shows revenue, expenses, material costs, inventory value, gross profit, and net profit.
- The dashboard supports a date range filter and displays whether values are live storefront records or manually entered Books records.
- The dashboard includes low-stock visibility and recent operational activity.

## Materials and supplier pricing are recorded
- The materials catalogue records material name, unit, supplier, purchase price, reorder level, and active status.
- Each material shows its current unit price and a price-history view with effective date and supplier.
- A material usage record can link a material to a product or custom order with quantity, unit cost, and calculated extended cost.
- Materials used and their prices are visible in the cost breakdown used by reports.

## Inventory and cost of goods are tracked
- Raw materials and finished products have stock quantity, unit, reorder level, unit cost, and stock value.
- Stock movements support purchase, usage, adjustment, sale, and return reasons.
- Low-stock items are clearly marked and inventory value is calculated from quantity and unit cost.

## Expenses and sales records are tracked
- Expenses support supplier, shipping, packaging, marketing, wages, and other categories, with date, description, amount, and payment status.
- Store products and orders can be represented as synced records with external IDs, totals, payment state, and sync timestamp.
- Reports can separate sales, expenses, material cost, and estimated production cost.

## Store connection is explicit
- The Connection section shows integration status, last sync timestamp, record counts, and sync events.
- The app reads live products, orders, and custom orders directly from the Ushanga Chronicles Supabase database using server-only credentials.
- The app also exposes a documented, authenticated sync boundary for optional storefront snapshot workers.
- The UI distinguishes direct live Supabase data from optional signed snapshot history.

## Private live product catalogue
- The catalogue is available at a protected admin route and requires an authenticated admin role.
- The catalogue reads all storefront products, images, descriptions, categories, prices, sale prices, stock, and active state directly from Supabase.
- The catalogue refreshes on entry, window focus, manual refresh, and a one-minute interval so newly uploaded storefront products appear without mock records.
- The catalogue has no download or print controls, includes an admin watermark, and is not advertised on the public storefront; browser links can still be forwarded or captured, so access control is enforced by admin authentication rather than an impossible anti-sharing guarantee.
- An admin can copy a token-protected customer link that opens a standalone read-only catalogue viewer without exposing the admin navigation or controls.
- A valid customer link reads the same live product catalogue, while invalid links are rejected and the link can be revoked by rotating the server-side share secret.

## Exportable records and maintainable code
- Ledger-style tables have clear filters and export-ready data presentation.
- The project includes a synchronized route manifest, typed database schema, typed tRPC procedures, and no unresolved TypeScript diagnostics.
- The app builds successfully with the pinned project toolchain.
