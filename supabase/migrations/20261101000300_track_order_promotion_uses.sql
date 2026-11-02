-- Prepared for owner approval. Counts each applied promotion once per newly
-- populated order. Existing orders and promotion counters are not backfilled.
create table if not exists public.promotion_redemptions (
  order_id uuid not null references public.orders(id) on delete cascade,
  promotion_id uuid not null references public.promotions(id),
  created_at timestamptz not null default now(),
  primary key (order_id, promotion_id)
);
alter table public.promotion_redemptions enable row level security;
revoke all on public.promotion_redemptions from anon, authenticated;
grant select on public.promotion_redemptions to authenticated;
create policy "admins read promotion redemption ledger" on public.promotion_redemptions
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.track_order_promotion_uses()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_order record;
  v_promotion_id uuid;
  v_promotion public.promotions%rowtype;
  v_count integer;
begin
  for v_order in
    select o.id, o.promotion_summary,
      o.subtotal as subtotal
    from public.orders o
    where o.id in (select distinct order_id from new_order_items)
  loop
    for v_promotion_id in
      select distinct (entry->>'id')::uuid
      from jsonb_array_elements(coalesce(v_order.promotion_summary->'applied','[]'::jsonb)) entry
    loop
      -- Serialize uses of the same promotion to avoid exceeding a limit.
      select * into v_promotion from public.promotions where id=v_promotion_id for update;
      if not found then raise exception 'Promoção não encontrada'; end if;
      if exists(select 1 from public.promotion_redemptions where order_id=v_order.id and promotion_id=v_promotion_id) then continue; end if;
      if not v_promotion.active or not v_promotion.visible
        or (v_promotion.starts_at is not null and v_promotion.starts_at > now())
        or (v_promotion.ends_at is not null and v_promotion.ends_at < now())
        or coalesce(v_order.subtotal,0) < v_promotion.min_cart_value
        or (v_promotion.usage_limit is not null and v_promotion.usage_count >= v_promotion.usage_limit)
      then raise exception 'A promoção mudou ou atingiu o limite. Revise o carrinho'; end if;
      insert into public.promotion_redemptions(order_id,promotion_id) values(v_order.id,v_promotion_id)
        on conflict do nothing;
      get diagnostics v_count = row_count;
      if v_count > 0 then update public.promotions set usage_count=usage_count+1 where id=v_promotion_id; end if;
    end loop;
  end loop;
  return null;
end;
$$;
revoke all on function public.track_order_promotion_uses() from public,anon,authenticated;
create trigger track_order_promotion_uses after insert on public.order_items
  referencing new table as new_order_items for each statement
  execute function public.track_order_promotion_uses();

-- The current checkout creates the parent order before its items. If item
-- validation fails, allow only the creator to discard that fresh, empty,
-- unpaid pending record. No general customer DELETE policy is introduced.
create or replace function public.discard_incomplete_order(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  delete from public.orders o where o.id=p_order_id and o.user_id=auth.uid()
    and o.status='pending' and o.payment_id is null and o.created_at >= now()-interval '5 minutes'
    and not exists(select 1 from public.order_items i where i.order_id=o.id);
  get diagnostics v_count = row_count;
  return v_count=1;
end;
$$;
revoke all on function public.discard_incomplete_order(uuid) from public,anon;
grant execute on function public.discard_incomplete_order(uuid) to authenticated;
