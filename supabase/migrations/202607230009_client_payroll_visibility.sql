begin;

-- El cliente puede consultar únicamente la información de remuneraciones de su empresa.
drop policy if exists trabajadores_admin_select on public.trabajadores;
drop policy if exists trabajadores_select_own_or_admin on public.trabajadores;
create policy trabajadores_select_own_or_admin on public.trabajadores for select to authenticated
using ((select private.can_access_empresa(empresa_id)));

drop policy if exists periodos_remuneraciones_admin_select on public.periodos_remuneraciones;
drop policy if exists periodos_remuneraciones_select_own_or_admin on public.periodos_remuneraciones;
create policy periodos_remuneraciones_select_own_or_admin on public.periodos_remuneraciones for select to authenticated
using ((select private.can_access_empresa(empresa_id)));

drop policy if exists liquidaciones_admin_select on public.liquidaciones;
drop policy if exists liquidaciones_select_own_or_admin on public.liquidaciones;
create policy liquidaciones_select_own_or_admin on public.liquidaciones for select to authenticated
using (
  exists (
    select 1
    from public.periodos_remuneraciones pr
    where pr.id = periodo_id
      and (select private.can_access_empresa(pr.empresa_id))
  )
);

drop policy if exists liquidacion_detalles_admin_select on public.liquidacion_detalles;
drop policy if exists liquidacion_detalles_select_own_or_admin on public.liquidacion_detalles;
create policy liquidacion_detalles_select_own_or_admin on public.liquidacion_detalles for select to authenticated
using (
  exists (
    select 1
    from public.liquidaciones l
    join public.periodos_remuneraciones pr on pr.id = l.periodo_id
    where l.id = liquidacion_id
      and (select private.can_access_empresa(pr.empresa_id))
  )
);

-- Novedades siguen siendo internas: contienen observaciones operativas del equipo.

commit;
