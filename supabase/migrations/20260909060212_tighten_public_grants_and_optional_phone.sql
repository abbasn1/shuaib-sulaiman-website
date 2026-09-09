-- Match the live contact schema to the optional phone field in the application.
alter table public.quotes alter column phone drop not null;

-- Supabase grants broad privileges on public-schema tables by default. RLS
-- protects row operations, but operations such as TRUNCATE are outside RLS, so
-- remove every browser-role privilege and grant back only the required surface.
revoke all privileges on table public.profiles from public, anon, authenticated;
revoke all privileges on table public.quotes from public, anon, authenticated;
revoke all privileges on table public.visits from public, anon, authenticated;
revoke all privileges on table public.audit_logs from public, anon, authenticated;
revoke all privileges on table public.contact_rate_limits from public, anon, authenticated;
revoke all privileges on table public.app_settings from public, anon, authenticated;
revoke all privileges on table public.products from public, anon, authenticated;
revoke all privileges on table public.testimonials from public, anon, authenticated;
revoke all privileges on table public.quote_responses from public, anon, authenticated;

do $$
begin
  if to_regclass('public.quotes_backup_20260908') is not null then
    execute 'revoke all privileges on table public.quotes_backup_20260908 from public, anon, authenticated';
  end if;
end;
$$;

revoke all privileges on sequence public.audit_logs_id_seq from public, anon, authenticated;

grant select on table public.profiles to authenticated;
grant select on table public.quotes to authenticated;
grant insert on table public.visits to anon, authenticated;
grant select on table public.visits to authenticated;
grant select on table public.audit_logs to authenticated;
grant select on table public.products to anon, authenticated;
grant select on table public.testimonials to anon, authenticated;
grant select on table public.quote_responses to authenticated;
