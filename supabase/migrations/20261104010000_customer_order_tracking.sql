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
  'Returns only carrier/service/status/tracking for the signed-in customer''s own orders. No invoice, label URL, secrets or internal error fields.';


-- Explicit admin confirmation of physical posting / delivery.
-- A generated label does NOT automatically mean a package was posted.
-- Update the order AND the shipment together, never money fields or stock.
create or replace function public.advance_order_delivery_status(
  p_order_id uuid, p_next_status text
) returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_shipment public.commerce_shipments%rowtype;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Acesso reservado à administração da Hiraeth'
      using errcode = '42501';
  end if;

  select * into v_order from public.orders
    where id = p_order_id for update;
  if not found then
    raise exception 'Pedido não encontrado';
  end if;
  if v_order.payment_status is distinct from 'approved' then
    raise exception 'A entrega só pode ser atualizada após confirmação do pagamento';
  end if;

  select * into v_shipment from public.commerce_shipments
    where order_id = p_order_id for update;
  if not found then
    raise exception 'Dados de expedição não encontrados';
  end if;

  if p_next_status = 'shipped' then
    if v_order.status <> 'paid'
       or v_shipment.status not in ('generated', 'posted')
       or v_shipment.provider_label_id is null
    then
      raise exception 'Confirme a geração da etiqueta e a postagem antes de marcar Enviado';
    end if;
    update public.commerce_shipments
      set status = 'posted', updated_at = now()
      where id = v_shipment.id;
    update public.orders
      set status = 'shipped', updated_at = now()
      where id = p_order_id;
    return 'shipped';
  elsif p_next_status = 'delivered' then
    if v_order.status <> 'shipped' or v_shipment.status <> 'posted' then
      raise exception 'Marque como Enviado antes de confirmar a entrega';
    end if;
    update public.commerce_shipments
      set status = 'delivered', updated_at = now()
      where id = v_shipment.id;
    update public.orders
      set status = 'delivered', updated_at = now()
      where id = p_order_id;
    return 'delivered';
  else
    raise exception 'Transição de entrega não permitida';
  end if;
end;
$$;

revoke all on function public.advance_order_delivery_status(uuid,text)
  from public, anon, authenticated;
grant execute on function public.advance_order_delivery_status(uuid,text)
  to authenticated;

comment on function public.advance_order_delivery_status(uuid,text) is
  'Admin-only, explicit/manual confirmation of posting or delivery, with paid-order and label checks. Never updates payment approval, stock or refunds.';
