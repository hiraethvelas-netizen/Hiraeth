-- Hiraeth: product labels and Secret Four Flames promotion
alter table public.products
  add column if not exists product_badge text
    check (product_badge in ('new','limited','bestseller'));

create table if not exists public.secret_flame_settings (
  id boolean primary key default true check (id = true),
  active boolean not null default false,
  title text not null default 'O Segredo das Quatro Chamas',
  subtitle text not null default 'Escolha uma vela e descubra a surpresa que ela guarda.',
  candle_images jsonb not null default '[]'::jsonb,
  min_cart_value numeric not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.secret_flame_settings enable row level security;
drop policy if exists "Public can view active Secret Flames settings" on public.secret_flame_settings;
create policy "Public can view active Secret Flames settings"
  on public.secret_flame_settings for select to anon, authenticated using (active = true);
drop policy if exists "Admins manage Secret Flames settings" on public.secret_flame_settings;
create policy "Admins manage Secret Flames settings"
  on public.secret_flame_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.secret_flame_rewards (
  candle_index integer primary key check (candle_index between 0 and 3),
  reward_type text not null default 'message',
  reward_title text not null default '',
  reward_description text not null default '',
  coupon_code text,
  updated_at timestamptz not null default now()
);
alter table public.secret_flame_rewards enable row level security;
drop policy if exists "Admins manage Secret Flames rewards" on public.secret_flame_rewards;
create policy "Admins manage Secret Flames rewards"
  on public.secret_flame_rewards for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.secret_flame_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  visitor_key text,
  candle_index integer not null check (candle_index between 0 and 3),
  reward_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint secret_flame_claim_identity check (user_id is not null or visitor_key is not null)
);
create unique index if not exists secret_flame_claims_user_unique
  on public.secret_flame_claims(user_id) where user_id is not null;
create unique index if not exists secret_flame_claims_visitor_unique
  on public.secret_flame_claims(visitor_key) where visitor_key is not null;
alter table public.secret_flame_claims enable row level security;
drop policy if exists "Users read own Secret Flames claim" on public.secret_flame_claims;
create policy "Users read own Secret Flames claim"
  on public.secret_flame_claims for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Admins read Secret Flames claims" on public.secret_flame_claims;
create policy "Admins read Secret Flames claims"
  on public.secret_flame_claims for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.claim_secret_flame(p_candle_index integer, p_visitor_key text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_key text := nullif(trim(p_visitor_key), '');
  v_claim public.secret_flame_claims%rowtype;
  v_reward public.secret_flame_rewards%rowtype;
  v_settings public.secret_flame_settings%rowtype;
  v_identity_user uuid;
begin
  if p_candle_index < 0 or p_candle_index > 3 then
    raise exception 'Escolha uma das quatro velas.';
  end if;
  if v_user_id is null and v_key is null then
    raise exception 'Identificador de participação ausente.';
  end if;
  select * into v_settings from public.secret_flame_settings where id = true and active = true;
  if not found or (v_settings.starts_at is not null and v_settings.starts_at > now())
     or (v_settings.ends_at is not null and v_settings.ends_at < now()) then
    raise exception 'A promoção não está disponível.';
  end if;
  if v_user_id is not null then
    select * into v_claim from public.secret_flame_claims where user_id = v_user_id;
  else
    select * into v_claim from public.secret_flame_claims where visitor_key = v_key;
  end if;
  if found then
    return jsonb_build_object('already_claimed', true, 'candle_index', v_claim.candle_index, 'reward', v_claim.reward_snapshot);
  end if;
  select * into v_reward from public.secret_flame_rewards where candle_index = p_candle_index;
  if not found then
    raise exception 'Esta vela ainda não tem um benefício configurado.';
  end if;
  insert into public.secret_flame_claims(user_id, visitor_key, candle_index, reward_snapshot)
  values (v_user_id, case when v_user_id is null then v_key else null end, p_candle_index,
    jsonb_build_object('type',v_reward.reward_type,'title',v_reward.reward_title,
      'description',v_reward.reward_description,'coupon_code',v_reward.coupon_code))
  returning * into v_claim;
  return jsonb_build_object('already_claimed', false, 'candle_index', v_claim.candle_index, 'reward', v_claim.reward_snapshot);
exception when unique_violation then
  if v_user_id is not null then
    select * into v_claim from public.secret_flame_claims where user_id = v_user_id;
  else
    select * into v_claim from public.secret_flame_claims where visitor_key = v_key;
  end if;
  return jsonb_build_object('already_claimed', true, 'candle_index', v_claim.candle_index, 'reward', v_claim.reward_snapshot);
end;
$$;
grant execute on function public.claim_secret_flame(integer,text) to anon, authenticated;
