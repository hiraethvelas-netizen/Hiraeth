-- Hiraeth commerce: prepared tables and atomic paid-order fulfillment.
-- Deployment is opt-in: real payments are disabled until credentials, freight,
-- and sandbox verification are complete. No changes to existing orders.
-- Prior promotion-tracking migrations expect this JSONB column. It may be
-- absent from older database snapshots, even when other fields already exist.
alter table public.orders
  add column if not exists promotion_summary jsonb not null default '{}'::jsonb;
create table if not exists public.commerce_checkouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  email text not null,
  recipient jsonb not null,
  items jsonb not null,
  freight jsonb not null,
  promotion_summary jsonb not null default '{}'::jsonb,
  coupon_code text,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  shipping numeric(12,2) not null check (shipping >= 0),
  total numeric(12,2) not null check (total > 0),
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment','processing','pending','rejected',
                     'paid','paid_attention','expired','cancelled')),
  payment_request_key uuid not null default gen_random_uuid() unique,
  mp_payment_id text unique,
  payment_method text,
  pix_qr_code text,
  pix_qr_code_base64 text,
  order_id uuid unique references public.orders(id) on delete restrict,
  paid_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  updated_at timestamptz not null default now()
);
create index if not exists commerce_checkouts_user_recent_idx
  on public.commerce_checkouts (user_id, created_at desc);
create index if not exists commerce_checkouts_status_idx
  on public.commerce_checkouts (status, created_at desc);

create table if not exists public.commerce_shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  provider text not null default 'melhor_envio',
  provider_label_id text unique,
  carrier_name text,
  service_name text,
  status text not null default 'pending'
    check (status in ('pending','quoted','awaiting_label_payment','label_paid',
                      'generated','posted','delivered','failed','cancelled')),
  tracking_code text,
  label_url text,
  quoted_freight numeric(12,2),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.commerce_invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  provider text not null default 'focusnfe',
  reference text not null unique,
  status text not null default 'pending'
    check (status in ('pending','needs_configuration','submitted','processing',
                      'authorized','rejected','cancelled')),
  nfe_number text,
  access_key text,
  danfe_url text,
  xml_url text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.commerce_checkouts enable row level security;
alter table public.commerce_shipments enable row level security;
alter table public.commerce_invoices enable row level security;
revoke all on public.commerce_checkouts from public, anon, authenticated;
revoke all on public.commerce_shipments from public, anon, authenticated;
revoke all on public.commerce_invoices from public, anon, authenticated;
grant select on public.commerce_checkouts, public.commerce_shipments, public.commerce_invoices to authenticated;
grant all on public.commerce_checkouts, public.commerce_shipments, public.commerce_invoices to service_role;

drop policy if exists "customers view own commerce checkout" on public.commerce_checkouts;
create policy "customers view own commerce checkout"
  on public.commerce_checkouts for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin view commerce shipments" on public.commerce_shipments;
create policy "admin view commerce shipments"
  on public.commerce_shipments for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admin view commerce invoices" on public.commerce_invoices;
create policy "admin view commerce invoices"
  on public.commerce_invoices for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- A client may never claim a Mercado Pago payment or decrement stock.
-- The webhook calls this function with the service-role JWT after verifying
-- the webhook signature and consulting the payment directly at Mercado Pago.
create or replace function public.confirm_paid_commerce_checkout(
  p_checkout_id uuid, p_payment_id text, p_amount numeric, p_method text
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_session public.commerce_checkouts%rowtype;
  v_order_id uuid;
  v_stock record;
  v_product public.products%rowtype;
  v_variant jsonb;
  v_position integer;
  v_variant_stock integer;
  v_shortage text;
  v_item jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Forbidden: service role required' using errcode='42501';
  end if;

  select * into v_session from public.commerce_checkouts
    where id = p_checkout_id for update;
  if not found then raise exception 'Checkout not found'; end if;

  if v_session.status in ('paid','paid_attention') then
    if v_session.mp_payment_id <> p_payment_id then
      raise exception 'Checkout already bound to another payment';
    end if;
    return jsonb_build_object('status',v_session.status,'order_id',v_session.order_id);
  end if;

  if v_session.mp_payment_id is not null and v_session.mp_payment_id <> p_payment_id then
    raise exception 'Payment mismatch for checkout';
  end if;
  if round(p_amount,2) <> round(v_session.total,2) or p_amount <= 0 then
    update public.commerce_checkouts set
      status='paid_attention',mp_payment_id=p_payment_id,payment_method=p_method,
      paid_at=now(),last_error='Mercado Pago amount mismatch',updated_at=now()
      where id=p_checkout_id;
    return jsonb_build_object('status','paid_attention','reason','amount_mismatch');
  end if;

  -- Lock and validate all requested SKUs in deterministic order to avoid
  -- over-selling if two payments are approved at the same moment.
  for v_stock in
    select (element->>'productId')::uuid as product_id,
      coalesce(element->>'stockVariantKey',element->>'variantKey','') as variant_key,
      sum((element->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(v_session.items) element
    group by 1,2 order by 1,2
  loop
    select * into v_product from public.products
      where id=v_stock.product_id for update;
    if not found or v_product.status <> 'published' then
      v_shortage := 'Product not available: ' || v_stock.product_id::text;
      exit;
    end if;
    if v_stock.variant_key <> '' then
      select elem, (ordinality-1)::integer into v_variant, v_position
        from jsonb_array_elements(coalesce(v_product.variants,'[]'::jsonb))
          with ordinality as rows(elem, ordinality)
        where elem->>'key'=v_stock.variant_key limit 1;
      if v_position is null then
        v_shortage := 'Variant not found: ' || v_stock.variant_key;
        exit;
      end if;
      v_variant_stock := coalesce((v_variant->>'stock')::integer,0);
      if v_variant_stock < v_stock.quantity then
        v_shortage := 'Insufficient variant stock: ' || v_stock.variant_key;
        exit;
      end if;
    elsif v_product.stock < v_stock.quantity then
      v_shortage := 'Insufficient product stock: ' || v_stock.product_id::text;
      exit;
    end if;
    v_variant := null;
    v_position := null;
  end loop;

  -- Store-wide discount/coupon usage limits must be tracked exactly once
  -- by the promotion redemption trigger. An incomplete migration must not
  -- quietly allow an unlimited discounted order.
  if jsonb_array_length(coalesce(v_session.promotion_summary->'applied','[]'::jsonb))>0
     and not exists(
       select 1 from pg_trigger
       where tgrelid='public.order_items'::regclass
         and tgname='track_order_promotion_uses' and not tgisinternal
     )
  then
    update public.commerce_checkouts set status='paid_attention',
      mp_payment_id=p_payment_id,payment_method=p_method,paid_at=now(),
      last_error='Promotion redemption tracking not installed',
      updated_at=now() where id=p_checkout_id;
    return jsonb_build_object('status','paid_attention','reason','promotions_configuration');
  end if;

  if v_shortage is not null then
    -- Payment is REAL, so do not refund or cancel automatically. Escalate to
    -- merchant review. No stock is subtracted and no items are fabricated.
    update public.commerce_checkouts set status='paid_attention',
      mp_payment_id=p_payment_id,payment_method=p_method,
      paid_at=now(),last_error=v_shortage,updated_at=now()
      where id=p_checkout_id;
    return jsonb_build_object('status','paid_attention','reason','inventory_review');
  end if;

  begin
    insert into public.orders (
      user_id, customer_email, customer_name, shipping_address,
      payment_method,payment_status,payment_id,status,
      subtotal,discount,shipping,total,coupon_code,promotion_summary
    ) values (
      v_session.user_id,v_session.email,v_session.recipient->>'name',
      v_session.recipient,p_method,'approved',p_payment_id,'paid',
      v_session.subtotal,v_session.discount,v_session.shipping,
      v_session.total,v_session.coupon_code,v_session.promotion_summary
    ) returning id into v_order_id;

    for v_item in select value from jsonb_array_elements(v_session.items) value loop
      insert into public.order_items (
        order_id,product_id,product_name,quantity,unit_price,variant_details
      ) values (
        v_order_id,(v_item->>'productId')::uuid,v_item->>'name',
        (v_item->>'quantity')::integer,(v_item->>'price')::numeric,
        coalesce(v_item->'variantDetails','{}'::jsonb)
      );
    end loop;

    for v_stock in
      select (element->>'productId')::uuid as product_id,
        coalesce(element->>'stockVariantKey',element->>'variantKey','') as variant_key,
        sum((element->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_session.items) element
      group by 1,2 order by 1,2
    loop
      select * into v_product from public.products where id=v_stock.product_id for update;
      if v_stock.variant_key <> '' then
        select (ordinality-1)::integer, (elem->>'stock')::integer
          into v_position,v_variant_stock
        from jsonb_array_elements(v_product.variants)
          with ordinality as rows(elem,ordinality)
        where elem->>'key'=v_stock.variant_key limit 1;
        update public.products set
          variants=jsonb_set(variants, ARRAY[v_position::text,'stock'],
            to_jsonb(v_variant_stock-v_stock.quantity)),
          stock=greatest(0,stock-v_stock.quantity),updated_at=now()
        where id=v_stock.product_id;
      else
        update public.products set stock=stock-v_stock.quantity,updated_at=now()
          where id=v_stock.product_id;
      end if;
    end loop;

    insert into public.commerce_shipments(order_id,carrier_name,service_name,quoted_freight)
      values (v_order_id,v_session.freight->>'company',
              v_session.freight->>'name',v_session.shipping);
    insert into public.commerce_invoices(order_id,reference)
      values (v_order_id,'hiraeth-'||v_order_id::text);
    update public.commerce_checkouts set status='paid',
      mp_payment_id=p_payment_id,payment_method=p_method,
      paid_at=now(),order_id=v_order_id,last_error=null,updated_at=now()
    where id=p_checkout_id;

    return jsonb_build_object('status','paid','order_id',v_order_id);
  exception when others then
    -- A failing trigger (for example promotion exhaustion) does not pretend
    -- payment failed. A human can review a paid_attention checkout.
    update public.commerce_checkouts set status='paid_attention',
      mp_payment_id=p_payment_id,payment_method=p_method,
      paid_at=now(),last_error=left(SQLERRM,500),updated_at=now()
    where id=p_checkout_id;
    return jsonb_build_object('status','paid_attention','reason','fulfillment_review');
  end;
end;
$$;

revoke all on function public.confirm_paid_commerce_checkout(uuid,text,numeric,text)
  from public,anon,authenticated;
grant execute on function public.confirm_paid_commerce_checkout(uuid,text,numeric,text)
  to service_role;

-- NOTE: Do not call this RPC from the browser. Payment webhook signature,
-- provider API verification and amount checks are required first.
