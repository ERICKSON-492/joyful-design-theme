CREATE POLICY "Anyone can read enquiry messages"
ON public.enquiry_messages
FOR SELECT
TO public
USING (true);