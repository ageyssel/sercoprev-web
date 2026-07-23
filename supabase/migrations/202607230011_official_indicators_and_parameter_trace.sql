begin;

create table if not exists public.indicadores_oficiales (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  fecha_referencia date not null,
  valor numeric(16,4) not null,
  fuente_nombre text not null,
  fuente_url text not null,
  obtenido_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint indicadores_oficiales_tipo_check check (tipo in ('UF', 'UTM')),
  constraint indicadores_oficiales_valor_check check (valor > 0),
  unique (tipo, fecha_referencia)
);

create index if not exists indicadores_oficiales_fecha_idx
  on public.indicadores_oficiales(tipo, fecha_referencia desc);

alter table public.indicadores_oficiales enable row level security;
alter table public.indicadores_oficiales force row level security;
revoke all on table public.indicadores_oficiales from anon;

drop policy if exists indicadores_oficiales_admin_select on public.indicadores_oficiales;
create policy indicadores_oficiales_admin_select
  on public.indicadores_oficiales
  for select
  to authenticated
  using ((select private.is_admin()));

grant select on table public.indicadores_oficiales to authenticated;
revoke insert, update, delete on table public.indicadores_oficiales from authenticated;

alter table public.parametros_remuneraciones
  add column if not exists uf_fecha date,
  add column if not exists utm_periodo date,
  add column if not exists fuente_uf text,
  add column if not exists fuente_utm text,
  add column if not exists indicadores_verificados_at timestamptz;

comment on table public.indicadores_oficiales is 'Valores oficiales chilenos obtenidos desde fuentes públicas, versionados por fecha para reproducibilidad de cálculos.';
comment on column public.parametros_remuneraciones.uf_fecha is 'Fecha diaria exacta usada para el valor UF.';
comment on column public.parametros_remuneraciones.utm_periodo is 'Primer día del mes correspondiente al valor UTM.';

commit;
