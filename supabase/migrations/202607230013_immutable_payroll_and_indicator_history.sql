begin;

create table if not exists public.datos_oficiales_versiones (
  id uuid primary key default gen_random_uuid(),
  fuente_codigo text not null,
  codigo text not null,
  fecha_referencia date not null,
  periodo date not null,
  valor numeric(20,8) not null,
  unidad text not null,
  fuente_nombre text not null,
  fuente_url text not null,
  obtenido_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint datos_oficiales_versiones_fuente_check check (fuente_codigo in ('SII', 'BANCO_CENTRAL', 'PREVIRED', 'SP', 'AFC', 'FONASA', 'ISAPRE')),
  constraint datos_oficiales_versiones_codigo_check check (codigo ~ '^[A-Z0-9_]{2,80}$'),
  constraint datos_oficiales_versiones_unidad_check check (unidad in ('CLP', 'UF', 'UTM', 'PORCENTAJE', 'INDICE', 'TASA')),
  unique (fuente_codigo, codigo, fecha_referencia)
);

create index if not exists datos_oficiales_versiones_fecha_idx
  on public.datos_oficiales_versiones(fecha_referencia desc, fuente_codigo, codigo);

alter table public.datos_oficiales_versiones enable row level security;
alter table public.datos_oficiales_versiones force row level security;
revoke all on table public.datos_oficiales_versiones from anon;

drop policy if exists datos_oficiales_versiones_admin_select on public.datos_oficiales_versiones;
create policy datos_oficiales_versiones_admin_select
  on public.datos_oficiales_versiones
  for select
  to authenticated
  using ((select private.is_admin()));

grant select on table public.datos_oficiales_versiones to authenticated;
revoke insert, update, delete on table public.datos_oficiales_versiones from authenticated;

create or replace function private.capture_official_data_version()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  reference_date date;
begin
  reference_date := case
    when coalesce(new.metadata->>'fecha_referencia', '') ~ '^\d{4}-\d{2}-\d{2}$'
      then (new.metadata->>'fecha_referencia')::date
    else new.periodo
  end;

  insert into public.datos_oficiales_versiones (
    fuente_codigo,
    codigo,
    fecha_referencia,
    periodo,
    valor,
    unidad,
    fuente_nombre,
    fuente_url,
    obtenido_at,
    metadata,
    updated_at
  ) values (
    new.fuente_codigo,
    new.codigo,
    reference_date,
    new.periodo,
    new.valor,
    new.unidad,
    new.fuente_nombre,
    new.fuente_url,
    new.obtenido_at,
    new.metadata,
    now()
  )
  on conflict (fuente_codigo, codigo, fecha_referencia)
  do update set
    periodo = excluded.periodo,
    valor = excluded.valor,
    unidad = excluded.unidad,
    fuente_nombre = excluded.fuente_nombre,
    fuente_url = excluded.fuente_url,
    obtenido_at = excluded.obtenido_at,
    metadata = excluded.metadata,
    updated_at = now();

  return new;
end;
$$;

revoke all on function private.capture_official_data_version() from public, anon, authenticated;

drop trigger if exists datos_oficiales_capture_version on public.datos_oficiales;
create trigger datos_oficiales_capture_version
after insert or update on public.datos_oficiales
for each row execute function private.capture_official_data_version();

insert into public.datos_oficiales_versiones (
  fuente_codigo,
  codigo,
  fecha_referencia,
  periodo,
  valor,
  unidad,
  fuente_nombre,
  fuente_url,
  obtenido_at,
  metadata,
  updated_at
)
select
  fuente_codigo,
  codigo,
  case
    when coalesce(metadata->>'fecha_referencia', '') ~ '^\d{4}-\d{2}-\d{2}$'
      then (metadata->>'fecha_referencia')::date
    else periodo
  end,
  periodo,
  valor,
  unidad,
  fuente_nombre,
  fuente_url,
  obtenido_at,
  metadata,
  now()
from public.datos_oficiales
on conflict (fuente_codigo, codigo, fecha_referencia)
do update set
  periodo = excluded.periodo,
  valor = excluded.valor,
  unidad = excluded.unidad,
  fuente_nombre = excluded.fuente_nombre,
  fuente_url = excluded.fuente_url,
  obtenido_at = excluded.obtenido_at,
  metadata = excluded.metadata,
  updated_at = now();

create or replace function private.prevent_referenced_payroll_parameter_changes()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if exists (
    select 1
    from public.periodos_remuneraciones
    where parametros_id = old.id
  ) then
    raise exception 'PAYROLL_PARAMETERS_LOCKED_BY_PERIOD';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.prevent_referenced_payroll_parameter_changes() from public, anon, authenticated;

drop trigger if exists parametros_remuneraciones_lock_referenced on public.parametros_remuneraciones;
create trigger parametros_remuneraciones_lock_referenced
before update or delete on public.parametros_remuneraciones
for each row execute function private.prevent_referenced_payroll_parameter_changes();

create or replace function private.protect_payroll_period_state()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if tg_op = 'DELETE' then
    if old.estado = 'Cerrado' then raise exception 'CLOSED_PAYROLL_PERIOD_IMMUTABLE'; end if;
    return old;
  end if;

  if old.estado = 'Cerrado' then
    raise exception 'CLOSED_PAYROLL_PERIOD_IMMUTABLE';
  end if;

  if new.empresa_id is distinct from old.empresa_id or new.periodo is distinct from old.periodo then
    raise exception 'PAYROLL_PERIOD_IDENTITY_IMMUTABLE';
  end if;

  if new.parametros_id is distinct from old.parametros_id and (
    old.estado <> 'Abierto'
    or exists (select 1 from public.liquidaciones where periodo_id = old.id)
  ) then
    raise exception 'PAYROLL_PARAMETER_REFERENCE_IMMUTABLE';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_payroll_period_state() from public, anon, authenticated;

drop trigger if exists periodos_remuneraciones_protect_state on public.periodos_remuneraciones;
create trigger periodos_remuneraciones_protect_state
before update or delete on public.periodos_remuneraciones
for each row execute function private.protect_payroll_period_state();

create or replace function private.protect_payroll_period_child()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_period uuid;
  target_state text;
begin
  target_period := case when tg_op = 'DELETE' then old.periodo_id else new.periodo_id end;
  select estado into target_state from public.periodos_remuneraciones where id = target_period;
  if target_state = 'Cerrado' then raise exception 'CLOSED_PAYROLL_DATA_IMMUTABLE'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.protect_payroll_period_child() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['movimientos_remuneracion', 'novedades_remuneraciones', 'liquidaciones'] loop
    execute format('drop trigger if exists %I_protect_closed_period on public.%I', table_name, table_name);
    execute format('create trigger %I_protect_closed_period before insert or update or delete on public.%I for each row execute function private.protect_payroll_period_child()', table_name, table_name);
  end loop;
end;
$$;

create or replace function private.protect_payroll_detail()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_liquidation uuid;
  target_state text;
begin
  target_liquidation := case when tg_op = 'DELETE' then old.liquidacion_id else new.liquidacion_id end;
  select p.estado into target_state
  from public.liquidaciones l
  join public.periodos_remuneraciones p on p.id = l.periodo_id
  where l.id = target_liquidation;

  if target_state = 'Cerrado' then raise exception 'CLOSED_PAYROLL_DETAIL_IMMUTABLE'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.protect_payroll_detail() from public, anon, authenticated;

drop trigger if exists liquidacion_detalles_protect_closed_period on public.liquidacion_detalles;
create trigger liquidacion_detalles_protect_closed_period
before insert or update or delete on public.liquidacion_detalles
for each row execute function private.protect_payroll_detail();

comment on table public.datos_oficiales_versiones is 'Historial inmutable por fecha de referencia de indicadores económicos y previsionales obtenidos desde fuentes oficiales.';
comment on function private.prevent_referenced_payroll_parameter_changes() is 'Evita modificar parámetros legales que ya fueron fijados por un periodo de remuneraciones.';
comment on function private.protect_payroll_period_state() is 'Impide reabrir o alterar retroactivamente periodos de remuneraciones cerrados.';

commit;
