begin;

create table if not exists public.novedades_remuneraciones (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid not null references public.periodos_remuneraciones(id) on delete cascade,
  trabajador_id uuid not null references public.trabajadores(id) on delete cascade,
  dias_trabajados numeric(6,2) not null default 30,
  dias_descanso numeric(6,2) not null default 0,
  dias_ausencia numeric(6,2) not null default 0,
  dias_vacaciones numeric(6,2) not null default 0,
  dias_licencia numeric(6,2) not null default 0,
  horas_extra_50 numeric(8,2) not null default 0,
  horas_extra_100 numeric(8,2) not null default 0,
  monto_horas_extra_50 numeric(14,2) not null default 0,
  monto_horas_extra_100 numeric(14,2) not null default 0,
  haberes_semana_corrida numeric(14,2) not null default 0,
  bonos_imponibles numeric(14,2) not null default 0,
  bonos_no_imponibles numeric(14,2) not null default 0,
  descuentos_adicionales numeric(14,2) not null default 0,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (periodo_id, trabajador_id),
  constraint novedades_dias_check check (
    dias_trabajados between 0 and 31
    and dias_descanso between 0 and 31
    and dias_ausencia between 0 and 31
    and dias_vacaciones between 0 and 31
    and dias_licencia between 0 and 31
  ),
  constraint novedades_horas_check check (horas_extra_50 >= 0 and horas_extra_100 >= 0),
  constraint novedades_montos_check check (
    monto_horas_extra_50 >= 0
    and monto_horas_extra_100 >= 0
    and haberes_semana_corrida >= 0
    and bonos_imponibles >= 0
    and bonos_no_imponibles >= 0
    and descuentos_adicionales >= 0
  )
);

create index if not exists novedades_periodo_trabajador_idx
  on public.novedades_remuneraciones(periodo_id, trabajador_id);

drop trigger if exists novedades_remuneraciones_set_updated_at on public.novedades_remuneraciones;
create trigger novedades_remuneraciones_set_updated_at
before update on public.novedades_remuneraciones
for each row execute function private.set_updated_at();

alter table public.novedades_remuneraciones enable row level security;
alter table public.novedades_remuneraciones force row level security;
revoke all on table public.novedades_remuneraciones from anon;

drop policy if exists novedades_remuneraciones_admin_select on public.novedades_remuneraciones;
create policy novedades_remuneraciones_admin_select on public.novedades_remuneraciones for select to authenticated
using ((select private.is_admin()));

grant select on table public.novedades_remuneraciones to authenticated;
revoke insert, update, delete on table public.novedades_remuneraciones from authenticated;

commit;
