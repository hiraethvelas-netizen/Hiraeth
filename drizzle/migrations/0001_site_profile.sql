-- Editable Hiraeth about page and public contact details
create table if not exists public.site_profile (
  id boolean primary key default true check (id = true),
  about_story text not null default 'A Hiraeth nasceu do amor pelos livros, pelas histórias e pelos universos que continuam vivendo dentro de nós.',
  about_mari text not null default 'Eu sou Mari, a Guardiã da Chama. Crio cada detalhe da Hiraeth com carinho, nostalgia e a vontade de transformar histórias em experiências.',
  about_image_url text not null default '',
  story_image_url text not null default '',
  instagram_url text not null default '',
  whatsapp_number text not null default '',
  whatsapp_url text not null default '',
  contact_email text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.site_profile (id) values (true) on conflict (id) do nothing;
alter table public.site_profile enable row level security;
grant select on public.site_profile to anon, authenticated;
grant insert, update on public.site_profile to authenticated;
create policy "public can read site profile" on public.site_profile for select to anon using (true);
create policy "authenticated can read site profile" on public.site_profile for select to authenticated using (true);
create policy "admins insert site profile" on public.site_profile for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "admins update site profile" on public.site_profile for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
