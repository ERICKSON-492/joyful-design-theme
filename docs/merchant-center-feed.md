# Google Merchant Center feed

The API serves the current active product catalog as a UTF-8, tab-delimited product file at:

`https://joyful-design-theme.onrender.com/feeds/google-merchant-center.tsv`

The previous path remains available for compatibility at `/api/merchant-feed.tsv`. In Merchant Center, configure the source as a scheduled fetch and use the full stable URL above. The response is `text/tab-separated-values` and is cached for five minutes. The feed is generated from current database values at request time; it is not a static build artifact.

The feed emits Google attribute columns for product ID, title, description, canonical product URL, primary image, availability, availability date, condition, price, sale price, brand, and product type. Product URLs use the site's canonical trailing-slash `/products/{slug}/` format. Legacy Supabase public-storage image links are rewritten through the site's public media proxy.

Prices are formatted in KES. Select Kenya as the source's target country unless valid localized prices and delivery coverage have been configured for additional countries; the feed itself does not set country targeting or Merchant Center shipping policies.

## Preorder availability dates

`products.preorder_available_date` is a nullable SQL `date` field. The admin product form requires this date when a product is marked preorder. The product page displays the expected ship date, and the feed emits `availability=preorder` plus `availability_date` in ISO 8601 form with East Africa Time (`+0300`). The API refuses to produce a feed if an active preorder product lacks a date, rather than silently serving an invalid preorder row.

On first startup after deploying this change, the idempotent migration backfills only the **27 existing active preorder product IDs** confirmed by the owner, using **1 December 2026**. A migration ledger ensures this backfill runs once only. New preorder products must receive their own date through the admin form.

## Deploy and verify

Deploy the API service so its startup bootstrap applies the schema migration, then deploy the website frontend so the admin and product-page date UI is available. Check the API logs for successful schema bootstrap. Verify the feed URL returns HTTP 200 and tab-delimited rows, then trigger a fetch in Merchant Center and review the processed-item diagnostics. Google still requires shipping and target-country settings to be configured in Merchant Center.
