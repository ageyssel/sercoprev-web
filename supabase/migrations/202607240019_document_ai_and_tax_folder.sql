begin;

alter table public.documentos
  add column if not exists tipo_documento_codigo text not null default 'SIN_CLASIFICAR',
  add column if not exists archivo_hash text;

alter table public.documentos drop constraint if exists documentos_tipo_documento_codigo_check;
alter table public.documentos add constraint documentos_tipo_documento_codigo_check check (tipo_documento_codigo in (
  'CARPETA_TRIBUTARIA', 'FORMULARIO_29', 'FORMULARIO_22', 'DECLARACION_JURADA',
  'REGISTRO_COMPRAS_VENTAS', 'COMPROBANTE_TGR', 'LIQUIDACION_SUELDO',
  'LIBRO_REMUNERACIONES', 'PLANILLA_PREVIRED', 'CONTRATO_TRABAJO', 'ANEXO_CONTRATO',
  'FINIQUITO', 'LICENCIA_MEDICA', 'CERTIFICADO_F30', 'CERTIFICADO_F30_1',
  'CARTOLA_BANCARIA', 'CONCILIACION_BANCARIA', 'BALANCE_GENERAL', 'BALANCE_CLASIFICADO',
  'ESTADO_RESULTADOS', 'LIBRO_DIARIO', 'LIBRO_MAYOR', 'INVENTARIO_BALANCES',
  'ESCRITURA', 'CERTIFICADO_VIGENCIA', 'PODER', 'OTRO_TRIBUTARIO', 'OTRO_LABORAL',
  'OTRO_CONTABLE', 'OTRO_LEGAL', 'SIN_CLASIFICAR'
));

update public.documentos
set tipo_documento_codigo = case
  when lower(coalesce(nombre_original, '') || ' ' || coalesce(descripcion, '')) like '%carpeta tributaria%' then 'CARPETA_TRIBUTARIA'
  when categoria = 'Impuestos' then 'OTRO_TRIBUTARIO'
  when categoria = 'Tributario' then 'OTRO_TRIBUTARIO'
  when categoria = 'Remuneraciones' then 'LIBRO_REMUNERACIONES'
  when categoria = 'Laboral' then 'OTRO_LABORAL'
  when categoria = 'Contratos' then 'CONTRATO_TRABAJO'
  when categoria = 'Contabilidad' then 'OTRO_CONTABLE'
  when categoria = 'Legal' then 'OTRO_LEGAL'
  when categoria = 'Bancario' then 'CARTOLA_BANCARIA'
  else 'SIN_CLASIFICAR'
end
where tipo_documento_codigo = 'SIN_CLASIFICAR';

alter table public.archivos_ingesta
  add column if not exists tipo_documento_sugerido text not null default 'SIN_CLASIFICAR',
  add column if not exists ai_estado text not null default 'Pendiente',
  add column if not exists ai_proveedor text,
  add column if not exists ai_modelo text,
  add column if not exists ai_prompt_version text,
  add column if not exists ai_intentos integer not null default 0,
  add column if not exists ai_procesado_at timestamptz,
  add column if not exists empresa_confianza smallint not null default 0,
  add column if not exists tipo_confianza smallint not null default 0,
  add column if not exists periodo_confianza smallint not null default 0,
  add column if not exists evidencias jsonb not null default '{}'::jsonb,
  add column if not exists resultado_ia jsonb not null default '{}'::jsonb,
  add column if not exists texto_hash text,
  add column if not exists archivo_hash text;

alter table public.archivos_ingesta drop constraint if exists archivos_ingesta_estado_check;
alter table public.archivos_ingesta add constraint archivos_ingesta_estado_check
  check (estado in ('Analizando', 'Clasificado', 'Revisión', 'Rechazado', 'Error'));

alter table public.archivos_ingesta drop constraint if exists archivos_ingesta_ai_estado_check;
alter table public.archivos_ingesta add constraint archivos_ingesta_ai_estado_check
  check (ai_estado in ('Pendiente', 'Procesando', 'Completado', 'Error', 'No configurado'));

alter table public.archivos_ingesta drop constraint if exists archivos_ingesta_tipo_documento_check;
alter table public.archivos_ingesta add constraint archivos_ingesta_tipo_documento_check check (tipo_documento_sugerido in (
  'CARPETA_TRIBUTARIA', 'FORMULARIO_29', 'FORMULARIO_22', 'DECLARACION_JURADA',
  'REGISTRO_COMPRAS_VENTAS', 'COMPROBANTE_TGR', 'LIQUIDACION_SUELDO',
  'LIBRO_REMUNERACIONES', 'PLANILLA_PREVIRED', 'CONTRATO_TRABAJO', 'ANEXO_CONTRATO',
  'FINIQUITO', 'LICENCIA_MEDICA', 'CERTIFICADO_F30', 'CERTIFICADO_F30_1',
  'CARTOLA_BANCARIA', 'CONCILIACION_BANCARIA', 'BALANCE_GENERAL', 'BALANCE_CLASIFICADO',
  'ESTADO_RESULTADOS', 'LIBRO_DIARIO', 'LIBRO_MAYOR', 'INVENTARIO_BALANCES',
  'ESCRITURA', 'CERTIFICADO_VIGENCIA', 'PODER', 'OTRO_TRIBUTARIO', 'OTRO_LABORAL',
  'OTRO_CONTABLE', 'OTRO_LEGAL', 'SIN_CLASIFICAR'
));

alter table public.archivos_ingesta drop constraint if exists archivos_ingesta_ai_confianza_check;
alter table public.archivos_ingesta add constraint archivos_ingesta_ai_confianza_check check (
  empresa_confianza between 0 and 100
  and tipo_confianza between 0 and 100
  and periodo_confianza between 0 and 100
  and ai_intentos between 0 and 20
);

create index if not exists documentos_empresa_tipo_fecha_idx
  on public.documentos(empresa_id, tipo_documento_codigo, fecha_subida desc);
create index if not exists documentos_carpeta_tributaria_idx
  on public.documentos(empresa_id, fecha_subida desc)
  where tipo_documento_codigo = 'CARPETA_TRIBUTARIA';
create index if not exists archivos_ingesta_ai_estado_idx
  on public.archivos_ingesta(ai_estado, created_at);
create index if not exists archivos_ingesta_archivo_hash_idx
  on public.archivos_ingesta(archivo_hash)
  where archivo_hash is not null;

create or replace function public.publicar_archivo_ingesta(
  p_ingesta_id uuid,
  p_empresa_id uuid,
  p_categoria text,
  p_tipo_documento_codigo text,
  p_periodo text,
  p_fecha_documento date,
  p_target_storage_path text,
  p_actor_user_id uuid,
  p_fuente_carga text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  intake_row public.archivos_ingesta%rowtype;
  document_id uuid;
  previous_paths text[] := '{}'::text[];
  previous_ids uuid[] := '{}'::uuid[];
  audit_code text;
  classified_count integer;
  pending_count integer;
  error_count integer;
  resolved_batch_state text;
begin
  if p_tipo_documento_codigo not in (
    'CARPETA_TRIBUTARIA', 'FORMULARIO_29', 'FORMULARIO_22', 'DECLARACION_JURADA',
    'REGISTRO_COMPRAS_VENTAS', 'COMPROBANTE_TGR', 'LIQUIDACION_SUELDO',
    'LIBRO_REMUNERACIONES', 'PLANILLA_PREVIRED', 'CONTRATO_TRABAJO', 'ANEXO_CONTRATO',
    'FINIQUITO', 'LICENCIA_MEDICA', 'CERTIFICADO_F30', 'CERTIFICADO_F30_1',
    'CARTOLA_BANCARIA', 'CONCILIACION_BANCARIA', 'BALANCE_GENERAL', 'BALANCE_CLASIFICADO',
    'ESTADO_RESULTADOS', 'LIBRO_DIARIO', 'LIBRO_MAYOR', 'INVENTARIO_BALANCES',
    'ESCRITURA', 'CERTIFICADO_VIGENCIA', 'PODER', 'OTRO_TRIBUTARIO', 'OTRO_LABORAL',
    'OTRO_CONTABLE', 'OTRO_LEGAL'
  ) then
    raise exception 'INVALID_DOCUMENT_TYPE';
  end if;

  if p_categoria not in ('Impuestos', 'Remuneraciones', 'Legal', 'Contabilidad', 'Tributario', 'Laboral', 'Bancario', 'Contratos') then
    raise exception 'INVALID_DOCUMENT_CATEGORY';
  end if;

  select * into intake_row
  from public.archivos_ingesta
  where id = p_ingesta_id
  for update;

  if intake_row.id is null then raise exception 'INTAKE_NOT_FOUND'; end if;
  if intake_row.documento_id is not null then
    return jsonb_build_object(
      'documento_id', intake_row.documento_id,
      'reemplazados', 0,
      'storage_paths_eliminar', '[]'::jsonb,
      'idempotente', true
    );
  end if;

  if not exists (select 1 from public.empresas where id = p_empresa_id and es_admin = false) then
    raise exception 'COMPANY_NOT_FOUND';
  end if;

  if p_tipo_documento_codigo = 'CARPETA_TRIBUTARIA' then
    perform pg_advisory_xact_lock(hashtext(p_empresa_id::text || ':CARPETA_TRIBUTARIA'));

    select
      coalesce(array_agg(storage_path order by fecha_subida), '{}'::text[]),
      coalesce(array_agg(id order by fecha_subida), '{}'::uuid[])
    into previous_paths, previous_ids
    from public.documentos
    where empresa_id = p_empresa_id
      and tipo_documento_codigo = 'CARPETA_TRIBUTARIA';

    delete from public.documentos
    where empresa_id = p_empresa_id
      and tipo_documento_codigo = 'CARPETA_TRIBUTARIA';
  end if;

  insert into public.documentos (
    empresa_id,
    nombre_original,
    storage_path,
    categoria,
    periodo,
    descripcion,
    uploaded_by,
    mime_type,
    file_size,
    visible_cliente,
    lote_id,
    clasificacion_estado,
    rut_detectado,
    fecha_documento,
    fuente_carga,
    metadata_clasificacion,
    tipo_documento_codigo,
    archivo_hash
  ) values (
    p_empresa_id,
    intake_row.nombre_original,
    p_target_storage_path,
    p_categoria,
    nullif(btrim(p_periodo), ''),
    case
      when p_tipo_documento_codigo = 'CARPETA_TRIBUTARIA' then 'Carpeta Tributaria vigente. Reemplaza automáticamente la versión anterior de esta empresa.'
      else 'Documento clasificado y publicado desde la carga masiva SERCOPREV.'
    end,
    p_actor_user_id,
    intake_row.mime_type,
    intake_row.file_size,
    true,
    intake_row.lote_id,
    'Confirmada',
    intake_row.rut_detectado,
    p_fecha_documento,
    coalesce(nullif(btrim(p_fuente_carga), ''), 'Masiva revisada'),
    coalesce(p_metadata, '{}'::jsonb),
    p_tipo_documento_codigo,
    intake_row.archivo_hash
  ) returning id into document_id;

  update public.archivos_ingesta
  set empresa_id = p_empresa_id,
      documento_id = document_id,
      storage_path = p_target_storage_path,
      categoria_sugerida = p_categoria,
      tipo_documento_sugerido = p_tipo_documento_codigo,
      periodo_sugerido = nullif(btrim(p_periodo), ''),
      fecha_sugerida = p_fecha_documento,
      estado = 'Clasificado',
      ai_estado = case when ai_estado = 'Procesando' then 'Completado' else ai_estado end,
      reviewed_at = now(),
      reviewed_by = p_actor_user_id
  where id = p_ingesta_id;

  select
    count(*) filter (where estado = 'Clasificado'),
    count(*) filter (where estado in ('Analizando', 'Revisión')),
    count(*) filter (where estado = 'Error')
  into classified_count, pending_count, error_count
  from public.archivos_ingesta
  where lote_id = intake_row.lote_id;

  resolved_batch_state := case
    when error_count > 0 or pending_count > 0 then 'Con observaciones'
    else 'Completado'
  end;

  update public.lotes_documentales
  set clasificados = classified_count,
      pendientes = pending_count,
      errores = error_count,
      estado = resolved_batch_state,
      completado_at = case when pending_count = 0 then now() else completado_at end
  where id = intake_row.lote_id;

  insert into public.auditoria_eventos (
    actor_user_id,
    empresa_id,
    accion,
    entidad,
    entidad_id,
    module,
    description,
    source,
    metadata,
    before_data,
    after_data
  ) values (
    p_actor_user_id,
    p_empresa_id,
    case when p_tipo_documento_codigo = 'CARPETA_TRIBUTARIA' then 'reemplazar_carpeta_tributaria' else 'publicar_documento_clasificado' end,
    'archivo_ingesta',
    p_ingesta_id::text,
    'Documentos',
    case
      when p_tipo_documento_codigo = 'CARPETA_TRIBUTARIA' then 'Carpeta Tributaria vigente reemplazada de forma automática y trazable'
      else 'Documento clasificado y publicado en el portal del cliente'
    end,
    case when p_fuente_carga ilike '%IA%' then 'inteligencia_artificial' else 'aplicacion' end,
    jsonb_build_object(
      'documento_id', document_id,
      'tipo_documento_codigo', p_tipo_documento_codigo,
      'periodo', nullif(btrim(p_periodo), ''),
      'documentos_reemplazados', coalesce(array_length(previous_ids, 1), 0),
      'documentos_reemplazados_ids', to_jsonb(previous_ids)
    ),
    case when coalesce(array_length(previous_ids, 1), 0) > 0 then jsonb_build_object('documentos_ids', previous_ids) else null end,
    jsonb_build_object('documento_id', document_id, 'tipo_documento_codigo', p_tipo_documento_codigo)
  ) returning transaction_code into audit_code;

  return jsonb_build_object(
    'documento_id', document_id,
    'reemplazados', coalesce(array_length(previous_ids, 1), 0),
    'documentos_reemplazados_ids', to_jsonb(previous_ids),
    'storage_paths_eliminar', to_jsonb(previous_paths),
    'transaction_code', audit_code,
    'idempotente', false
  );
end;
$$;

revoke all on function public.publicar_archivo_ingesta(uuid, uuid, text, text, text, date, text, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.publicar_archivo_ingesta(uuid, uuid, text, text, text, date, text, uuid, text, jsonb) to service_role;

commit;
