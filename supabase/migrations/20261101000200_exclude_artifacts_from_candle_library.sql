-- Prepared for approval. Preserve the current order-to-library trigger and only
-- exclude newly classified artifacts from automatic candle records. No backfill.
CREATE OR REPLACE FUNCTION public.add_order_item_to_community_library()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.community_library (
    user_id, title, aroma, image_url, category, acquired_at, product_id,
    order_item_id, quantity, purchase_status, variant_details, updated_at
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
    and p.product_type is distinct from 'artifact'
    and o.user_id is not null
    and o.status not in ('cancelled', 'refunded')
    and not exists (
      select 1 from public.community_library existing
      where existing.user_id = o.user_id
        and existing.product_id = oi.product_id
        and existing.order_item_id is null
        and existing.acquired_at = o.created_at::date
    )
  on conflict (order_item_id) where order_item_id is not null do nothing;
  return new;
end;
$function$
;

