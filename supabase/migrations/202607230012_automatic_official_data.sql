begin;

create table if not exists public.datos_oficiales (
  id uuid primary key default gen_random_uuid(),
  fuente_codigo text not null,
  codigo text not null,
  periodo date not null,
  valor numeric(20,8) not null,
  unidad text not null,
  fuente_nombre text not null,
  fuente_url text not null,
  obtenido_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint datos_oficiales_fuente_check check (fuente_codigo in ('SII', 'BANCO_CENTRAL', 'PREVIRED', 'SP', 'AFC', 'FONASA', 'ISAPRE')),
  constraint datos_oficiales_codigo_check check (codigo ~ '^[A-Z0-9_]{2,80}$'),
  constraint datos_oficiales_unidad_check check (unidad in ('CLP', 'UF', 'UTM', 'PORCENTAJE', 'INDICE', 'TASA')),
  unique (fuente_codigo, codigo, periodo)
);

create index if not exists datos_oficiales_periodo_idx
  on public.datos_oficiales(periodo desc, fuente_codigo, codigo);

alter table public.datos_oficiales enable row level security;
alter table public.datos_oficiales force row level security;
revoke all on table public.datos_oficiales from anon;

-- Los datos generales son visibles sólo para el equipo autorizado. Las escrituras
-- se realizan exclusivamente mediante el cliente administrativo del servidor.
drop policy if exists datos_oficiales_admin_select on public.datos_oficiales;
create policy datos_oficiales_admin_select
  on public.datos_oficiales
  for select
  to authenticated
  using ((select private.is_admin()));

grant select on table public.datos_oficiales to authenticated;
revoke insert, update, delete on table public.datos_oficiales from authenticated;

alter table public.parametros_remuneraciones
  add column if not exists fuentes_automaticas jsonb not null default '{}'::jsonb,
  add column if not exists parametros_automaticos_at timestamptz;

comment on table public.datos_oficiales is 'Historial versionado de valores generales publicados por organismos y plataformas oficiales chilenas.';
comment on column public.datos_oficiales.periodo is 'Primer día del mes al que corresponde el valor, salvo indicadores diarios cuya fecha exacta queda además en metadata.';
comment on column public.parametros_remuneraciones.fuentes_automaticas is 'Fuentes, fecha de obtención y eventuales anulaciones manuales de parámetros generales.';
comment on column public.parametros_remuneraciones.parametros_automaticos_at is 'Momento en que se cargaron valores generales desde fuentes oficiales.';

commit;
