-- Capas de interesses e biblioteca independente de velas Hiraeth no Círculo do Fogo.
alter table public.community_interests add column if not exists image_url text;

create table if not exists public.community_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  aroma text,
  image_url text,
  created_at timestamptz not null default now()
);
alter table public.community_library enable row level security;
grant select, insert, delete on public.community_library to authenticated;
grant all on public.community_library to service_role;

drop policy if exists "members view community candle libraries" on public.community_library;
create policy "members view community candle libraries" on public.community_library
  for select to authenticated using (
    exists (select 1 from public.community_memberships m where m.user_id = auth.uid())
  );

drop policy if exists "users manage own community candle library" on public.community_library;
create policy "users manage own community candle library" on public.community_library
  for all to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (
    select 1 from public.community_memberships m where m.user_id = auth.uid()
  ));

create index if not exists community_library_user_idx on public.community_library (user_id, created_at desc);
