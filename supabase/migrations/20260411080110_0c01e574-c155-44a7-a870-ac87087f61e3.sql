
-- Product variants table
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_label TEXT NOT NULL DEFAULT '',
  size TEXT,
  color TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active variants" ON public.product_variants FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can insert variants" ON public.product_variants FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update variants" ON public.product_variants FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete variants" ON public.product_variants FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Shipping methods table
CREATE TABLE public.shipping_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'local',
  provider TEXT NOT NULL DEFAULT '',
  estimated_days TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  regions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active shipping methods" ON public.shipping_methods FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can insert shipping methods" ON public.shipping_methods FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update shipping methods" ON public.shipping_methods FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete shipping methods" ON public.shipping_methods FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_shipping_methods_updated_at BEFORE UPDATE ON public.shipping_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payment methods table
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active payment methods" ON public.payment_methods FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can insert payment methods" ON public.payment_methods FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update payment methods" ON public.payment_methods FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete payment methods" ON public.payment_methods FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default shipping methods (Kenyan couriers + DHL)
INSERT INTO public.shipping_methods (name, type, provider, estimated_days, price, regions) VALUES
  ('Sendy', 'local', 'sendy', '1-3 days', 300, ARRAY['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret']),
  ('G4S Courier', 'local', 'g4s', '2-5 days', 400, ARRAY['Nationwide']),
  ('Fargo Courier', 'local', 'fargo', '2-4 days', 350, ARRAY['Nationwide']),
  ('Wells Fargo', 'local', 'wells_fargo', '1-3 days', 500, ARRAY['Nairobi', 'Mombasa']),
  ('Posta Kenya (EMS)', 'local', 'posta', '3-7 days', 250, ARRAY['Nationwide']),
  ('DHL Express', 'international', 'dhl', '3-7 days', 2500, ARRAY['Worldwide']),
  ('DHL Economy', 'international', 'dhl_economy', '7-14 days', 1500, ARRAY['Worldwide']);

-- Seed default payment methods
INSERT INTO public.payment_methods (name, provider, is_active, config) VALUES
  ('M-Pesa', 'mpesa', true, '{"mode": "sandbox"}'::jsonb),
  ('Pesapal', 'pesapal', false, '{"mode": "sandbox", "note": "Add API keys to activate"}'::jsonb),
  ('Cash on Delivery', 'cod', true, '{}'::jsonb);
