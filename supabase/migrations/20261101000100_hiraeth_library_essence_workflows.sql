-- Prepared for review. Do not apply to production without the owner's approval.
-- Additive fields only: no existing orders, stocks, products or customer records are rewritten.
alter table public.community_library add column if not exists finished boolean not null default false;
alter table public.essences
  add column if not exists is_pure boolean not null default true,
  add column if not exists top_notes text[] not null default '{}',
  add column if not exists heart_notes text[] not null default '{}',
  add column if not exists base_notes text[] not null default '{}';
alter table public.products add column if not exists product_type text
  check (product_type in ('candle', 'artifact'));
alter table public.orders add column if not exists promotion_summary jsonb not null default '{}';

-- Keep existing admin RLS in force. Recipe replacement is transactional: an error
-- rolls back the entire replacement instead of leaving a partially emptied recipe.
create or replace function public.set_product_essences(p_product_id uuid, p_ingredients jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Apenas a administração pode salvar receitas';
  end if;
  if jsonb_typeof(p_ingredients) is distinct from 'array' then
    raise exception 'A receita deve ser uma lista';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_ingredients) as r(essence_id uuid, quantity_ml numeric)
             where r.essence_id is null or r.quantity_ml is null or r.quantity_ml <= 0)
     or exists (select r.essence_id from jsonb_to_recordset(p_ingredients) as r(essence_id uuid, quantity_ml numeric)
                group by r.essence_id having count(*) > 1) then
    raise exception 'Confira as essências e as quantidades positivas, sem ingredientes repetidos';
  end if;
  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Produto não encontrado';
  end if;
  perform 1 from public.products where id = p_product_id for update;
  delete from public.product_essences where product_id = p_product_id;
  insert into public.product_essences(product_id, essence_id, quantity_ml)
    select p_product_id, r.essence_id, r.quantity_ml
    from jsonb_to_recordset(p_ingredients) as r(essence_id uuid, quantity_ml numeric);
end;
$$;
revoke all on function public.set_product_essences(uuid,jsonb) from public, anon;
grant execute on function public.set_product_essences(uuid,jsonb) to authenticated;

-- Only the public scent description is exposed. Stock, supplier, recipe amounts
-- and internal notes remain protected by the existing essence policies.
create or replace function public.get_product_aroma_notes(p_product_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('name', e.name, 'is_pure', e.is_pure,
    'top_notes', e.top_notes, 'heart_notes', e.heart_notes, 'base_notes', e.base_notes)
    order by e.name), '[]'::jsonb)
  from public.product_essences r
  join public.essences e on e.id = r.essence_id and e.active = true
  join public.products p on p.id = r.product_id and p.status = 'published' and p.product_type is distinct from 'artifact'
  where r.product_id = p_product_id;
$$;
revoke all on function public.get_product_aroma_notes(uuid) from public;
grant execute on function public.get_product_aroma_notes(uuid) to anon, authenticated;
