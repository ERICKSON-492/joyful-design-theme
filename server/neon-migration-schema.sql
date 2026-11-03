-- Remaining Ushanga Chronicles tables, moved from Supabase to Neon.
-- Apply after server/neon-schema.sql and server/auth-schema.sql.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Existing Neon databases may have been created before scheduled sale fields
-- were introduced. Keep this repair in the migration file because CREATE TABLE
-- IF NOT EXISTS does not alter an already-existing products table.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_price numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_starts_at timestamptz;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_ends_at timestamptz;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS preorder_available_date date;

-- The owner confirmed these existing active preorder products are expected to
-- be available for shipment by 1 December 2026. Record the backfill once only;
-- future preorder products must get their own date through the admin form.
CREATE TABLE IF NOT EXISTS public.app_data_migrations (
  migration_key text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.app_data_migrations
    WHERE migration_key = '20261103_preorder_available_date_backfill'
  ) THEN
    UPDATE public.products
    SET preorder_available_date = DATE '2026-12-01'
    WHERE id IN (
      '221eeb78-b952-4cc9-ada9-a12fedab8150', 'cb89d0de-9766-48a4-90c4-98caf4ff877f',
      '1705c02a-c452-4a32-8bd6-fcffe7ff32fa', 'e6d0c83c-ec99-48e3-aa26-d7edafef0c1f',
      '7b7a8a87-15fa-4842-b0aa-3b1948221266', '2f28f88f-550f-4fb9-87c2-949e36fec79f',
      '7789a43b-48f1-47cb-9eff-18be212a7dcf', '5f53eb31-cd33-4503-956a-bc048fe41ee6',
      '26fc3698-f1cd-4775-af13-44b15153b67f', '78455ba6-5e76-4176-ae4a-15051150d3a6',
      'c957f34d-4a8e-4f97-afe2-03a6cfb12a98', '2e88ad42-91cf-4a50-bdec-fe57d481074a',
      '6aad57e7-66af-45b5-9cb1-fffcf44127af', 'abf3a288-faa4-4d41-8f3c-da91679a4c45',
      '9f1e914c-4856-4d97-901e-d6ce37d1d499', '6c90bd00-7d87-4962-ad21-6a265b0e3720',
      '5811861e-27b6-4ff5-84da-e06d7b5dcd80', 'e8b1b1cd-a95c-4cbc-8ffe-396725ffb2f9',
      '912fbeab-3f2d-4bfa-a150-0f97926eff28', '52757aa1-d511-461a-9733-3f00a2ad1035',
      'fe90a09b-3778-4769-a796-654c3bf4aed8', '6097aa18-6ac3-432f-8cc5-4657b1052566',
      'e82d848e-6025-4161-afab-debda70b3d73', 'fd654c3b-eebe-4ef0-984c-b9ad7ed8dda0',
      '80ac0d4a-93d5-49c3-9a10-585d0c2fbf3d', '01d5c802-76aa-42ae-a9ee-e5dd56522fc0',
      '05e9830d-3c02-405c-ada3-576afcfd660a'
    ) AND is_active = true AND is_preorder = true AND preorder_available_date IS NULL;

    INSERT INTO public.app_data_migrations (migration_key)
    VALUES ('20261103_preorder_available_date_backfill');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, slug text NOT NULL UNIQUE,
  display_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL, slug text NOT NULL,
  display_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.category_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL UNIQUE, image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE, title text NOT NULL, subtitle text,
  body text NOT NULL DEFAULT '', image_url text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL, title text NOT NULL DEFAULT '', subtitle text NOT NULL DEFAULT '',
  cta_text text NOT NULL DEFAULT '', cta_link text NOT NULL DEFAULT '/shop',
  display_order integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chronicle_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, slug text NOT NULL UNIQUE, excerpt text, content text,
  cover_image_url text, author text, is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shipping_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, type text NOT NULL DEFAULT 'local', provider text NOT NULL DEFAULT '',
  estimated_days text, price numeric NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true,
  regions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.nairobi_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE, doorstep_price numeric NOT NULL DEFAULT 0,
  super_metro_route text, super_metro_only boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 0, min_order_amount numeric,
  usage_limit integer, times_used integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true, expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, provider text NOT NULL, is_active boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, customer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text, comment text NOT NULL, photo_urls text[] NOT NULL DEFAULT '{}',
  is_verified_buyer boolean NOT NULL DEFAULT false, status text NOT NULL DEFAULT 'pending',
  admin_response text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_reviews ALTER COLUMN user_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.tribe_looks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, image_url text NOT NULL, name text NOT NULL,
  piece_name text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Curated featured looks may be created by the site owner rather than a customer.
ALTER TABLE public.tribe_looks ALTER COLUMN user_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.enquiry_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL, customer_name text NOT NULL,
  customer_email text, customer_phone text, message text NOT NULL,
  is_from_admin boolean NOT NULL DEFAULT false, is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS enquiry_conversation_idx ON public.enquiry_messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS public.custom_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL, vision text, colors text[] NOT NULL DEFAULT '{}', materials text,
  name text NOT NULL, phone text NOT NULL, email text, delivery_location text,
  reference_image_urls text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, email text, phone text, message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, display_name text, phone text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
-- Existing Neon databases may have an older profiles table without these columns.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

CREATE TABLE IF NOT EXISTS public.stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL, variant_id uuid, change integer NOT NULL,
  previous_stock integer NOT NULL, new_stock integer NOT NULL,
  reason text NOT NULL DEFAULT 'manual', notes text,
  adjusted_by uuid, adjusted_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.newsletter_digest_state (
  id integer PRIMARY KEY DEFAULT 1,
  last_sent_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text, template_name text NOT NULL DEFAULT '', recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'queued', error_message text, metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE, reason text NOT NULL DEFAULT 'unsubscribe', metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE, email text NOT NULL,
  used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);

-- Outbox for transactional email, drained by the API's email worker.
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id bigserial PRIMARY KEY,
  recipient_email text NOT NULL, subject text NOT NULL, html_body text NOT NULL,
  template_label text NOT NULL DEFAULT 'generic', attachments jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
  last_error text, sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_outbox_pending_idx ON public.email_outbox (status, created_at);

CREATE TABLE IF NOT EXISTS public.order_email_notifications (
  id bigserial PRIMARY KEY, order_id uuid NOT NULL, event_key text NOT NULL,
  recipient_email text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, event_key, recipient_email)
);

CREATE TABLE IF NOT EXISTS public.sale_email_notifications (
  id bigserial PRIMARY KEY, product_id uuid NOT NULL, event_key text NOT NULL,
  window_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, event_key, window_key)
);

-- File storage: replaces the Supabase storage buckets.
CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL, path text NOT NULL, mime text NOT NULL DEFAULT 'application/octet-stream',
  size integer NOT NULL DEFAULT 0, is_public boolean NOT NULL DEFAULT true,
  data bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, path)
);

-- Extra order columns the checkout writes.
ALTER TABLE public.joyful_orders ADD COLUMN IF NOT EXISTS shipping_area text;
ALTER TABLE public.joyful_orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.joyful_orders ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.joyful_orders ADD COLUMN IF NOT EXISTS receipt_url text;
ALTER TABLE public.joyful_orders ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Coupon redemption, previously the redeem_coupon RPC.
CREATE OR REPLACE FUNCTION public.redeem_coupon(p_coupon_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE public.coupons SET times_used = times_used + 1, updated_at = now() WHERE id = p_coupon_id;
$$;

-- First-party visitor analytics. No raw IP addresses are stored.
CREATE TABLE IF NOT EXISTS public.visitor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text NOT NULL UNIQUE,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  country text, region text, city text,
  landing_page text, referrer text, device_type text,
  utm_source text, utm_medium text, utm_campaign text
);
CREATE TABLE IF NOT EXISTS public.analytics_page_views (
  id bigserial PRIMARY KEY,
  session_key text NOT NULL,
  path text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds integer NOT NULL DEFAULT 0
);
ALTER TABLE public.analytics_page_views ADD COLUMN IF NOT EXISTS duration_seconds integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS visitor_sessions_first_seen_idx ON public.visitor_sessions (first_seen_at DESC);
CREATE INDEX IF NOT EXISTS visitor_sessions_country_idx ON public.visitor_sessions (country, first_seen_at DESC);
CREATE INDEX IF NOT EXISTS visitor_sessions_region_idx ON public.visitor_sessions (region, first_seen_at DESC);
CREATE INDEX IF NOT EXISTS analytics_page_views_viewed_at_idx ON public.analytics_page_views (viewed_at DESC);
CREATE INDEX IF NOT EXISTS analytics_page_views_session_idx ON public.analytics_page_views (session_key);

-- Idempotency guard for recurring analytics emails.
CREATE TABLE IF NOT EXISTS public.analytics_report_state (
  report_key text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent a product notification from being queued twice for the same recipient.
CREATE TABLE IF NOT EXISTS public.product_email_notifications (
  id bigserial PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, recipient_email)
);
CREATE INDEX IF NOT EXISTS product_email_notifications_product_idx ON public.product_email_notifications (product_id);

-- Opted-in Firebase browser tokens for instant web push alerts.
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id bigserial PRIMARY KEY,
  token text NOT NULL UNIQUE,
  user_id uuid REFERENCES public.auth_users(id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT true,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fcm_tokens_enabled_idx ON public.fcm_tokens (enabled, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.order_push_notifications (
  id bigserial PRIMARY KEY,
  order_id uuid NOT NULL,
  event_key text NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, event_key, user_id)
);

-- Prevent duplicate sale-start and sale-ending browser pushes for one sale window.
CREATE TABLE IF NOT EXISTS public.sale_push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  window_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, event_key, window_key)
);
