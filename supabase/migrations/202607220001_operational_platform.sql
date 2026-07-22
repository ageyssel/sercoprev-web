begin;

alter table public.empresas
  add column if not exists nombre_fantasia text,
  add column if not exists tipo_sociedad text,
  add column if not exists giro text,
  add column if not exists regimen_tributario text,
  add column if not exists inicio_actividades date,
  add column if not exists direccion text,
  add column if not exists comuna text,
  add column if not exists ciudad text,
  add column if not exists representante_legal text,
  add column if not exists representante_rut text,
  add column if not exists telefono text,
  add column if not exists email_contacto text,
  add column if not exists contador_asignado text,
  add column if not exists ejecutivo_asignado text,
  add column if not exists estado_cliente text not null default 'Activo',
  add column if not exists plan_servicio text,
  add column if not exists honorario_mensual numeric(14,2),
  add column if not exists dia_pago smallint,
  add column if not exists notas_internas text,
  add column if not exists ultima_actividad_at timestamptz;

alter table public.empresas drop constraint if exists empresas_estado_cliente_check;
alter table public.empresas add constraint empresas_estado_cliente_check
  check (estado_cliente in ('En incorporación', 'Activo', 'Requiere atención', 'Suspendido', 'Archivado'));

alter table public.empresas drop constraint if exists empresas_dia_pago_check;
alter table public.empresas add constraint empresas_dia_pago_check
  check (dia_pago is null or dia_pago between 1 and 31);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  empresa text,
  rut text,
  email text not null,
  telefono text not null,
  servicio text not null,
  mensaje text,
  origen text not null default 'Landing SERCOPREV',
  estado text not null default 'Nuevo',
  asignado_a text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_nombre_length check (char_length(nombre) between 2 and 120),
  constraint leads_email_length check (char_length(email) between 5 and 254),
  constraint leads_telefono_length check (char_length(telefono) between 6 and 40),
  constraint leads_servicio_length check (char_length(servicio) between 2 and 120),
  constraint leads_estado_check check (estado in ('Nuevo', 'Contactado', 'Evaluación', 'Propuesta enviada', 'Ganado', 'Descartado'))
);

create table if not exists public.servicios_contratados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nombre text not null,
  descripcion text,
  estado text not null default 'Activo',
  fecha_inicio date,
  fecha_termino date,
  honorario_mensual numeric(14,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint servicios_estado_check check (estado in ('Pendiente', 'Activo', 'Suspendido', 'Finalizado'))
);

create table if not exists public.obligaciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  titulo text not null,
  tipo text not null,
  periodo text,
  fecha_vencimiento date not null,
  estado text not null default 'Pendiente',
  prioridad text not null default 'Media',
  monto numeric(18,2),
  requiere_accion_cliente boolean not null default false,
  descripcion text,
  completada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint obligaciones_estado_check check (estado in ('Pendiente', 'En proceso', 'Esperando cliente', 'Presentada', 'Pagada', 'No aplica', 'Vencida')),
  constraint obligaciones_prioridad_check check (prioridad in ('Baja', 'Media', 'Alta', 'Crítica'))
);

create table if not exists public.tareas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  titulo text not null,
  descripcion text,
  responsable text,
  fecha_vencimiento date,
  estado text not null default 'Pendiente',
  prioridad text not null default 'Media',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tareas_estado_check check (estado in ('Pendiente', 'En curso', 'Bloqueada', 'Completada')),
  constraint tareas_prioridad_check check (prioridad in ('Baja', 'Media', 'Alta', 'Crítica'))
);

create table if not exists public.solicitudes_documentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  titulo text not null,
  descripcion text,
  categoria text not null,
  periodo text,
  fecha_limite date,
  estado text not null default 'Solicitado',
  solicitado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint solicitudes_categoria_check check (categoria in ('Impuestos', 'Remuneraciones', 'Legal')),
  constraint solicitudes_estado_check check (estado in ('Solicitado', 'Recibido', 'En revisión', 'Observado', 'Aprobado', 'Vencido'))
);

alter table public.documentos
  add column if not exists periodo text,
  add column if not exists descripcion text,
  add column if not exists uploaded_by uuid references auth.users(id) on delete set null,
  add column if not exists solicitud_id uuid references public.solicitudes_documentos(id) on delete set null,
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists version integer not null default 1,
  add column if not exists visible_cliente boolean not null default true;

create table if not exists public.auditoria_eventos (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  empresa_id uuid references public.empresas(id) on delete set null,
  accion text not null,
  entidad text not null,
  entidad_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists empresas_estado_cliente_idx on public.empresas(estado_cliente) where es_admin = false;
create index if not exists leads_estado_created_idx on public.leads(estado, created_at desc);
create index if not exists servicios_empresa_estado_idx on public.servicios_contratados(empresa_id, estado);
create index if not exists obligaciones_empresa_fecha_idx on public.obligaciones(empresa_id, fecha_vencimiento);
create index if not exists obligaciones_estado_fecha_idx on public.obligaciones(estado, fecha_vencimiento);
create index if not exists tareas_empresa_fecha_idx on public.tareas(empresa_id, fecha_vencimiento);
create index if not exists tareas_estado_fecha_idx on public.tareas(estado, fecha_vencimiento);
create index if not exists solicitudes_empresa_fecha_idx on public.solicitudes_documentos(empresa_id, fecha_limite);
create index if not exists solicitudes_estado_fecha_idx on public.solicitudes_documentos(estado, fecha_limite);
create index if not exists auditoria_empresa_created_idx on public.auditoria_eventos(empresa_id, created_at desc);

create or replace function private.touch_company_activity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.empresas
  set ultima_actividad_at = now()
  where id = coalesce(new.empresa_id, old.empresa_id);
  return coalesce(new, old);
end;
$$;

revoke all on function private.touch_company_activity() from public, anon;
grant execute on function private.touch_company_activity() to service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['leads', 'servicios_contratados', 'obligaciones', 'tareas', 'solicitudes_documentos']
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

drop trigger if exists obligaciones_touch_company on public.obligaciones;
create trigger obligaciones_touch_company
after insert or update or delete on public.obligaciones
for each row execute function private.touch_company_activity();

drop trigger if exists solicitudes_touch_company on public.solicitudes_documentos;
create trigger solicitudes_touch_company
after insert or update or delete on public.solicitudes_documentos
for each row execute function private.touch_company_activity();

drop trigger if exists tareas_touch_company on public.tareas;
create trigger tareas_touch_company
after insert or update or delete on public.tareas
for each row execute function private.touch_company_activity();

alter table public.leads enable row level security;
alter table public.leads force row level security;
alter table public.servicios_contratados enable row level security;
alter table public.servicios_contratados force row level security;
alter table public.obligaciones enable row level security;
alter table public.obligaciones force row level security;
alter table public.tareas enable row level security;
alter table public.tareas force row level security;
alter table public.solicitudes_documentos enable row level security;
alter table public.solicitudes_documentos force row level security;
alter table public.auditoria_eventos enable row level security;
alter table public.auditoria_eventos force row level security;

drop policy if exists leads_admin_select on public.leads;
create policy leads_admin_select on public.leads for select to authenticated
using ((select private.is_admin()));

drop policy if exists servicios_select_own_or_admin on public.servicios_contratados;
create policy servicios_select_own_or_admin on public.servicios_contratados for select to authenticated
using (empresa_id = (select private.current_empresa_id()) or (select private.is_admin()));

drop policy if exists obligaciones_select_own_or_admin on public.obligaciones;
create policy obligaciones_select_own_or_admin on public.obligaciones for select to authenticated
using (empresa_id = (select private.current_empresa_id()) or (select private.is_admin()));

drop policy if exists tareas_admin_select on public.tareas;
create policy tareas_admin_select on public.tareas for select to authenticated
using ((select private.is_admin()));

drop policy if exists solicitudes_select_own_or_admin on public.solicitudes_documentos;
create policy solicitudes_select_own_or_admin on public.solicitudes_documentos for select to authenticated
using (empresa_id = (select private.current_empresa_id()) or (select private.is_admin()));

drop policy if exists auditoria_admin_select on public.auditoria_eventos;
create policy auditoria_admin_select on public.auditoria_eventos for select to authenticated
using ((select private.is_admin()));

revoke all on table public.leads from anon;
revoke all on table public.servicios_contratados from anon;
revoke all on table public.obligaciones from anon;
revoke all on table public.tareas from anon;
revoke all on table public.solicitudes_documentos from anon;
revoke all on table public.auditoria_eventos from anon;

grant select on table public.leads to authenticated;
grant select on table public.servicios_contratados to authenticated;
grant select on table public.obligaciones to authenticated;
grant select on table public.tareas to authenticated;
grant select on table public.solicitudes_documentos to authenticated;
grant select on table public.auditoria_eventos to authenticated;

revoke insert, update, delete on table public.leads from authenticated;
revoke insert, update, delete on table public.servicios_contratados from authenticated;
revoke insert, update, delete on table public.obligaciones from authenticated;
revoke insert, update, delete on table public.tareas from authenticated;
revoke insert, update, delete on table public.solicitudes_documentos from authenticated;
revoke insert, update, delete on table public.auditoria_eventos from authenticated;

commit;
