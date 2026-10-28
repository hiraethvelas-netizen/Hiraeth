-- Hiraeth: product variants and promotions
-- Apply this migration to the connected Supabase project before deploying the UI.
alter table public.products
  add column if not exists variants jsonb not null default '[]'::jsonb;

alter table public.order_items
  add column if not exists variant_details jsonb not null default '{}'::jsonb;

alter table public.orders
  add column if not exists subtotal numeric not null default 0,
  add column if not exists discount numeric not null default 0,
  add column if not exists coupon_code text;

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('coupon','buy_x_pay_y','free_shipping','gift','automatic_discount')),
  code text,
  discount_type text check (discount_type in ('percent','fixed')),
  discount_value numeric not null default 0,
  buy_quantity integer,
  pay_quantity integer,
  min_cart_value numeric not null default 0,
  eligible_product_ids uuid[] not null default '{}',
  eligible_category_ids uuid[] not null default '{}',
  all_products boolean not null default true,
  gift_product_id uuid references public.products(id) on delete set null,
  gift_name text,
  visible boolean not null default false,
  active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.promotions enable row level security;
drop policy if exists "Public can view active visible promotions" on public.promotions;
create policy "Public can view active visible promotions"
  on public.promotions for select
  using (active = true and visible = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now()));

drop policy if exists "Admins manage promotions" on public.promotions;
create policy "Admins manage promotions"
  on public.promotions for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
