drop policy if exists "public read published products" on public.products;
drop policy if exists "super admins read all products" on public.products;
create policy "anonymous read published products" on public.products
for select to anon using (is_published = true);
create policy "authenticated read products" on public.products
for select to authenticated using (
  is_published = true or private.current_role() = 'super_admin'
);

drop policy if exists "public read published testimonials" on public.testimonials;
drop policy if exists "super admins read all testimonials" on public.testimonials;
create policy "anonymous read published testimonials" on public.testimonials
for select to anon using (is_published = true);
create policy "authenticated read testimonials" on public.testimonials
for select to authenticated using (
  is_published = true or private.current_role() = 'super_admin'
);
