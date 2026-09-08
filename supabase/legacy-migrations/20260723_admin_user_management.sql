begin;

-- Ensure administrator profiles can read all staff profiles.
drop policy if exists "users read profiles" on public.profiles;
create policy "users read profiles" on public.profiles
for select to authenticated using (
  id = auth.uid()
  or public.current_role() in ('super_admin','admin','auditor')
);

-- Only super administrators and administrators can maintain staff profiles.
drop policy if exists "admins update profiles" on public.profiles;
create policy "admins update profiles" on public.profiles
for update to authenticated using (
  public.current_role() in ('super_admin','admin')
) with check (
  public.current_role() in ('super_admin','admin')
);

-- Promote the primary production administrator when the account already exists.
update public.profiles
set
  role = 'super_admin',
  is_active = true,
  must_change_password = false,
  updated_at = now()
where lower(email) = lower('admin@shuaibsulaiman.com');

commit;

select id, full_name, email, role, is_active
from public.profiles
where lower(email) = lower('admin@shuaibsulaiman.com');
