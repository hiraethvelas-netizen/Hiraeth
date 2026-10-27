-- Hiraeth homepage banners: persistent content managed from the admin area.
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

alter table public.site_banners enable row level security;

create policy "Anyone can view active homepage banners"
on public.site_banners for select
using (active = true);

create policy "Admins can manage homepage banners"
on public.site_banners for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-banners', 'site-banners', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can view homepage banner images"
on storage.objects for select
using (bucket_id = 'site-banners');

create policy "Admins can upload homepage banner images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'site-banners' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can update homepage banner images"
on storage.objects for update
to authenticated
using (bucket_id = 'site-banners' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'site-banners' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete homepage banner images"
on storage.objects for delete
to authenticated
using (bucket_id = 'site-banners' and public.has_role(auth.uid(), 'admin'));
