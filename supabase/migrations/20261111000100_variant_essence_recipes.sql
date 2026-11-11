-- Prepared for review: apply only after explicit approval for the database update.
-- Existing balances/recipes stay in ml. New essences may explicitly use grams;
-- the historical *_ml column names are retained to avoid rewriting any balance.
alter table public.essences
  add column if not exists stock_unit text not null default 'ml'
  check (stock_unit in ('ml', 'g'));

alter table public.essence_stock_movements
  add column if not exists stock_unit text not null default 'ml'
  check (stock_unit in ('ml', 'g'));

alter table public.orders
  add column if not exists essence_stock_consumed_at timestamptz;

-- A unit belongs to the physical stock, not the product size. Relabelling an
-- existing balance is never a conversion between grams and millilitres.
create or replace function public.guard_essence_stock_unit()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.stock_unit is distinct from old.stock_unit then
    raise exception 'A unidade da essência não pode ser convertida automaticamente. Cadastre um estoque separado na unidade correta.';
  end if;
  return new;
end;
$$;
create trigger guard_essence_stock_unit before update of stock_unit
  on public.essences for each row execute function public.guard_essence_stock_unit();

-- recipe_id is an opaque stable ID in products.variants. Recipes themselves
-- remain private and are never embedded in the public product JSON.
create table public.product_variant_essences (
  product_id uuid not null references public.products(id) on delete cascade,
  recipe_id uuid not null,
  essence_id uuid not null references public.essences(id) on delete restrict,
  quantity numeric(12,3) not null check (quantity > 0 and quantity <= 999999999.999),
  created_at timestamptz not null default now(),
  primary key (product_id, recipe_id, essence_id)
);
alter table public.product_variant_essences enable row level security;
revoke all on public.product_variant_essences from public, anon, authenticated;
grant select, insert, update, delete on public.product_variant_essences to authenticated;
grant all on public.product_variant_essences to service_role;
create policy "Admins manage variant essence recipes"
  on public.product_variant_essences for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create or replace function public.set_product_recipes(
  p_product_id uuid, p_default_ingredients jsonb, p_variant_recipes jsonb
) returns void language plpgsql security invoker set search_path = public as $$
declare
  v_variants jsonb;
  v_recipe jsonb;
  v_ingredients jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Apenas a administração pode salvar receitas' using errcode = '42501';
  end if;
  if p_default_ingredients is null or jsonb_typeof(p_default_ingredients) <> 'array'
     or p_variant_recipes is null or jsonb_typeof(p_variant_recipes) <> 'array' then
    raise exception 'As receitas precisam ser listas de essências';
  end if;
  select variants into v_variants from public.products where id = p_product_id for update;
  if not found then raise exception 'Produto não encontrado'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_variant_recipes) r
    where jsonb_typeof(r) <> 'object' or nullif(r->>'recipe_id', '') is null
       or jsonb_typeof(r->'ingredients') is distinct from 'array'
  ) then raise exception 'Confira as receitas das variações'; end if;
  if exists (
    select (r->>'recipe_id')::uuid from jsonb_array_elements(p_variant_recipes) r
    group by 1 having count(*) > 1
  ) then raise exception 'Não repita a receita de uma variação'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_variant_recipes) r
    where not exists (select 1 from jsonb_array_elements(coalesce(v_variants, '[]')) v
           where v->>'recipe_id' = r->>'recipe_id')
  ) then raise exception 'A receita precisa pertencer a uma variação deste produto'; end if;

  for v_ingredients in
    select p_default_ingredients
    union all select r->'ingredients' from jsonb_array_elements(p_variant_recipes) r
  loop
    if exists (
      select 1 from jsonb_to_recordset(v_ingredients) as i(essence_id uuid, quantity numeric)
      where i.essence_id is null or i.quantity is null
         or not (i.quantity between 0.001 and 999999999.999)
         or i.quantity <> round(i.quantity, 3)
    ) or exists (
      select essence_id from jsonb_to_recordset(v_ingredients) as i(essence_id uuid, quantity numeric)
      group by essence_id having count(*) > 1
    ) then raise exception 'Confira as essências e as quantidades: valores positivos, até três casas decimais e sem repetições'; end if;
    if exists (
      select 1 from jsonb_to_recordset(v_ingredients) as i(essence_id uuid, quantity numeric)
      left join public.essences e on e.id = i.essence_id
      where e.id is null
    ) then raise exception 'Uma essência não foi encontrada no estoque'; end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(p_variant_recipes) r
             where jsonb_array_length(r->'ingredients') = 0) then
    raise exception 'Adicione uma essência à receita própria ou use a receita padrão';
  end if;

  delete from public.product_essences where product_id = p_product_id;
  insert into public.product_essences(product_id, essence_id, quantity_ml)
    select p_product_id, i.essence_id, i.quantity
    from jsonb_to_recordset(p_default_ingredients) as i(essence_id uuid, quantity numeric);
  delete from public.product_variant_essences where product_id = p_product_id;
  for v_recipe in select value from jsonb_array_elements(p_variant_recipes) loop
    insert into public.product_variant_essences(product_id, recipe_id, essence_id, quantity)
      select p_product_id, (v_recipe->>'recipe_id')::uuid, i.essence_id, i.quantity
      from jsonb_to_recordset(v_recipe->'ingredients') as i(essence_id uuid, quantity numeric);
  end loop;
end;
$$;
revoke all on function public.set_product_recipes(uuid,jsonb,jsonb) from public, anon;
grant execute on function public.set_product_recipes(uuid,jsonb,jsonb) to authenticated;

-- A failed recipe save rolls back product fields, price, stock and variants too.
create or replace function public.save_product_with_recipes(
  p_product_id uuid, p_product jsonb, p_default_ingredients jsonb, p_variant_recipes jsonb
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  v_product public.products%rowtype;
  v_id uuid := p_product_id;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Apenas a administração pode salvar produtos' using errcode = '42501';
  end if;
  if p_product is null or jsonb_typeof(p_product) <> 'object' then
    raise exception 'Dados do produto inválidos';
  end if;
  v_product := jsonb_populate_record(null::public.products, p_product);
  if v_product.product_type is distinct from 'candle' then
    raise exception 'As receitas são destinadas às velas';
  end if;
  if v_product.variants is null or jsonb_typeof(v_product.variants) <> 'array' then
    raise exception 'As variações precisam ser uma lista';
  end if;
  -- Legacy size x house conversions may share the same size recipe. Renaming
  -- options keeps the recipe ID stable; the public JSON contains no quantities.
  perform (r->>'recipe_id')::uuid from jsonb_array_elements(v_product.variants) r
    where nullif(r->>'recipe_id', '') is not null;

  if v_id is null then
    insert into public.products(
      name, slug, description, category_id, price, sale_price, stock, sku,
      fragrance, images, status, weight_grams, dimensions, variants, product_type, product_badge
    ) values (
      v_product.name, v_product.slug, v_product.description, v_product.category_id,
      v_product.price, v_product.sale_price, v_product.stock, v_product.sku,
      v_product.fragrance, v_product.images, v_product.status, v_product.weight_grams,
      v_product.dimensions, v_product.variants, v_product.product_type, v_product.product_badge
    ) returning id into v_id;
  else
    perform 1 from public.products where id = v_id for update;
    if not found then raise exception 'Produto não encontrado'; end if;
    update public.products set
      name = v_product.name, slug = v_product.slug, description = v_product.description,
      category_id = v_product.category_id, price = v_product.price,
      sale_price = v_product.sale_price, stock = v_product.stock, sku = v_product.sku,
      fragrance = v_product.fragrance, images = v_product.images, status = v_product.status,
      weight_grams = v_product.weight_grams, dimensions = v_product.dimensions,
      variants = v_product.variants, product_type = v_product.product_type,
      product_badge = v_product.product_badge, updated_at = now()
    where id = v_id;
  end if;
  perform public.set_product_recipes(v_id, p_default_ingredients, p_variant_recipes);
  return v_id;
end;
$$;
revoke all on function public.save_product_with_recipes(uuid,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.save_product_with_recipes(uuid,jsonb,jsonb,jsonb) to authenticated;

-- Relative entries/losses must use the locked live balance, never a cached
-- admin-screen value that could overwrite a concurrently fulfilled sale.
create or replace function public.record_essence_stock_movement(
  p_essence_id uuid, p_movement_type text, p_quantity numeric,
  p_expected_balance numeric default null
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_essence public.essences%rowtype;
  v_next numeric;
  v_delta numeric;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Apenas a administração pode movimentar essências' using errcode = '42501';
  end if;
  if p_movement_type is null or p_movement_type not in ('purchase', 'loss', 'adjustment')
     or p_quantity is null or not (p_quantity between 0 and 999999999.999)
     or p_quantity <> round(p_quantity, 3)
     or (p_movement_type <> 'adjustment' and p_quantity = 0) then
    raise exception 'Confira o tipo e a quantidade do movimento';
  end if;
  select * into v_essence from public.essences where id = p_essence_id for update;
  if not found then raise exception 'Essência não encontrada'; end if;
  if p_movement_type = 'adjustment' then
    if p_expected_balance is null or v_essence.stock_ml <> p_expected_balance then
      raise exception 'O estoque mudou. Atualize a tela e confira o saldo antes de ajustar';
    end if;
    v_next := p_quantity;
  else
    v_next := v_essence.stock_ml + case when p_movement_type = 'loss' then -p_quantity else p_quantity end;
  end if;
  if v_next < 0 or v_next > 999999999.999 then
    raise exception 'A quantidade excede o saldo ou o limite do estoque';
  end if;
  v_delta := v_next - v_essence.stock_ml;
  update public.essences set stock_ml = v_next, updated_at = now() where id = p_essence_id;
  insert into public.essence_stock_movements(
    essence_id, movement_type, quantity_ml, balance_after_ml, note, stock_unit
  ) values (
    p_essence_id, p_movement_type, v_delta, v_next,
    case p_movement_type when 'purchase' then 'Entrada de compra'
      when 'loss' then 'Perda/avaria' else 'Ajuste manual' end, v_essence.stock_unit
  );
  return jsonb_build_object('stock_ml', v_next, 'stock_unit', v_essence.stock_unit);
end;
$$;
revoke all on function public.record_essence_stock_movement(uuid,text,numeric,numeric) from public, anon;
grant execute on function public.record_essence_stock_movement(uuid,text,numeric,numeric) to authenticated;

-- Only aroma notes are public. Variant recipes contribute their notes once;
-- quantities, stock and suppliers remain private.
create or replace function public.get_product_aroma_notes(p_product_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', e.name, 'is_pure', e.is_pure, 'top_notes', e.top_notes,
    'heart_notes', e.heart_notes, 'base_notes', e.base_notes
  ) order by e.name), '[]'::jsonb)
  from public.essences e
  join (select essence_id from public.product_essences where product_id = p_product_id
        union select essence_id from public.product_variant_essences where product_id = p_product_id) r
    on r.essence_id = e.id
  where e.active and exists (select 1 from public.products p
    where p.id = p_product_id and p.status = 'published');
$$;

-- Private fulfillment helper. It is not a browser RPC, has no client grants,
-- is never called for historical orders, and does not replenish on cancellation.
create or replace function public.consume_paid_order_essences(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_recipe_id uuid;
  v_variant jsonb;
  v_requirements jsonb := '[]'::jsonb;
  v_requirement record;
  v_essence public.essences%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.payment_status <> 'approved' or v_order.status <> 'paid' then
    raise exception 'A baixa de essência exige um pedido pago';
  end if;
  if v_order.essence_stock_consumed_at is not null then return; end if;

  for v_item in
    select oi.*, p.variants, p.product_type from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id and coalesce(p.product_type, 'candle') = 'candle'
    order by oi.product_id, oi.id
  loop
    if v_item.quantity is null or v_item.quantity <= 0 then
      raise exception 'Quantidade do item inválida para a receita';
    end if;
    v_recipe_id := null;
    v_variant := null;
    select value into v_variant from jsonb_array_elements(coalesce(v_item.variants, '[]'))
    where value->>'key' = coalesce(v_item.variant_details->>'stockVariantKey',
                                   v_item.variant_details->>'variantKey', '') limit 1;
    if nullif(v_variant->>'recipe_id', '') is not null then
      v_recipe_id := (v_variant->>'recipe_id')::uuid;
    end if;
    -- No override means the explicitly displayed standard recipe, including
    -- existing products. There is no inferred ratio or ml/gram conversion.
    if v_recipe_id is not null and exists (
      select 1 from public.product_variant_essences
      where product_id = v_item.product_id and recipe_id = v_recipe_id
    ) then
      select v_requirements || coalesce(jsonb_agg(jsonb_build_object(
        'item_id', v_item.id, 'essence_id', r.essence_id,
        'quantity', r.quantity * v_item.quantity
      )), '[]') into v_requirements
      from public.product_variant_essences r
      where r.product_id = v_item.product_id and r.recipe_id = v_recipe_id;
    else
      select v_requirements || coalesce(jsonb_agg(jsonb_build_object(
        'item_id', v_item.id, 'essence_id', r.essence_id,
        'quantity', r.quantity_ml * v_item.quantity
      )), '[]') into v_requirements
      from public.product_essences r where r.product_id = v_item.product_id;
    end if;
  end loop;

  -- Lock every essence in deterministic order and validate the entire order
  -- before changing any balance. Concurrent payments cannot overdraw stock.
  for v_requirement in
    select r.essence_id, sum(r.quantity) as quantity
    from jsonb_to_recordset(v_requirements) as r(item_id uuid, essence_id uuid, quantity numeric)
    group by r.essence_id order by r.essence_id
  loop
    select * into v_essence from public.essences where id = v_requirement.essence_id for update;
    if not found or not v_essence.active or v_essence.stock_ml < v_requirement.quantity then
      raise exception 'Estoque de essência insuficiente ou indisponível para este pedido';
    end if;
  end loop;
  for v_requirement in
    select * from jsonb_to_recordset(v_requirements) as r(item_id uuid, essence_id uuid, quantity numeric)
    order by essence_id, item_id
  loop
    update public.essences set stock_ml = stock_ml - v_requirement.quantity, updated_at = now()
    where id = v_requirement.essence_id returning * into v_essence;
    insert into public.essence_stock_movements(
      essence_id, movement_type, quantity_ml, balance_after_ml,
      order_id, order_item_id, note, stock_unit
    ) values (
      v_requirement.essence_id, 'sale_consumption', -v_requirement.quantity,
      v_essence.stock_ml, p_order_id, v_requirement.item_id,
      'Consumo pela receita do tamanho comprado', v_essence.stock_unit
    );
  end loop;
  update public.orders set essence_stock_consumed_at = now() where id = p_order_id;
end;
$$;
revoke all on function public.consume_paid_order_essences(uuid) from public, anon, authenticated, service_role;

-- Keep the existing verified-payment flow unchanged except for one atomic
-- fulfillment step. Fail rather than replace an unexpectedly changed function.
do $$
declare
  v_definition text;
  v_anchor text := '    for v_stock in' || chr(10) || '      select (element->>''productId'')::uuid as product_id,';
begin
  select pg_get_functiondef('public.confirm_paid_commerce_checkout(uuid,text,numeric,text)'::regprocedure)
    into v_definition;
  if strpos(v_definition, 'perform public.consume_paid_order_essences(v_order_id);') = 0 then
    if strpos(v_definition, v_anchor) = 0 then
      raise exception 'O fluxo de pagamento mudou: revise a integração das receitas antes de aplicar';
    end if;
    execute replace(v_definition, v_anchor,
      '    perform public.consume_paid_order_essences(v_order_id);' || chr(10) || chr(10) || v_anchor);
  end if;
end;
$$;
