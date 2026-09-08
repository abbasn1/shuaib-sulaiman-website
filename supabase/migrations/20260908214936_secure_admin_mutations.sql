begin;

-- Quote mutations are performed by the JWT-protected admin-quotes Edge Function
-- using the service role after it enforces role-specific permissions and auditing.
drop policy if exists "staff update quotes" on public.quotes;
revoke update on table public.quotes from authenticated;

-- Audit events are written by trusted Edge Functions only. Keep authenticated
-- users read-only according to the existing auditors read logs policy.
drop policy if exists "staff create audit logs" on public.audit_logs;
revoke insert on table public.audit_logs from authenticated;

commit;
