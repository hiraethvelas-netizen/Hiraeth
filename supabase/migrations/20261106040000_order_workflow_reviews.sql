-- Hiraeth — admin-only order lifecycle and financial review queue.
-- Safe to apply in an existing production database: no paid order is modified.
-- A refund request is NOT a refund. No funds move and no stock is replenished.

create table if not exists public.commerce_order_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  kind text not null check(kind in ('cancellation','refund')),
  status text not null default 'pending_review'
    check(status in ('pending_review','awaiting_provider','completed','rejected')),
  reason text not null check(length(btrim(reason)) between 8 and 700),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists commerce_order_reviews_one_pending
  on public.commerce_order_reviews(order_id)
  where status in ('pending_review','awaiting_provider');
create index if not exists commerce_order_reviews_created
  on public.commerce_order_reviews(created_at desc);

alter table public.commerce_order_reviews enable row level security;
revoke all on public.commerce_order_reviews from public, anon, authenticated;
grant select on public.commerce_order_reviews to authenticated;
grant all on public.commerce_order_reviews to service_role;
drop policy if exists "Admin reads financial reviews" on public.commerce_order_reviews;
create policy "Admin reads financial reviews"
  on public.commerce_order_reviews for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

create or replace function public.request_commerce_order_review(
  p_order_id uuid,p_kind text,p_reason text
) returns uuid language plpgsql security definer set search_path=public
as $$
declare
  v_order public.orders%rowtype;
  v_existing uuid;
  v_id uuid;
  v_reason text := btrim(coalesce(p_reason,''));
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then
    raise exception 'Acesso reservado à administração da Hiraeth' using errcode='42501';
  end if;
  if p_kind not in ('cancellation','refund') or length(v_reason) not between 8 and 700 then
    raise exception 'Informe o tipo e um motivo entre 8 e 700 caracteres';
  end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if v_order.payment_status is distinct from 'approved'
    or v_order.payment_id is null
    or v_order.status not in ('paid','preparing','shipped','delivered')
  then
    raise exception 'Esse pedido exige conciliação financeira antes de solicitar reembolso';
  end if;
  if p_kind='cancellation' and v_order.status not in ('paid','preparing') then
    raise exception 'Pedido postado ou entregue exige análise de reembolso, não cancelamento';
  end if;
  select id into v_existing from public.commerce_order_reviews
    where order_id=p_order_id and status in ('pending_review','awaiting_provider')
    for update;
  if v_existing is not null then return v_existing; end if;
  insert into public.commerce_order_reviews(order_id,kind,status,reason,created_by)
    values(p_order_id,p_kind,'pending_review',v_reason,auth.uid())
    returning id into v_id;
  return v_id;
end; $$;

revoke all on function public.request_commerce_order_review(uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.request_commerce_order_review(uuid,text,text)
  to authenticated;
comment on function public.request_commerce_order_review(uuid,text,text) is
 'Admin-only financial review request. NEVER issues/refunds a payment, cancels an approved order or restocks products.';

-- Preserve the protected payment fields and paid-order totals. Only allow
-- fulfillment transitions that agree with the shipment state. No browser
-- path may set refunded/cancelled without verified provider reconciliation.
create or replace function public.guard_order_payment_integrity()
returns trigger language plpgsql set search_path=public
as $$
declare
  v_is_commerce boolean;
begin
  if auth.role() = 'service_role' then return new; end if;
  if tg_op='INSERT' then
    if new.payment_id is not null or
      new.payment_status in ('approved','accredited','paid') or
      new.status in ('paid','preparing','shipped','delivered','refunded') then
      raise exception 'Payment confirmation is server controlled' using errcode='42501';
    end if;
    return new;
  end if;
  if new.payment_id is distinct from old.payment_id or
     new.payment_status is distinct from old.payment_status or
     new.payment_method is distinct from old.payment_method then
    raise exception 'Payment fields are server controlled' using errcode='42501';
  end if;
  select exists(select 1 from public.commerce_checkouts where order_id=old.id)
    into v_is_commerce;
  if v_is_commerce then
    if new.total is distinct from old.total or new.subtotal is distinct from old.subtotal or
       new.discount is distinct from old.discount or new.shipping is distinct from old.shipping or
       new.coupon_code is distinct from old.coupon_code then
      raise exception 'Paid order totals cannot be changed' using errcode='42501';
    end if;
    if new.status is distinct from old.status then
      if not public.has_role(auth.uid(),'admin') or old.payment_status is distinct from 'approved' then
        raise exception 'Only administration can update confirmed order fulfillment' using errcode='42501';
      end if;
      if new.status='preparing' and old.status='paid' then
        null;
      elsif new.status='shipped' and old.status in ('paid','preparing') and
        exists(select 1 from public.commerce_shipments
          where order_id=old.id and status='posted' and provider_label_id is not null) then
        null;
      elsif new.status='delivered' and old.status='shipped' and
        exists(select 1 from public.commerce_shipments
          where order_id=old.id and status='delivered') then
        null;
      else
        raise exception 'Transição indisponível: cancelamento e reembolso exigem confirmação do provedor'
          using errcode='42501';
      end if;
    end if;
  end if;
  return new;
end; $$;

-- The existing guard_order_payment_integrity trigger invokes this updated
-- function automatically; no trigger replacement or table rewrite required.

create or replace function public.advance_order_delivery_status(
  p_order_id uuid,p_next_status text
) returns text language plpgsql security definer set search_path=public
as $$
declare
  v_order public.orders%rowtype;
  v_shipment public.commerce_shipments%rowtype;
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then
    raise exception 'Acesso reservado à administração da Hiraeth' using errcode='42501';
  end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found then raise exception 'Pedido não encontrado'; end if;
  if v_order.payment_status is distinct from 'approved' or v_order.payment_id is null then
    raise exception 'O pagamento precisa estar confirmado pelo provedor';
  end if;
  if exists(select 1 from public.commerce_order_reviews
    where order_id=p_order_id and status in ('pending_review','awaiting_provider')) then
    raise exception 'Há uma solicitação financeira pendente. Revise antes de continuar a expedição.';
  end if;
  if p_next_status='preparing' then
    if v_order.status <> 'paid' then raise exception 'Este pedido não está aguardando preparação'; end if;
    update public.orders set status='preparing',updated_at=now() where id=p_order_id;
    return 'preparing';
  end if;

  select * into v_shipment from public.commerce_shipments
    where order_id=p_order_id for update;
  if not found then raise exception 'Expedição não localizada'; end if;
  if p_next_status='shipped' then
    if v_order.status not in ('paid','preparing') or
       v_shipment.status not in ('generated','posted') or
       v_shipment.provider_label_id is null then
      raise exception 'A etiqueta precisa estar gerada e o pacote precisa ter sido postado';
    end if;
    update public.commerce_shipments set status='posted',updated_at=now()
      where id=v_shipment.id;
    update public.orders set status='shipped',updated_at=now() where id=p_order_id;
    return 'shipped';
  elsif p_next_status='delivered' then
    if v_order.status<>'shipped' or v_shipment.status<>'posted' then
      raise exception 'Marque como enviado antes de confirmar a entrega';
    end if;
    update public.commerce_shipments set status='delivered',updated_at=now()
      where id=v_shipment.id;
    update public.orders set status='delivered',updated_at=now() where id=p_order_id;
    return 'delivered';
  end if;
  raise exception 'Etapa de entrega não permitida';
end; $$;
revoke all on function public.advance_order_delivery_status(uuid,text)
  from public,anon,authenticated;
grant execute on function public.advance_order_delivery_status(uuid,text)
  to authenticated;

comment on function public.advance_order_delivery_status(uuid,text) is
 'Admin-only order preparation, verified posting and delivery. Blocks progress during pending refund review and cannot move money.';

