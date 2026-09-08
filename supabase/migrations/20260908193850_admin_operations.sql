begin;

-- Quote managers need a staff directory to assign enquiries.
drop policy if exists "users read profiles" on public.profiles;
create policy "users read profiles" on public.profiles
for select to authenticated using (
  id = (select auth.uid())
  or private.current_role() in ('super_admin','admin','quote_manager','auditor')
);

-- Staff actions initiated from the dashboard may write their own audit entries.
drop policy if exists "staff create audit logs" on public.audit_logs;
create policy "staff create audit logs" on public.audit_logs
for insert to authenticated with check (
  actor_id = (select auth.uid())
  and private.current_role() in ('super_admin','admin','quote_manager','sales_officer')
);

create index if not exists ix_audit_logs_actor_id
  on public.audit_logs(actor_id);

commit;
