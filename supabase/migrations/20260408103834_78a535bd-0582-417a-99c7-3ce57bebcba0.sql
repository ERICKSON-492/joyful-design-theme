
-- Tighten hero_slides: only admins can insert/update/delete
DROP POLICY IF EXISTS "Authenticated users can manage hero slides" ON public.hero_slides;

CREATE POLICY "Admins can insert hero slides"
ON public.hero_slides FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update hero slides"
ON public.hero_slides FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete hero slides"
ON public.hero_slides FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Tighten products: only admins can insert/update/delete
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

CREATE POLICY "Admins can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update products"
ON public.products FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Tighten enquiry read/update to admins
DROP POLICY IF EXISTS "Authenticated users can read enquiries" ON public.enquiry_messages;
DROP POLICY IF EXISTS "Authenticated users can update enquiries" ON public.enquiry_messages;

CREATE POLICY "Admins can read enquiries"
ON public.enquiry_messages FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update enquiries"
ON public.enquiry_messages FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));
