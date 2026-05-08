
-- Categories table
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage categories insert" ON public.categories FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins manage categories update" ON public.categories FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage categories delete" ON public.categories FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Subcategories table
CREATE TABLE public.subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, slug)
);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active subcategories" ON public.subcategories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage subcategories insert" ON public.subcategories FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins manage subcategories update" ON public.subcategories FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins manage subcategories delete" ON public.subcategories FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add multi-image + subcategory to products
ALTER TABLE public.products
  ADD COLUMN image_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN subcategory text;

-- Backfill image_urls from existing image_url
UPDATE public.products SET image_urls = ARRAY[image_url] WHERE image_url IS NOT NULL AND array_length(image_urls,1) IS NULL;

-- Seed categories
INSERT INTO public.categories (name, slug, display_order) VALUES
  ('Wear It', 'wear-it', 1),
  ('Live With It', 'live-with-it', 2),
  ('For Your Pet', 'pet', 3),
  ('Kitchen and Dining', 'kitchen-dining', 4),
  ('Arts & Collectibles', 'arts-collectibles', 5),
  ('Wholesale & Gifting', 'wholesale-gifting', 6);

-- Seed subcategories
WITH cat AS (SELECT id, slug FROM public.categories)
INSERT INTO public.subcategories (category_id, name, slug, display_order)
SELECT c.id, sub.name, sub.slug, sub.ord FROM cat c JOIN (VALUES
  -- Wear It (Fashion Accessories + Jewellery)
  ('wear-it','Belts','belts',1),
  ('wear-it','Hats','hats',2),
  ('wear-it','Footwear','footwear',3),
  ('wear-it','Bags','bags',4),
  ('wear-it','Necklaces','necklaces',5),
  ('wear-it','Bracelets','bracelets',6),
  ('wear-it','Rings','rings',7),
  ('wear-it','Hair & Braids Accessories','hair-braids',8),
  ('wear-it','Earrings','earrings',9),
  -- Live With It
  ('live-with-it','Decorative Fans','decorative-fans',1),
  ('live-with-it','Wall Baskets','wall-baskets',2),
  ('live-with-it','Storage & Decorative Baskets','storage-baskets',3),
  ('live-with-it','Seasonal Decorations','seasonal-decorations',4),
  ('live-with-it','Fridge Magnets','fridge-magnets',5),
  ('live-with-it','Wall Arts','wall-arts',6),
  ('live-with-it','Mirrors','mirrors',7),
  ('live-with-it','Wall Clocks','wall-clocks',8),
  ('live-with-it','Keychains','keychains',9),
  -- For Your Pet
  ('pet','Dog & Cat Collars','collars',1),
  ('pet','Leashes','leashes',2),
  -- Kitchen and Dining
  ('kitchen-dining','Table Mats','table-mats',1),
  ('kitchen-dining','Coasters','coasters',2),
  ('kitchen-dining','Utensils','utensils',3),
  ('kitchen-dining','Table Accessories','table-accessories',4),
  -- Arts & Collectibles
  ('arts-collectibles','Corporate Gifts','corporate-gifts',1),
  ('arts-collectibles','Souvenirs','souvenirs',2),
  -- Wholesale & Gifting
  ('wholesale-gifting','Tailored Orders','tailored-orders',1),
  ('wholesale-gifting','Bulk Order Discount','bulk-discount',2),
  ('wholesale-gifting','Gifting Vouchers','gifting-vouchers',3),
  ('wholesale-gifting','Mother''s Day','mothers-day',4),
  ('wholesale-gifting','Father''s Day','fathers-day',5),
  ('wholesale-gifting','Festive Season','festive-season',6),
  ('wholesale-gifting','Women''s Day','womens-day',7),
  ('wholesale-gifting','Valentine''s Day','valentines-day',8),
  ('wholesale-gifting','Easter Holidays','easter-holidays',9)
) AS sub(cat_slug, name, slug, ord) ON c.slug = sub.cat_slug;
