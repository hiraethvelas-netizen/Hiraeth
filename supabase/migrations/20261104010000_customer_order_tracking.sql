-- Hiraeth — read-only order-tracking lookup for the order's own customer.
-- Does not relax RLS on commerce_shipments or expose provider/internal errors.
-- No modifications to existing orders, payments, shipment states, or stock.
create or replace function public.get_my_order_tracking(p_order_ids uuid[])
returns table (
  order_id uuid,
  carrier_name text,
  service_name text,
  tracking_code text,
  status text,
  updated_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select
    s.order_id, s.carrier_name, s.service_name, s.tracking_code, s.status, s.updated_at
  from public.commerce_shipments s
  inner join public.orders o on o.id = s.order_id
  where auth.uid() is not null
    and o.user_id = auth.uid()
    and s.order_id = any(coalesce(p_order_ids, array[]::uuid[]))
    and cardinality(coalesce(p_order_ids, array[]::uuid[])) <= 100;
$$;

revoke all on function public.get_my_order_tracking(uuid[]) from public, anon, authenticated;
grant execute on function public.get_my_order_tracking(uuid[]) to authenticated;

comment on function public.get_my_order_tracking(uuid[]) is
  'Returns only carrier/service/status/tracking for the signed-in customer\'s own orders. No invoice, label URL, secrets or internal error fields.';
