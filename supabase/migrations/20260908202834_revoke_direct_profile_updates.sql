begin;

-- Browser sessions only read profiles. All profile mutations are handled by
-- the JWT-protected admin-users Edge Function using the service role.
revoke update on table public.profiles from anon, authenticated;
grant update on table public.profiles to service_role;

commit;
