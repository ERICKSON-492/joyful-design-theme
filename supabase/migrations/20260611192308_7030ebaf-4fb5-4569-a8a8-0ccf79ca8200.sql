
CREATE TABLE IF NOT EXISTS public.newsletter_digest_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_sent_at timestamptz NOT NULL DEFAULT (now() - interval '24 hours'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.newsletter_digest_state TO service_role;

ALTER TABLE public.newsletter_digest_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role only" ON public.newsletter_digest_state
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.newsletter_digest_state (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
