-- A nova opção complementa os selos já permitidos, sem alterar produtos cadastrados.
-- A constraint existente tem esse nome na base de produção.
alter table public.products
  drop constraint if exists products_product_badge_check;

alter table public.products
  add constraint products_product_badge_check
  check (product_badge is null or product_badge in ('new', 'limited', 'bestseller', 'favorite_scent'));
