-- Fragrance notes and per-product aroma formulas for Hiraeth.
create table if not exists public.essences (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  stock_ml numeric(12,3) not null default 0,
  minimum_stock_ml numeric(12,3) not null default 10,
  target_stock_ml numeric(12,3) not null default 50,
  supplier text,
  notes text,
  top_notes text[] not null default '{}',
  heart_notes text[] not null default '{}',
  base_notes text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.essences add column if not exists top_notes text[] not null default '{}';
alter table public.essences add column if not exists heart_notes text[] not null default '{}';
alter table public.essences add column if not exists base_notes text[] not null default '{}';
alter table public.essences enable row level security;
grant select on public.essences to anon;
grant select, insert, update, delete on public.essences to authenticated;
create policy "Public can read active fragrance notes" on public.essences for select to anon using (active = true);
create policy "Admins manage essences" on public.essences for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.product_essences (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  essence_id uuid not null references public.essences(id) on delete cascade,
  quantity_ml numeric(12,3) not null check (quantity_ml > 0),
  created_at timestamptz not null default now(),
  unique (product_id, essence_id)
);
alter table public.product_essences enable row level security;
grant select on public.product_essences to anon;
grant select, insert, update, delete on public.product_essences to authenticated;
create policy "Public can read formulas for published products" on public.product_essences for select to anon using (exists (select 1 from public.products p where p.id = product_id and p.status = 'published'));
create policy "Admins manage product fragrance formulas" on public.product_essences for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
