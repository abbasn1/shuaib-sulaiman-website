do $$
declare
  target_id uuid;
begin
  select id into target_id
  from public.profiles
  where lower(email) = lower('admin2@shuaibsulaiman.com');

  if target_id is null then
    raise exception 'admin2@shuaibsulaiman.com profile not found';
  end if;

  update public.profiles
  set role = 'super_admin'::public.app_role,
      is_active = true,
      must_change_password = true,
      updated_at = now()
  where id = target_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (
    null,
    'admin_role_bootstrap',
    'profile',
    target_id::text,
    jsonb_build_object(
      'email', 'admin2@shuaibsulaiman.com',
      'role', 'super_admin',
      'must_change_password', true
    )
  );
end $$;
