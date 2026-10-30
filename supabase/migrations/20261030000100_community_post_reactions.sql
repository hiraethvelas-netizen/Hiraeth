-- Reações do Feed do Círculo do Fogo.
-- Requer a migration que cria community_posts e community_memberships.

create table if not exists public.community_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('heart', 'fire')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.community_post_reactions enable row level security;
grant select, insert, update, delete on public.community_post_reactions to authenticated;
grant all on public.community_post_reactions to service_role;

drop policy if exists "members view post reactions" on public.community_post_reactions;
create policy "members view post reactions" on public.community_post_reactions
  for select to authenticated
  using (exists (select 1 from public.community_memberships m where m.user_id = auth.uid()));

drop policy if exists "members add own post reactions" on public.community_post_reactions;
create policy "members add own post reactions" on public.community_post_reactions
  for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.community_memberships m where m.user_id = auth.uid()));

drop policy if exists "members change own post reactions" on public.community_post_reactions;
create policy "members change own post reactions" on public.community_post_reactions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (select 1 from public.community_memberships m where m.user_id = auth.uid()));

drop policy if exists "members remove own post reactions" on public.community_post_reactions;
create policy "members remove own post reactions" on public.community_post_reactions
  for delete to authenticated
  using (auth.uid() = user_id);

create index if not exists community_post_reactions_post_idx
  on public.community_post_reactions (post_id, reaction_type);
