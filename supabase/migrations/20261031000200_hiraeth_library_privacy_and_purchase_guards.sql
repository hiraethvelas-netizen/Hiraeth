-- Hiraeth: regras de visibilidade da estante e proteção dos dados de compras.
alter table public.community_profiles
  add column if not exists library_visible boolean not null default true;

-- A Biblioteca pode ser consultada pelo próprio titular ou por integrantes da
-- Comunidade quando o titular permite a exibição da coleção.
drop policy if exists "public profiles read candle libraries" on public.community_library;
create policy "members read visible candle libraries"
  on public.community_library for select to authenticated
  using (
    auth.uid() = user_id
    or (
      exists (
        select 1 from public.community_memberships viewer
        where viewer.user_id = auth.uid()
      )
      and exists (
        select 1 from public.community_memberships owner_membership
        where owner_membership.user_id = community_library.user_id
      )
      and coalesce((
        select profile.library_visible
        from public.community_profiles profile
        where profile.user_id = community_library.user_id
      ), true)
    )
  );

-- Dados oficiais do item comprado nunca podem ser alterados pelo cliente.
-- Depois da entrega, somente observações pessoais e foguinhos ficam liberados.
create or replace function public.guard_purchased_community_library_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if coalesce(current_setting('hiraeth.order_sync', true), 'false') <> 'true'
     and pg_trigger_depth() = 1
     and (
    new.order_item_id is distinct from old.order_item_id
    or new.purchase_status is distinct from old.purchase_status
    or new.product_id is distinct from old.product_id
    or new.quantity is distinct from old.quantity
    or new.variant_details is distinct from old.variant_details
  ) then
    raise exception 'Purchase links and statuses are managed by Hiraeth orders';
  end if;

  if old.order_item_id is not null
     and pg_trigger_depth() = 1
     and (
       new.title is distinct from old.title
       or new.aroma is distinct from old.aroma
       or new.image_url is distinct from old.image_url
       or new.category is distinct from old.category
       or new.acquired_at is distinct from old.acquired_at
     ) then
    raise exception 'Official candle details are managed by Hiraeth orders';
  end if;

  if old.order_item_id is not null
     and old.purchase_status is distinct from 'delivered'
     and pg_trigger_depth() = 1
     and (
       new.notes is distinct from old.notes
       or new.rating is distinct from old.rating
     ) then
    raise exception 'Candle notes and ratings can be edited after delivery';
  end if;

  return new;
end;
$function$;

-- Reaproveita uma vela antiga registrada manualmente somente quando o produto e a
-- data de compra correspondem; nos demais casos cria uma entrada por item de pedido.
create or replace function public.ensure_community_library_order_item(p_order_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid;
  v_order_created_at timestamptz;
  v_status text;
  v_product_id uuid;
  v_product_name text;
  v_quantity integer;
  v_variant_details jsonb;
  v_aroma text;
  v_image_url text;
  v_category text;
  v_existing_id uuid;
begin
  select
    o.user_id,
    o.created_at,
    o.status,
    oi.product_id,
    oi.product_name,
    oi.quantity,
    coalesce(oi.variant_details, '{}'::jsonb),
    p.fragrance,
    case when coalesce(array_length(p.images, 1), 0) > 0 then p.images[1] else null end,
    coalesce(c.name, p.collection)
  into
    v_user_id,
    v_order_created_at,
    v_status,
    v_product_id,
    v_product_name,
    v_quantity,
    v_variant_details,
    v_aroma,
    v_image_url,
    v_category
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  left join public.products p on p.id = oi.product_id
  left join public.categories c on c.id = p.category_id
  where oi.id = p_order_item_id;

  if not found or v_user_id is null or v_status in ('cancelled', 'refunded') then
    return;
  end if;

  if exists (
    select 1 from public.community_library linked
    where linked.order_item_id = p_order_item_id
  ) then
    return;
  end if;

  select existing.id
    into v_existing_id
    from public.community_library existing
   where existing.user_id = v_user_id
     and existing.order_item_id is null
     and existing.acquired_at = v_order_created_at::date
     and (
       (v_product_id is not null and existing.product_id = v_product_id)
       or lower(btrim(existing.title)) = lower(btrim(v_product_name))
     )
   order by case when existing.product_id = v_product_id then 0 else 1 end,
            existing.created_at asc
   limit 1;

  if v_existing_id is not null then
    perform set_config('hiraeth.order_sync', 'true', true);
    update public.community_library
       set order_item_id = p_order_item_id,
           quantity = greatest(coalesce(v_quantity, 1), 1),
           purchase_status = v_status,
           variant_details = v_variant_details,
           product_id = coalesce(product_id, v_product_id),
           aroma = coalesce(aroma, v_aroma),
           image_url = coalesce(image_url, v_image_url),
           category = coalesce(category, v_category),
           updated_at = now()
     where id = v_existing_id;
    perform set_config('hiraeth.order_sync', 'false', true);
  else
    insert into public.community_library (
      user_id, title, aroma, image_url, category, acquired_at,
      product_id, order_item_id, quantity, purchase_status, variant_details, updated_at
    ) values (
      v_user_id, v_product_name, v_aroma, v_image_url, v_category, v_order_created_at::date,
      v_product_id, p_order_item_id, greatest(coalesce(v_quantity, 1), 1),
      v_status, v_variant_details, now()
    )
    on conflict (order_item_id) where order_item_id is not null do nothing;
  end if;
end;
$function$;

revoke all on function public.ensure_community_library_order_item(uuid) from public, anon, authenticated;
grant execute on function public.ensure_community_library_order_item(uuid) to service_role;

create or replace function public.add_order_item_to_community_library()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  perform public.ensure_community_library_order_item(new.id);
  return new;
end;
$function$;

drop trigger if exists add_order_item_to_community_library on public.order_items;
create trigger add_order_item_to_community_library
  after insert on public.order_items
  for each row execute function public.add_order_item_to_community_library();

-- Reprocessa compras anteriores para preencher vínculos ausentes e evitar
-- que velas antigas já registradas com o mesmo produto/data sejam duplicadas.
select public.ensure_community_library_order_item(oi.id)
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
 where o.user_id is not null
   and o.status not in ('cancelled', 'refunded');

