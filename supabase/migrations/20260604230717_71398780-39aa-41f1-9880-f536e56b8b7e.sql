CREATE OR REPLACE FUNCTION public.enqueue_transactional_email(
  recipient_email text,
  subject_text text,
  html_body text,
  template_label text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payload jsonb;
  msg_id bigint;
BEGIN
  payload := jsonb_build_object(
    'message_id', 'msg_' || gen_random_uuid(),
    'to', recipient_email,
    'subject', subject_text,
    'html', html_body,
    'label', template_label,
    'queued_at', to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );

  msg_id := pgmq.send('transactional_emails', payload);
  RETURN msg_id;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create('transactional_emails');
  msg_id := pgmq.send('transactional_emails', payload);
  RETURN msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_transactional_email(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_transactional_email(text, text, text, text) TO service_role;