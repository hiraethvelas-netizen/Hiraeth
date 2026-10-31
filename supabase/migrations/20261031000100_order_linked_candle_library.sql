-- Biblioteca Hiraeth: conecta cada linha de pedido à estante compartilhada.
-- Compras aparecem automaticamente; detalhes e foguinhos de compras são preenchidos após a entrega.

alter table public.community_library
  add column if not exists favorite boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists order_item_id uuid references public.order_items(id) on delete cascade,
  add column if not exists quantity integer not null default 1,
  add column if not exists purchase_status text,
  add column if not exists variant_details jsonb not null default '{}'::jsonb;

create unique index if not exists community_library_order_item_uidx
  on public.community_library (order_item_id)
  where order_item_id is not null;

create index if not exists community_library_user_category_idx
  on public.community_library (user_id, category, created_at desc);

-- A leitura da estante é pública para pessoas autenticadas; cada pessoa só altera
-- suas próprias velas e não pode apagar registros vinculados a pedidos.
alter table public.community_library enable row level security;
drop policy if exists "members view community candle libraries" on public.community_library;
drop policy if exists "public profiles read candle libraries" on public.community_library;
drop policy if exists "users manage own community candle library" on public.community_library;
drop policy if exists "users insert own candle library" on public.community_library;
drop policy if exists "users update own candle library" on public.community_library;
drop policy if exists "users delete own manual candle records" on public.community_library;

create policy "public profiles read candle libraries"
  on public.community_library for select to authenticated
  using (true);

create policy "users insert own candle library"
  on public.community_library for insert to authenticated
  with check (auth.uid() = user_id and order_item_id is null and purchase_status is null);

create policy "users update own candle library"
  on public.community_library for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own manual candle records"
  on public.community_library for delete to authenticated
  using (auth.uid() = user_id and order_item_id is null);

grant select, insert, update, delete on public.community_library to authenticated;
grant all on public.community_library to service_role;

-- Impede que alterações feitas pelo cliente falsifiquem vínculos ou estados de pedidos.
-- Atualizações internas disparadas pela mudança de status do pedido passam por uma
-- profundidade de trigger maior e podem sincronizar purchase_status normalmente.
create or replace function public.guard_purchased_community_library_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if pg_trigger_depth() = 1 and (
    new.order_item_id is distinct from old.order_item_id
    or new.purchase_status is distinct from old.purchase_status
    or new.product_id is distinct from old.product_id
    or new.quantity is distinct from old.quantity
    or new.variant_details is distinct from old.variant_details
  ) then
    raise exception 'Purchase links and statuses are managed by Hiraeth orders';
  end if;

  if old.order_item_id is not null
     and old.purchase_status is distinct from 'delivered'
     and pg_trigger_depth() = 1
     and (
       new.title is distinct from old.title
       or new.aroma is distinct from old.aroma
       or new.image_url is distinct from old.image_url
       or new.category is distinct from old.category
       or new.acquired_at is distinct from old.acquired_at
       or new.notes is distinct from old.notes
       or new.rating is distinct from old.rating
     ) then
    raise exception 'Candle details and rating can be edited after delivery';
  end if;

  return new;
end;
$function$;

drop trigger if exists guard_purchased_community_library_row on public.community_library;
create trigger guard_purchased_community_library_row
  before update on public.community_library
  for each row execute function public.guard_purchased_community_library_row();

-- Cria uma entrada para cada item de pedido associado a uma conta.
create or replace function public.add_order_item_to_community_library()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.community_library (
    user_id,
    title,
    aroma,
    image_url,
    category,
    acquired_at,
    product_id,
    order_item_id,
    quantity,
    purchase_status,
    variant_details,
    updated_at
  )
  select
    o.user_id,
    oi.product_name,
    p.fragrance,
    case when coalesce(array_length(p.images, 1), 0) > 0 then p.images[1] else null end,
    coalesce(c.name, p.collection),
    o.created_at::date,
    oi.product_id,
    oi.id,
    greatest(oi.quantity, 1),
    o.status,
    coalesce(oi.variant_details, '{}'::jsonb),
    now()
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  left join public.products p on p.id = oi.product_id
  left join public.categories c on c.id = p.category_id
  where oi.id = new.id
    and o.user_id is not null
    and o.status not in ('cancelled', 'refunded')
    and not exists (
      select 1
      from public.community_library existing
      where existing.user_id = o.user_id
        and existing.product_id = oi.product_id
        and existing.order_item_id is null
        and (existing.acquired_at is null or existing.acquired_at = o.created_at::date)
    )
  on conflict (order_item_id) where order_item_id is not null do nothing;

  return new;
end;
$$;

drop trigger if exists add_order_item_to_community_library on public.order_items;
create trigger add_order_item_to_community_library
  after insert on public.order_items
  for each row execute function public.add_order_item_to_community_library();

-- Mantém o estado da compra sincronizado com o pedido para liberar edição
-- apenas quando a administração marcar o pedido como entregue.
create or replace function public.sync_community_library_purchase_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    update public.community_library cl
       set purchase_status = new.status,
           updated_at = now()
      from public.order_items oi
     where cl.order_item_id = oi.id
       and oi.order_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_community_library_purchase_status on public.orders;
create trigger sync_community_library_purchase_status
  after update of status on public.orders
  for each row execute function public.sync_community_library_purchase_status();

-- Importa compras anteriores sem duplicar velas antigas que já foram migradas
-- para a estante pessoal.
insert into public.community_library (
  user_id,
  title,
  aroma,
  image_url,
  category,
  acquired_at,
  product_id,
  order_item_id,
  quantity,
  purchase_status,
  variant_details,
  updated_at
)
select
  o.user_id,
  oi.product_name,
  p.fragrance,
  case when coalesce(array_length(p.images, 1), 0) > 0 then p.images[1] else null end,
  coalesce(c.name, p.collection),
  o.created_at::date,
  oi.product_id,
  oi.id,
  greatest(oi.quantity, 1),
  o.status,
  coalesce(oi.variant_details, '{}'::jsonb),
  now()
from public.order_items oi
join public.orders o on o.id = oi.order_id
left join public.products p on p.id = oi.product_id
left join public.categories c on c.id = p.category_id
where o.user_id is not null
  and o.status not in ('cancelled', 'refunded')
  and not exists (
    select 1
    from public.community_library existing
    where existing.user_id = o.user_id
      and existing.product_id = oi.product_id
      and existing.order_item_id is null
      and (existing.acquired_at is null or existing.acquired_at = o.created_at::date)
  )
on conflict (order_item_id) where order_item_id is not null do nothing;
