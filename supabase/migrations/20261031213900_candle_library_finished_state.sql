-- Permite marcar uma vela da Biblioteca como consumida, sem alterar os dados oficiais do pedido.
alter table public.community_library
  add column if not exists finished boolean not null default false;

comment on column public.community_library.finished is
  'Indica que a vela foi totalmente consumida pelo titular da Biblioteca.';
