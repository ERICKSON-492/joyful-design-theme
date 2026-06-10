CREATE POLICY "Authenticated upload order receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'order-receipts');

CREATE POLICY "Authenticated read order receipts"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'order-receipts');