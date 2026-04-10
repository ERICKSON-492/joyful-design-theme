-- Create tribe_looks table for community look uploads
CREATE TABLE public.tribe_looks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  piece_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tribe_looks ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved looks
CREATE POLICY "Anyone can view approved tribe looks"
ON public.tribe_looks FOR SELECT
USING (status = 'approved');

-- Logged-in users can submit their own looks
CREATE POLICY "Users can submit their own looks"
ON public.tribe_looks FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all looks (including pending)
CREATE POLICY "Admins can view all tribe looks"
ON public.tribe_looks FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- Admins can update looks (approve/reject)
CREATE POLICY "Admins can update tribe looks"
ON public.tribe_looks FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()));

-- Admins can delete tribe looks
CREATE POLICY "Admins can delete tribe looks"
ON public.tribe_looks FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));

-- Add pre-order columns to products
ALTER TABLE public.products ADD COLUMN is_preorder BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN preorder_label TEXT;