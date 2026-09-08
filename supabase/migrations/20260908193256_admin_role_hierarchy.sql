begin;

drop policy if exists "admins update profiles" on public.profiles;
create policy "admins update profiles" on public.profiles
for update to authenticated
using (
  private.current_role() = 'super_admin'
  or (
    private.current_role() = 'admin'
    and role <> 'super_admin'
  )
)
with check (
  private.current_role() = 'super_admin'
  or (
    private.current_role() = 'admin'
    and role <> 'super_admin'
  )
);

commit;
