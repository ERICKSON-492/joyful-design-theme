CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text,
  price numeric NOT NULL DEFAULT 0, category text NOT NULL DEFAULT '', image_url text,
  stock integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  price_min numeric, price_max numeric, is_preorder boolean NOT NULL DEFAULT false,
  preorder_label text, image_urls text[] NOT NULL DEFAULT '{}', subcategory text,
  low_stock_threshold integer NOT NULL DEFAULT 5, sale_price numeric
);
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_label text NOT NULL, size text, color text, price numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.admin_users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid UNIQUE NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.joyful_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), phone text NOT NULL, customer_name text,
  total_amount numeric NOT NULL, status text NOT NULL DEFAULT 'pending', items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), user_id uuid,
  shipping_address jsonb, email text, shipping_method text, shipping_cost numeric NOT NULL DEFAULT 0,
  latitude double precision, longitude double precision, stock_decremented boolean NOT NULL DEFAULT false,
  mpesa_checkout_request_id text, mpesa_receipt_number text, tracking_number text
);
CREATE INDEX IF NOT EXISTS joyful_orders_created_idx ON public.joyful_orders (created_at DESC);
CREATE INDEX IF NOT EXISTS products_active_created_idx ON public.products (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS variants_product_active_idx ON public.product_variants (product_id, is_active);
