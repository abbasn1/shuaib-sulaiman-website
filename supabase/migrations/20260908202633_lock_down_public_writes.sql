begin;

-- Public enquiry creation is handled by the send-quote-email Edge Function,
-- which verifies Turnstile and rate limits before inserting customer data.
drop policy if exists "public submit quotes" on public.quotes;
revoke insert on table public.quotes from anon, authenticated;
grant insert on table public.quotes to service_role;

-- Profile mutations must go through the JWT-protected admin-users Edge
-- Function so server-side role hierarchy checks and audit logging cannot be
-- bypassed by direct browser writes.
drop policy if exists "admins update profiles" on public.profiles;

commit;
