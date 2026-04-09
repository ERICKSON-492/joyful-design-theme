
-- Category images table
CREATE TABLE public.category_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.category_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view category images" ON public.category_images FOR SELECT USING (true);
CREATE POLICY "Admins can insert category images" ON public.category_images FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update category images" ON public.category_images FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete category images" ON public.category_images FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_category_images_updated_at BEFORE UPDATE ON public.category_images FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add price range columns to products
ALTER TABLE public.products ADD COLUMN price_min NUMERIC NULL;
ALTER TABLE public.products ADD COLUMN price_max NUMERIC NULL;
