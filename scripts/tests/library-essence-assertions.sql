-- Run only after the fixture and the prepared migration in a disposable database.
set app.test_admin='true';
set role authenticated;
select public.set_product_essences('00000000-0000-0000-0000-000000000001','[{"essence_id":"00000000-0000-0000-0000-000000000003","quantity_ml":8}]');
do $$ begin
  begin
    perform public.set_product_essences('00000000-0000-0000-0000-000000000001','[{"essence_id":"00000000-0000-0000-0000-000000000099","quantity_ml":9}]');
    raise exception 'Expected a missing ingredient error';
  exception when foreign_key_violation then null;
  end;
  if (select quantity_ml from public.product_essences where product_id='00000000-0000-0000-0000-000000000001') <> 8 then raise exception 'Recipe was not rolled back'; end if;
  begin
    perform public.set_product_essences('00000000-0000-0000-0000-000000000001','[{"essence_id":"00000000-0000-0000-0000-000000000003","quantity_ml":0}]');
    raise exception 'Expected quantity rejection';
  exception when raise_exception then
    if sqlerrm='Expected quantity rejection' then raise; end if;
  end;
end $$;
reset role;
update public.essences set base_notes=array['Baunilha'];
update public.community_library set finished=true;
do $$ begin
  if not (select finished from public.community_library where title='Vela de teste') then raise exception 'Finished state did not persist'; end if;
end $$;
set role anon;
do $$ declare notes jsonb; begin
  notes:=public.get_product_aroma_notes('00000000-0000-0000-0000-000000000001');
  if notes->0->>'name' <> 'Baunilha' then raise exception 'Missing public notes'; end if;
  if (notes->0) ? 'stock_ml' or (notes->0) ? 'quantity_ml' or (notes->0) ? 'supplier' then raise exception 'Internal recipe data leaked'; end if;
  if public.get_product_aroma_notes('00000000-0000-0000-0000-000000000002') <> '[]'::jsonb then raise exception 'Draft notes are public'; end if;
end $$;
reset role;
set app.test_admin='false';
set role authenticated;
do $$ begin
  begin
    perform public.set_product_essences('00000000-0000-0000-0000-000000000001','[]');
    raise exception 'Expected admin rejection';
  exception when raise_exception then
    if sqlerrm='Expected admin rejection' then raise; end if;
  end;
end $$;
reset role;
select 'All isolated migration assertions passed' as result;

-- Verify only newly classified artifacts are excluded; legacy/unclassified candles are preserved.
create trigger add_order_item_to_community_library after insert on public.order_items for each row execute function public.add_order_item_to_community_library();
insert into public.orders(id,user_id,status) values('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000011','delivered');
update public.products set product_type='artifact' where id='00000000-0000-0000-0000-000000000002';
insert into public.order_items(id,order_id,product_id,product_name,quantity) values
 ('00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001','Vela comprada',1),
 ('00000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000002','Artefato comprado',1);
do $$ begin
 if not exists(select 1 from public.community_library where order_item_id='00000000-0000-0000-0000-000000000020') then raise exception 'Purchased candle was not recorded'; end if;
 if exists(select 1 from public.community_library where order_item_id='00000000-0000-0000-0000-000000000021') then raise exception 'Artifact was recorded as a candle'; end if;
end $$;
select 'Artifact library assertions passed' as result;

-- Limits are checked on the server and counted once, even for split item inserts.
insert into public.promotions(id,name,usage_limit) values('00000000-0000-0000-0000-000000000030','Teste de limite',1);
insert into public.orders(id,user_id,status,promotion_summary) values
 ('00000000-0000-0000-0000-000000000031','00000000-0000-0000-0000-000000000011','pending','{"applied":[{"id":"00000000-0000-0000-0000-000000000030"}]}'),
 ('00000000-0000-0000-0000-000000000032','00000000-0000-0000-0000-000000000011','pending','{"applied":[{"id":"00000000-0000-0000-0000-000000000030"}]}');
insert into public.order_items(id,order_id,product_id,product_name,quantity) values('00000000-0000-0000-0000-000000000041','00000000-0000-0000-0000-000000000031','00000000-0000-0000-0000-000000000001','Vela',1);
insert into public.order_items(id,order_id,product_id,product_name,quantity) values('00000000-0000-0000-0000-000000000042','00000000-0000-0000-0000-000000000031','00000000-0000-0000-0000-000000000001','Outra vela',1);
do $$ begin
 if (select usage_count from public.promotions where id='00000000-0000-0000-0000-000000000030')<>1 then raise exception 'Promotion use counted twice'; end if;
 begin
  insert into public.order_items(id,order_id,product_id,product_name,quantity) values('00000000-0000-0000-0000-000000000043','00000000-0000-0000-0000-000000000032','00000000-0000-0000-0000-000000000001','Não deve salvar',1);
  raise exception 'Expected promotion limit rejection';
 exception when raise_exception then if sqlerrm='Expected promotion limit rejection' then raise; end if; end;
 if exists(select 1 from public.order_items where id='00000000-0000-0000-0000-000000000043') then raise exception 'Rejected item persisted'; end if;
 if has_table_privilege('authenticated','public.promotion_redemptions','INSERT') then raise exception 'Clients can insert redemption records'; end if;
end $$;
select 'Promotion counter assertions passed' as result;

-- Cleanup is restricted to fresh, own, pending and empty orders.
set app.test_user='00000000-0000-0000-0000-000000000011';
set role authenticated;
do $$ begin
 if public.discard_incomplete_order('00000000-0000-0000-0000-000000000031') then raise exception 'Deleted an order with items'; end if;
 if not public.discard_incomplete_order('00000000-0000-0000-0000-000000000032') then raise exception 'Did not remove fresh failed empty order'; end if;
end $$;
reset role;
select 'Incomplete order cleanup assertions passed' as result;
