-- Permitir que administradores retirem comunicados gerais já enviados.
-- As notificações privadas (mensagens, comentários e reações) permanecem intactas.
-- A exclusão é intencionalmente limitada ao tipo 'announcement' sem destinatário.
grant delete on table public.app_notifications to authenticated;

drop policy if exists "only admins remove global announcements" on public.app_notifications;
create policy "only admins remove global announcements"
  on public.app_notifications
  for delete to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    and kind = 'announcement'
    and recipient_id is null
  );
