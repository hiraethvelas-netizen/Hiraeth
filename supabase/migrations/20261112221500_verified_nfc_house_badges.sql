-- Acesso exclusivo aos selos das casas por código NFC individual, reivindicado uma única vez.
-- Etiquetas antigas com URL pública continuam funcionando como conteúdo, mas não liberam selo.
create table if not exists public.portal_nfc_access_codes (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portals(id) on delete restrict,
  token_hash text not null unique,
  issued_by uuid references auth.users(id) on delete set null,
  claimed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  constraint nfc_claim_pair check ((claimed_by is null) = (claimed_at is null))
);
create index if not exists portal_nfc_access_claimed_by_idx
  on public.portal_nfc_access_codes(claimed_by, portal_id);
alter table public.portal_nfc_access_codes enable row level security;
revoke all on public.portal_nfc_access_codes from public, anon, authenticated;
grant all on public.portal_nfc_access_codes to service_role;
drop policy if exists "admins inspect nfc claims" on public.portal_nfc_access_codes;
create policy "admins inspect nfc claims" on public.portal_nfc_access_codes for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
grant select on public.portal_nfc_access_codes to authenticated;

-- O segredo é devolvido apenas uma vez ao administrador e nunca é salvo em texto puro.
create or replace function public.create_house_nfc_access_code(p_portal_slug text)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_portal uuid; v_code text;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Acesso restrito à administração';
  end if;
  select id into v_portal from public.portals
    where slug = p_portal_slug and status = 'published';
  if v_portal is null then raise exception 'Portal publicado não encontrado'; end if;
  v_code := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  insert into public.portal_nfc_access_codes(portal_id, token_hash, issued_by)
  values(v_portal, encode(sha256(convert_to(v_code, 'UTF8')), 'hex'), auth.uid());
  return v_code;
end;
$$;
revoke all on function public.create_house_nfc_access_code(text) from public;
grant execute on function public.create_house_nfc_access_code(text) to authenticated;

create or replace function public.claim_house_nfc_access_code(p_token text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_entry public.portal_nfc_access_codes%rowtype;
begin
  if auth.uid() is null or p_token !~ '^[0-9a-f]{64}$' then return false; end if;
  select * into v_entry from public.portal_nfc_access_codes
    where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    for update;
  if not found then return false; end if;
  if v_entry.claimed_by is not null then return v_entry.claimed_by = auth.uid(); end if;
  update public.portal_nfc_access_codes
    set claimed_by = auth.uid(), claimed_at = now()
    where id = v_entry.id;
  return true;
end;
$$;
revoke all on function public.claim_house_nfc_access_code(text) from public;
grant execute on function public.claim_house_nfc_access_code(text) to authenticated;

create or replace function public.has_verified_house_nfc_access(p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_user is not null and exists (
    select 1
    from public.portal_nfc_access_codes code
    join public.portals portal on portal.id = code.portal_id
    where code.claimed_by = p_user
      and portal.slug in ('o-mundo-de-magia', 'mundo-da-magia', 'harry-potter')
  );
$$;
revoke all on function public.has_verified_house_nfc_access(uuid) from public;
grant execute on function public.has_verified_house_nfc_access(uuid) to authenticated;

-- Todos podem manter sua conta, mas somente titulares verificados podem escolher casa.
drop policy if exists "member houses self insert" on public.member_houses;
drop policy if exists "member houses self update" on public.member_houses;
create policy "member houses verified nfc insert" on public.member_houses for insert to authenticated
  with check (user_id = auth.uid() and public.has_verified_house_nfc_access(auth.uid()));
create policy "member houses verified nfc update" on public.member_houses for update to authenticated
  using (user_id = auth.uid() and public.has_verified_house_nfc_access(auth.uid()))
  with check (user_id = auth.uid() and public.has_verified_house_nfc_access(auth.uid()));

-- A Taça e os selinhos ignoram registros legados de contas não verificadas.
create or replace function public.house_totals()
returns table(house text, participant_count bigint)
language sql stable security definer set search_path = ''
as $$
  select possible.house, count(m.user_id)::bigint
  from (values ('leao'),('texugo'),('aguia'),('serpente')) as possible(house)
  left join public.member_houses m
    on m.house = possible.house and public.has_verified_house_nfc_access(m.user_id)
  group by possible.house;
$$;
revoke all on function public.house_totals() from public;
grant execute on function public.house_totals() to anon, authenticated;

create or replace function public.get_member_houses(p_user_ids uuid[])
returns table(user_id uuid, house text)
language sql stable security definer set search_path = ''
as $$
  select m.user_id, m.house
  from public.member_houses m
  where auth.uid() is not null
    and coalesce(cardinality(p_user_ids), 0) between 1 and 200
    and m.user_id = any(p_user_ids)
    and exists (select 1 from public.community_memberships c where c.user_id = auth.uid())
    and m.house is not null
    and public.has_verified_house_nfc_access(m.user_id);
$$;
revoke all on function public.get_member_houses(uuid[]) from public;
grant execute on function public.get_member_houses(uuid[]) to authenticated;
