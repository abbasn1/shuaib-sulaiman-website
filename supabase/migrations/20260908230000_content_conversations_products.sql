begin;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  category text not null,
  image_url text,
  summary text not null default '',
  overview text not null default '',
  benefits jsonb not null default '[]'::jsonb check (jsonb_typeof(benefits) = 'array'),
  applications jsonb not null default '[]'::jsonb check (jsonb_typeof(applications) = 'array'),
  specifications jsonb not null default '{}'::jsonb check (jsonb_typeof(specifications) = 'object'),
  packaging jsonb not null default '[]'::jsonb check (jsonb_typeof(packaging) = 'array'),
  quality_points jsonb not null default '[]'::jsonb check (jsonb_typeof(quality_points) = 'array'),
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  source_quote_id uuid references public.quotes(id) on delete set null,
  buyer_name text not null,
  company_name text,
  role_or_market text,
  quote_text text not null,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quote_responses (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  staff_id uuid references public.profiles(id) on delete set null,
  recipient_email text not null,
  subject text not null,
  body text not null,
  resend_email_id text,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.testimonials enable row level security;
alter table public.quote_responses enable row level security;

revoke insert, update, delete on table public.products from anon, authenticated;
revoke insert, update, delete on table public.testimonials from anon, authenticated;
revoke insert, update, delete on table public.quote_responses from anon, authenticated;

grant select on table public.products to anon, authenticated;
grant select on table public.testimonials to anon, authenticated;
grant select on table public.quote_responses to authenticated;

drop policy if exists "public read published products" on public.products;
create policy "public read published products" on public.products
for select to anon, authenticated
using (is_published = true);

drop policy if exists "super admins read all products" on public.products;
create policy "super admins read all products" on public.products
for select to authenticated
using (private.current_role() = 'super_admin');

drop policy if exists "public read published testimonials" on public.testimonials;
create policy "public read published testimonials" on public.testimonials
for select to anon, authenticated
using (is_published = true);

drop policy if exists "super admins read all testimonials" on public.testimonials;
create policy "super admins read all testimonials" on public.testimonials
for select to authenticated
using (private.current_role() = 'super_admin');

drop policy if exists "staff read quote responses" on public.quote_responses;
create policy "staff read quote responses" on public.quote_responses
for select to authenticated
using (
  private.current_role() in ('super_admin','admin','quote_manager','sales_officer','analytics_viewer','auditor')
);

create index if not exists ix_products_published_sort on public.products(is_published, sort_order, name);
create index if not exists ix_products_updated_by on public.products(updated_by);
create index if not exists ix_testimonials_published on public.testimonials(is_published, published_at desc nulls last, created_at desc);
create index if not exists ix_testimonials_source_quote on public.testimonials(source_quote_id);
create index if not exists ix_testimonials_updated_by on public.testimonials(updated_by);
create index if not exists ix_quote_responses_quote_created on public.quote_responses(quote_id, created_at);
create index if not exists ix_quote_responses_staff on public.quote_responses(staff_id);

insert into public.products (
  slug, name, category, image_url, summary, overview, benefits, applications, specifications,
  packaging, quality_points, is_published, sort_order
)
values
(
  's-s-shea-butter','S&S Shea Butter','Wellness','/images/products/shea-butter.jpg',
  'Natural Nigerian shea butter supplied for cosmetic, personal-care, wellness and approved industrial applications.',
  'S&S Shea Butter is sourced from selected Nigerian producer communities and prepared for buyers who value consistency, responsible sourcing and dependable delivery. Raw or refined options may be discussed, with colour, odour, texture, grade and packaging confirmed before order approval.',
  '["Naturally rich emollient for skin and hair products","Raw and refined options may be available","Suitable for cosmetic and wellness manufacturing","Bulk formats designed for commercial handling"]'::jsonb,
  '["Body creams and lotions","Haircare and scalp products","Soap, balm and cosmetic production","Approved food or industrial formulations"]'::jsonb,
  '{"Product type":"Raw or refined shea butter","Origin":"Nigeria","Quality focus":"Colour, odour, texture, cleanliness and buyer specification","Order basis":"Specification-led bulk quotation"}'::jsonb,
  '["Lined cartons","Food-grade buckets or drums","Sealed bulk blocks","Buyer-approved export packaging"]'::jsonb,
  '["Producer and batch selection","Clean processing and storage","Physical quality inspection","Documentation and shipment control"]'::jsonb,
  true,10
),
(
  's-s-garri-cassava','S&S Garri (Cassava)','Processed Food','/images/products/garri-cassava-flakes.jpeg',
  'Clean, properly processed cassava flakes supplied for diaspora, retail, wholesale and food-service markets.',
  'S&S Garri is produced from selected cassava and coordinated for buyers requiring dependable processing, moisture control, granulation and export preparation. White or yellow garri may be supplied subject to availability and the agreed order specification.',
  '["Popular West African staple with strong diaspora demand","Flexible pack sizes for retail or food service","White and yellow options subject to availability","Prepared for wholesale and container distribution"]'::jsonb,
  '["African and international food stores","Diaspora grocery markets","Restaurants and catering businesses","Wholesale and institutional food supply"]'::jsonb,
  '{"Product type":"Processed cassava flakes","Varieties":"White or yellow garri","Quality focus":"Moisture, cleanliness, acidity and granulation","Order basis":"Container or agreed wholesale quantity"}'::jsonb,
  '["Sealed consumer pouches","Bulk woven or laminated bags","Export cartons where required","Custom labels subject to approval"]'::jsonb,
  '["Supplier and batch verification","Visual and moisture inspection","Food-safe packing environment","Export documentation coordination"]'::jsonb,
  true,20
),
(
  's-s-cashew-nut','S&S Cashew Nut','Agricultural','/images/products/raw-cashew-nuts.jpg',
  'Selected Nigerian cashew nuts supplied to processors, food manufacturers, packers and commodity buyers.',
  'S&S Cashew Nut is sourced according to season and buyer requirements. Raw nuts in shell or processed kernel options may be discussed, with nut count, outturn, kernel grade, moisture, colour, defects and packaging agreed before quotation.',
  '["Suitable for processing, roasting or direct packing","Specifications can be matched to buyer requirements","Seasonal procurement planning is available","Bulk container supply for qualified buyers"]'::jsonb,
  '["Cashew processing plants","Snack and nut brands","Bakery and confectionery production","Commodity and ingredient distribution"]'::jsonb,
  '{"Product type":"Raw cashew nuts or processed kernels by agreement","Quality indicators":"Nut count, outturn, grade, moisture, colour and defects","Origin":"Nigeria","Order basis":"Seasonal and grade-specific quotation"}'::jsonb,
  '["Breathable jute or woven bags for raw nuts","Vacuum-packed inner bags for kernels","Food-grade cartons or tins","Container loading with moisture protection"]'::jsonb,
  '["Seasonal lot and supplier selection","Sampling and grade assessment","Moisture and defect checks","Bagging, carton and container inspection"]'::jsonb,
  true,30
),
(
  's-s-ginger','S&S Ginger','Agricultural','/images/products/ginger.webp',
  'Nigerian ginger supplied in fresh, dried split or powdered formats for food, beverage and wellness markets.',
  'S&S Ginger is sourced from established Nigerian growing areas and prepared according to the buyer’s required form. Fresh roots, dried split ginger or ginger powder may be supplied subject to availability, with aroma, dryness, fibre, cleanliness and packaging confirmed before shipment.',
  '["Distinctive aroma and flavour profile","Fresh, dried and processed formats may be available","Suitable for food, beverage and wellness markets","Export preparation tailored to destination requirements"]'::jsonb,
  '["Spice and seasoning production","Tea and beverage manufacturing","Bakery and confectionery","Extract and wellness-product processing"]'::jsonb,
  '{"Product type":"Fresh, dried split or powdered ginger","Origin":"Nigeria","Quality focus":"Aroma, dryness, fibre, cleanliness and buyer specification","Order basis":"Format-specific quotation"}'::jsonb,
  '["Ventilated cartons for fresh ginger","Lined bags for dried ginger","Sealed pouches or bags for powder","Palletised export loading"]'::jsonb,
  '["Root and batch selection","Dryness and foreign-matter checks","Ventilation or moisture-barrier controls","Export documentation coordination"]'::jsonb,
  true,40
),
(
  's-s-charcoal','S&S Charcoal','Energy & Minerals','/images/products/s-s-charcoal.svg',
  'Selected charcoal supplied for approved commercial, industrial and hospitality uses, subject to destination regulations.',
  'S&S Charcoal is coordinated against clear buyer requirements covering wood source, lump size, fixed carbon, moisture, ash, burn characteristics and packaging. Supply is subject to responsible sourcing, export rules and destination-country requirements.',
  '["Lump-size and quality requirements can be agreed","Suitable for commercial and hospitality buyers","Bulk packaging supports container distribution","Documentation coordinated for approved destinations"]'::jsonb,
  '["Restaurants and hospitality operations","Barbecue and grilling distribution","Approved industrial heating applications","Wholesale fuel distribution"]'::jsonb,
  '{"Product type":"Lump charcoal or buyer-agreed grade","Quality focus":"Fixed carbon, moisture, ash, size and burn performance","Origin":"Nigeria","Order basis":"Technical and regulatory specification required"}'::jsonb,
  '["Laminated export bags","Buyer-branded retail bags","Bulk sacks","Moisture-protected container loading"]'::jsonb,
  '["Responsible-source review","Size and foreign-matter inspection","Moisture and ash checks where agreed","Export and destination compliance review"]'::jsonb,
  true,50
),
(
  's-s-coal-black','S&S Coal (Black)','Energy & Minerals','/images/products/s-s-coal-black.svg',
  'Black coal supplied to qualified industrial buyers against an agreed technical specification and regulatory review.',
  'S&S Coal (Black) is offered only for qualified commercial or industrial enquiries. Coal type, calorific value, sulphur, ash, moisture, particle size, volume, loading method, intended use and destination regulations must be confirmed before quotation or supply commitment.',
  '["Technical specification agreed before sourcing","Bulk supply planning for qualified industrial buyers","Sampling and analysis can be discussed","Shipment documentation coordinated by destination"]'::jsonb,
  '["Approved industrial energy use","Manufacturing and process heating","Qualified commodity distribution","Other lawful buyer-specified applications"]'::jsonb,
  '{"Product type":"Black coal by agreed grade","Technical indicators":"Calorific value, sulphur, ash, moisture and particle size","Supply condition":"Subject to lawful sourcing and destination approval","Order basis":"Technical specification and compliance review required"}'::jsonb,
  '["Bulk vessel or container loading where feasible","Jumbo bags","Bulk sacks","Buyer-agreed industrial handling format"]'::jsonb,
  '["Supplier and source verification","Product sampling where agreed","Weight and loading checks","Environmental, export and customs document review"]'::jsonb,
  true,60
),
(
  's-s-yam-flour-amala','S&S Yam Flour (Amala)','Processed Food','/images/products/s-s-yam-flour.svg',
  'Finely processed yam flour prepared for amala, retail distribution, food service and diaspora markets.',
  'S&S Yam Flour (Amala) is produced from selected yam and prepared as a shelf-stable flour for buyers requiring consistent texture, colour, cleanliness and packaging. Pack size, labelling, moisture limits and destination requirements are confirmed before production and shipment.',
  '["Convenient shelf-stable Nigerian staple","Suitable for amala preparation","Retail and bulk pack sizes may be arranged","Strong fit for diaspora and speciality-food markets"]'::jsonb,
  '["African and international food stores","Restaurants and catering businesses","Wholesale food distribution","Private-label retail programmes"]'::jsonb,
  '{"Product type":"Processed yam flour","Format":"Fine flour for amala preparation","Quality focus":"Ingredient purity, dryness, texture, colour and shelf life","Order basis":"Pack and volume-specific quotation"}'::jsonb,
  '["Printed retail pouches","Bulk food-grade sacks","Export master cartons","Private-label packaging by agreement"]'::jsonb,
  '["Raw material and processor review","Moisture and cleanliness checks","Seal and label inspection","Batch documentation control"]'::jsonb,
  true,70
)
on conflict (slug) do nothing;

insert into public.testimonials (buyer_name, role_or_market, quote_text, is_published, published_at)
select * from (values
  ('Anny K.','Spice Importer, Dubai','The team handled sourcing, packaging and export coordination professionally. Communication remained clear throughout the order.',true,now()),
  ('Ravi M.','Food Distributor, India','We received dependable support from enquiry through shipment. The quality-control process gave us confidence in the final delivery.',true,now()),
  ('Li W.','Wholesale Buyer, China','A transparent and responsive trading partner. We were kept informed and received the agreed documentation on time.',true,now())
) as seed(buyer_name, role_or_market, quote_text, is_published, published_at)
where not exists (select 1 from public.testimonials);

commit;
