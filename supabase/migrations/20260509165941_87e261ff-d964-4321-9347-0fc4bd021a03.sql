
-- Stock adjustments log table
CREATE TABLE public.stock_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  variant_id UUID,
  change INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  adjusted_by UUID,
  adjusted_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_adjustments_product ON public.stock_adjustments(product_id, created_at DESC);
CREATE INDEX idx_stock_adjustments_variant ON public.stock_adjustments(variant_id, created_at DESC);

ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view stock adjustments"
  ON public.stock_adjustments FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert stock adjustments"
  ON public.stock_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- Add low stock threshold to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER NOT NULL DEFAULT 5;
