-- Isolated, disposable PostgreSQL test fixture. NEVER run against the live database.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.test_user',true),'')::uuid $$;
create function public.has_role(uuid,text) returns boolean language sql stable as $$ select coalesce(current_setting('app.test_admin',true),'false')='true' $$;
create table public.categories(id uuid primary key,name text);
create table public.products(id uuid primary key,name text,status text,fragrance text,images text[],category_id uuid,collection text);
create table public.essences(id uuid primary key,name text,active boolean default true,stock_ml numeric, supplier text);
create table public.product_essences(id bigint generated always as identity primary key,product_id uuid references public.products(id),essence_id uuid references public.essences(id),quantity_ml numeric check(quantity_ml>0),unique(product_id,essence_id));
create table public.community_library(id uuid primary key default gen_random_uuid(),title text,user_id uuid,aroma text,image_url text,category text,acquired_at date,product_id uuid,order_item_id uuid,quantity integer,purchase_status text,variant_details jsonb,updated_at timestamptz);
create unique index community_library_order_item_uidx on public.community_library(order_item_id) where order_item_id is not null;
create table public.orders(id uuid primary key,user_id uuid,status text,created_at timestamptz default now(),payment_id text);
create table public.order_items(id uuid primary key,order_id uuid,product_id uuid,product_name text,quantity integer,variant_details jsonb,unit_price numeric default 10);
grant usage on schema public,auth to anon,authenticated;
grant select on public.products,public.essences to authenticated;
grant select,insert,delete,update on public.product_essences to authenticated;
grant usage on sequence public.product_essences_id_seq to authenticated;
grant update on public.products to authenticated;
insert into public.products(id,name,status) values('00000000-0000-0000-0000-000000000001','Vela de teste','published'),('00000000-0000-0000-0000-000000000002','Rascunho de teste','draft');
insert into public.essences values('00000000-0000-0000-0000-000000000003','Baunilha',true,20,'Fornecedor fictício');
insert into public.community_library(id,title) values('00000000-0000-0000-0000-000000000004','Vela de teste');

create table public.promotions(id uuid primary key,name text,active boolean default true,visible boolean default true,starts_at timestamptz,ends_at timestamptz,min_cart_value numeric default 0,usage_limit integer,usage_count integer not null default 0);
