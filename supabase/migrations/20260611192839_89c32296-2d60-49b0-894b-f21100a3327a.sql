
CREATE TABLE IF NOT EXISTS public.chronicle_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text,
  cover_image_url text,
  author text,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chronicle_posts_published_idx
  ON public.chronicle_posts (is_published, published_at DESC);

GRANT SELECT ON public.chronicle_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chronicle_posts TO authenticated;
GRANT ALL ON public.chronicle_posts TO service_role;

ALTER TABLE public.chronicle_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published chronicle posts are public"
  ON public.chronicle_posts FOR SELECT
  USING (is_published = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert chronicle posts"
  ON public.chronicle_posts FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update chronicle posts"
  ON public.chronicle_posts FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete chronicle posts"
  ON public.chronicle_posts FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER set_chronicle_posts_updated_at
  BEFORE UPDATE ON public.chronicle_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
