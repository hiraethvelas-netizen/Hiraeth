create table if not exists public.site_banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text not null,
  href text not null default '/loja',
  position integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.site_banners to anon, authenticated;
grant insert, update, delete on public.site_banners to authenticated;
grant all on public.site_banners to service_role;
alter table public.site_banners enable row level security;
drop policy if exists "Anyone can view active homepage banners" on public.site_banners;
create policy "Anyone can view active homepage banners" on public.site_banners for select to anon, authenticated using (active = true or public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admins can manage homepage banners" on public.site_banners;
create policy "Admins can manage homepage banners" on public.site_banners for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;
grant all on public.site_content to service_role;
alter table public.site_content enable row level security;
drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content" on public.site_content for select to anon, authenticated using (true);
drop policy if exists "Admins manage site content" on public.site_content;
create policy "Admins manage site content" on public.site_content for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

alter table public.site_profile add column if not exists about_gallery text[] not null default '{}'::text[];

drop policy if exists "Public can view homepage banner images" on storage.objects;
create policy "Public can view homepage banner images" on storage.objects for select to anon, authenticated using (bucket_id = 'site-banners');
drop policy if exists "Admins can upload homepage banner images" on storage.objects;
create policy "Admins can upload homepage banner images" on storage.objects for insert to authenticated with check (bucket_id = 'site-banners' and public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admins can update homepage banner images" on storage.objects;
create policy "Admins can update homepage banner images" on storage.objects for update to authenticated using (bucket_id = 'site-banners' and public.has_role(auth.uid(), 'admin')) with check (bucket_id = 'site-banners' and public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admins can delete homepage banner images" on storage.objects;
create policy "Admins can delete homepage banner images" on storage.objects for delete to authenticated using (bucket_id = 'site-banners' and public.has_role(auth.uid(), 'admin'));