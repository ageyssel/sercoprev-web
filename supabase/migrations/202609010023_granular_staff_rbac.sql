begin;

-- Capacidad base: identifica a cualquier usuario interno activo, manteniendo
-- compatibilidad con el superadministrador histórico de empresas.es_admin.
create or replace function private.is_staff()
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
  ) or exists (
    select 1
    from public.usuarios_organizacion u
    where u.user_id = (select auth.uid())
      and u.activo = true
      and u.rol in ('Superadministrador', 'Administrador', 'Contador', 'Remuneraciones', 'Cobranza', 'Lectura')
  );
$$;

create or replace function private.has_staff_role(p_roles text[])
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
  ) or exists (
    select 1
    from public.usuarios_organizacion u
    where u.user_id = (select auth.uid())
      and u.activo = true
      and u.rol = any (p_roles)
  );
$$;

create or replace function private.can_read_payroll()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select private.has_staff_role(array['Superadministrador', 'Administrador', 'Remuneraciones']::text[]);
$$;

create or replace function private.can_read_accounting()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select private.has_staff_role(array['Superadministrador', 'Administrador', 'Contador']::text[]);
$$;

create or replace function private.can_read_billing()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select private.has_staff_role(array['Superadministrador', 'Administrador', 'Cobranza']::text[]);
$$;

create or replace function private.can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select private.has_staff_role(array['Superadministrador', 'Administrador']::text[]);
$$;

revoke all on function private.is_staff() from public, anon;
revoke all on function private.has_staff_role(text[]) from public, anon;
revoke all on function private.can_read_payroll() from public, anon;
revoke all on function private.can_read_accounting() from public, anon;
revoke all on function private.can_read_billing() from public, anon;
revoke all on function private.can_manage_users() from public, anon;

grant execute on function private.is_staff() to authenticated, service_role;
grant execute on function private.has_staff_role(text[]) to authenticated, service_role;
grant execute on function private.can_read_payroll() to authenticated, service_role;
grant execute on function private.can_read_accounting() to authenticated, service_role;
grant execute on function private.can_read_billing() to authenticated, service_role;
grant execute on function private.can_manage_users() to authenticated, service_role;

-- El nombre is_admin es histórico. Se conserva como alias de is_staff para no
-- romper políticas o funciones existentes; código nuevo debe usar is_staff o
-- una capacidad explícita según el módulo.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select private.is_staff();
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;

comment on function private.is_admin() is
  'Nombre histórico: identifica a cualquier usuario interno activo. Código nuevo debe usar private.is_staff() o una capacidad explícita como can_read_payroll(), can_read_accounting(), can_read_billing() o can_manage_users().';

-- Remuneraciones: políticas exclusivamente internas.
drop policy if exists contratos_trabajo_admin_select on public.contratos_trabajo;
create policy contratos_trabajo_admin_select on public.contratos_trabajo
for select to authenticated
using ((select private.can_read_payroll()));

drop policy if exists parametros_remuneraciones_admin_select on public.parametros_remuneraciones;
create policy parametros_remuneraciones_admin_select on public.parametros_remuneraciones
for select to authenticated
using ((select private.can_read_payroll()));

drop policy if exists conceptos_remuneracion_admin_select on public.conceptos_remuneracion;
create policy conceptos_remuneracion_admin_select on public.conceptos_remuneracion
for select to authenticated
using ((select private.can_read_payroll()));

drop policy if exists movimientos_remuneracion_admin_select on public.movimientos_remuneracion;
create policy movimientos_remuneracion_admin_select on public.movimientos_remuneracion
for select to authenticated
using ((select private.can_read_payroll()));

drop policy if exists novedades_remuneraciones_admin_select on public.novedades_remuneraciones;
create policy novedades_remuneraciones_admin_select on public.novedades_remuneraciones
for select to authenticated
using ((select private.can_read_payroll()));

drop policy if exists vacaciones_admin_select on public.vacaciones;
create policy vacaciones_admin_select on public.vacaciones
for select to authenticated
using ((select private.can_read_payroll()));

drop policy if exists licencias_medicas_admin_select on public.licencias_medicas;
create policy licencias_medicas_admin_select on public.licencias_medicas
for select to authenticated
using ((select private.can_read_payroll()));

drop policy if exists finiquitos_admin_select on public.finiquitos;
create policy finiquitos_admin_select on public.finiquitos
for select to authenticated
using ((select private.can_read_payroll()));

-- Estas cuatro tablas conservan literalmente la rama de acceso del cliente de
-- 202607230009. El guard NOT is_staff evita que el fallback histórico de
-- can_access_empresa() vuelva a convertir esa rama en acceso global de staff.
-- Todo acceso interno pasa exclusivamente por can_read_payroll().
drop policy if exists trabajadores_admin_select on public.trabajadores;
drop policy if exists trabajadores_select_own_or_admin on public.trabajadores;
create policy trabajadores_select_own_or_admin on public.trabajadores
for select to authenticated
using (
  (
    not (select private.is_staff())
    and (select private.can_access_empresa(empresa_id))
  )
  or (select private.can_read_payroll())
);

drop policy if exists periodos_remuneraciones_admin_select on public.periodos_remuneraciones;
drop policy if exists periodos_remuneraciones_select_own_or_admin on public.periodos_remuneraciones;
create policy periodos_remuneraciones_select_own_or_admin on public.periodos_remuneraciones
for select to authenticated
using (
  (
    not (select private.is_staff())
    and (select private.can_access_empresa(empresa_id))
  )
  or (select private.can_read_payroll())
);

drop policy if exists liquidaciones_admin_select on public.liquidaciones;
drop policy if exists liquidaciones_select_own_or_admin on public.liquidaciones;
create policy liquidaciones_select_own_or_admin on public.liquidaciones
for select to authenticated
using (
  (
    not (select private.is_staff())
    and exists (
      select 1
      from public.periodos_remuneraciones pr
      where pr.id = periodo_id
        and (select private.can_access_empresa(pr.empresa_id))
    )
  )
  or (select private.can_read_payroll())
);

drop policy if exists liquidacion_detalles_admin_select on public.liquidacion_detalles;
drop policy if exists liquidacion_detalles_select_own_or_admin on public.liquidacion_detalles;
create policy liquidacion_detalles_select_own_or_admin on public.liquidacion_detalles
for select to authenticated
using (
  (
    not (select private.is_staff())
    and exists (
      select 1
      from public.liquidaciones l
      join public.periodos_remuneraciones pr on pr.id = l.periodo_id
      where l.id = liquidacion_id
        and (select private.can_access_empresa(pr.empresa_id))
    )
  )
  or (select private.can_read_payroll())
);

-- Contabilidad: sólo Superadministrador, Administrador y Contador.
drop policy if exists plan_cuentas_admin_select on public.plan_cuentas;
create policy plan_cuentas_admin_select on public.plan_cuentas
for select to authenticated
using ((select private.can_read_accounting()));

drop policy if exists periodos_contables_admin_select on public.periodos_contables;
create policy periodos_contables_admin_select on public.periodos_contables
for select to authenticated
using ((select private.can_read_accounting()));

drop policy if exists asientos_contables_admin_select on public.asientos_contables;
create policy asientos_contables_admin_select on public.asientos_contables
for select to authenticated
using ((select private.can_read_accounting()));

drop policy if exists movimientos_contables_admin_select on public.movimientos_contables;
create policy movimientos_contables_admin_select on public.movimientos_contables
for select to authenticated
using ((select private.can_read_accounting()));

drop policy if exists documentos_tributarios_admin_select on public.documentos_tributarios;
create policy documentos_tributarios_admin_select on public.documentos_tributarios
for select to authenticated
using ((select private.can_read_accounting()));

drop policy if exists cuentas_bancarias_admin_select on public.cuentas_bancarias;
create policy cuentas_bancarias_admin_select on public.cuentas_bancarias
for select to authenticated
using ((select private.can_read_accounting()));

drop policy if exists movimientos_bancarios_admin_select on public.movimientos_bancarios;
create policy movimientos_bancarios_admin_select on public.movimientos_bancarios
for select to authenticated
using ((select private.can_read_accounting()));

drop policy if exists conciliaciones_bancarias_admin_select on public.conciliaciones_bancarias;
create policy conciliaciones_bancarias_admin_select on public.conciliaciones_bancarias
for select to authenticated
using ((select private.can_read_accounting()));

drop policy if exists importaciones_contables_admin_select on public.importaciones_contables;
create policy importaciones_contables_admin_select on public.importaciones_contables
for select to authenticated
using ((select private.can_read_accounting()));

comment on function private.is_staff() is
  'Cualquier usuario interno activo; incluye al superadministrador histórico de empresas.es_admin.';
comment on function private.has_staff_role(text[]) is
  'Comprueba un rol interno activo contra la lista indicada; empresas.es_admin conserva acceso histórico total.';
comment on function private.can_read_payroll() is
  'Lectura de remuneraciones: Superadministrador, Administrador y Remuneraciones; también empresas.es_admin histórico.';
comment on function private.can_read_accounting() is
  'Lectura de contabilidad: Superadministrador, Administrador y Contador; también empresas.es_admin histórico.';
comment on function private.can_read_billing() is
  'Lectura de cobranza: Superadministrador, Administrador y Cobranza; también empresas.es_admin histórico.';
comment on function private.can_manage_users() is
  'Gestión de usuarios: Superadministrador y Administrador; también empresas.es_admin histórico.';

-- Matriz RBAC documentada:
--   Superadministrador / Administrador: Remuneraciones + Contabilidad + Cobranza + Usuarios.
--   Remuneraciones:                   lectura de Remuneraciones.
--   Contador:                         lectura de Contabilidad.
--   Cobranza:                         lectura de Cobranza.
--   Lectura:                          sin acceso a estos módulos sensibles por capacidad.
--   empresas.es_admin = true:         superadministrador histórico con todas las capacidades anteriores.
--   Cliente:                          conserva sólo la rama propia de 202607230009 en las cuatro tablas del portal.

commit;
