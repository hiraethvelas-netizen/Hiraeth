-- Hiraeth: insights de acesso e CRM administrativo sem identificação de visitantes anônimos.
-- Não usa IP, fingerprint ou IDs persistentes para visitantes sem cadastro.
-- Contadores são ABERTURAS/SESSÕES aproximadas, nunca "pessoas únicas".
create table if not exists public.hiraeth_daily_visits (
  day date not null default current_date,
  channel text not null check (channel in ('app', 'portal')),
  portal_slug text not null default '',
  view_count integer not null default 0 check (view_count >= 0),
  primary key (day, channel, portal_slug),
  check ((channel = 'app' and portal_slug = '') or
         (channel = 'portal' and length(portal_slug) between 1 and 120))
);
create table if not exists public.hiraeth_customer_activity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_app_seen_at timestamptz,
  last_portal_seen_at timestamptz,
  last_portal_slug text,
  updated_at timestamptz not null default now()
);

alter table public.hiraeth_daily_visits enable row level security;
alter table public.hiraeth_customer_activity enable row level security;
revoke all on public.hiraeth_daily_visits from public, anon, authenticated;
revoke all on public.hiraeth_customer_activity from public, anon, authenticated;
grant select on public.hiraeth_daily_visits, public.hiraeth_customer_activity to authenticated;
grant all on public.hiraeth_daily_visits, public.hiraeth_customer_activity to service_role;

drop policy if exists "hiraeth admins see aggregated visits" on public.hiraeth_daily_visits;
create policy "hiraeth admins see aggregated visits"
  on public.hiraeth_daily_visits for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "hiraeth admins see account activity" on public.hiraeth_customer_activity;
create policy "hiraeth admins see account activity"
  on public.hiraeth_customer_activity for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.hiraeth_record_visit(
  p_channel text,
  p_portal_slug text default null
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_slug text := '';
  v_user uuid := auth.uid();
begin
  -- O aplicativo nunca precisa registrar visitas de contas administrativas.
  if v_user is not null and public.has_role(v_user, 'admin') then return; end if;
  if p_channel not in ('app', 'portal') or p_channel is null then return; end if;
  if p_channel = 'portal' then
    v_slug := trim(coalesce(p_portal_slug, ''));
    if length(v_slug) < 1 or length(v_slug) > 120 then return; end if;
    if not exists (
      select 1 from public.portals where slug = v_slug and status = 'published'
    ) then return; end if;
  end if;
  insert into public.hiraeth_daily_visits (day, channel, portal_slug, view_count)
    values (current_date, p_channel, v_slug, 1)
    on conflict (day, channel, portal_slug)
    do update set view_count = public.hiraeth_daily_visits.view_count + 1;

  -- Um acesso anônimo é agregado; NÃO se cria perfil, telefone, IP ou identificador.
  if v_user is not null then
    insert into public.hiraeth_customer_activity (
      user_id, last_app_seen_at, last_portal_seen_at, last_portal_slug
    ) values (
      v_user,
      case when p_channel = 'app' then now() else null end,
      case when p_channel = 'portal' then now() else null end,
      case when p_channel = 'portal' then v_slug else null end
    )
    on conflict (user_id) do update set
      last_app_seen_at = case when p_channel = 'app'
        then now() else public.hiraeth_customer_activity.last_app_seen_at end,
      last_portal_seen_at = case when p_channel = 'portal'
        then now() else public.hiraeth_customer_activity.last_portal_seen_at end,
      last_portal_slug = case when p_channel = 'portal'
        then v_slug else public.hiraeth_customer_activity.last_portal_slug end,
      updated_at = now();
  end if;
end;
$$;
revoke all on function public.hiraeth_record_visit(text, text) from public;
grant execute on function public.hiraeth_record_visit(text, text) to anon, authenticated;

-- Métricas agregadas, só administradores. Cadastro vem das contas já existentes.
create or replace function public.hiraeth_admin_insights(p_days integer default 30)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_days integer := least(90, greatest(1, coalesce(p_days, 30)));
  v_from timestamptz := (current_date - (least(90, greatest(1, coalesce(p_days, 30))) - 1))::timestamptz;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Acesso restrito à administração' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'registered_total', (select count(*) from auth.users u
      where not exists (select 1 from public.user_roles r where r.user_id = u.id and r.role = 'admin')),
    'registered_period', (select count(*) from auth.users u where u.created_at >= v_from
      and not exists (select 1 from public.user_roles r where r.user_id = u.id and r.role = 'admin')),
    'community_total', (select count(*) from public.community_memberships),
    'known_app_accounts_period', (select count(*) from public.hiraeth_customer_activity
      where last_app_seen_at >= v_from),
    'known_portal_accounts_period', (select count(*) from public.hiraeth_customer_activity
      where last_portal_seen_at >= v_from),
    'app_sessions_period', (select coalesce(sum(view_count), 0) from public.hiraeth_daily_visits
      where channel = 'app' and day >= v_from::date),
    'portal_sessions_period', (select coalesce(sum(view_count), 0) from public.hiraeth_daily_visits
      where channel = 'portal' and day >= v_from::date),
    'portals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', b.portal_slug,
        'name', coalesce(p.name, b.portal_slug),
        'sessions', b.views
      ) order by b.views desc)
      from (
        select portal_slug, sum(view_count) as views
        from public.hiraeth_daily_visits
        where channel = 'portal' and day >= v_from::date
        group by portal_slug order by sum(view_count) desc limit 20
      ) b
      left join public.portals p on p.slug = b.portal_slug
    ), '[]'::jsonb),
    'days', v_days
  );
end;
$$;

-- Pesquisa paginada. Dados de auth.users ficam dentro da função protegida,
-- sem conceder acesso direto à tabela de autenticação aos clientes.
create or replace function public.hiraeth_admin_customers(
  p_search text default '',
  p_filter text default 'all',
  p_limit integer default 20,
  p_offset integer default 0
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_search text := lower(left(trim(coalesce(p_search, '')), 100));
  v_digits text := regexp_replace(coalesce(p_search, ''), '[^0-9]', '', 'g');
  v_filter text := case when p_filter in ('all','app','community') then p_filter else 'all' end;
  v_limit integer := least(30, greatest(1, coalesce(p_limit, 20)));
  v_offset integer := least(10000, greatest(0, coalesce(p_offset, 0)));
  v_total integer;
  v_rows jsonb;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Acesso restrito à administração' using errcode = '42501';
  end if;

  with customers as (
    select u.id, u.email, u.created_at,
      coalesce(nullif(u.raw_user_meta_data->>'display_name', ''),
        nullif(u.raw_user_meta_data->>'full_name', ''),
        nullif(p.display_name, ''), 'Cliente') as display_name,
      coalesce(nullif(u.raw_user_meta_data->>'phone', ''), nullif(u.phone, '')) as phone,
      cp.username, (cm.user_id is not null) as community_member,
      ca.last_app_seen_at, ca.last_portal_seen_at, ca.last_portal_slug,
      (u.raw_user_meta_data->>'hiraeth_marketing_opt_in' = 'true') as marketing_opt_in,
      (select count(*) from public.orders o where o.user_id = u.id) as orders_count
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.community_profiles cp on cp.user_id = u.id
    left join public.community_memberships cm on cm.user_id = u.id
    left join public.hiraeth_customer_activity ca on ca.user_id = u.id
    where not exists (select 1 from public.user_roles r
        where r.user_id = u.id and r.role = 'admin')
      and (v_filter = 'all'
        or (v_filter = 'app' and ca.last_app_seen_at is not null)
        or (v_filter = 'community' and cm.user_id is not null))
      and (v_search = ''
        or position(v_search in lower(coalesce(u.email, ''))) > 0
        or position(v_search in lower(coalesce(p.display_name, ''))) > 0
        or position(v_search in lower(coalesce(u.raw_user_meta_data->>'display_name', ''))) > 0
        or position(v_search in lower(coalesce(u.raw_user_meta_data->>'full_name', ''))) > 0
        or position(v_search in lower(coalesce(cp.username, ''))) > 0
        or (length(v_digits) >= 3 and position(v_digits in
          regexp_replace(coalesce(nullif(u.raw_user_meta_data->>'phone', ''), u.phone, ''), '[^0-9]', '', 'g')) > 0))
  )
  select count(*) into v_total from customers;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.created_at desc), '[]'::jsonb)
    into v_rows
  from (
    select u.id, u.email, u.created_at,
      coalesce(nullif(u.raw_user_meta_data->>'display_name', ''),
        nullif(u.raw_user_meta_data->>'full_name', ''),
        nullif(p.display_name, ''), 'Cliente') as display_name,
      coalesce(nullif(u.raw_user_meta_data->>'phone', ''), nullif(u.phone, '')) as phone,
      cp.username, (cm.user_id is not null) as community_member,
      ca.last_app_seen_at, ca.last_portal_seen_at, ca.last_portal_slug,
      (u.raw_user_meta_data->>'hiraeth_marketing_opt_in' = 'true') as marketing_opt_in,
      (select count(*) from public.orders o where o.user_id = u.id) as orders_count
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.community_profiles cp on cp.user_id = u.id
    left join public.community_memberships cm on cm.user_id = u.id
    left join public.hiraeth_customer_activity ca on ca.user_id = u.id
    where not exists (select 1 from public.user_roles r
        where r.user_id = u.id and r.role = 'admin')
      and (v_filter = 'all'
        or (v_filter = 'app' and ca.last_app_seen_at is not null)
        or (v_filter = 'community' and cm.user_id is not null))
      and (v_search = ''
        or position(v_search in lower(coalesce(u.email, ''))) > 0
        or position(v_search in lower(coalesce(p.display_name, ''))) > 0
        or position(v_search in lower(coalesce(u.raw_user_meta_data->>'display_name', ''))) > 0
        or position(v_search in lower(coalesce(u.raw_user_meta_data->>'full_name', ''))) > 0
        or position(v_search in lower(coalesce(cp.username, ''))) > 0
        or (length(v_digits) >= 3 and position(v_digits in
          regexp_replace(coalesce(nullif(u.raw_user_meta_data->>'phone', ''), u.phone, ''), '[^0-9]', '', 'g')) > 0))
    order by u.created_at desc
    limit v_limit offset v_offset
  ) c;
  return jsonb_build_object('customers', v_rows, 'total', v_total,
    'limit', v_limit, 'offset', v_offset);
end;
$$;

-- Ficha completa necessária ao atendimento, não expondo senha/tokens nem
-- dados de outros usuários. Mensagens privadas do chat NÃO são incluídas.
create or replace function public.hiraeth_admin_customer_detail(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_customer jsonb;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Acesso restrito à administração' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'id', u.id, 'email', u.email, 'created_at', u.created_at,
    'display_name', coalesce(nullif(u.raw_user_meta_data->>'display_name', ''),
      nullif(u.raw_user_meta_data->>'full_name', ''),
      nullif(p.display_name, ''), 'Cliente'),
    'phone', coalesce(nullif(u.raw_user_meta_data->>'phone', ''), nullif(u.phone, '')),
    'address', coalesce(u.raw_user_meta_data->'address', 'null'::jsonb),
    'marketing_opt_in', (u.raw_user_meta_data->>'hiraeth_marketing_opt_in' = 'true'),
    'community', (select jsonb_build_object(
      'member', true, 'joined_at', m.joined_at,
      'username', cp.username, 'bio', cp.bio, 'instagram_url', cp.instagram_url,
      'tiktok_url', cp.tiktok_url, 'other_social_url', cp.other_social_url
    ) from public.community_memberships m
      left join public.community_profiles cp on cp.user_id = m.user_id
      where m.user_id = u.id),
    'activity', (select jsonb_build_object(
      'last_app_seen_at', a.last_app_seen_at, 'last_portal_seen_at', a.last_portal_seen_at,
      'last_portal_slug', a.last_portal_slug
    ) from public.hiraeth_customer_activity a where a.user_id = u.id),
    'orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'created_at', o.created_at,
        'status', o.status, 'total', o.total, 'shipping', o.shipping,
        'customer_name', o.customer_name, 'customer_email', o.customer_email,
        'payment_status', o.payment_status, 'shipping_address', o.shipping_address,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'product_name', i.product_name, 'quantity', i.quantity,
            'unit_price', i.unit_price, 'variant_details', i.variant_details
          ) order by i.id) from public.order_items i where i.order_id = o.id
        ), '[]'::jsonb)
      ) order by o.created_at desc)
      from (select * from public.orders where user_id = u.id
        order by created_at desc limit 50) o
    ), '[]'::jsonb),
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', cp.id, 'body', cp.body, 'image_urls', cp.image_urls, 'created_at', cp.created_at
      ) order by cp.created_at desc)
      from (select * from public.community_posts where user_id = u.id
        order by created_at desc limit 30) cp
    ), '[]'::jsonb),
    'interests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'type', ci.interest_type, 'title', ci.title, 'created_at', ci.created_at
      ) order by ci.created_at desc)
      from (select * from public.community_interests where user_id = u.id
        order by created_at desc limit 50) ci
    ), '[]'::jsonb)
  ) into v_customer
  from auth.users u left join public.profiles p on p.id = u.id
  where u.id = p_user_id
    and not exists (select 1 from public.user_roles r
      where r.user_id = u.id and r.role = 'admin');
  return v_customer;
end;
$$;
revoke all on function public.hiraeth_admin_insights(integer) from public, anon;
revoke all on function public.hiraeth_admin_customers(text, text, integer, integer) from public, anon;
revoke all on function public.hiraeth_admin_customer_detail(uuid) from public, anon;
grant execute on function public.hiraeth_admin_insights(integer) to authenticated;
grant execute on function public.hiraeth_admin_customers(text, text, integer, integer) to authenticated;
grant execute on function public.hiraeth_admin_customer_detail(uuid) to authenticated;

create index if not exists hiraeth_customer_activity_app_seen_idx
  on public.hiraeth_customer_activity (last_app_seen_at desc);
create index if not exists hiraeth_customer_activity_portal_seen_idx
  on public.hiraeth_customer_activity (last_portal_seen_at desc);
