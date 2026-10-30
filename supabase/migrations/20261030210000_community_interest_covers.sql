-- Capa opcional para cada item do Meu Universo.
alter table public.community_interests add column if not exists image_url text;