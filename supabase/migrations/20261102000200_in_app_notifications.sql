-- Caixa de notificações dentro do app: avisos gerais da administração
-- e notificações individuais das interações da Comunidade.
-- Sem lida/não lida, sem modificar posts, mensagens ou produtos existentes.
create table if not exists public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('announcement', 'reaction', 'comment', 'message')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 500),
  href text not null default '/comunidade' check (href in (
    '/loja', '/inicio', '/comunidade', '/comunidade?tab=chat',
    '/comunidade?tab=feed', '/clube-do-livro'
  )),
  origin_id uuid,
  created_at timestamptz not null default now(),
  constraint notification_recipient_scope_check check (
    (kind = 'announcement' and recipient_id is null)
    or (kind <> 'announcement' and recipient_id is not null)
  )
);

create index if not exists app_notifications_recipient_date_idx
  on public.app_notifications (recipient_id, created_at desc);
create index if not exists app_notifications_global_date_idx
  on public.app_notifications (created_at desc) where recipient_id is null;
create index if not exists app_notifications_chat_actor_idx
  on public.app_notifications (recipient_id, actor_id, created_at desc) where kind = 'message';

alter table public.app_notifications enable row level security;
revoke all on public.app_notifications from public, anon;
grant select, insert on public.app_notifications to authenticated;
grant all on public.app_notifications to service_role;

drop policy if exists "members read their notifications and general announcements" on public.app_notifications;
create policy "members read their notifications and general announcements"
  on public.app_notifications for select to authenticated
  using (auth.uid() is not null and (recipient_id = auth.uid() or recipient_id is null));

drop policy if exists "only admins send global announcements" on public.app_notifications;
create policy "only admins send global announcements"
  on public.app_notifications for insert to authenticated
  with check (
    public.has_role(auth.uid(), 'admin')
    and recipient_id is null and kind = 'announcement' and actor_id = auth.uid()
  );

-- Trigger is SECURITY DEFINER so regular members cannot spoof someone else's
-- notifications using the client. The only source is an authenticated community
-- interaction. No sensitive message body or unpublished post is copied.
create or replace function public.create_community_activity_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner_id uuid;
  actor_name text;
begin
  select coalesce(nullif(left(p.username, 50), ''), 'Alguém')
    into actor_name from public.community_profiles p where p.user_id = new.user_id;
  actor_name := coalesce(actor_name, 'Alguém');

  if tg_table_name = 'community_messages' then
    -- The chat is collective: notify members only, not the sender.
    -- Combine bursts from the same sender into one notice per 10 minutes.
    insert into public.app_notifications (recipient_id, actor_id, kind, title, body, href, origin_id)
    select m.user_id, new.user_id, 'message',
      'Nova mensagem no Círculo do Fogo',
      actor_name || ' enviou uma mensagem no chat.',
      '/comunidade?tab=chat', new.id
    from public.community_memberships m
    where m.user_id <> new.user_id
      and not exists (
        select 1 from public.app_notifications n
        where n.recipient_id = m.user_id and n.actor_id = new.user_id
          and n.kind = 'message' and n.created_at > now() - interval '10 minutes'
      );
    return new;
  end if;

  if tg_table_name = 'community_message_reactions' then
    select m.user_id into owner_id
      from public.community_messages m where m.id = new.message_id;
    if owner_id is not null and owner_id <> new.user_id then
      insert into public.app_notifications (recipient_id, actor_id, kind, title, body, href, origin_id)
      values (owner_id, new.user_id, 'reaction',
        'Sua mensagem recebeu uma reação',
        actor_name || ' reagiu à sua mensagem no Círculo do Fogo.',
        '/comunidade?tab=chat', new.message_id);
    end if;
    return new;
  end if;

  if tg_table_name = 'community_post_reactions' then
    select p.user_id into owner_id
      from public.community_posts p where p.id = new.post_id;
    if owner_id is not null and owner_id <> new.user_id then
      insert into public.app_notifications (recipient_id, actor_id, kind, title, body, href, origin_id)
      values (owner_id, new.user_id, 'reaction',
        'Sua publicação recebeu uma reação',
        actor_name || ' deixou uma reação na sua publicação.',
        '/comunidade?tab=feed', new.post_id);
    end if;
    return new;
  end if;

  if tg_table_name = 'community_post_comments' then
    select p.user_id into owner_id
      from public.community_posts p where p.id = new.post_id;
    if owner_id is not null and owner_id <> new.user_id then
      insert into public.app_notifications (recipient_id, actor_id, kind, title, body, href, origin_id)
      values (owner_id, new.user_id, 'comment',
        'Novo comentário na sua publicação',
        actor_name || ' comentou no seu espaço da Comunidade.',
        '/comunidade?tab=feed', new.post_id);
    end if;
    return new;
  end if;
  return new;
end;
$$;
revoke execute on function public.create_community_activity_notification()
  from public, anon, authenticated;

drop trigger if exists notify_community_chat_message on public.community_messages;
create trigger notify_community_chat_message
  after insert on public.community_messages
  for each row execute function public.create_community_activity_notification();

drop trigger if exists notify_community_post_reaction on public.community_post_reactions;
create trigger notify_community_post_reaction
  after insert on public.community_post_reactions
  for each row execute function public.create_community_activity_notification();

drop trigger if exists notify_community_chat_reaction on public.community_message_reactions;
create trigger notify_community_chat_reaction
  after insert on public.community_message_reactions
  for each row execute function public.create_community_activity_notification();

drop trigger if exists notify_community_post_comment on public.community_post_comments;
create trigger notify_community_post_comment
  after insert on public.community_post_comments
  for each row execute function public.create_community_activity_notification();

comment on table public.app_notifications is
  'Notificações in-app: anúncios globais (recipient_id null) e eventos privados por destinatário; sem status lida/não lida.';
