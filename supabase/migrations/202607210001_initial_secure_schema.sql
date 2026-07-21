begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  rut text not null unique,
  razon_social text not null,
  estado_impuestos text not null default 'Pendiente',
  es_admin boolean not null default false,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint empresas_rut_length check (char_length(rut) between 8 and 12),
  constraint empresas_razon_social_length check (char_length(razon_social) between 2 and 160),
  constraint empresas_estado_length check (char_length(estado_impuestos) between 2 and 60)
);

create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nombre_original text not null,
  storage_path text not null unique,
  categoria text not null,
  fecha_subida timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint documentos_nombre_length check (char_length(nombre_original) between 1 and 255),
  constraint documentos_storage_path_length check (char_length(storage_path) between 3 and 700),
  constraint documentos_categoria_check check (categoria in ('Impuestos', 'Remuneraciones', 'Legal'))
);

create table if not exists public.datos_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  periodo text not null,
  descripcion text not null,
  monto numeric(18,2),
  estado text not null default 'Pendiente',
  categoria text not null,
  subcategoria text not null,
  created_at timestamptz not null default now(),
  constraint datos_periodo_length check (char_length(periodo) between 1 and 80),
  constraint datos_descripcion_length check (char_length(descripcion) between 1 and 500),
  constraint datos_estado_length check (char_length(estado) between 1 and 80),
  constraint datos_categoria_length check (char_length(categoria) between 2 and 100),
  constraint datos_subcategoria_length check (char_length(subcategoria) between 2 and 160)
);

create index if not exists empresas_user_id_idx on public.empresas(user_id);
create index if not exists empresas_es_admin_idx on public.empresas(es_admin) where es_admin = true;
create index if not exists documentos_empresa_fecha_idx on public.documentos(empresa_id, fecha_subida desc);
create index if not exists datos_empresa_empresa_created_idx on public.datos_empresa(empresa_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists empresas_set_updated_at on public.empresas;
create trigger empresas_set_updated_at
before update on public.empresas
for each row execute function private.set_updated_at();

create or replace function private.current_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select e.id
  from public.empresas e
  where e.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.empresas e
    where e.user_id = (select auth.uid())
      and e.es_admin = true
  );
$$;

revoke all on function private.current_empresa_id() from public, anon;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.current_empresa_id() to authenticated, service_role;
grant execute on function private.is_admin() to authenticated, service_role;

alter table public.empresas enable row level security;
alter table public.empresas force row level security;
alter table public.documentos enable row level security;
alter table public.documentos force row level security;
alter table public.datos_empresa enable row level security;
alter table public.datos_empresa force row level security;

drop policy if exists empresas_select_own_or_admin on public.empresas;
create policy empresas_select_own_or_admin
on public.empresas
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_admin())
);

drop policy if exists empresas_update_password_flag on public.empresas;
create policy empresas_update_password_flag
on public.empresas
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists documentos_select_own_or_admin on public.documentos;
create policy documentos_select_own_or_admin
on public.documentos
for select
to authenticated
using (
  empresa_id = (select private.current_empresa_id())
  or (select private.is_admin())
);

drop policy if exists datos_empresa_select_own_or_admin on public.datos_empresa;
create policy datos_empresa_select_own_or_admin
on public.datos_empresa
for select
to authenticated
using (
  empresa_id = (select private.current_empresa_id())
  or (select private.is_admin())
);

revoke all on table public.empresas from anon;
revoke all on table public.documentos from anon;
revoke all on table public.datos_empresa from anon;

revoke insert, update, delete on table public.empresas from authenticated;
revoke insert, update, delete on table public.documentos from authenticated;
revoke insert, update, delete on table public.datos_empresa from authenticated;

grant select on table public.empresas to authenticated;
grant update (must_change_password) on table public.empresas to authenticated;
grant select on table public.documentos to authenticated;
grant select on table public.datos_empresa to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos',
  'documentos',
  false,
  20971520,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists storage_documentos_select on storage.objects;
create policy storage_documentos_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documentos'
  and (
    (select private.is_admin())
    or (storage.foldername(name))[1] = (select private.current_empresa_id())::text
  )
);

drop policy if exists storage_documentos_insert_admin on storage.objects;
create policy storage_documentos_insert_admin
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documentos'
  and (select private.is_admin())
);

drop policy if exists storage_documentos_update_admin on storage.objects;
create policy storage_documentos_update_admin
on storage.objects
for update
to authenticated
using (
  bucket_id = 'documentos'
  and (select private.is_admin())
)
with check (
  bucket_id = 'documentos'
  and (select private.is_admin())
);

drop policy if exists storage_documentos_delete_admin on storage.objects;
create policy storage_documentos_delete_admin
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'documentos'
  and (select private.is_admin())
);

commit;
