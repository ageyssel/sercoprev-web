begin;

-- Usuarios internos y múltiples accesos por empresa.
create table if not exists public.usuarios_organizacion (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null,
  rol text not null default 'Lectura',
  activo boolean not null default true,
  permisos jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usuarios_organizacion_nombre_check check (char_length(nombre) between 2 and 160),
  constraint usuarios_organizacion_rol_check check (rol in ('Superadministrador', 'Administrador', 'Contador', 'Remuneraciones', 'Cobranza', 'Lectura'))
);

create table if not exists public.empresa_usuarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null,
  rol text not null default 'Solo lectura',
  activo boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, user_id),
  unique (user_id),
  constraint empresa_usuarios_nombre_check check (char_length(nombre) between 2 and 160),
  constraint empresa_usuarios_rol_check check (rol in ('Administrador cliente', 'Operador', 'Solo lectura'))
);

create index if not exists usuarios_organizacion_activo_rol_idx on public.usuarios_organizacion(activo, rol);
create index if not exists empresa_usuarios_empresa_activo_idx on public.empresa_usuarios(empresa_id, activo);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.empresas e
    where e.user_id = (select auth.uid()) and e.es_admin = true
  ) or exists (
    select 1 from public.usuarios_organizacion u
    where u.user_id = (select auth.uid())
      and u.activo = true
      and u.rol in ('Superadministrador', 'Administrador', 'Contador', 'Remuneraciones', 'Cobranza', 'Lectura')
  );
$$;

create or replace function private.current_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    (select e.id from public.empresas e where e.user_id = (select auth.uid()) and e.es_admin = false limit 1),
    (select eu.empresa_id from public.empresa_usuarios eu where eu.user_id = (select auth.uid()) and eu.activo = true limit 1)
  );
$$;

create or replace function private.can_access_empresa(p_empresa_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select (select private.is_admin())
    or p_empresa_id = (select private.current_empresa_id());
$$;

revoke all on function private.can_access_empresa(uuid) from public, anon;
grant execute on function private.can_access_empresa(uuid) to authenticated, service_role;

-- Permite que los usuarios adicionales del cliente lean la ficha de su empresa.
drop policy if exists empresas_select_own_or_admin on public.empresas;
create policy empresas_select_own_or_admin on public.empresas for select to authenticated
using ((select private.can_access_empresa(id)));

drop policy if exists documentos_select_own_or_admin on public.documentos;
create policy documentos_select_own_or_admin on public.documentos for select to authenticated
using ((select private.can_access_empresa(empresa_id)));

drop policy if exists datos_empresa_select_own_or_admin on public.datos_empresa;
create policy datos_empresa_select_own_or_admin on public.datos_empresa for select to authenticated
using ((select private.can_access_empresa(empresa_id)));

-- Centros de costo compartidos por contabilidad y remuneraciones.
create table if not exists public.centros_costo (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text not null,
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, codigo)
);

-- Remuneraciones.
create table if not exists public.trabajadores (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  rut text not null,
  nombres text not null,
  apellido_paterno text not null,
  apellido_materno text,
  email text,
  telefono text,
  direccion text,
  comuna text,
  fecha_nacimiento date,
  fecha_ingreso date not null,
  fecha_termino date,
  estado text not null default 'Activo',
  afp text,
  salud_tipo text not null default 'Fonasa',
  salud_institucion text,
  salud_plan_uf numeric(10,4),
  afc_aplica boolean not null default true,
  asignacion_familiar_tramo text,
  centro_costo_id uuid references public.centros_costo(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, rut),
  constraint trabajadores_estado_check check (estado in ('Activo', 'Suspendido', 'Finiquitado')),
  constraint trabajadores_salud_check check (salud_tipo in ('Fonasa', 'Isapre', 'Sin cotización'))
);

create table if not exists public.contratos_trabajo (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references public.trabajadores(id) on delete cascade,
  tipo text not null,
  cargo text not null,
  jornada_horas numeric(6,2),
  fecha_inicio date not null,
  fecha_termino date,
  sueldo_base numeric(14,2) not null default 0,
  gratificacion_tipo text not null default 'Artículo 50',
  modalidad_pago text not null default 'Mensual',
  dias_semana smallint not null default 5,
  colacion_diaria numeric(14,2) not null default 0,
  movilizacion_diaria numeric(14,2) not null default 0,
  estado text not null default 'Vigente',
  documento_id uuid references public.documentos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contratos_tipo_check check (tipo in ('Indefinido', 'Plazo fijo', 'Obra o faena', 'Honorarios')),
  constraint contratos_modalidad_check check (modalidad_pago in ('Mensual', 'Diaria', 'Por hora')),
  constraint contratos_estado_check check (estado in ('Borrador', 'Vigente', 'Finalizado'))
);

create table if not exists public.parametros_remuneraciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid references public.empresas(id) on delete cascade,
  periodo date not null,
  uf numeric(14,4) not null,
  utm numeric(14,2) not null,
  ingreso_minimo numeric(14,2) not null,
  tope_afp_uf numeric(10,4) not null,
  tope_salud_uf numeric(10,4) not null,
  tope_afc_uf numeric(10,4) not null,
  tasa_salud numeric(8,6) not null default 0.07,
  tasa_sis_empleador numeric(8,6) not null default 0,
  tasa_afc_trabajador_indefinido numeric(8,6) not null default 0.006,
  tasa_afc_empleador_indefinido numeric(8,6) not null default 0.024,
  tasa_afc_empleador_plazo numeric(8,6) not null default 0.03,
  tasas_afp jsonb not null default '{}'::jsonb,
  impuesto_segunda_categoria jsonb not null default '[]'::jsonb,
  fuente text,
  vigente boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (empresa_id, periodo)
);

create table if not exists public.periodos_remuneraciones (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  periodo date not null,
  estado text not null default 'Abierto',
  parametros_id uuid references public.parametros_remuneraciones(id) on delete restrict,
  calculado_at timestamptz,
  cerrado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, periodo),
  constraint periodos_rem_estado_check check (estado in ('Abierto', 'Calculado', 'Revisión', 'Cerrado', 'Rectificado'))
);

create table if not exists public.conceptos_remuneracion (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text not null,
  nombre text not null,
  naturaleza text not null,
  imponible boolean not null default false,
  tributable boolean not null default false,
  afecta_semana_corrida boolean not null default false,
  formula text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, codigo),
  constraint conceptos_rem_naturaleza_check check (naturaleza in ('Haber', 'Descuento', 'Aporte empleador'))
);

create table if not exists public.movimientos_remuneracion (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid not null references public.periodos_remuneraciones(id) on delete cascade,
  trabajador_id uuid not null references public.trabajadores(id) on delete cascade,
  concepto_id uuid references public.conceptos_remuneracion(id) on delete set null,
  codigo text not null,
  descripcion text not null,
  cantidad numeric(14,4) not null default 1,
  monto numeric(14,2) not null default 0,
  origen text not null default 'Manual',
  created_at timestamptz not null default now(),
  constraint movimientos_rem_origen_check check (origen in ('Manual', 'Contrato', 'Importación', 'Cálculo'))
);

create table if not exists public.liquidaciones (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid not null references public.periodos_remuneraciones(id) on delete cascade,
  trabajador_id uuid not null references public.trabajadores(id) on delete cascade,
  sueldo_base numeric(14,2) not null default 0,
  total_imponible numeric(14,2) not null default 0,
  total_tributable numeric(14,2) not null default 0,
  total_no_imponible numeric(14,2) not null default 0,
  descuentos_legales numeric(14,2) not null default 0,
  otros_descuentos numeric(14,2) not null default 0,
  aportes_empleador numeric(14,2) not null default 0,
  liquido_pagar numeric(14,2) not null default 0,
  estado text not null default 'Borrador',
  calculo jsonb not null default '{}'::jsonb,
  enviada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (periodo_id, trabajador_id),
  constraint liquidaciones_estado_check check (estado in ('Borrador', 'Calculada', 'Revisada', 'Enviada', 'Pagada', 'Anulada'))
);

create table if not exists public.liquidacion_detalles (
  id uuid primary key default gen_random_uuid(),
  liquidacion_id uuid not null references public.liquidaciones(id) on delete cascade,
  codigo text not null,
  descripcion text not null,
  naturaleza text not null,
  imponible boolean not null default false,
  tributable boolean not null default false,
  monto numeric(14,2) not null,
  orden smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint liquidacion_detalle_naturaleza_check check (naturaleza in ('Haber', 'Descuento', 'Aporte empleador'))
);

create table if not exists public.vacaciones (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references public.trabajadores(id) on delete cascade,
  tipo text not null default 'Feriado legal',
  fecha_inicio date not null,
  fecha_fin date not null,
  dias_habiles numeric(8,2) not null,
  estado text not null default 'Solicitada',
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vacaciones_fechas_check check (fecha_fin >= fecha_inicio),
  constraint vacaciones_estado_check check (estado in ('Solicitada', 'Aprobada', 'Rechazada', 'Utilizada', 'Anulada'))
);

create table if not exists public.licencias_medicas (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references public.trabajadores(id) on delete cascade,
  folio text,
  tipo text,
  fecha_inicio date not null,
  fecha_fin date not null,
  dias smallint not null,
  estado text not null default 'Informada',
  documento_id uuid references public.documentos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint licencias_fechas_check check (fecha_fin >= fecha_inicio),
  constraint licencias_estado_check check (estado in ('Informada', 'Tramitada', 'Autorizada', 'Reducida', 'Rechazada'))
);

create table if not exists public.finiquitos (
  id uuid primary key default gen_random_uuid(),
  trabajador_id uuid not null references public.trabajadores(id) on delete cascade,
  causal_codigo text not null,
  fecha_termino date not null,
  aviso_previo numeric(14,2) not null default 0,
  indemnizacion_anos_servicio numeric(14,2) not null default 0,
  vacaciones_proporcionales numeric(14,2) not null default 0,
  remuneraciones_pendientes numeric(14,2) not null default 0,
  otros_haberes numeric(14,2) not null default 0,
  descuentos numeric(14,2) not null default 0,
  total_pagar numeric(14,2) not null default 0,
  estado text not null default 'Borrador',
  calculo jsonb not null default '{}'::jsonb,
  documento_id uuid references public.documentos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finiquitos_estado_check check (estado in ('Borrador', 'Revisado', 'Emitido', 'Firmado', 'Pagado', 'Anulado'))
);

-- Contabilidad.
create table if not exists public.plan_cuentas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  codigo text not null,
  nombre text not null,
  tipo text not null,
  naturaleza text not null,
  nivel smallint not null default 1,
  cuenta_padre_id uuid references public.plan_cuentas(id) on delete restrict,
  imputable boolean not null default true,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, codigo),
  constraint plan_cuentas_tipo_check check (tipo in ('Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Gasto', 'Orden')),
  constraint plan_cuentas_naturaleza_check check (naturaleza in ('Deudora', 'Acreedora'))
);

create table if not exists public.periodos_contables (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  periodo date not null,
  estado text not null default 'Abierto',
  cerrado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, periodo),
  constraint periodos_contables_estado_check check (estado in ('Abierto', 'En revisión', 'Cerrado', 'Reabierto'))
);

create table if not exists public.asientos_contables (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  periodo_id uuid not null references public.periodos_contables(id) on delete restrict,
  numero bigint not null,
  fecha date not null,
  tipo text not null default 'Traspaso',
  glosa text not null,
  estado text not null default 'Borrador',
  origen text not null default 'Manual',
  documento_referencia text,
  created_by uuid references auth.users(id) on delete set null,
  contabilizado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empresa_id, numero),
  constraint asientos_tipo_check check (tipo in ('Ingreso', 'Egreso', 'Traspaso', 'Apertura', 'Cierre')),
  constraint asientos_estado_check check (estado in ('Borrador', 'Contabilizado', 'Anulado')),
  constraint asientos_origen_check check (origen in ('Manual', 'Importación', 'Remuneraciones', 'Ventas', 'Compras', 'Banco'))
);

create table if not exists public.movimientos_contables (
  id uuid primary key default gen_random_uuid(),
  asiento_id uuid not null references public.asientos_contables(id) on delete cascade,
  cuenta_id uuid not null references public.plan_cuentas(id) on delete restrict,
  centro_costo_id uuid references public.centros_costo(id) on delete set null,
  glosa text,
  debe numeric(18,2) not null default 0,
  haber numeric(18,2) not null default 0,
  tercero_rut text,
  documento_tipo text,
  documento_folio text,
  fecha_vencimiento date,
  created_at timestamptz not null default now(),
  constraint movimientos_contables_valores_check check (debe >= 0 and haber >= 0 and not (debe > 0 and haber > 0) and (debe > 0 or haber > 0))
);

create table if not exists public.documentos_tributarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  tipo_registro text not null,
  tipo_documento text not null,
  folio text,
  rut_contraparte text,
  razon_social_contraparte text,
  fecha_emision date not null,
  fecha_recepcion date,
  neto numeric(18,2) not null default 0,
  exento numeric(18,2) not null default 0,
  iva numeric(18,2) not null default 0,
  otros_impuestos numeric(18,2) not null default 0,
  total numeric(18,2) not null default 0,
  estado text not null default 'Registrado',
  asiento_id uuid references public.asientos_contables(id) on delete set null,
  documento_id uuid references public.documentos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documentos_tributarios_registro_check check (tipo_registro in ('Compra', 'Venta', 'Honorario', 'Otro')),
  constraint documentos_tributarios_estado_check check (estado in ('Registrado', 'Contabilizado', 'Observado', 'Anulado'))
);

create table if not exists public.cuentas_bancarias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  banco text not null,
  tipo_cuenta text not null,
  numero_enmascarado text not null,
  moneda text not null default 'CLP',
  cuenta_contable_id uuid references public.plan_cuentas(id) on delete set null,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.movimientos_bancarios (
  id uuid primary key default gen_random_uuid(),
  cuenta_bancaria_id uuid not null references public.cuentas_bancarias(id) on delete cascade,
  fecha date not null,
  descripcion text not null,
  referencia text,
  cargo numeric(18,2) not null default 0,
  abono numeric(18,2) not null default 0,
  saldo numeric(18,2),
  estado text not null default 'Pendiente',
  asiento_id uuid references public.asientos_contables(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint movimientos_bancarios_valores_check check (cargo >= 0 and abono >= 0 and not (cargo > 0 and abono > 0)),
  constraint movimientos_bancarios_estado_check check (estado in ('Pendiente', 'Conciliado', 'Observado', 'Ignorado'))
);

create table if not exists public.conciliaciones_bancarias (
  id uuid primary key default gen_random_uuid(),
  movimiento_bancario_id uuid not null references public.movimientos_bancarios(id) on delete cascade,
  asiento_id uuid not null references public.asientos_contables(id) on delete cascade,
  monto numeric(18,2) not null,
  conciliado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (movimiento_bancario_id, asiento_id)
);

-- Lotes documentales con clasificación determinística y revisión humana.
create table if not exists public.lotes_documentales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  total_archivos integer not null default 0,
  clasificados integer not null default 0,
  pendientes integer not null default 0,
  errores integer not null default 0,
  estado text not null default 'Procesando',
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completado_at timestamptz,
  constraint lotes_documentales_estado_check check (estado in ('Procesando', 'Completado', 'Con observaciones', 'Fallido'))
);

alter table public.documentos
  add column if not exists lote_id uuid references public.lotes_documentales(id) on delete set null,
  add column if not exists clasificacion_estado text not null default 'Confirmada',
  add column if not exists rut_detectado text,
  add column if not exists fecha_documento date,
  add column if not exists fuente_carga text not null default 'Individual',
  add column if not exists metadata_clasificacion jsonb not null default '{}'::jsonb;

alter table public.documentos drop constraint if exists documentos_categoria_check;
alter table public.documentos add constraint documentos_categoria_check
  check (categoria in ('Impuestos', 'Remuneraciones', 'Legal', 'Contabilidad', 'Tributario', 'Laboral', 'Bancario', 'Contratos', 'Sin clasificar'));
alter table public.documentos drop constraint if exists documentos_clasificacion_estado_check;
alter table public.documentos add constraint documentos_clasificacion_estado_check
  check (clasificacion_estado in ('Confirmada', 'Revisión', 'Rechazada'));

create index if not exists trabajadores_empresa_estado_idx on public.trabajadores(empresa_id, estado);
create index if not exists periodos_rem_empresa_periodo_idx on public.periodos_remuneraciones(empresa_id, periodo desc);
create index if not exists liquidaciones_periodo_estado_idx on public.liquidaciones(periodo_id, estado);
create index if not exists plan_cuentas_empresa_codigo_idx on public.plan_cuentas(empresa_id, codigo);
create index if not exists asientos_empresa_fecha_idx on public.asientos_contables(empresa_id, fecha desc);
create index if not exists documentos_tributarios_empresa_fecha_idx on public.documentos_tributarios(empresa_id, fecha_emision desc);
create index if not exists documentos_lote_estado_idx on public.documentos(lote_id, clasificacion_estado);

-- Un asiento sólo puede pasar a contabilizado si está cuadrado.
create or replace function public.contabilizar_asiento(p_asiento_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  total_debe numeric(18,2);
  total_haber numeric(18,2);
  target_empresa uuid;
begin
  if not private.is_admin() then raise exception 'FORBIDDEN'; end if;

  select empresa_id into target_empresa from public.asientos_contables where id = p_asiento_id;
  if target_empresa is null then raise exception 'ASIENTO_NOT_FOUND'; end if;

  select coalesce(sum(debe), 0), coalesce(sum(haber), 0)
    into total_debe, total_haber
  from public.movimientos_contables
  where asiento_id = p_asiento_id;

  if total_debe <= 0 or total_debe <> total_haber then
    raise exception 'ASIENTO_DESCUADRADO';
  end if;

  update public.asientos_contables
  set estado = 'Contabilizado', contabilizado_at = now()
  where id = p_asiento_id;
end;
$$;

revoke all on function public.contabilizar_asiento(uuid) from public, anon;
grant execute on function public.contabilizar_asiento(uuid) to authenticated, service_role;

-- Updated-at en las tablas con dicho campo.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'usuarios_organizacion', 'empresa_usuarios', 'centros_costo', 'trabajadores',
    'contratos_trabajo', 'parametros_remuneraciones', 'periodos_remuneraciones',
    'conceptos_remuneracion', 'liquidaciones', 'vacaciones', 'licencias_medicas',
    'finiquitos', 'plan_cuentas', 'periodos_contables', 'asientos_contables',
    'documentos_tributarios', 'cuentas_bancarias'
  ] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

-- RLS: módulos sensibles visibles sólo para el equipo; accesos de cliente visibles a sí mismos y al equipo.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'usuarios_organizacion', 'empresa_usuarios', 'centros_costo', 'trabajadores',
    'contratos_trabajo', 'parametros_remuneraciones', 'periodos_remuneraciones',
    'conceptos_remuneracion', 'movimientos_remuneracion', 'liquidaciones',
    'liquidacion_detalles', 'vacaciones', 'licencias_medicas', 'finiquitos',
    'plan_cuentas', 'periodos_contables', 'asientos_contables', 'movimientos_contables',
    'documentos_tributarios', 'cuentas_bancarias', 'movimientos_bancarios',
    'conciliaciones_bancarias', 'lotes_documentales'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from anon', table_name);
  end loop;
end;
$$;

drop policy if exists usuarios_organizacion_select on public.usuarios_organizacion;
create policy usuarios_organizacion_select on public.usuarios_organizacion for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

drop policy if exists empresa_usuarios_select on public.empresa_usuarios;
create policy empresa_usuarios_select on public.empresa_usuarios for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'centros_costo', 'trabajadores', 'contratos_trabajo', 'parametros_remuneraciones',
    'periodos_remuneraciones', 'conceptos_remuneracion', 'movimientos_remuneracion',
    'liquidaciones', 'liquidacion_detalles', 'vacaciones', 'licencias_medicas',
    'finiquitos', 'plan_cuentas', 'periodos_contables', 'asientos_contables',
    'movimientos_contables', 'documentos_tributarios', 'cuentas_bancarias',
    'movimientos_bancarios', 'conciliaciones_bancarias', 'lotes_documentales'
  ] loop
    execute format('drop policy if exists %I_admin_select on public.%I', table_name, table_name);
    execute format('create policy %I_admin_select on public.%I for select to authenticated using ((select private.is_admin()))', table_name, table_name);
    execute format('grant select on table public.%I to authenticated', table_name);
    execute format('revoke insert, update, delete on table public.%I from authenticated', table_name);
  end loop;
end;
$$;

grant select on table public.usuarios_organizacion to authenticated;
grant select on table public.empresa_usuarios to authenticated;
revoke insert, update, delete on table public.usuarios_organizacion from authenticated;
revoke insert, update, delete on table public.empresa_usuarios from authenticated;

commit;
