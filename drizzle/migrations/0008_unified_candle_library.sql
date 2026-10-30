-- Biblioteca Hiraeth unificada: community_library passa a ser a fonte única.
alter table public.community_library
  add column if not exists category text,
  add column if not exists acquired_at date,
  add column if not exists notes text,
  add column if not exists rating integer check (rating between 1 and 5),
  add column if not exists product_id uuid references public.products(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

-- Preserva e migra os registros antigos de Minha Biblioteca sem duplicar velas já cadastradas.
insert into public.community_library (user_id, title, aroma, image_url, acquired_at, notes, product_id, created_at)
select li.user_id,
       coalesce(nullif(btrim(li.custom_name), ''), p.name, 'Vela Hiraeth'),
       p.fragrance,
       case when coalesce(array_length(p.images, 1), 0) > 0 then p.images[1] else null end,
       li.acquired_at,
       li.notes,
       li.product_id,
       li.created_at
from public.library_items li
left join public.products p on p.id = li.product_id
where not exists (
  select 1 from public.community_library cl
  where cl.user_id = li.user_id
    and lower(btrim(cl.title)) = lower(btrim(coalesce(nullif(li.custom_name, ''), p.name, 'Vela Hiraeth')))
);

-- Leitura da estante no perfil público; escrita continua restrita ao próprio usuário.
drop policy if exists "members view community candle libraries" on public.community_library;
create policy "public profiles read candle libraries" on public.community_library
  for select to authenticated using (true);

drop policy if exists "users manage own community candle library" on public.community_library;
create policy "users manage own community candle library" on public.community_library
  for all to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.community_library to authenticated;
create index if not exists community_library_user_category_idx on public.community_library (user_id, category, created_at desc);
