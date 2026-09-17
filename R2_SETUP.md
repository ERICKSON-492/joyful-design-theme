# Cloudflare R2 setup for Ushanga Chronicles

The application now uses the Render API to issue short-lived presigned upload URLs. Browser clients upload directly to Cloudflare R2; the R2 secret is never exposed to the browser.

## 1. Create the bucket and public hostname

In Cloudflare Dashboard, open **R2 Object Storage**, create a bucket such as `ushanga-media`, and connect a custom domain such as `media.ushangachronicles.com`. Set `R2_PUBLIC_BASE_URL` to that HTTPS hostname. Do not use the S3 API endpoint as the public image URL.

Create an R2 API token with **Object Read & Write** access limited to this bucket. Keep the access key and secret only in Render environment variables.

## 2. Render environment variables

Add these variables to the Node API service:

```env
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=ushanga-media
R2_PUBLIC_BASE_URL=https://media.ushangachronicles.com
```

The API exposes:

- `POST /api/storage/upload-url` — authenticated users receive a URL valid for 10 minutes.
- `POST /api/storage/delete` — authenticated users can delete objects they are authorized to manage.

Administrative folders (`product-images`, `site-images`, `custom-orders`, `tribe-looks`, and `order-receipts`) require a Neon user with the `admin` role. Review photos require a signed-in user.

## 3. Configure R2 CORS

The bucket must allow the Cloudflare Pages origin to send the signed `PUT` request. Add a CORS rule similar to this in the R2 bucket settings, replacing the origins with the real production and preview domains:

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

Store `publicUrl` in Neon. The browser first calls Render for a signed URL, then sends the file directly to R2. No R2 credential is bundled into the Vite frontend.

## 5. Remaining replacements

The same helper should replace the remaining Supabase Storage calls in:

- `TribeLooksPage.tsx` and `AdminTribeLooks.tsx`
- `AdminContent.tsx`
- `CustomOrderPage.tsx`
- `src/lib/orderReceipt.ts` (use a private bucket or a signed-download API instead of a public URL)

For private order receipts, do not store a public URL. Add a Render endpoint that checks the order owner/admin role and returns a short-lived signed `GET` URL.

## 6. Verification checklist

1. Set the five Render variables and redeploy the API.
2. Confirm `GET /api/health` returns `200`.
3. Sign in through the site and upload an admin image.
4. Confirm the browser sends `PUT` directly to the R2 custom domain/API URL and receives `200`.
5. Confirm the returned `publicUrl` renders in a new browser tab.
6. Confirm unauthenticated requests to `/api/storage/upload-url` return `403` and that a non-admin cannot request an administrative folder.
7. After all callers are migrated, remove the Supabase Storage calls and then remove the Supabase client dependency.
