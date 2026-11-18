-- Hiraeth: vendas assistidas do Correio da Fênix (velas JÁ PRONTAS).
-- NÃO cria ordens/pagamentos Mercado Pago, não gera notas nem etiquetas.
-- A baixa é apenas do estoque físico de velas após confirmação humana da venda.
-- A rotina antiga de consumo de essências para pedidos pagos fica suspensa.
-- Aplicar no backend ATUAL da Hiraeth Oficial; merge GitHub NÃO aplica migrações.

create table if not exists public.hiraeth_manual_sales (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  customer_name text not null check (length(btrim(customer_name)) between 3 and 160),
  customer_phone text,
  customer_email text,
  payment_method text not null check (payment_method in ('pix','credit','debit','other')),
  is_gift boolean not null default false,
  note text not null default '',
  total_catalog_reference numeric not null default 0 check (total_catalog_reference >= 0),
  confirmed_by uuid not null references auth.users(id) on delete restrict,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.hiraeth_manual_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.hiraeth_manual_sales(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  variant_key text not null default '',
  variant_label text not null default '',
  quantity integer not null check (quantity between 1 and 100),
  unit_catalog_reference numeric not null check (unit_catalog_reference >= 0),
  created_at timestamptz not null default now()
);
create index if not exists hiraeth_manual_sale_items_sale_idx
  on public.hiraeth_manual_sale_items(sale_id);

-- A tabela privada pode ser LIDA apenas por administradores; gravação somente
-- via RPC transacional auditável, nunca por INSERT/UPDATE direto do navegador.
alter table public.hiraeth_manual_sales enable row level security;
alter table public.hiraeth_manual_sale_items enable row level security;
revoke all on public.hiraeth_manual_sales from public, anon, authenticated;
revoke all on public.hiraeth_manual_sale_items from public, anon, authenticated;
grant select on public.hiraeth_manual_sales to authenticated;
grant select on public.hiraeth_manual_sale_items to authenticated;
grant all on public.hiraeth_manual_sales to service_role;
grant all on public.hiraeth_manual_sale_items to service_role;
drop policy if exists "Hiraeth admin reads manual sales" on public.hiraeth_manual_sales;
create policy "Hiraeth admin reads manual sales"
  on public.hiraeth_manual_sales for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
drop policy if exists "Hiraeth admin reads manual sale items" on public.hiraeth_manual_sale_items;
create policy "Hiraeth admin reads manual sale items"
  on public.hiraeth_manual_sale_items for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

create or replace function public.record_hiraeth_manual_sale(
  p_request_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_items jsonb,
  p_payment_method text,
  p_is_gift boolean,
  p_note text,
  p_confirmed boolean
) returns uuid
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_sale_id uuid;
  v_row record;
  v_product public.products%rowtype;
  v_variant jsonb;
  v_position integer;
  v_variant_stock integer;
  v_unit_price numeric;
  v_amount numeric := 0;
  v_total_units integer;
begin
  if auth.uid() is null or not public.has_role(auth.uid(),'admin') then
    raise exception 'Apenas a administração pode registrar vendas manuais'
      using errcode='42501';
  end if;
  if p_confirmed is distinct from true then
    raise exception 'Confirme a venda recebida pelo WhatsApp antes de baixar o estoque';
  end if;
  if p_request_id is null then
    raise exception 'Identificador de registro obrigatório';
  end if;

  -- Clique repetido ou falha de rede NUNCA descontam o mesmo pedido novamente.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select id into v_sale_id from public.hiraeth_manual_sales
    where request_id = p_request_id;
  if found then return v_sale_id; end if;

  if length(btrim(coalesce(p_customer_name,''))) not between 3 and 160
    or length(coalesce(p_customer_phone,'')) > 40
    or length(coalesce(p_customer_email,'')) > 160
    or length(coalesce(p_note,'')) > 800 then
    raise exception 'Confira os dados da cliente e o recado';
  end if;
  if p_payment_method not in ('pix','credit','debit','other') then
    raise exception 'Forma de pagamento inválida';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Informe os itens vendidos';
  end if;
  if jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'Informe de 1 a 30 itens por registro';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) as x(item)
    where jsonb_typeof(x.item) <> 'object'
      or nullif(x.item->>'productId','') is null
      or length(coalesce(x.item->>'variantKey','')) > 200
      or coalesce(x.item->>'quantity','') !~ '^[0-9]{1,3}$'
      or (x.item->>'quantity')::integer not between 1 and 100
  ) then raise exception 'Item, variação ou quantidade inválidos'; end if;
  select sum((x.item->>'quantity')::integer) into v_total_units
    from jsonb_array_elements(p_items) as x(item);
  if v_total_units > 100 then
    raise exception 'Limite de 100 velas por registro';
  end if;

  insert into public.hiraeth_manual_sales (
    request_id, customer_name, customer_phone, customer_email, payment_method,
    is_gift, note, confirmed_by
  ) values (
    p_request_id, btrim(p_customer_name), btrim(coalesce(p_customer_phone,'')),
    btrim(coalesce(p_customer_email,'')), p_payment_method,
    coalesce(p_is_gift,false), btrim(coalesce(p_note,'')), auth.uid()
  ) returning id into v_sale_id;

  -- Lock em ordem fixa, inclusive quando dois atendimentos vendem simultaneamente.
  -- A transação inteira é revertida se faltar qualquer vela/variação.
  for v_row in
    select (x.item->>'productId')::uuid as product_id,
      coalesce(x.item->>'variantKey','') as variant_key,
      sum((x.item->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as x(item)
    group by 1,2
    order by 1,2
  loop
    select * into v_product from public.products
      where id=v_row.product_id for update;
    if not found or v_product.status <> 'published'
      or coalesce(v_product.product_type,'candle') <> 'candle' then
      raise exception 'Vela não publicada ou indisponível no acervo';
    end if;
    if v_product.stock < v_row.quantity then
      raise exception 'Estoque de velas insuficiente para %',v_product.name;
    end if;

    v_variant := null;
    v_position := null;
    if jsonb_array_length(coalesce(v_product.variants,'[]'::jsonb)) > 0 then
      if v_row.variant_key = '' then
        raise exception 'Escolha a variação da vela %',v_product.name;
      end if;
      select entry.value, (entry.ordinality-1)::integer
        into v_variant,v_position
      from jsonb_array_elements(v_product.variants) with ordinality as entry(value,ordinality)
      where entry.value->>'key'=v_row.variant_key limit 1;
      if v_variant is null then
        raise exception 'Variação não encontrada para %',v_product.name;
      end if;
      v_variant_stock := coalesce((v_variant->>'stock')::integer,0);
      if v_variant_stock < v_row.quantity then
        raise exception 'Estoque insuficiente na variação de %',v_product.name;
      end if;
      update public.products set
        variants=jsonb_set(variants,array[v_position::text,'stock'],
          to_jsonb(v_variant_stock-v_row.quantity),false),
        stock=stock-v_row.quantity,updated_at=now()
      where id=v_product.id;
      v_unit_price := coalesce(
        nullif(v_variant->>'sale_price','')::numeric,
        nullif(v_variant->>'price','')::numeric,
        v_product.sale_price,v_product.price);
    else
      if v_row.variant_key <> '' then
        raise exception 'Esta vela não possui variações cadastradas';
      end if;
      update public.products set stock=stock-v_row.quantity,updated_at=now()
      where id=v_product.id;
      v_unit_price := coalesce(v_product.sale_price,v_product.price);
    end if;

    insert into public.hiraeth_manual_sale_items (
      sale_id,product_id,product_name,variant_key,variant_label,quantity,unit_catalog_reference
    ) values (
      v_sale_id,v_product.id,v_product.name,v_row.variant_key,
      coalesce(v_variant->>'label',''),v_row.quantity,v_unit_price
    );
    v_amount:=v_amount+(v_unit_price*v_row.quantity);
  end loop;

  update public.hiraeth_manual_sales
    set total_catalog_reference=v_amount where id=v_sale_id;
  return v_sale_id;
end;
$$;

revoke all on function public.record_hiraeth_manual_sale(uuid,text,text,text,jsonb,text,boolean,text,boolean)
  from public,anon,authenticated;
grant execute on function public.record_hiraeth_manual_sale(uuid,text,text,text,jsonb,text,boolean,text,boolean)
  to authenticated;

-- ESTOQUE DE ESSÊNCIAS CONGELADO EM VENDAS DE VELAS PRONTAS.
-- A função continua existindo para compatibilidade com a rotina de webhook,
-- mas NÃO verifica nem altera saldos de essências em qualquer pedido pago.
-- Não executa movimento retroativo, e não altera registros anteriores.
create or replace function public.consume_paid_order_essences(p_order_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  return;
end;
$$;
revoke all on function public.consume_paid_order_essences(uuid)
  from public,anon,authenticated,service_role;
comment on function public.consume_paid_order_essences(uuid) is
  'Suspensa para velas pré-produzidas. Venda de vela pronta NÃO consome essência. Reativação futura somente após decisão explícita e migração revisada.';
