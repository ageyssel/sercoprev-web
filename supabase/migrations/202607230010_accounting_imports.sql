begin;

alter table public.documentos_tributarios
  add column if not exists fingerprint text;

alter table public.movimientos_bancarios
  add column if not exists fingerprint text;

create unique index if not exists documentos_tributarios_fingerprint_uidx
  on public.documentos_tributarios(empresa_id, fingerprint)
  where fingerprint is not null;

create unique index if not exists movimientos_bancarios_fingerprint_uidx
  on public.movimientos_bancarios(cuenta_bancaria_id, fingerprint)
  where fingerprint is not null;

create table if not exists public.importaciones_contables (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo text not null,
  nombre_archivo text not null,
  total_filas integer not null default 0,
  insertadas integer not null default 0,
  duplicadas integer not null default 0,
  rechazadas integer not null default 0,
  estado text not null default 'Procesando',
  errores jsonb not null default '[]'::jsonb,
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completado_at timestamptz,
  constraint importaciones_contables_tipo_check check (tipo in ('RCV compras', 'RCV ventas', 'Cartola bancaria')),
  constraint importaciones_contables_estado_check check (estado in ('Procesando', 'Completada', 'Con observaciones', 'Fallida'))
);

create index if not exists importaciones_contables_empresa_created_idx
  on public.importaciones_contables(empresa_id, created_at desc);

alter table public.importaciones_contables enable row level security;
alter table public.importaciones_contables force row level security;
revoke all on table public.importaciones_contables from anon;

drop policy if exists importaciones_contables_admin_select on public.importaciones_contables;
create policy importaciones_contables_admin_select on public.importaciones_contables for select to authenticated
using ((select private.is_admin()));

grant select on table public.importaciones_contables to authenticated;
revoke insert, update, delete on table public.importaciones_contables from authenticated;

commit;
