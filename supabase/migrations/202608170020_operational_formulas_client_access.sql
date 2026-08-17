begin;

-- Prospectos: eliminación lógica y trazable.
alter table public.leads
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists delete_reason text;

create index if not exists leads_active_created_idx
  on public.leads(created_at desc)
  where deleted_at is null;

create index if not exists leads_deleted_created_idx
  on public.leads(deleted_at desc)
  where deleted_at is not null;

-- Catálogo de fórmulas de cálculo. Las definiciones describen el significado;
-- las versiones contienen la expresión que efectivamente puede publicarse.
create table if not exists public.formula_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  module text not null default 'Remuneraciones',
  category text not null,
  description text not null,
  default_expression text not null,
  variables jsonb not null default '[]'::jsonb,
  unit text not null default 'CLP',
  rounding text not null default 'Peso',
  critical boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint formula_definitions_code_check check (code ~ '^[A-Z0-9_]{3,80}$'),
  constraint formula_definitions_name_check check (char_length(name) between 2 and 160),
  constraint formula_definitions_expression_check check (char_length(default_expression) between 1 and 4000)
);

create table if not exists public.formula_versions (
  id uuid primary key default gen_random_uuid(),
  formula_id uuid not null references public.formula_definitions(id) on delete cascade,
  version integer not null,
  expression text not null,
  status text not null default 'Borrador',
  effective_from date not null default current_date,
  effective_to date,
  change_reason text,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (formula_id, version),
  constraint formula_versions_version_check check (version > 0),
  constraint formula_versions_status_check check (status in ('Borrador', 'Prueba', 'Revisión', 'Publicada', 'Reemplazada')),
  constraint formula_versions_expression_check check (char_length(expression) between 1 and 4000),
  constraint formula_versions_dates_check check (effective_to is null or effective_to >= effective_from)
);

create index if not exists formula_versions_formula_status_idx
  on public.formula_versions(formula_id, status, effective_from desc, version desc);

create table if not exists public.formula_test_cases (
  id uuid primary key default gen_random_uuid(),
  formula_id uuid not null references public.formula_definitions(id) on delete cascade,
  name text not null,
  inputs jsonb not null default '{}'::jsonb,
  expected_result numeric,
  tolerance numeric not null default 0,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint formula_test_cases_name_check check (char_length(name) between 2 and 160),
  constraint formula_test_cases_tolerance_check check (tolerance >= 0)
);

alter table public.formula_definitions enable row level security;
alter table public.formula_versions enable row level security;
alter table public.formula_test_cases enable row level security;

drop policy if exists formula_definitions_staff_select on public.formula_definitions;
create policy formula_definitions_staff_select on public.formula_definitions
for select to authenticated
using ((select private.is_admin()));

drop policy if exists formula_versions_staff_select on public.formula_versions;
create policy formula_versions_staff_select on public.formula_versions
for select to authenticated
using ((select private.is_admin()));

drop policy if exists formula_test_cases_staff_select on public.formula_test_cases;
create policy formula_test_cases_staff_select on public.formula_test_cases
for select to authenticated
using ((select private.is_admin()));

revoke insert, update, delete on public.formula_definitions from authenticated;
revoke insert, update, delete on public.formula_versions from authenticated;
revoke insert, update, delete on public.formula_test_cases from authenticated;

grant select on public.formula_definitions to authenticated;
grant select on public.formula_versions to authenticated;
grant select on public.formula_test_cases to authenticated;

insert into public.formula_definitions (code, name, category, description, default_expression, variables, unit, rounding, critical)
values
  ('SUELDO_BASE_PAGADO', 'Sueldo base pagado', 'Haberes base', 'Calcula el sueldo base proporcional según modalidad de pago y días trabajados.', 'IF(PAYMENT_MODE_MONTHLY, ROUND((SALARY_BASE / 30) * WORKED_DAYS), ROUND(SALARY_BASE * WORKED_DAYS))', '[{"code":"PAYMENT_MODE_MONTHLY","description":"1 si el contrato es mensual; 0 en otra modalidad"},{"code":"SALARY_BASE","description":"Sueldo base contractual"},{"code":"WORKED_DAYS","description":"Días trabajados del periodo"}]'::jsonb, 'CLP', 'Peso', true),
  ('SEMANA_CORRIDA', 'Semana corrida', 'Haberes base', 'Distribuye los haberes variables considerados para semana corrida sobre los días trabajados y días de descanso.', 'IF(WORKED_DAYS > 0, ROUND((VARIABLE_EARNINGS_WEEK_RUN / WORKED_DAYS) * REST_DAYS), 0)', '[{"code":"VARIABLE_EARNINGS_WEEK_RUN","description":"Haberes variables base de semana corrida"},{"code":"WORKED_DAYS","description":"Días trabajados"},{"code":"REST_DAYS","description":"Días de descanso pagables"}]'::jsonb, 'CLP', 'Peso', true),
  ('GRATIFICACION', 'Gratificación', 'Haberes base', 'Calcula la gratificación configurada como Artículo 50 con su tope mensual.', 'IF(IS_ARTICLE_50, ROUND(MIN((SALARY_BASE_PAID + MOVEMENT_TAXABLE + WEEK_RUN) * 0.25, (INGRESO_MINIMO * 4.75) / 12)), 0)', '[{"code":"IS_ARTICLE_50","description":"1 si corresponde Artículo 50"},{"code":"SALARY_BASE_PAID","description":"Sueldo base pagado"},{"code":"MOVEMENT_TAXABLE","description":"Otros haberes imponibles"},{"code":"WEEK_RUN","description":"Semana corrida"},{"code":"INGRESO_MINIMO","description":"Ingreso mínimo configurado"}]'::jsonb, 'CLP', 'Peso', true),
  ('ASIGNACIONES_DIARIAS', 'Asignaciones diarias', 'Haberes no imponibles', 'Calcula colación y movilización diaria según días trabajados.', 'ROUND((MEAL_ALLOWANCE_DAILY + TRANSPORT_ALLOWANCE_DAILY) * WORKED_DAYS)', '[{"code":"MEAL_ALLOWANCE_DAILY","description":"Colación diaria"},{"code":"TRANSPORT_ALLOWANCE_DAILY","description":"Movilización diaria"},{"code":"WORKED_DAYS","description":"Días trabajados"}]'::jsonb, 'CLP', 'Peso', false),
  ('TOTAL_IMPONIBLE', 'Total imponible', 'Bases', 'Suma los haberes que forman la base imponible del periodo.', 'ROUND(SALARY_BASE_PAID + GRATIFICATION + WEEK_RUN + MOVEMENT_TAXABLE)', '[{"code":"SALARY_BASE_PAID","description":"Sueldo base pagado"},{"code":"GRATIFICATION","description":"Gratificación"},{"code":"WEEK_RUN","description":"Semana corrida"},{"code":"MOVEMENT_TAXABLE","description":"Movimientos imponibles"}]'::jsonb, 'CLP', 'Peso', true),
  ('TOTAL_TRIBUTABLE', 'Total tributable', 'Bases', 'Suma los haberes que forman la base tributable del periodo.', 'ROUND(SALARY_BASE_PAID + GRATIFICATION + WEEK_RUN + MOVEMENT_INCOME_TAXABLE)', '[{"code":"SALARY_BASE_PAID","description":"Sueldo base pagado"},{"code":"GRATIFICATION","description":"Gratificación"},{"code":"WEEK_RUN","description":"Semana corrida"},{"code":"MOVEMENT_INCOME_TAXABLE","description":"Movimientos tributables"}]'::jsonb, 'CLP', 'Peso', true),
  ('TOTAL_NO_IMPONIBLE', 'Total no imponible', 'Bases', 'Suma haberes no imponibles y asignaciones diarias.', 'ROUND(MOVEMENT_NON_TAXABLE + DAILY_ALLOWANCES)', '[{"code":"MOVEMENT_NON_TAXABLE","description":"Movimientos no imponibles"},{"code":"DAILY_ALLOWANCES","description":"Asignaciones diarias"}]'::jsonb, 'CLP', 'Peso', false),
  ('BASE_AFP', 'Base AFP', 'Bases previsionales', 'Aplica el tope imponible configurado a la base AFP.', 'MIN(TAXABLE_EARNINGS, TOPE_AFP_UF * UF)', '[{"code":"TAXABLE_EARNINGS","description":"Total imponible"},{"code":"TOPE_AFP_UF","description":"Tope AFP en UF"},{"code":"UF","description":"Valor UF del periodo"}]'::jsonb, 'CLP', 'Peso', true),
  ('BASE_SALUD', 'Base salud', 'Bases previsionales', 'Aplica el tope imponible configurado a la base de salud.', 'MIN(TAXABLE_EARNINGS, TOPE_SALUD_UF * UF)', '[{"code":"TAXABLE_EARNINGS","description":"Total imponible"},{"code":"TOPE_SALUD_UF","description":"Tope salud en UF"},{"code":"UF","description":"Valor UF del periodo"}]'::jsonb, 'CLP', 'Peso', true),
  ('BASE_AFC', 'Base AFC', 'Bases previsionales', 'Aplica el tope imponible configurado a la base del seguro de cesantía.', 'MIN(TAXABLE_EARNINGS, TOPE_AFC_UF * UF)', '[{"code":"TAXABLE_EARNINGS","description":"Total imponible"},{"code":"TOPE_AFC_UF","description":"Tope AFC en UF"},{"code":"UF","description":"Valor UF del periodo"}]'::jsonb, 'CLP', 'Peso', true),
  ('AFP_TRABAJADOR', 'AFP trabajador', 'Descuentos legales', 'Calcula la cotización AFP del trabajador.', 'ROUND(PENSION_BASE * AFP_RATE)', '[{"code":"PENSION_BASE","description":"Base AFP topada"},{"code":"AFP_RATE","description":"Tasa AFP configurada"}]'::jsonb, 'CLP', 'Peso', true),
  ('SALUD_LEGAL', 'Salud legal', 'Descuentos legales', 'Calcula la cotización legal de salud cuando corresponde.', 'IF(HAS_HEALTH, ROUND(HEALTH_BASE * HEALTH_RATE), 0)', '[{"code":"HAS_HEALTH","description":"1 si existe cotización de salud"},{"code":"HEALTH_BASE","description":"Base salud topada"},{"code":"HEALTH_RATE","description":"Tasa legal de salud"}]'::jsonb, 'CLP', 'Peso', true),
  ('SALUD_TRABAJADOR', 'Salud trabajador', 'Descuentos legales', 'Toma el mayor valor entre cotización legal y plan de salud cuando corresponde.', 'MAX(LEGAL_HEALTH, HEALTH_PLAN)', '[{"code":"LEGAL_HEALTH","description":"Cotización legal"},{"code":"HEALTH_PLAN","description":"Plan de salud valorizado"}]'::jsonb, 'CLP', 'Peso', true),
  ('AFC_TRABAJADOR', 'AFC trabajador', 'Descuentos legales', 'Calcula el seguro de cesantía del trabajador cuando aplica y el contrato es indefinido.', 'IF(AFC_APPLIES * IS_INDEFINITE, ROUND(UNEMPLOYMENT_BASE * AFC_WORKER_RATE), 0)', '[{"code":"AFC_APPLIES","description":"1 si aplica AFC"},{"code":"IS_INDEFINITE","description":"1 si el contrato es indefinido"},{"code":"UNEMPLOYMENT_BASE","description":"Base AFC topada"},{"code":"AFC_WORKER_RATE","description":"Tasa AFC trabajador"}]'::jsonb, 'CLP', 'Peso', true),
  ('AFC_EMPLEADOR', 'AFC empleador', 'Aportes empleador', 'Calcula el seguro de cesantía a cargo del empleador.', 'IF(AFC_APPLIES, ROUND(UNEMPLOYMENT_BASE * IF(IS_INDEFINITE, AFC_EMPLOYER_INDEFINITE_RATE, AFC_EMPLOYER_TERM_RATE)), 0)', '[{"code":"AFC_APPLIES","description":"1 si aplica AFC"},{"code":"IS_INDEFINITE","description":"1 si el contrato es indefinido"},{"code":"UNEMPLOYMENT_BASE","description":"Base AFC topada"},{"code":"AFC_EMPLOYER_INDEFINITE_RATE","description":"Tasa empleador indefinido"},{"code":"AFC_EMPLOYER_TERM_RATE","description":"Tasa empleador plazo fijo/obra"}]'::jsonb, 'CLP', 'Peso', true),
  ('SIS_EMPLEADOR', 'SIS empleador', 'Aportes empleador', 'Calcula el SIS del empleador cuando el contrato no es a honorarios.', 'IF(IS_HONORARIOS, 0, ROUND(PENSION_BASE * SIS_RATE))', '[{"code":"IS_HONORARIOS","description":"1 si es contrato a honorarios"},{"code":"PENSION_BASE","description":"Base AFP"},{"code":"SIS_RATE","description":"Tasa SIS empleador"}]'::jsonb, 'CLP', 'Peso', true),
  ('BASE_IMPUESTO', 'Base de impuesto', 'Impuesto', 'Construye la base sobre la que se aplica la tabla de Impuesto Único configurada.', 'MAX(0, INCOME_TAXABLE_EARNINGS - AFP_WORKER - LEGAL_HEALTH - UNEMPLOYMENT_WORKER)', '[{"code":"INCOME_TAXABLE_EARNINGS","description":"Total tributable"},{"code":"AFP_WORKER","description":"AFP trabajador"},{"code":"LEGAL_HEALTH","description":"Salud legal"},{"code":"UNEMPLOYMENT_WORKER","description":"AFC trabajador"}]'::jsonb, 'CLP', 'Peso', true),
  ('IMPUESTO_UNICO', 'Impuesto Único', 'Impuesto', 'Aplica la tabla de tramos configurada al resultado de BASE_IMPUESTO.', 'TAX_BRACKET(TAX_BASE)', '[{"code":"TAX_BASE","description":"Base de impuesto"}]'::jsonb, 'CLP', 'Peso', true),
  ('APORTES_EMPLEADOR', 'Aportes empleador', 'Aportes empleador', 'Suma AFC, SIS y aportes manuales del empleador.', 'ROUND(UNEMPLOYMENT_EMPLOYER + SIS_EMPLOYER + EMPLOYER_MANUAL)', '[{"code":"UNEMPLOYMENT_EMPLOYER","description":"AFC empleador"},{"code":"SIS_EMPLOYER","description":"SIS"},{"code":"EMPLOYER_MANUAL","description":"Otros aportes empleador"}]'::jsonb, 'CLP', 'Peso', true),
  ('LIQUIDO_PAGAR', 'Líquido a pagar', 'Resultado', 'Calcula el monto final a pagar al trabajador.', 'ROUND(TAXABLE_EARNINGS + NON_TAXABLE_EARNINGS - LEGAL_DEDUCTIONS - OTHER_DEDUCTIONS)', '[{"code":"TAXABLE_EARNINGS","description":"Total imponible"},{"code":"NON_TAXABLE_EARNINGS","description":"Total no imponible"},{"code":"LEGAL_DEDUCTIONS","description":"Descuentos legales"},{"code":"OTHER_DEDUCTIONS","description":"Otros descuentos"}]'::jsonb, 'CLP', 'Peso', true)
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  default_expression = excluded.default_expression,
  variables = excluded.variables,
  unit = excluded.unit,
  rounding = excluded.rounding,
  critical = excluded.critical,
  active = true,
  updated_at = now();

insert into public.formula_versions (formula_id, version, expression, status, effective_from, change_reason, published_at)
select d.id, 1, d.default_expression, 'Publicada', date '2020-01-01', 'Versión base del motor SERCOPREV', now()
from public.formula_definitions d
where not exists (
  select 1 from public.formula_versions v where v.formula_id = d.id
);

commit;
