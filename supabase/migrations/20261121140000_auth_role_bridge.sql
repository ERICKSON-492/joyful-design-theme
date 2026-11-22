-- Supabase cutover: make Auth app_metadata an accepted source of admin truth.
-- The legacy admin_users table remains supported during rollback and reconciliation.

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = _user_id
  )
  or exists (
    select 1
    from auth.users
    where id = _user_id
      and coalesce(raw_app_meta_data ->> 'role', '') = 'admin'
  );
$$;

-- Promote already-existing Auth accounts whose imported legacy record was an
-- administrator. This does not create users or change passwords.
update auth.users as au
set raw_app_meta_data = coalesce(au.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
from public.auth_users as legacy
where lower(au.email) = lower(legacy.email)
  and legacy.role = 'admin'
  and coalesce(au.raw_app_meta_data ->> 'role', '') <> 'admin';
