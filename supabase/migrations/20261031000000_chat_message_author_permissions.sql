-- Círculo do Fogo: somente o autor pode editar ou apagar a própria mensagem.
-- Administradores continuam podendo fixar/desafixar mensagens, mas não editar o texto de terceiros.

drop policy if exists "authors or admins edit community messages" on public.community_messages;
drop policy if exists "authors or admins delete community messages" on public.community_messages;

create policy "authors edit own community messages" on public.community_messages
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "authors delete own community messages" on public.community_messages
  for delete to authenticated
  using (auth.uid() = user_id);

create or replace function public.guard_community_message_author_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.body is distinct from old.body and auth.uid() is distinct from old.user_id then
    raise exception 'Only the message author can edit this message';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_community_message_author_edit on public.community_messages;
create trigger guard_community_message_author_edit
  before update on public.community_messages
  for each row execute function public.guard_community_message_author_edit();
