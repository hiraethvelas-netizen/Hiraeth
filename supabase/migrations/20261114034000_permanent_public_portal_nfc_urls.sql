-- An NFC tag's public URL is derived from the immutable portal slug.
-- Protect URLs even from accidental SQL/admin updates, not only UI edits.
-- A published portal must remain published so tags already distributed still open.
begin;

create or replace function public.preserve_portal_nfc_permalink()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.slug is distinct from old.slug then
    raise exception 'O endereço NFC deste portal é permanente: o identificador (slug) não pode ser alterado.';
  end if;

  if old.status = 'published' and new.status is distinct from 'published' then
    raise exception 'Este portal já foi publicado e pode estar gravado em etiquetas NFC. Não pode ser despublicado.';
  end if;

  return new;
end;
$$;

drop trigger if exists portal_permanent_nfc_permalink on public.portals;

create trigger portal_permanent_nfc_permalink
before update on public.portals
for each row
execute function public.preserve_portal_nfc_permalink();

commit;
