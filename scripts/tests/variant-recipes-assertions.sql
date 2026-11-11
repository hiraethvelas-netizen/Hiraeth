-- Fictional candles, essences, customers and payments only.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
insert into public.essences(id,name,stock_ml,stock_unit) values
 ('10000000-0000-0000-0000-000000000001','Essência em gramas',100,'g'),
 ('10000000-0000-0000-0000-000000000002','Essência legada em ml',100,'ml');
select public.save_product_with_recipes(null,
 '{"name":"Vela fictícia","slug":"vela-ficticia","product_type":"candle","price":30,"stock":30,"status":"published","images":[],"variants":[{"key":"100g","label":"100 g","recipe_id":"20000000-0000-0000-0000-000000000001","stock":10},{"key":"250g","label":"250 g","recipe_id":"20000000-0000-0000-0000-000000000002","stock":10},{"key":"padrao","label":"Padrão","stock":10}]}',
 '[{"essence_id":"10000000-0000-0000-0000-000000000002","quantity":3}]',
 '[{"recipe_id":"20000000-0000-0000-0000-000000000001","ingredients":[{"essence_id":"10000000-0000-0000-0000-000000000001","quantity":8},{"essence_id":"10000000-0000-0000-0000-000000000002","quantity":2}]},{"recipe_id":"20000000-0000-0000-0000-000000000002","ingredients":[{"essence_id":"10000000-0000-0000-0000-000000000001","quantity":20},{"essence_id":"10000000-0000-0000-0000-000000000002","quantity":5}]}]');

do $$
declare v_id uuid; v_payload jsonb; v_default jsonb; v_recipes jsonb;
begin
 select id,to_jsonb(p) into v_id,v_payload from public.products p where slug='vela-ficticia';
 select jsonb_agg(jsonb_build_object('essence_id',essence_id,'quantity',quantity_ml)) into v_default from public.product_essences where product_id=v_id;
 select jsonb_agg(jsonb_build_object('recipe_id',recipe_id,'ingredients',ingredients)) into v_recipes
 from (select recipe_id,jsonb_agg(jsonb_build_object('essence_id',essence_id,'quantity',quantity)) ingredients from public.product_variant_essences where product_id=v_id group by recipe_id) r;
 -- Recipe ID persists across display-name/key edits, preserving 100 g's 8 g.
 v_payload := jsonb_set(v_payload,'{variants,0,key}','"100-gramas"');
 perform public.save_product_with_recipes(v_id,v_payload,v_default,v_recipes);
 -- A bad foreign essence must roll back the product edit as well as recipes.
 begin
   perform public.save_product_with_recipes(v_id,jsonb_set(v_payload,'{name}','"Nome que não deve persistir"'),v_default,
    '[{"recipe_id":"20000000-0000-0000-0000-000000000001","ingredients":[{"essence_id":"10000000-0000-0000-0000-000000000099","quantity":8}]}]');
   raise exception 'Expected invalid essence';
 exception when others then if sqlerrm='Expected invalid essence' then raise; end if; end;
 if (select name from public.products where id=v_id)<>'Vela fictícia' then raise exception 'Partial product update'; end if;
 if (select quantity from public.product_variant_essences where product_id=v_id and recipe_id='20000000-0000-0000-0000-000000000001' and essence_id='10000000-0000-0000-0000-000000000001')<>8 then raise exception 'Recipe lost after rename/rollback'; end if;
 begin
   perform public.set_product_recipes(v_id,'[]','[{"recipe_id":"20000000-0000-0000-0000-000000000099","ingredients":[{"essence_id":"10000000-0000-0000-0000-000000000001","quantity":1}]}]');
   raise exception 'Expected foreign variation';
 exception when others then if sqlerrm='Expected foreign variation' then raise; end if; end;
 begin
   perform public.set_product_recipes(v_id,'[]','[{"recipe_id":"20000000-0000-0000-0000-000000000001","ingredients":[]}]');
   raise exception 'Expected empty own recipe';
 exception when others then if sqlerrm='Expected empty own recipe' then raise; end if; end;
 begin
   perform public.set_product_recipes(v_id,'[{"essence_id":"10000000-0000-0000-0000-000000000001","quantity":0}]','[]');
   raise exception 'Expected invalid quantity';
 exception when others then if sqlerrm='Expected invalid quantity' then raise; end if; end;
 begin
   update public.essences set stock_unit='ml' where stock_unit='g';
   raise exception 'Expected forbidden unit relabel';
 exception when others then if sqlerrm='Expected forbidden unit relabel' then raise; end if; end;
end $$;

-- A normal customer has no recipe-management or formula-reading permission.
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
do $$
begin
 if (select count(*) from public.product_variant_essences)<>0 then raise exception 'Private recipe exposed'; end if;
 begin
   perform public.save_product_with_recipes(null,'{}','[]','[]');
   raise exception 'Expected admin-only save';
 exception when insufficient_privilege then null; end;
 begin
   perform public.consume_paid_order_essences(gen_random_uuid());
   raise exception 'Expected private helper';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Confirm only a verified service-role payment. 2 x 100 g + 1 x 250 g + 1
-- inherited standard recipe consumes 36 g and 12 ml, never 100/250 g of essence.
insert into public.commerce_checkouts(id,user_id,email,recipient,items,freight,subtotal,shipping,total)
select '30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','fictional@example.invalid','{"name":"Pessoa fictícia"}',
 jsonb_build_array(
  jsonb_build_object('productId',id,'name',name,'quantity',2,'price',30,'stockVariantKey','100-gramas','variantDetails',jsonb_build_object('stockVariantKey','100-gramas')),
  jsonb_build_object('productId',id,'name',name,'quantity',1,'price',30,'stockVariantKey','250g','variantDetails',jsonb_build_object('stockVariantKey','250g')),
  jsonb_build_object('productId',id,'name',name,'quantity',1,'price',30,'stockVariantKey','padrao','variantDetails',jsonb_build_object('stockVariantKey','padrao'))),
 '{}',120,0,120 from public.products where slug='vela-ficticia';
set role service_role;
set request.jwt.claim.role = 'service_role';
select public.confirm_paid_commerce_checkout('30000000-0000-0000-0000-000000000001','fictional-payment-one',120,'pix');
select public.confirm_paid_commerce_checkout('30000000-0000-0000-0000-000000000001','fictional-payment-one',120,'pix');
reset role;
do $$
declare v_order uuid;
begin
 select order_id into v_order from public.commerce_checkouts where id='30000000-0000-0000-0000-000000000001';
 if v_order is null then raise exception 'Paid order not fulfilled'; end if;
 if (select stock_ml from public.essences where stock_unit='g')<>64 then raise exception 'Wrong grams consumption'; end if;
 if (select stock_ml from public.essences where stock_unit='ml')<>88 then raise exception 'Wrong ml/default consumption'; end if;
 if (select count(*) from public.essence_stock_movements where order_id=v_order)<>5 then raise exception 'Wrong movement count/idempotence'; end if;
 if exists(select 1 from public.essence_stock_movements m join public.essences e on e.id=m.essence_id where m.stock_unit<>e.stock_unit or m.quantity_ml>=0) then raise exception 'Bad movement unit/sign'; end if;
 -- Private helper independently guards against repeated consumption.
 perform public.consume_paid_order_essences(v_order);
 if (select stock_ml from public.essences where stock_unit='g')<>64 then raise exception 'Duplicate consumption'; end if;
 -- Cancellations do not assume the essence can be recovered from made candles.
 update public.orders set status='cancelled' where id=v_order;
 if (select stock_ml from public.essences where stock_unit='g')<>64 then raise exception 'Unexpected replenishment'; end if;
end $$;

-- Insufficient essence rolls back ALL fulfillment, including product stock.
update public.essences set stock_ml=1 where stock_unit='g';
insert into public.commerce_checkouts(id,user_id,email,recipient,items,freight,subtotal,shipping,total)
select '30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','fictional@example.invalid','{}',
 jsonb_build_array(jsonb_build_object('productId',id,'name',name,'quantity',1,'price',30,'stockVariantKey','250g','variantDetails',jsonb_build_object('stockVariantKey','250g'))),
 '{}',30,0,30 from public.products where slug='vela-ficticia';
set role service_role;
select public.confirm_paid_commerce_checkout('30000000-0000-0000-0000-000000000002','fictional-payment-two',30,'pix');
reset role;
do $$
begin
 if (select status from public.commerce_checkouts where id='30000000-0000-0000-0000-000000000002')<>'paid_attention' then raise exception 'Missing fulfillment review'; end if;
 if (select stock from public.products where slug='vela-ficticia')<>26 then raise exception 'Stock changed despite essence shortage'; end if;
 if (select count(*) from public.orders)<>1 then raise exception 'Partial order after shortage'; end if;
 if (select stock_ml from public.essences where stock_unit='g')<>1 then raise exception 'Partial essence debit'; end if;
 if (select stock_ml from public.essences where stock_unit='ml')<>88 then raise exception 'Other essence debited on shortage'; end if;
 if jsonb_array_length(public.get_product_aroma_notes((select id from public.products where slug='vela-ficticia')))<>2 then raise exception 'Aroma notes lost/duplicated'; end if;
 if public.get_product_aroma_notes((select id from public.products where slug='vela-ficticia'))::text like '%quantity%' then raise exception 'Recipe quantity exposed in notes'; end if;
end $$;
-- Relative manual stock movements use the current balance; explicit counts
-- reject a stale screen, and an insert failure rolls back the balance update.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.record_essence_stock_movement('10000000-0000-0000-0000-000000000001','purchase',10,100);
select public.record_essence_stock_movement('10000000-0000-0000-0000-000000000001','loss',2,100);
do $$
begin
 if (select stock_ml from public.essences where stock_unit='g')<>9 then raise exception 'Manual delta overwrote current balance'; end if;
 begin
   perform public.record_essence_stock_movement('10000000-0000-0000-0000-000000000001','adjustment',50,100);
   raise exception 'Expected stale adjustment rejection';
 exception when others then if sqlerrm='Expected stale adjustment rejection' then raise; end if; end;
 if (select stock_ml from public.essences where stock_unit='g')<>9 then raise exception 'Stale count changed stock'; end if;
 perform public.record_essence_stock_movement('10000000-0000-0000-0000-000000000001','adjustment',12,9);
end $$;
reset role;
create function public.fixture_fail_movement() returns trigger language plpgsql as $$
begin raise exception 'Fictional ledger failure'; end $$;
create trigger fixture_fail_movement before insert on public.essence_stock_movements
  for each row execute function public.fixture_fail_movement();
set role authenticated;
do $$
begin
 begin
   perform public.record_essence_stock_movement('10000000-0000-0000-0000-000000000001','purchase',10,12);
   raise exception 'Expected ledger failure';
 exception when others then if sqlerrm='Expected ledger failure' then raise; end if; end;
 if (select stock_ml from public.essences where stock_unit='g')<>12 then raise exception 'Balance changed despite ledger failure'; end if;
end $$;
reset role;
drop trigger fixture_fail_movement on public.essence_stock_movements;
drop function public.fixture_fail_movement();
select 'All variant recipe assertions passed' as result;
