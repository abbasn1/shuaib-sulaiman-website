drop policy if exists "staff read quotes" on public.quotes;
create policy "staff read quotes" on public.quotes
for select to authenticated
using (
  (private.current_role() = 'sales_officer'::public.app_role and assigned_to = auth.uid())
  or private.current_role() = any (array[
    'super_admin'::public.app_role,
    'admin'::public.app_role,
    'quote_manager'::public.app_role,
    'analytics_viewer'::public.app_role,
    'auditor'::public.app_role,
    'content_editor'::public.app_role
  ])
);

drop policy if exists "staff read quote responses" on public.quote_responses;
create policy "staff read quote responses" on public.quote_responses
for select to authenticated
using (
  (private.current_role() = 'sales_officer'::public.app_role and exists (
    select 1 from public.quotes q where q.id = quote_responses.quote_id and q.assigned_to = auth.uid()
  ))
  or private.current_role() = any (array[
    'super_admin'::public.app_role,
    'admin'::public.app_role,
    'quote_manager'::public.app_role,
    'analytics_viewer'::public.app_role,
    'auditor'::public.app_role,
    'content_editor'::public.app_role
  ])
);
