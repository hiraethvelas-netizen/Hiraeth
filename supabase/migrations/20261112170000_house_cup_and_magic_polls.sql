
-- Taça das Casas e enquetes do Mundo da Magia.
-- Nenhum voto ou participante é criado artificialmente. Dados antigos ficam intactos.
create table if not exists public.member_houses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  house text check (house in ('leao','texugo','aguia','serpente')),
  updated_at timestamptz not null default now()
);
alter table public.member_houses enable row level security;
grant select, insert, update on public.member_houses to authenticated;
grant all on public.member_houses to service_role;
drop policy if exists "member houses self read" on public.member_houses;
create policy "member houses self read" on public.member_houses for select to authenticated using (user_id = auth.uid());
drop policy if exists "member houses self insert" on public.member_houses;
create policy "member houses self insert" on public.member_houses for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "member houses self update" on public.member_houses;
create policy "member houses self update" on public.member_houses for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Placar agregado: não publica identificadores, e sempre retorna as quatro casas.
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

-- Selos visíveis somente aos membros da comunidade, e apenas para IDs já conhecidos pela interface.
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
    and m.house is not null;
$$;
revoke all on function public.get_member_houses(uuid[]) from public;
grant execute on function public.get_member_houses(uuid[]) to authenticated;

create table if not exists public.community_magic_polls (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 8 and 220),
  options text[] not null check (coalesce(array_length(options,1),0) between 3 and 4),
  position integer not null default 0,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.community_magic_polls enable row level security;
grant select on public.community_magic_polls to anon, authenticated;
grant insert, update, delete on public.community_magic_polls to authenticated;
grant all on public.community_magic_polls to service_role;
drop policy if exists "published or admin polls visible" on public.community_magic_polls;
create policy "published or admin polls visible" on public.community_magic_polls for select to anon, authenticated
  using (active or coalesce(public.has_role(auth.uid(), 'admin'), false));
drop policy if exists "admin manages polls" on public.community_magic_polls;
create policy "admin manages polls" on public.community_magic_polls for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.community_magic_votes (
  poll_id uuid not null references public.community_magic_polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index integer not null check (option_index between 0 and 3),
  updated_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);
create index if not exists community_magic_votes_poll_idx on public.community_magic_votes(poll_id, option_index);
alter table public.community_magic_votes enable row level security;
grant select, insert, update on public.community_magic_votes to authenticated;
grant all on public.community_magic_votes to service_role;
drop policy if exists "vote self read" on public.community_magic_votes;
create policy "vote self read" on public.community_magic_votes for select to authenticated using (user_id = auth.uid());
drop policy if exists "vote self insert" on public.community_magic_votes;
create policy "vote self insert" on public.community_magic_votes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "vote self update" on public.community_magic_votes;
create policy "vote self update" on public.community_magic_votes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Proteção no servidor: não aceitar índices inexistentes nem votos em enquetes arquivadas.
create or replace function public.validate_magic_poll_vote()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare choices text[]; published boolean;
begin
  select p.options, p.active into choices, published
  from public.community_magic_polls p where p.id = new.poll_id;
  if not found or published is not true or new.option_index < 0
      or new.option_index >= coalesce(array_length(choices, 1), 0) then
    raise exception 'Voto inválido ou enquete indisponível';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists magic_vote_validation on public.community_magic_votes;
create trigger magic_vote_validation before insert or update on public.community_magic_votes
  for each row execute function public.validate_magic_poll_vote();

-- Uma enquete com votos mantém suas opções; para substituir opções, arquive e crie outra.
create or replace function public.prevent_voted_poll_options_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if old.options is distinct from new.options
     and exists (select 1 from public.community_magic_votes v where v.poll_id = old.id) then
    raise exception 'Enquete com votos: arquive e crie uma nova para modificar as opções';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists magic_poll_options_protection on public.community_magic_polls;
create trigger magic_poll_options_protection before update on public.community_magic_polls
  for each row execute function public.prevent_voted_poll_options_change();

-- Resultados anônimos por pergunta, com opções sem votos incluídas.
create or replace function public.magic_poll_results(p_poll uuid)
returns table(option_index integer, vote_count bigint)
language sql stable security definer set search_path = ''
as $$
  select n.idx, count(v.user_id)::bigint
  from public.community_magic_polls p
  cross join lateral generate_series(0, array_length(p.options,1)-1) as n(idx)
  left join public.community_magic_votes v on v.poll_id = p.id and v.option_index = n.idx
  where p.id = p_poll and (p.active or coalesce(public.has_role(auth.uid(), 'admin'), false))
  group by n.idx
  order by n.idx;
$$;
revoke all on function public.magic_poll_results(uuid) from public;
grant execute on function public.magic_poll_results(uuid) to anon, authenticated;

-- Exemplos editoriais que a administração poderá arquivar/editar.
insert into public.community_magic_polls(question, options, position, active)
select seed.question, seed.options, seed.position, true
from (values
 ('Como você imagina o aroma de um jovem bruxo aventureiro?',
  array['Papel antigo e chá','Cedro e chuva','Baunilha e canela','Vento fresco e grama'], 10),
 ('Como seria uma tarde na cabana do guardião da floresta?',
  array['Lenha e chocolate quente','Terra molhada e pinheiros','Biscoitos recém-assados','Couro, madeira e café'], 20),
 ('Qual fragrância combina com os corredores de um castelo mágico?',
  array['Madeira, âmbar e livros','Ervas e poções frescas','Florais e lareira','Chuva, pedra e musgo'], 30)
) as seed(question, options, position)
where not exists (select 1 from public.community_magic_polls p where p.question = seed.question);
