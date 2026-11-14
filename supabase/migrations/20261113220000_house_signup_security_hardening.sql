-- Hiraeth: o selo pertence ao cadastro normal; o NFC segue como experiência opcional.
-- Migration aditiva/idempotente. Não altera clientes, compras, estoque ou etiquetas NFC já emitidas.
begin;

-- Cada membro escolhe apenas a própria casa; nenhuma prova de NFC é exigida.
drop policy if exists "member houses verified nfc insert" on public.member_houses;
drop policy if exists "member houses verified nfc update" on public.member_houses;
drop policy if exists "member houses self insert" on public.member_houses;
drop policy if exists "member houses self update" on public.member_houses;
create policy "member houses self insert" on public.member_houses
  for insert to authenticated
  with check (auth.uid() = user_id);
create policy "member houses self update" on public.member_houses
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- O placar só revela agregados, inclusive de membros que se cadastraram sem NFC.
create or replace function public.house_totals()
returns table(house text, participant_count bigint)
language sql stable security definer set search_path = ''
as $$
  select possible.house, count(m.user_id)::bigint
  from (values ('leao'),('texugo'),('aguia'),('serpente')) as possible(house)
  left join public.member_houses m on m.house = possible.house
  group by possible.house;
$$;
revoke all on function public.house_totals() from public;
grant execute on function public.house_totals() to anon, authenticated;

-- Selos só são mostrados a integrantes da comunidade; não dependem de NFC.
create or replace function public.get_member_houses(p_user_ids uuid[])
returns table(user_id uuid, house text)
language sql stable security definer set search_path = ''
as $$
  select m.user_id, m.house
  from public.member_houses m
  where auth.uid() is not null
    and coalesce(cardinality(p_user_ids), 0) between 1 and 200
    and m.user_id = any(p_user_ids)
    and m.house in ('leao', 'texugo', 'aguia', 'serpente')
    and exists (
      select 1 from public.community_memberships viewer where viewer.user_id = auth.uid()
    );
$$;
revoke all on function public.get_member_houses(uuid[]) from public;
grant execute on function public.get_member_houses(uuid[]) to authenticated;

-- A lista de inscrições à comunidade é privada (não listar todos os UUIDs).
drop policy if exists "members can view community membership list" on public.community_memberships;
drop policy if exists "members read own community membership" on public.community_memberships;
create policy "members read own community membership" on public.community_memberships
  for select to authenticated
  using (user_id = auth.uid());

-- Bibliotecas privadas (incluindo order_item_id, status e anotações) nunca ficam
-- expostas integralmente pela API a outros clientes.
drop policy if exists "public profiles read candle libraries" on public.community_library;
drop policy if exists "members read visible candle libraries" on public.community_library;
drop policy if exists "owners read their own full candle library" on public.community_library;
create policy "owners read their own full candle library" on public.community_library
  for select to authenticated using (user_id = auth.uid());

-- Compatibilidade com instalações antigas: a preferência de privacidade ainda pode
-- não existir no banco apesar de constar em uma migration antiga do repositório.
alter table public.community_profiles
  add column if not exists library_visible boolean not null default true;

-- API de leitura limitada à estante que o titular optou por tornar pública.
-- Retorna somente campos de apresentação; não inclui IDs de compras, notas pessoais,
-- datas de compra, estado do pedido, quantidades, dados de variação ou vínculos financeiros.
create or replace function public.get_public_candle_library(p_user_id uuid)
returns setof jsonb
language sql stable security definer set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'id', candle.id, 'title', candle.title, 'aroma', candle.aroma,
    'image_url', candle.image_url, 'category', candle.category,
    'rating', candle.rating, 'favorite', candle.favorite,
    'finished', candle.finished
  )
  from public.community_library candle
  where candle.user_id = p_user_id
    and auth.uid() is not null
    and exists (
      select 1 from public.community_memberships viewer where viewer.user_id = auth.uid()
    )
    and exists (
      select 1 from public.community_memberships owner_member
      where owner_member.user_id = candle.user_id
    )
    and coalesce((
      select profile.library_visible from public.community_profiles profile
      where profile.user_id = candle.user_id
    ), true);
$$;
revoke all on function public.get_public_candle_library(uuid) from public, anon;
grant execute on function public.get_public_candle_library(uuid) to authenticated;

-- Variações/drafts do catálogo não são expostos a outros clientes autenticados.
drop policy if exists "authenticated read products" on public.products;
drop policy if exists "customers read published products" on public.products;
create policy "customers read published products" on public.products
  for select to authenticated using (status = 'published');
-- A política existente "admins manage products" continua permitindo o painel admin.

-- Uploads do público precisam estar vinculados à conta autenticada.
-- Site-banners / product-images são ativos GERIDOS por admin e mantêm suas regras admin,
-- já vinculadas à função has_role, independentemente de "owner" de arquivo.
drop policy if exists "Public can upload Hiraeth review media" on storage.objects;
drop policy if exists "Members upload their own review media" on storage.objects;
create policy "Members upload their own review media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'review-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
-- Fotos já publicadas permanecem acessíveis por URL; nenhum arquivo é excluído.

commit;
