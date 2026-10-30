-- Círculo do Fogo: edição, fixação e reações do chat; edição administrativa do feed.
alter table public.community_messages
  add column if not exists edited_at timestamptz,
  add column if not exists is_pinned boolean not null default false;

create table if not exists public.community_message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.community_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('heart','fire')),
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

alter table public.community_message_reactions enable row level security;
grant select, insert, update, delete on public.community_message_reactions to authenticated;

drop policy if exists "members read message reactions" on public.community_message_reactions;
create policy "members read message reactions" on public.community_message_reactions
  for select to authenticated
  using (exists (select 1 from public.community_memberships m where m.user_id = auth.uid()));

drop policy if exists "members manage own message reactions" on public.community_message_reactions;
create policy "members manage own message reactions" on public.community_message_reactions
  for all to authenticated
  using (auth.uid() = user_id and exists (select 1 from public.community_memberships m where m.user_id = auth.uid()))
  with check (auth.uid() = user_id and exists (select 1 from public.community_memberships m where m.user_id = auth.uid()));

drop policy if exists "authors or admins edit community messages" on public.community_messages;
create policy "authors or admins edit community messages" on public.community_messages
  for update to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'::app_role))
  with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "authors or admins delete community messages" on public.community_messages;
create policy "authors or admins delete community messages" on public.community_messages
  for delete to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "admins pin community messages" on public.community_messages;
create policy "admins pin community messages" on public.community_messages
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role))
  with check (public.has_role(auth.uid(), 'admin'::app_role));

-- RLS UPDATE policies are permissive (OR). This trigger independently prevents
-- a non-admin author from changing is_pinned while still allowing body edits.
create or replace function public.guard_community_message_pin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_pinned is distinct from old.is_pinned
     and not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'Only community administrators can pin messages';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_community_message_pin on public.community_messages;
create trigger guard_community_message_pin
  before update on public.community_messages
  for each row execute function public.guard_community_message_pin();

drop policy if exists "authors or admins edit community posts" on public.community_posts;
create policy "authors or admins edit community posts" on public.community_posts
  for update to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'::app_role))
  with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'::app_role));

create index if not exists community_messages_pinned_created_idx
  on public.community_messages (is_pinned desc, created_at asc);
create index if not exists community_message_reactions_message_idx
  on public.community_message_reactions (message_id);
