from pathlib import Path

path = Path('supabase/schema.sql')
text = path.read_text()

old_products = '''drop policy if exists "public read published products" on public.products;
create policy "public read published products" on public.products
for select to anon, authenticated using (is_published = true);

drop policy if exists "super admins read all products" on public.products;
create policy "super admins read all products" on public.products
for select to authenticated using (private.current_role() = 'super_admin');
'''
new_products = '''drop policy if exists "public read published products" on public.products;
drop policy if exists "super admins read all products" on public.products;
drop policy if exists "anonymous read published products" on public.products;
drop policy if exists "authenticated read products" on public.products;
create policy "anonymous read published products" on public.products
for select to anon using (is_published = true);
create policy "authenticated read products" on public.products
for select to authenticated using (
  is_published = true or private.current_role() = 'super_admin'
);
'''

old_testimonials = '''drop policy if exists "public read published testimonials" on public.testimonials;
create policy "public read published testimonials" on public.testimonials
for select to anon, authenticated using (is_published = true);

drop policy if exists "super admins read all testimonials" on public.testimonials;
create policy "super admins read all testimonials" on public.testimonials
for select to authenticated using (private.current_role() = 'super_admin');
'''
new_testimonials = '''drop policy if exists "public read published testimonials" on public.testimonials;
drop policy if exists "super admins read all testimonials" on public.testimonials;
drop policy if exists "anonymous read published testimonials" on public.testimonials;
drop policy if exists "authenticated read testimonials" on public.testimonials;
create policy "anonymous read published testimonials" on public.testimonials
for select to anon using (is_published = true);
create policy "authenticated read testimonials" on public.testimonials
for select to authenticated using (
  is_published = true or private.current_role() = 'super_admin'
);
'''

if old_products not in text:
    raise SystemExit('products policy block not found')
if old_testimonials not in text:
    raise SystemExit('testimonials policy block not found')

text = text.replace(old_products, new_products, 1).replace(old_testimonials, new_testimonials, 1)
path.write_text(text)
print('schema policies consolidated')
