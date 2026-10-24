-- Perfis e roles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "users read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);

create type public.app_role as enum ('admin', 'customer');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''));
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Categorias
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  position int not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon;
grant select, insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "public read visible categories" on public.categories for select to anon using (visible);
create policy "authenticated read categories" on public.categories for select to authenticated using (true);
create policy "admins manage categories" on public.categories for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

insert into public.categories (name, slug, position) values
  ('Livros', 'livros', 1), ('Filmes', 'filmes', 2), ('Séries', 'series', 3),
  ('Coleções especiais', 'colecoes-especiais', 4), ('Novidades', 'novidades', 5),
  ('Kits', 'kits', 6), ('Camisetas', 'camisetas', 7);

-- Portais NFC
create table public.portals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  universe text,
  category text,
  cover_url text,
  intro_title text,
  intro_subtitle text,
  intro_enabled boolean not null default true,
  intro_duration_ms int not null default 3000,
  spotify_playlist_url text,
  spotify_title text,
  spotify_description text,
  spotify_visible boolean not null default true,
  theme jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.portals to anon;
grant select, insert, update, delete on public.portals to authenticated;
grant all on public.portals to service_role;
alter table public.portals enable row level security;
create policy "public read published portals" on public.portals for select to anon using (status = 'published');
create policy "authenticated read portals" on public.portals for select to authenticated using (true);
create policy "admins manage portals" on public.portals for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.portal_fragments (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.portals(id) on delete cascade,
  title text not null,
  body text not null,
  reference text,
  context text,
  image_url text,
  caption text,
  position int not null default 0,
  visible boolean not null default true
);
grant select on public.portal_fragments to anon;
grant select, insert, update, delete on public.portal_fragments to authenticated;
grant all on public.portal_fragments to service_role;
alter table public.portal_fragments enable row level security;
create policy "public read visible fragments" on public.portal_fragments for select to anon using (visible);
create policy "authenticated read fragments" on public.portal_fragments for select to authenticated using (true);
create policy "admins manage fragments" on public.portal_fragments for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Produtos
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  collection text,
  price numeric(10,2) not null default 0,
  sale_price numeric(10,2),
  stock int not null default 0,
  sku text,
  weight_grams int,
  dimensions text,
  fragrance text,
  features text[],
  images text[] not null default '{}',
  portal_id uuid references public.portals(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public read published products" on public.products for select to anon using (status = 'published');
create policy "authenticated read products" on public.products for select to authenticated using (true);
create policy "admins manage products" on public.products for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Pedidos
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  status text not null default 'pending' check (status in ('pending','paid','shipped','delivered','cancelled','refunded')),
  total numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  customer_email text,
  customer_name text,
  shipping_address jsonb,
  payment_method text,
  payment_id text,
  payment_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "users read own orders" on public.orders for select to authenticated using (auth.uid() = user_id);
create policy "users insert own orders" on public.orders for insert to authenticated with check (auth.uid() = user_id);
create policy "admins manage orders" on public.orders for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity int not null default 1,
  unit_price numeric(10,2) not null
);
grant select, insert on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "users read own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "users insert own order items" on public.order_items for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "admins manage order items" on public.order_items for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Minha Biblioteca e desejos
create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id uuid references public.products(id) on delete set null,
  custom_name text,
  acquired_at date,
  notes text,
  favorite boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.library_items to authenticated;
grant all on public.library_items to service_role;
alter table public.library_items enable row level security;
create policy "users manage own library" on public.library_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
grant select, insert, delete on public.wishlist_items to authenticated;
grant all on public.wishlist_items to service_role;
alter table public.wishlist_items enable row level security;
create policy "users manage own wishlist" on public.wishlist_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Newsletter
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);
grant insert on public.newsletter_subscribers to anon;
grant select, insert, delete on public.newsletter_subscribers to authenticated;
grant all on public.newsletter_subscribers to service_role;
alter table public.newsletter_subscribers enable row level security;
create policy "anyone can subscribe" on public.newsletter_subscribers for insert to anon with check (true);
create policy "admins read subscribers" on public.newsletter_subscribers for select to authenticated using (public.has_role(auth.uid(), 'admin'));