# Ushanga Books — Implementation Plan

## Product

Ushanga Books is a separate admin bookkeeping and record-keeping app for Ushanga Chronicles. It connects to the main store through an import/sync boundary for products, orders, customers, and payment status, while owning business records for expenses, materials, supplier prices, material usage, inventory, production cost, and profitability.

## Required behavior

- Secure admin authentication with role-based access for authorized staff.
- Dashboard with revenue, expenses, material costs, inventory value, gross profit, and net profit.
- Date-filtered records and CSV-ready tables.
- Materials catalogue recording material name, unit, supplier, purchase price, and price history.
- Material usage records linked to products or custom orders, with material quantity, unit cost, and calculated cost.
- Finished-product and raw-material inventory, stock movements, low-stock visibility, and stock value.
- Expense tracking for suppliers, shipping, packaging, marketing, wages, and other business costs.
- Store connection status and sync log, with a clear handoff for the existing Ushanga store to send/import order and product records.
- Separate navigation sections: Overview, Materials, Inventory, Expenses, Sales & orders, Reports, and Store connection.

## Implementation approach

Use the initialized React/Express/tRPC/Drizzle web-db-user project. The managed MySQL database is the source of truth for this app. Backend procedures use `adminProcedure` so all mutations and sensitive reads require an authenticated admin. Add additive Drizzle tables for materials, material price history, material usage, expenses, inventory items, stock movements, store orders, store products, custom orders, and sync events. Keep the store integration adapter explicit: imported store data is validated and upserted by a signed HTTP sync route, with an installable Supabase storefront adapter documented under `docs/`, so the app never pretends to be connected when no store payload has arrived.

The first usable build includes a polished dashboard and form-ready tables backed by the API. When the database has no business records yet, the UI uses clearly marked starter records for preview only; persisted records are labeled as synced or manually entered. Do not silently turn starter records into real books.

## Project structure

- `client/src/App.tsx`: routes, protected admin shell, and route fallback.
- `client/src/pages/Home.tsx`: overview dashboard.
- `client/src/pages/Materials.tsx`: materials, supplier pricing, price history, and usage.
- `client/src/pages/Inventory.tsx`: raw materials, finished goods, stock movements, and low-stock rows.
- `client/src/pages/Expenses.tsx`: business expense ledger and add-expense form.
- `client/src/pages/Reports.tsx`: date-filtered revenue/cost/profit reporting.
- `client/src/pages/Connection.tsx`: store connection status, sync log, and import contract.
- `client/src/components/AppShell.tsx`: sidebar, top bar, workspace context, and reusable metric cards.
- `client/src/index.css`: premium warm admin visual system.
- `drizzle/schema.ts`: database tables and types.
- `server/db.ts`: typed data access and summary queries.
- `server/routers.ts`: protected admin procedures for dashboard, materials, expenses, inventory, reports, and store sync.
- `public/manus-routes.json`: complete client route manifest.

## Design direction

### Three styles considered

1. **Ledger Atelier** — 0.06 probability: quiet finance UI with warm paper, ink, and brass details.
2. **Modern Operations Console** — 0.05 probability: crisp SaaS cards with restrained African craft cues.
3. **Dark Finance Terminal** — 0.04 probability: dense charcoal panels and neon status colors.

Chosen: **Ledger Atelier**.

### Design movement

A premium Nairobi atelier back office: part hand-bound ledger, part precise operations desk. The visual language uses paper warmth, brass accents, deep umber ink, and thin ruled lines rather than generic blue SaaS chrome.

### Core principles

- Financial information should feel calm, legible, and trustworthy.
- Craft economics should remain visible: a product's material story is a first-class record.
- High-value numbers get breathing room; dense tables use alignment and subtle rules instead of heavy borders.
- Every imported store record shows provenance and sync state.

### Color philosophy

Use parchment `#F7F2E9` as the workspace canvas, warm white cards, deep coffee `#30231D` for primary text, brass `#C89B2C` for actions and highlights, terracotta `#A86143` for cost pressure, and muted sage `#5C7867` for healthy stock/profit signals. The palette connects the admin app to Ushanga Chronicles without copying the storefront hero.

### Layout paradigm

Use a persistent left rail with a ledger-style workspace: a narrow context column for date range and connection state, then a broad report canvas with offset metric cards, chart strip, and operational tables. On small screens the rail collapses into a top bar and the main content becomes a single reading column.

### Signature elements

- A small brass “ledger mark” beside the Ushanga Books wordmark.
- Thin ruled separators and stamped status chips such as `SYNCED`, `MANUAL`, and `LOW STOCK`.
- Material cost rows that show quantity × unit price = extended cost.

### Interaction philosophy

Actions should be explicit and reversible: add expense, record material purchase, adjust stock, or review sync data. Forms use plain language and show the financial consequence before saving.

### Animation

Use short 160–220 ms fades and 2–4 px lift on hover for cards. Charts should reveal once, not continuously animate. Avoid decorative motion in financial tables.

### Typography system

Use a serif display face for page titles and a neutral sans for controls and numbers. Use generous numeric tracking, tabular figures, and uppercase micro-labels for status chips. Maintain strong contrast for currency and cost values.

### Brand essence

**Ushanga Books — know what every piece costs, earns, and carries forward.** Practical, rooted, exact.

### Brand voice

Headlines are calm and direct: “Know the cost behind every story.” CTAs are operational: “Record purchase” and “Review sync.” Avoid accounting jargon where a plain phrase works.

### Wordmark & logo

Use the text mark “USHANGA BOOKS” with a small brass ledger line and a single bead-shaped dot; keep it typographic and compact for an admin tool.

### Signature brand color

Brass `#C89B2C`, used sparingly for primary actions, section rules, and financial emphasis.
