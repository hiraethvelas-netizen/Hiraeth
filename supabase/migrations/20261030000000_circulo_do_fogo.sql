-- Círculo do Fogo: estrutura base da comunidade.
-- O Clube do Livro é uma área independente.

create table if not exists public.community_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now()
);
create table if not exists public.community_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  avatar_url text,
  instagram_url text,
  tiktok_url text,
  other_social_url text,
  bio text,
  updated_at timestamptz not null default now()
);
create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 3000),
  created_at timestamptz not null default now()
);
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 5000),
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.community_interests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  interest_type text not null check (interest_type in ('book','movie','series','other')),
  title text not null check (char_length(title) between 1 and 160),
  created_at timestamptz not null default now()
);
create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.community_memberships enable row level security;
alter table public.community_profiles enable row level security;
alter table public.community_messages enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_interests enable row level security;
alter table public.community_post_comments enable row level security;

grant select, insert on public.community_memberships to authenticated;
grant select, insert, update on public.community_profiles to authenticated;
grant select, insert on public.community_messages to authenticated;
grant select, insert, update, delete on public.community_posts to authenticated;
grant select, insert, update, delete on public.community_interests to authenticated;
grant select, insert, delete on public.community_post_comments to authenticated;
grant all on public.community_memberships, public.community_profiles, public.community_messages, public.community_posts, public.community_interests, public.community_post_comments to service_role;

drop policy if exists "members can view community membership list" on public.community_memberships;
create policy "members can view community membership list" on public.community_memberships for select to authenticated using (true);
drop policy if exists "users can join community once" on public.community_memberships;
create policy "users can join community once" on public.community_memberships for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "community profiles visible to members" on public.community_profiles;
create policy "community profiles visible to members" on public.community_profiles for select to authenticated using (exists (select 1 from public.community_memberships m where m.user_id = auth.uid()));
drop policy if exists "users create own community profile" on public.community_profiles;
create policy "users create own community profile" on public.community_profiles for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.community_memberships m where m.user_id = auth.uid()));
drop policy if exists "users update own community profile" on public.community_profiles;
create policy "users update own community profile" on public.community_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "members read community chat" on public.community_messages;
create policy "members read community chat" on public.community_messages for select to authenticated using (exists (select 1 from public.community_memberships m where m.user_id = auth.uid()));
drop policy if exists "members send community messages" on public.community_messages;
create policy "members send community messages" on public.community_messages for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.community_memberships m where m.user_id = auth.uid()));

drop policy if exists "members read community feed" on public.community_posts;
create policy "members read community feed" on public.community_posts for select to authenticated using (exists (select 1 from public.community_memberships m where m.user_id = auth.uid()));
drop policy if exists "members publish to community feed" on public.community_posts;
create policy "members publish to community feed" on public.community_posts for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.community_memberships m where m.user_id = auth.uid()));
drop policy if exists "authors edit own community posts" on public.community_posts;
create policy "authors edit own community posts" on public.community_posts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "authors or admins delete community posts" on public.community_posts;
create policy "authors or admins delete community posts" on public.community_posts for delete to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "members view community interests" on public.community_interests;
create policy "members view community interests" on public.community_interests for select to authenticated using (exists (select 1 from public.community_memberships m where m.user_id = auth.uid()));
drop policy if exists "users manage own interests" on public.community_interests;
create policy "users manage own interests" on public.community_interests for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "members read post comments" on public.community_post_comments;
create policy "members read post comments" on public.community_post_comments for select to authenticated using (exists (select 1 from public.community_memberships m where m.user_id = auth.uid()));
drop policy if exists "members comment on feed" on public.community_post_comments;
create policy "members comment on feed" on public.community_post_comments for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.community_memberships m where m.user_id = auth.uid()));
drop policy if exists "authors or admins delete comments" on public.community_post_comments;
create policy "authors or admins delete comments" on public.community_post_comments for delete to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create index if not exists community_messages_created_idx on public.community_messages (created_at desc);
create index if not exists community_posts_created_idx on public.community_posts (created_at desc);
create index if not exists community_post_comments_post_idx on public.community_post_comments (post_id, created_at);
create index if not exists community_interests_user_idx on public.community_interests (user_id, created_at desc);
