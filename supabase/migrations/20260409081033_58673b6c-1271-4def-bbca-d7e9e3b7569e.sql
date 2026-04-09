
CREATE TABLE public.site_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT,
  body TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "Admins can insert site content" ON public.site_content FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update site content" ON public.site_content FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete site content" ON public.site_content FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_site_content_updated_at BEFORE UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_content (section_key, title, body, image_url) VALUES (
  'the_chronicle_begins',
  'The Chronicle Begins',
  E'It started with one bead. A single beaded necklace, gifted to Linda on her graduation day in 2018. That moment sparked something — a deep connection to the craft, the culture, and the stories each bead carries.\n\nWhat began as a passion project grew into Ushanga Chronicles — a brand rooted in African heritage, handcrafted by skilled artisans, and worn by the Ushanga Tribe across the world.',
  NULL
);
