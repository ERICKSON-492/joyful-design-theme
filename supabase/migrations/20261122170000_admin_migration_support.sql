-- Admin-only Supabase cutover support.
-- Customer data is exposed through a controlled RPC/Edge Function only.

create or replace function public.admin_list_customers()
returns table (
  user_id uuid,
  display_name text,
  email text,
  phone text,
  created_at timestamptz,
  is_active boolean,
  order_count bigint
)
language plpgsql
security definer
stable
set search_path = public, auth
as $$
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  return query
  select
    au.id,
    coalesce(nullif(p.display_name, ''), nullif(au.raw_user_meta_data ->> 'full_name', ''), nullif(au.raw_user_meta_data ->> 'name', '')),
    au.email,
    p.phone,
    au.created_at,
    coalesce(au.raw_app_meta_data ->> 'account_status', 'active') <> 'archived',
    count(o.id)::bigint
  from auth.users au
  left join public.profiles p on p.user_id = au.id
  left join public.orders o on o.user_id = au.id
  where coalesce(au.raw_app_meta_data ->> 'role', 'user') <> 'admin'
  group by au.id, p.display_name, p.phone, au.email, au.created_at, au.raw_user_meta_data, au.raw_app_meta_data
  order by au.created_at desc;
end;
$$;

revoke all on function public.admin_list_customers() from public, anon;
grant execute on function public.admin_list_customers() to authenticated;

create or replace function public.admin_anonymize_customer(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller uuid := auth.uid();
  target_email text;
  anonymized_orders integer := 0;
  replacement_email text := 'removed+' || target_user_id::text || '@example.invalid';
begin
  if caller is null or not public.is_admin(caller) then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select email into target_email from auth.users where id = target_user_id;
  if target_email is null then
    raise exception 'Customer not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from auth.users where id = target_user_id and coalesce(raw_app_meta_data ->> 'role', 'user') = 'admin') then
    raise exception 'Administrator accounts cannot be removed' using errcode = '42501';
  end if;

  update public.orders
  set customer_name = 'Removed customer', phone = '', email = null,
      shipping_address = null, receipt_url = null, user_id = null, updated_at = now()
  where user_id = target_user_id;
  get diagnostics anonymized_orders = row_count;

  update public.product_reviews
  set customer_name = 'Customer', photo_urls = '{}', updated_at = now()
  where user_id = target_user_id;

  update public.tribe_looks
  set name = 'Community member'
  where user_id = target_user_id;

  delete from public.profiles where user_id = target_user_id;

  update public.contact_messages
  set name = 'Removed customer', email = null, phone = null, message = 'Message removed'
  where lower(email) = lower(target_email);

  update public.custom_orders
  set name = 'Removed customer', phone = '', email = null, vision = null,
      colors = '{}', materials = null, delivery_location = null, reference_image_urls = '{}'
  where lower(email) = lower(target_email);

  update public.enquiry_messages
  set customer_name = 'Removed customer', customer_email = null,
      customer_phone = null, message = 'Message removed'
  where lower(customer_email) = lower(target_email);

  delete from public.newsletter_subscribers where lower(email) = lower(target_email);
  delete from public.email_unsubscribe_tokens where lower(email) = lower(target_email);
  update public.email_send_log
    set recipient_email = replacement_email, metadata = null, error_message = null
    where lower(recipient_email) = lower(target_email);
  delete from public.email_outbox
    where lower(recipient_email) = lower(target_email) and status in ('pending', 'queued');
  update public.email_outbox
    set recipient_email = replacement_email, subject = 'Message removed', html_body = '', attachments = '[]'::jsonb
    where lower(recipient_email) = lower(target_email);

  -- These tables may contain legacy UUIDs that are no longer linked to Auth.
  update public.auth_login_events
    set user_id = null, email = replacement_email, ip_address = null, user_agent = null
    where user_id = target_user_id or lower(email) = lower(target_email);

  return jsonb_build_object('ok', true, 'anonymized_orders', anonymized_orders, 'replacement_email', replacement_email);
end;
$$;

revoke all on function public.admin_anonymize_customer(uuid) from public, anon;
grant execute on function public.admin_anonymize_customer(uuid) to authenticated;

-- Analytics tables are intentionally not directly readable/writable by the browser.
revoke all on public.visitor_sessions, public.analytics_page_views from anon, authenticated;
