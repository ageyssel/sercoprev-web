begin;

create or replace function public.reversar_asiento(
  p_asiento_id uuid,
  p_motivo text,
  p_actor_user_id uuid
)
returns table (
  asiento_inverso_id uuid,
  numero_inverso bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  asiento_origen public.asientos_contables%rowtype;
  periodo_destino_id uuid;
  fecha_contable date := (clock_timestamp() at time zone 'America/Santiago')::date;
  motivo text := btrim(coalesce(p_motivo, ''));
  nuevo_asiento_id uuid;
  nuevo_numero bigint;
begin
  if char_length(motivo) < 10 then
    raise exception 'MOTIVO_REVERSA_INVALIDO';
  end if;

  select * into asiento_origen
  from public.asientos_contables
  where id = p_asiento_id
  for update;

  if asiento_origen.id is null then
    raise exception 'ASIENTO_ORIGEN_NO_ENCONTRADO';
  end if;

  if asiento_origen.estado = 'Borrador' then
    raise exception 'ASIENTO_ORIGEN_BORRADOR_NO_REVERSABLE';
  end if;

  if asiento_origen.estado = 'Anulado' then
    raise exception 'ASIENTO_ORIGEN_ANULADO_NO_REVERSABLE';
  end if;

  if asiento_origen.estado <> 'Contabilizado' then
    raise exception 'ASIENTO_ORIGEN_ESTADO_INVALIDO';
  end if;

  if exists (
    select 1
    from public.asientos_contables reversa_existente
    where reversa_existente.empresa_id = asiento_origen.empresa_id
      and reversa_existente.documento_referencia = asiento_origen.id::text
      and reversa_existente.estado = 'Contabilizado'
      and reversa_existente.tipo = 'Traspaso'
      and reversa_existente.glosa like 'Reversa del asiento N° %'
  ) then
    raise exception 'ASIENTO_YA_REVERTIDO';
  end if;

  select periodo.id into periodo_destino_id
  from public.periodos_contables periodo
  where periodo.empresa_id = asiento_origen.empresa_id
    and periodo.estado = 'Abierto'
    and fecha_contable >= periodo.periodo
    and fecha_contable < (periodo.periodo + interval '1 month')::date
  limit 1;

  if periodo_destino_id is null then
    raise exception 'PERIODO_DESTINO_NO_DISPONIBLE';
  end if;

  lock table public.asientos_contables in share row exclusive mode;

  select coalesce(max(asiento.numero), 0) + 1
    into nuevo_numero
  from public.asientos_contables asiento
  where asiento.empresa_id = asiento_origen.empresa_id;

  insert into public.asientos_contables (
    empresa_id,
    periodo_id,
    numero,
    fecha,
    tipo,
    glosa,
    estado,
    origen,
    documento_referencia,
    created_by
  ) values (
    asiento_origen.empresa_id,
    periodo_destino_id,
    nuevo_numero,
    fecha_contable,
    'Traspaso',
    format('Reversa del asiento N° %s (%s). Motivo: %s', asiento_origen.numero, asiento_origen.id, motivo),
    'Borrador',
    'Manual',
    asiento_origen.id::text,
    p_actor_user_id
  )
  returning id into nuevo_asiento_id;

  insert into public.movimientos_contables (
    asiento_id,
    cuenta_id,
    centro_costo_id,
    glosa,
    debe,
    haber,
    tercero_rut,
    documento_tipo,
    documento_folio,
    fecha_vencimiento
  )
  select
    nuevo_asiento_id,
    movimiento.cuenta_id,
    movimiento.centro_costo_id,
    movimiento.glosa,
    movimiento.haber,
    movimiento.debe,
    movimiento.tercero_rut,
    movimiento.documento_tipo,
    movimiento.documento_folio,
    movimiento.fecha_vencimiento
  from public.movimientos_contables movimiento
  where movimiento.asiento_id = asiento_origen.id
  order by movimiento.created_at, movimiento.id;

  -- contabilizar_asiento conserva una única validación de cuadratura. La RPC de
  -- reversa se ejecuta con service_role, por lo que se propaga temporalmente el
  -- actor autenticado para satisfacer la autorización histórica de esa función.
  perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);
  perform public.contabilizar_asiento(nuevo_asiento_id);

  insert into public.auditoria_eventos (
    actor_user_id,
    empresa_id,
    accion,
    entidad,
    entidad_id,
    module,
    description,
    result,
    source,
    metadata
  ) values (
    p_actor_user_id,
    asiento_origen.empresa_id,
    'reversar_asiento',
    'asientos_contables',
    asiento_origen.id::text,
    'Contabilidad',
    format('Reversa del asiento N° %s. Motivo: %s', asiento_origen.numero, motivo),
    'exitoso',
    'database_function',
    jsonb_build_object(
      'motivo', motivo,
      'asiento_origen_id', asiento_origen.id,
      'numero_origen', asiento_origen.numero,
      'asiento_inverso_id', nuevo_asiento_id,
      'numero_inverso', nuevo_numero,
      'periodo_destino_id', periodo_destino_id,
      'fecha_reversa', fecha_contable
    )
  );

  return query select nuevo_asiento_id, nuevo_numero;
end;
$$;

revoke all on function public.reversar_asiento(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.reversar_asiento(uuid, text, uuid) to service_role;

comment on function public.reversar_asiento(uuid, text, uuid) is 'Crea y contabiliza un asiento compensatorio en el periodo abierto actual, preservando inmutable el asiento origen y registrando la trazabilidad de la reversa.';

commit;
