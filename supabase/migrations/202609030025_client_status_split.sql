begin;

alter table public.empresas
  add column if not exists estado_contable text not null default 'En proceso de inicio de actividades';

-- Keep repeated/partially-applied executions deterministic before adding the CHECK.
update public.empresas
set estado_contable = 'En proceso de inicio de actividades'
where estado_contable is null
   or estado_contable not in (
     'En proceso de inicio de actividades',
     'Con movimiento',
     'Sin movimiento',
     'Término de giro'
   );

alter table public.empresas
  alter column estado_contable set default 'En proceso de inicio de actividades',
  alter column estado_contable set not null;

alter table public.empresas drop constraint if exists empresas_estado_contable_check;
alter table public.empresas add constraint empresas_estado_contable_check
  check (estado_contable in (
    'En proceso de inicio de actividades',
    'Con movimiento',
    'Sin movimiento',
    'Término de giro'
  ));

-- Migrate the legacy mixed commercial/accounting status while the old CHECK still permits it.
update public.empresas
set estado_cliente = 'Activo'
where estado_cliente = 'Requiere atención';

alter table public.empresas drop constraint if exists empresas_estado_cliente_check;
alter table public.empresas add constraint empresas_estado_cliente_check
  check (estado_cliente in ('En incorporación', 'Activo', 'Suspendido', 'Archivado'));

-- Refuse to remove estado_impuestos if production drift introduced a structural dependency.
do $$
declare
  estado_impuestos_attnum smallint;
  dependencies text;
begin
  select a.attnum
  into estado_impuestos_attnum
  from pg_catalog.pg_attribute a
  where a.attrelid = 'public.empresas'::regclass
    and a.attname = 'estado_impuestos'
    and not a.attisdropped;

  if estado_impuestos_attnum is not null then
    select string_agg(dependency, E'\n' order by dependency)
    into dependencies
    from (
      select format('index %I.%I', ns.nspname, idx.relname) as dependency
      from pg_catalog.pg_index i
      join pg_catalog.pg_class idx on idx.oid = i.indexrelid
      join pg_catalog.pg_namespace ns on ns.oid = idx.relnamespace
      where i.indrelid = 'public.empresas'::regclass
        and pg_catalog.pg_get_indexdef(i.indexrelid) ilike '%estado_impuestos%'

      union

      select format('policy %I', p.polname)
      from pg_catalog.pg_policy p
      where p.polrelid = 'public.empresas'::regclass
        and (
          coalesce(pg_catalog.pg_get_expr(p.polqual, p.polrelid), '') ilike '%estado_impuestos%'
          or coalesce(pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid), '') ilike '%estado_impuestos%'
        )

      union

      select format('trigger %I', t.tgname)
      from pg_catalog.pg_trigger t
      where t.tgrelid = 'public.empresas'::regclass
        and not t.tgisinternal
        and (
          pg_catalog.pg_get_triggerdef(t.oid) ilike '%estado_impuestos%'
          or pg_catalog.pg_get_functiondef(t.tgfoid) ilike '%estado_impuestos%'
        )

      union

      select format('%s %I.%I', case when c.relkind = 'm' then 'materialized view' else 'view' end, ns.nspname, c.relname)
      from pg_catalog.pg_depend d
      join pg_catalog.pg_rewrite r on r.oid = d.objid
      join pg_catalog.pg_class c on c.oid = r.ev_class
      join pg_catalog.pg_namespace ns on ns.oid = c.relnamespace
      where d.refobjid = 'public.empresas'::regclass
        and d.refobjsubid = estado_impuestos_attnum
        and c.relkind in ('v', 'm')
    ) dependency_rows;

    if dependencies is not null then
      raise exception using
        message = 'Cannot drop public.empresas.estado_impuestos because structural dependencies exist',
        detail = dependencies,
        hint = 'Remove or migrate the reported index, RLS policy, trigger or view explicitly before retrying this migration.';
    end if;
  end if;
end;
$$;

alter table public.empresas drop column if exists estado_impuestos;
alter table public.empresas drop column if exists ejecutivo_asignado;

drop index if exists public.empresas_estado_contable_idx;
create index empresas_estado_contable_idx
  on public.empresas(estado_contable)
  where es_admin = false;

comment on column public.empresas.estado_cliente is
  'Estado de la relación comercial con SERCOPREV. En incorporación: alta comercial aún en curso; Activo: relación y servicio vigentes; Suspendido: prestación comercial detenida; Archivado: relación finalizada y conservada por historial. Es independiente del estado contable/tributario.';

comment on column public.empresas.estado_contable is
  'Estado operativo contable/tributario del cliente, separado de su relación comercial. En proceso de inicio de actividades: aún sin inicio operativo; Con movimiento: mantiene actividad contable; Sin movimiento: cliente vigente sin movimiento contable; Término de giro: actividad tributaria terminada.';

commit;
