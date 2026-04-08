
-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Anyone can view active products
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT
USING (is_active = true);

-- Authenticated users can manage products (admin check will be in app)
CREATE POLICY "Authenticated users can insert products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
ON public.products FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete products"
ON public.products FOR DELETE TO authenticated
USING (true);

-- Create enquiry_messages table for customer chat
CREATE TABLE public.enquiry_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  message TEXT NOT NULL,
  is_from_admin BOOLEAN NOT NULL DEFAULT false,
  conversation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.enquiry_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can submit enquiries
CREATE POLICY "Anyone can submit enquiries"
ON public.enquiry_messages FOR INSERT
WITH CHECK (true);

-- Authenticated users can read all enquiries
CREATE POLICY "Authenticated users can read enquiries"
ON public.enquiry_messages FOR SELECT TO authenticated
USING (true);

-- Authenticated users can update enquiries (mark as read, reply)
CREATE POLICY "Authenticated users can update enquiries"
ON public.enquiry_messages FOR UPDATE TO authenticated
USING (true);

-- Enable realtime for enquiry messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.enquiry_messages;

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-images');

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
