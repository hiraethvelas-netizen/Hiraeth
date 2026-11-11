-- Disposable PostgreSQL-only fixture. Never run against the store database.
do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role service_role bypassrls; exception when duplicate_object then null; end $$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '')
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
create function public.has_role(p_user_id uuid, p_role text) returns boolean
language sql stable as $$
  select p_user_id = '00000000-0000-0000-0000-000000000001'::uuid and p_role = 'admin'
$$;
create table public.products(
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  description text, category_id uuid, price numeric not null default 0, sale_price numeric,
  stock integer not null default 0, sku text, fragrance text, images text[] not null default '{}',
  status text not null default 'draft', weight_grams numeric, dimensions text,
  variants jsonb not null default '[]', product_type text, product_badge text,
  features text[], collection text, portal_id uuid, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
create policy admin_products on public.products for all to authenticated
  using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
grant select, insert, update, delete on public.products to authenticated;
create table public.orders(
  id uuid primary key default gen_random_uuid(), user_id uuid,
  customer_email text, customer_name text, shipping_address jsonb,
  payment_method text, payment_status text, payment_id text,
  status text, subtotal numeric, discount numeric, shipping numeric, total numeric,
  coupon_code text, created_at timestamptz not null default now()
);
create table public.order_items(
  id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id),
  product_id uuid references public.products(id), product_name text,
  quantity integer not null, unit_price numeric, variant_details jsonb not null default '{}'
);
\ir ../../supabase/migrations/20261026000200_product_fragrance_pyramid.sql
\ir ../../supabase/migrations/20261102000100_repair_essence_registration_and_recipes.sql
create table public.essence_stock_movements(
  id uuid primary key default gen_random_uuid(), essence_id uuid not null references public.essences(id),
  movement_type text not null check(movement_type in('purchase','sale_consumption','adjustment','loss','reversal')),
  quantity_ml numeric not null, balance_after_ml numeric not null,
  order_id uuid references public.orders(id), order_item_id uuid references public.order_items(id),
  note text, created_at timestamptz not null default now()
);
alter table public.essence_stock_movements enable row level security;
grant select, insert on public.essence_stock_movements to authenticated;
create policy admin_essence_movements on public.essence_stock_movements for all to authenticated
  using(public.has_role(auth.uid(),'admin')) with check(public.has_role(auth.uid(),'admin'));
\ir ../../supabase/migrations/20261102000400_ecommerce_checkout_payments_shipping_fiscal.sql
\ir ../../supabase/migrations/20261111000100_variant_essence_recipes.sql
insert into auth.users values ('00000000-0000-0000-0000-000000000002');
