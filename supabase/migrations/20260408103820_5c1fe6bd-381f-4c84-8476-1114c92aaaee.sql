
-- Hero slides table for admin-managed hero carousel
CREATE TABLE public.hero_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT NOT NULL DEFAULT '',
  cta_text TEXT NOT NULL DEFAULT 'Shop Now',
  cta_link TEXT NOT NULL DEFAULT '/shop',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active hero slides"
ON public.hero_slides FOR SELECT
USING (is_active = true);

CREATE POLICY "Authenticated users can manage hero slides"
ON public.hero_slides FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Admin users table to restrict admin access
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin_users"
ON public.admin_users FOR SELECT
TO authenticated
USING (true);

-- Security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = _user_id
  )
$$;

-- Cart items table
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  session_id TEXT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage cart items by session"
ON public.cart_items FOR ALL
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read newsletter, contacts, custom_orders for admin dashboard
CREATE POLICY "Authenticated users can read newsletter subscribers"
ON public.newsletter_subscribers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read contact messages"
ON public.contact_messages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read custom orders"
ON public.custom_orders FOR SELECT
TO authenticated
USING (true);
