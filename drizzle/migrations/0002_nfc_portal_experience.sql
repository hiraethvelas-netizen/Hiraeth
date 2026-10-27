-- NFC portal experience enhancements and least-privilege access
-- Additive migration: existing portal data and store tables are preserved.
alter table public.portals
  add column if not exists intro_video_url text,
  add column if not exists intro_cta_text text not null default 'Atravesse o Portal',
  add column if not exists store_category_url text;

-- Keep public portal reading limited to published portal content.
drop policy if exists "authenticated read portals" on public.portals;
drop policy if exists "public read published portals" on public.portals;
create policy "public read published portals"
  on public.portals for select to anon
  using (status = 'published');
create policy "authenticated read published portals"
  on public.portals for select to authenticated
  using (status = 'published');
-- The existing admins manage portals policy remains the only authenticated write path.

-- Fragment content is public only when visible and attached to a published portal.
drop policy if exists "authenticated read fragments" on public.portal_fragments;
drop policy if exists "public read visible fragments" on public.portal_fragments;
create policy "public read visible fragments"
  on public.portal_fragments for select to anon
  using (
    visible = true
    and exists (
      select 1 from public.portals p
      where p.id = portal_id and p.status = 'published'
    )
  );
create policy "authenticated read visible published fragments"
  on public.portal_fragments for select to authenticated
  using (
    visible = true
    and exists (
      select 1 from public.portals p
      where p.id = portal_id and p.status = 'published'
    )
  );
-- The existing admins manage fragments policy preserves admin CRUD.

-- Add the first portal as a draft so it cannot be accessed publicly before review.
insert into public.portals
  (slug, name, universe, intro_title, intro_subtitle, intro_enabled,
   intro_cta_text, status, spotify_visible, store_category_url)
values
  ('o-mundo-de-magia', 'O Mundo de Magia', 'Fantasia literária',
   'Seja bem-vindo ao mundo de magia', null, true,
   'Atravesse o Portal', 'draft', true, '/loja')
on conflict (slug) do nothing;
