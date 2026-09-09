drop policy if exists "staff read quotes" on public.quotes;
create policy "staff read quotes" on public.quotes
for select to authenticated using (
  private.current_role() in ('super_admin','admin','quote_manager','sales_officer','analytics_viewer','auditor','content_editor')
);

drop policy if exists "staff read quote responses" on public.quote_responses;
create policy "staff read quote responses" on public.quote_responses
for select to authenticated using (
  private.current_role() in ('super_admin','admin','quote_manager','sales_officer','analytics_viewer','auditor','content_editor')
);
