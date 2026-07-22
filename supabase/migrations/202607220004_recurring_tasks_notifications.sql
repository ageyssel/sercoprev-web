begin;

create table if not exists public.tarea_series (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  titulo text not null,
  descripcion text,
  responsable text,
  prioridad text not null default 'Media',
  dia_vencimiento smallint not null,
  meses_anticipacion smallint not null default 6,
  fecha_inicio date not null,
  fecha_fin date,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tarea_series_prioridad_check check (prioridad in ('Baja', 'Media', 'Alta', 'Crítica')),
  constraint tarea_series_dia_check check (dia_vencimiento between 1 and 31),
  constraint tarea_series_anticipacion_check check (meses_anticipacion between 1 and 24),
  constraint tarea_series_fechas_check check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

alter table public.tareas
  add column if not exists serie_id uuid references public.tarea_series(id) on delete set null,
  add column if not exists periodo_recurrente date,
  add column if not exists es_recurrente boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tareas_serie_periodo_unique'
      and conrelid = 'public.tareas'::regclass
  ) then
    alter table public.tareas
      add constraint tareas_serie_periodo_unique unique (serie_id, periodo_recurrente);
  end if;
end;
$$;

create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete set null,
  canal text not null,
  evento text not null,
  destinatario text,
  asunto text,
  estado text not null default 'Pendiente',
  proveedor_id text,
  error_mensaje text,
  metadata jsonb not null default '{}'::jsonb,
  enviada_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notificaciones_canal_check check (canal in ('Email', 'WhatsApp')),
  constraint notificaciones_estado_check check (estado in ('Pendiente', 'Enviada', 'Omitida', 'Fallida'))
);

create index if not exists tarea_series_empresa_activa_idx
  on public.tarea_series(empresa_id, activa);
create index if not exists tareas_serie_periodo_idx
  on public.tareas(serie_id, periodo_recurrente);
create index if not exists notificaciones_empresa_created_idx
  on public.notificaciones(empresa_id, created_at desc);
create index if not exists notificaciones_estado_created_idx
  on public.notificaciones(estado, created_at desc);

drop trigger if exists tarea_series_set_updated_at on public.tarea_series;
create trigger tarea_series_set_updated_at
before update on public.tarea_series
for each row execute function private.set_updated_at();

create or replace function public.materializar_tareas_recurrentes(p_empresa_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  serie record;
  mes_actual date;
  mes_inicio date;
  mes_limite date;
  ultimo_dia integer;
  fecha_vencimiento date;
  insertadas integer := 0;
begin
  if auth.role() <> 'service_role' and not private.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  for serie in
    select *
    from public.tarea_series
    where activa = true
      and (p_empresa_id is null or empresa_id = p_empresa_id)
  loop
    mes_inicio := greatest(
      date_trunc('month', serie.fecha_inicio)::date,
      date_trunc('month', current_date)::date
    );
    mes_limite := (
      date_trunc('month', current_date)
      + make_interval(months => serie.meses_anticipacion)
    )::date;
    mes_actual := mes_inicio;

    while mes_actual <= mes_limite loop
      exit when serie.fecha_fin is not null
        and mes_actual > date_trunc('month', serie.fecha_fin)::date;

      ultimo_dia := extract(day from (mes_actual + interval '1 month - 1 day'))::integer;
      fecha_vencimiento := (
        mes_actual
        + make_interval(days => least(serie.dia_vencimiento, ultimo_dia) - 1)
      )::date;

      insert into public.tareas (
        empresa_id,
        titulo,
        descripcion,
        responsable,
        fecha_vencimiento,
        estado,
        prioridad,
        serie_id,
        periodo_recurrente,
        es_recurrente
      ) values (
        serie.empresa_id,
        serie.titulo,
        serie.descripcion,
        serie.responsable,
        fecha_vencimiento,
        'Pendiente',
        serie.prioridad,
        serie.id,
        mes_actual,
        true
      )
      on conflict (serie_id, periodo_recurrente) do nothing;

      if found then
        insertadas := insertadas + 1;
      end if;

      mes_actual := (mes_actual + interval '1 month')::date;
    end loop;
  end loop;

  return insertadas;
end;
$$;

revoke all on function public.materializar_tareas_recurrentes(uuid) from public, anon;
grant execute on function public.materializar_tareas_recurrentes(uuid) to authenticated, service_role;

create or replace function private.materializar_tarea_serie_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  perform public.materializar_tareas_recurrentes(new.empresa_id);
  return new;
end;
$$;

revoke all on function private.materializar_tarea_serie_trigger() from public, anon;
grant execute on function private.materializar_tarea_serie_trigger() to service_role;

drop trigger if exists tarea_series_materializar on public.tarea_series;
create trigger tarea_series_materializar
after insert or update of titulo, descripcion, responsable, prioridad, dia_vencimiento, meses_anticipacion, fecha_inicio, fecha_fin, activa
on public.tarea_series
for each row execute function private.materializar_tarea_serie_trigger();

alter table public.tarea_series enable row level security;
alter table public.tarea_series force row level security;
alter table public.notificaciones enable row level security;
alter table public.notificaciones force row level security;

drop policy if exists tarea_series_admin_select on public.tarea_series;
create policy tarea_series_admin_select on public.tarea_series for select to authenticated
using ((select private.is_admin()));

drop policy if exists notificaciones_admin_select on public.notificaciones;
create policy notificaciones_admin_select on public.notificaciones for select to authenticated
using ((select private.is_admin()));

revoke all on table public.tarea_series from anon;
revoke all on table public.notificaciones from anon;
grant select on table public.tarea_series to authenticated;
grant select on table public.notificaciones to authenticated;
revoke insert, update, delete on table public.tarea_series from authenticated;
revoke insert, update, delete on table public.notificaciones from authenticated;

commit;
