begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "super admins upload product images" on storage.objects;
create policy "super admins upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and private.current_role() = 'super_admin'
);

drop policy if exists "super admins update product images" on storage.objects;
create policy "super admins update product images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'product-images'
  and private.current_role() = 'super_admin'
)
with check (
  bucket_id = 'product-images'
  and private.current_role() = 'super_admin'
);

drop policy if exists "super admins delete product images" on storage.objects;
create policy "super admins delete product images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'product-images'
  and private.current_role() = 'super_admin'
);

commit;
