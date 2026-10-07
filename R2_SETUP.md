# Cloudflare R2 storage for Ushanga Chronicles

The `ushanga` R2 bucket contains the migrated Supabase Storage objects. Object keys retain their original bucket as the first path segment, for example `product-images/products/example.webp` and `order-receipts/<order-id>/receipt.pdf`.

The app uses the Render API to issue short-lived presigned upload URLs. Browser clients upload directly to R2; the R2 secret is never exposed to the browser. Legacy public Supabase Storage URLs for allowed media buckets are translated to the matching R2 object key by the app. By default, public media is served through the API's read-only `/api/storage/public/` proxy, so a public R2 domain is not required.

Two image URLs found in repository seed data were not present in the source bucket listing and are deliberately left pointing at their original Supabase URLs to avoid broken images: `product-images/categories/wear-it-1781032558106.jpg` and `product-images/hero/1780565881534.jpg`. Remove the corresponding exceptions in `src/lib/r2ObjectUrl.ts` once those objects are copied or the references are retired.

For faster catalog delivery, the 53 legacy product images above 750 KB have WebP copies under `public/media/product-images/`. `server/optimized-product-images.json` maps their original R2-backed URLs to those static CDN paths; startup updates matching primary and gallery references only. The original objects remain untouched in R2, and future eligible uploads are compressed by the shared upload helper.

## 1. Configure the Render API environment

Set these server-only variables on the Node API service:

```env
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=ushanga
```

The R2 API token needs **Object Read & Write** access to the `ushanga` bucket. Keep the access key and secret only in server-side environment variables (for example, Render); do not add them to the frontend `.env` or a `VITE_` variable.

The API exposes:

- `POST /api/storage/upload-url` — authenticated users receive a URL valid for 10 minutes.
- `GET /api/storage/public/<key>` — serves only allowlisted public-media prefixes from R2; `order-receipts` is explicitly excluded.
- `POST /api/storage/delete` — authenticated users can delete objects they are authorized to manage.
- `POST /api/storage/receipt-upload-url` — an order owner or admin receives a private upload URL and a seven-day signed download URL for that order's PDF receipt.

Administrative folders (`product-images`, `site-images`, `custom-orders`, and `tribe-looks`) require a Neon user with the `admin` role. Review photos require a signed-in user. Receipts are restricted to the order owner or an admin.

## 2. Public image delivery and receipt privacy

With no additional frontend setting, the app uses the API proxy for public media. This works with a private R2 bucket and prevents the `order-receipts/` objects from being served by that public-media route.

**Do not enable public access on the `ushanga` bucket or point a public R2 domain at it while it contains `order-receipts/` objects.** R2 public access applies to the bucket, not just the image prefixes, and could expose receipts. If you later want CDN delivery via a custom domain, first move receipts into a separate private R2 bucket (and configure that bucket for the private receipt API), or put an access-controlled Worker in front of the mixed bucket.

If you have completed that separation and want direct CDN image URLs, set this non-secret build-time variable on the frontend and rebuild:

```env
VITE_R2_PUBLIC_BASE_URL=https://media.example.com
```

The custom domain must serve the `ushanga` bucket and preserve the full key path. Leave the variable unset for the safe API-proxy default.

## 3. Configure R2 CORS for browser uploads

The bucket must allow the Cloudflare Pages origin to send the signed `PUT` request. Add a CORS rule similar to this in R2 bucket settings, replacing the origins with the real production and preview domains:

```json
[
  {
    "AllowedOrigins": [
      "https://ushangachronicles.pages.dev",
      "https://www.ushangachronicles.com",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

If Cloudflare Pages uses a different production hostname, add that exact origin. Do not use `*` for a production bucket.

## 4. Frontend upload pattern

Use `uploadToR2(folder, file, key)` from `src/lib/storage.ts`:

```ts
const { publicUrl } = await uploadToR2(
  'product-images',
  file,
  `products/${productId}/${crypto.randomUUID()}.webp`,
)
```

Store `publicUrl` in Neon. The browser first calls the API for a signed URL, then sends the file directly to R2. No R2 credential is bundled into the Vite frontend. For non-receipt media, uploads fall back to the legacy Supabase Storage bucket when the API/signing request has a network or server error (`5xx`), or the R2 upload request has a network or server error (`5xx`). The fallback URL is tagged so the app will not redirect it to a missing R2 key. Client errors (`4xx`) remain visible rather than silently falling back. Private receipt uploads never fall back to Supabase.

## 5. Verification checklist

1. Set the four Render variables above and redeploy the API.
2. Confirm `GET /api/health` returns `200`.
3. Open a migrated `product-images/...` URL in the app; with the default configuration it should resolve through `/api/storage/public/`.
4. Sign in through the site and upload an admin image. Confirm the browser sends `PUT` directly to the R2 signed URL and receives `200`.
5. Confirm the returned image URL renders.
6. Confirm unauthenticated requests to `/api/storage/upload-url` return `403`, non-admin users cannot request administrative folders, and `/api/storage/public/order-receipts/...` does not return a receipt.
7. All frontend Supabase Storage upload callers should use `uploadToR2`. Supabase database/function calls are separate and are not removed by this storage migration.
