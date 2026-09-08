begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
$$;

revoke all on function private.current_role() from public;
revoke all on function private.current_role() from anon;
grant execute on function private.current_role() to authenticated;

-- Repoint all authorization policies to the non-exposed helper.
drop policy if exists "staff read quotes" on public.quotes;
create policy "staff read quotes" on public.quotes
for select to authenticated using (
  private.current_role() in ('super_admin','admin','quote_manager','sales_officer','analytics_viewer','auditor')
);

drop policy if exists "staff update quotes" on public.quotes;
create policy "staff update quotes" on public.quotes
for update to authenticated using (
  private.current_role() in ('super_admin','admin','quote_manager','sales_officer')
) with check (
  private.current_role() in ('super_admin','admin','quote_manager','sales_officer')
);

drop policy if exists "users read profiles" on public.profiles;
create policy "users read profiles" on public.profiles
for select to authenticated using (
  id = (select auth.uid())
  or private.current_role() in ('super_admin','admin','auditor')
);

drop policy if exists "admins update profiles" on public.profiles;
create policy "admins update profiles" on public.profiles
for update to authenticated using (
  private.current_role() in ('super_admin','admin')
) with check (
  private.current_role() in ('super_admin','admin')
);

drop policy if exists "analytics read visits" on public.visits;
create policy "analytics read visits" on public.visits
for select to authenticated using (
  private.current_role() in ('super_admin','admin','analytics_viewer','auditor')
);

drop policy if exists "auditors read logs" on public.audit_logs;
create policy "auditors read logs" on public.audit_logs
for select to authenticated using (
  private.current_role() in ('super_admin','admin','auditor')
);

-- The old public helper is no longer required by policies.
drop function if exists public.current_role();

-- Trigger and event-trigger functions are internal implementation details.
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

revoke all on function public.rls_auto_enable() from public;
revoke all on function public.rls_auto_enable() from anon;
revoke all on function public.rls_auto_enable() from authenticated;

commit;
