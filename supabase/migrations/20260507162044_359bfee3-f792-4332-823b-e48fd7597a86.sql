CREATE POLICY "Anyone can mark admin replies as read"
ON public.enquiry_messages
FOR UPDATE
TO public
USING (is_from_admin = true)
WITH CHECK (is_from_admin = true);