-- Preserve existing order management, but block direct browser updates that could
-- forge Mercado Pago approval, payment references or paid checkout amounts.
create or replace function public.guard_order_payment_integrity()
returns trigger language plpgsql set search_path = public
as $$
declare
  v_is_commerce boolean;
begin
  if auth.role() = 'service_role' then return new; end if;
  if tg_op = 'INSERT' then
    if new.payment_id is not null or
       new.payment_status in ('approved','accredited','paid') or
       new.status in ('paid','shipped','delivered')
    then
      raise exception 'Payment confirmation is server controlled'
        using errcode='42501';
    end if;
    return new;
  end if;

  -- Never allow a browser to edit payment references or claim that it
  -- received payment. Shipment lifecycle updates remain available to admins.
  if new.payment_id is distinct from old.payment_id or
     new.payment_status is distinct from old.payment_status or
     new.payment_method is distinct from old.payment_method
  then
    raise exception 'Payment fields are server controlled'
      using errcode='42501';
  end if;

  select exists(select 1 from public.commerce_checkouts c where c.order_id=old.id)
    into v_is_commerce;
  if v_is_commerce then
    if new.total is distinct from old.total or new.subtotal is distinct from old.subtotal
       or new.discount is distinct from old.discount or new.shipping is distinct from old.shipping
       or new.coupon_code is distinct from old.coupon_code
    then
      raise exception 'Paid order totals cannot be changed'
        using errcode='42501';
    end if;
    if new.status is distinct from old.status then
      if not public.has_role(auth.uid(), 'admin') or
         new.status not in ('shipped','delivered','cancelled','refunded')
      then
        raise exception 'Only administration may change fulfillment state'
          using errcode='42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_order_payment_integrity on public.orders;
create trigger guard_order_payment_integrity
  before insert or update on public.orders
  for each row execute function public.guard_order_payment_integrity();

-- Card details must never exist in application tables.
comment on table public.commerce_checkouts is
  'Payment metadata and verified order snapshot only; card PAN, CVV, expiry and Mercado Pago card token are NEVER stored.';
