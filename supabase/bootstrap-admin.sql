-- Run this once in Supabase Dashboard > SQL Editor.
-- Replace the email below with the email used to sign in at /admin.

begin;

insert into public.profiles (
  id,
  full_name,
  email,
  role,
  is_active,
  must_change_password,
  created_at,
  updated_at
)
select
  id,
  coalesce(raw_user_meta_data->>'full_name', 'System Administrator'),
  email,
  'super_admin'::public.app_role,
  true,
  false,
  coalesce(created_at, now()),
  now()
from auth.users
where lower(email) = lower('REPLACE_WITH_YOUR_ADMIN_EMAIL')
on conflict (id) do update
set
  role = 'super_admin'::public.app_role,
  is_active = true,
  updated_at = now();

-- Confirm the account and assigned role.
select
  p.id,
  p.full_name,
  p.email,
  p.role,
  p.is_active
from public.profiles p
where lower(p.email) = lower('REPLACE_WITH_YOUR_ADMIN_EMAIL');

commit;
