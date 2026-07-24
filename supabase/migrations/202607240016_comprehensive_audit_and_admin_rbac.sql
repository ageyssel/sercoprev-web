begin;

create or replace function private.is_privileged_admin()
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
      and u.rol in ('Superadministrador', 'Administrador')
  );
$$;

revoke all on function private.is_privileged_admin() from public, anon;
grant execute on function private.is_privileged_admin() to authenticated, service_role;

alter table public.auditoria_eventos
  add column if not exists transaction_code text,
  add column if not exists actor_name text,
  add column if not exists actor_email text,
  add column if not exists actor_role text,
  add column if not exists target_user_id uuid references auth.users(id) on delete set null,
  add column if not exists target_user_name text,
  add column if not exists target_user_email text,
  add column if not exists module text,
  add column if not exists description text,
  add column if not exists result text,
  add column if not exists source text,
  add column if not exists request_id text,
  add column if not exists ip_hash text,
  add column if not exists user_agent text,
  add column if not exists before_data jsonb,
  add column if not exists after_data jsonb;

update public.auditoria_eventos
set transaction_code = 'TX-' || to_char(created_at at time zone 'UTC', 'YYYYMMDDHH24MISSMS') || '-' || lpad(id::text, 10, '0')
where transaction_code is null or btrim(transaction_code) = '';

update public.auditoria_eventos
set result = 'exitoso'
where result is null or btrim(result) = '';

update public.auditoria_eventos
set source = 'aplicacion'
where source is null or btrim(source) = '';

update public.auditoria_eventos
set module = case
  when entidad in ('usuario_organizacion', 'empresa_usuario', 'staff_email_mfa') then 'Seguridad y accesos'
  when entidad like '%remuner%' or entidad in ('trabajador', 'contrato_trabajo', 'liquidacion', 'finiquito', 'vacacion', 'licencia_medica') then 'Remuneraciones'
  when entidad like '%contable%' or entidad in ('plan_cuenta', 'documento_tributario', 'movimiento_bancario', 'conciliacion_bancaria') then 'Contabilidad'
  when entidad like '%document%' or entidad in ('solicitud_documento', 'archivo_ingesta', 'lote_documental') then 'Documentos'
  when entidad in ('empresa', 'lead', 'servicio_contratado') then 'Clientes y comercial'
  else 'Operación'
end
where module is null or btrim(module) = '';

update public.auditoria_eventos
set description = initcap(replace(accion, '_', ' ')) || ' · ' || replace(entidad, '_', ' ')
where description is null or btrim(description) = '';

alter table public.auditoria_eventos
  alter column transaction_code set not null,
  alter column transaction_code set default ('TX-' || to_char(clock_timestamp() at time zone 'UTC', 'YYYYMMDDHH24MISSMS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  alter column module set not null,
  alter column module set default 'Operación',
  alter column result set not null,
  alter column result set default 'exitoso',
  alter column source set not null,
  alter column source set default 'aplicacion';

alter table public.auditoria_eventos drop constraint if exists auditoria_eventos_result_check;
alter table public.auditoria_eventos add constraint auditoria_eventos_result_check
  check (result in ('exitoso', 'fallido', 'denegado'));

create unique index if not exists auditoria_transaction_code_uidx on public.auditoria_eventos(transaction_code);
create index if not exists auditoria_created_desc_idx on public.auditoria_eventos(created_at desc);
create index if not exists auditoria_actor_created_idx on public.auditoria_eventos(actor_user_id, created_at desc);
create index if not exists auditoria_module_created_idx on public.auditoria_eventos(module, created_at desc);
create index if not exists auditoria_result_created_idx on public.auditoria_eventos(result, created_at desc);
create index if not exists auditoria_target_user_created_idx on public.auditoria_eventos(target_user_id, created_at desc);

create or replace function private.audit_module_for_entity(p_entity text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when p_entity in ('usuarios_organizacion', 'usuario_organizacion', 'empresa_usuarios', 'empresa_usuario', 'staff_email_mfa') then 'Seguridad y accesos'
    when p_entity in ('trabajadores', 'trabajador', 'contratos_trabajo', 'contrato_trabajo', 'parametros_remuneraciones', 'periodos_remuneraciones', 'conceptos_remuneracion', 'movimientos_remuneracion', 'novedades_remuneraciones', 'liquidaciones', 'liquidacion', 'liquidacion_detalles', 'vacaciones', 'vacacion', 'licencias_medicas', 'licencia_medica', 'finiquitos', 'finiquito') then 'Remuneraciones'
    when p_entity in ('plan_cuentas', 'plan_cuenta', 'periodos_contables', 'asientos_contables', 'movimientos_contables', 'documentos_tributarios', 'documento_tributario', 'cuentas_bancarias', 'movimientos_bancarios', 'movimiento_bancario', 'conciliaciones_bancarias', 'conciliacion_bancaria', 'importaciones_contables') then 'Contabilidad'
    when p_entity in ('solicitudes_documentos', 'solicitud_documento', 'documentos', 'documento', 'lotes_documentales', 'lote_documental', 'archivos_ingesta', 'archivo_ingesta') then 'Documentos'
    when p_entity in ('empresas', 'empresa', 'leads', 'lead', 'servicios_contratados', 'servicio_contratado', 'contactos_empresa') then 'Clientes y comercial'
    when p_entity in ('honorarios', 'cobranza') then 'Cobranza'
    when p_entity in ('tickets', 'ticket_mensajes') then 'Soporte'
    when p_entity in ('notificaciones') then 'Notificaciones'
    else 'Operación'
  end;
$$;

create or replace function private.audit_redact_payload(p_payload jsonb)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when p_payload is null then null
    else p_payload - array[
      'password', 'temporary_password', 'code', 'code_hash', 'challenge_token_hash',
      'token_hash', 'access_token', 'refresh_token', 'secret', 'api_key', 'ip_hash',
      'storage_path'
    ]::text[]
  end;
$$;

create or replace function private.enrich_audit_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  resolved_name text;
  resolved_email text;
  resolved_role text;
  target_id uuid;
begin
  if new.transaction_code is null or btrim(new.transaction_code) = '' then
    new.transaction_code := 'TX-' || to_char(clock_timestamp() at time zone 'UTC', 'YYYYMMDDHH24MISSMS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;

  new.request_id := coalesce(nullif(btrim(new.request_id), ''), new.transaction_code);
  new.module := coalesce(nullif(btrim(new.module), ''), private.audit_module_for_entity(new.entidad));
  new.description := coalesce(nullif(btrim(new.description), ''), initcap(replace(new.accion, '_', ' ')) || ' · ' || replace(new.entidad, '_', ' '));
  new.result := coalesce(nullif(lower(btrim(new.result)), ''), 'exitoso');
  new.source := coalesce(nullif(btrim(new.source), ''), 'aplicacion');
  new.metadata := coalesce(new.metadata, '{}'::jsonb);
  new.before_data := private.audit_redact_payload(new.before_data);
  new.after_data := private.audit_redact_payload(new.after_data);

  if new.actor_user_id is not null then
    select e.razon_social, au.email, 'Superadministrador'
      into resolved_name, resolved_email, resolved_role
    from public.empresas e
    left join auth.users au on au.id = e.user_id
    where e.user_id = new.actor_user_id and e.es_admin = true
    limit 1;

    if resolved_name is null then
      select u.nombre, u.email, u.rol
        into resolved_name, resolved_email, resolved_role
      from public.usuarios_organizacion u
      where u.user_id = new.actor_user_id
      limit 1;
    end if;

    if resolved_name is null then
      select eu.nombre, eu.email, eu.rol
        into resolved_name, resolved_email, resolved_role
      from public.empresa_usuarios eu
      where eu.user_id = new.actor_user_id
      limit 1;
    end if;

    new.actor_name := coalesce(nullif(btrim(new.actor_name), ''), resolved_name);
    new.actor_email := coalesce(nullif(btrim(new.actor_email), ''), resolved_email);
    new.actor_role := coalesce(nullif(btrim(new.actor_role), ''), resolved_role);
  end if;

  if new.entidad in ('usuario_organizacion', 'usuarios_organizacion') and new.entidad_id is not null then
    select u.user_id, u.nombre, u.email into target_id, new.target_user_name, new.target_user_email
    from public.usuarios_organizacion u
    where u.id::text = new.entidad_id
    limit 1;
  elsif new.entidad in ('empresa_usuario', 'empresa_usuarios') and new.entidad_id is not null then
    select eu.user_id, eu.nombre, eu.email into target_id, new.target_user_name, new.target_user_email
    from public.empresa_usuarios eu
    where eu.id::text = new.entidad_id
    limit 1;
  end if;

  new.target_user_id := coalesce(new.target_user_id, target_id);
  return new;
end;
$$;

revoke all on function private.audit_module_for_entity(text) from public, anon;
revoke all on function private.audit_redact_payload(jsonb) from public, anon;
revoke all on function private.enrich_audit_event() from public, anon;

drop trigger if exists auditoria_eventos_enrich on public.auditoria_eventos;
create trigger auditoria_eventos_enrich
before insert on public.auditoria_eventos
for each row execute function private.enrich_audit_event();

create or replace function private.capture_audit_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  old_payload jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_payload jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  row_payload jsonb := coalesce(new_payload, old_payload, '{}'::jsonb);
  company_raw text := coalesce(new_payload ->> 'empresa_id', old_payload ->> 'empresa_id');
  company_id uuid;
  changed_fields jsonb := '[]'::jsonb;
  action_name text;
  action_description text;
begin
  if company_raw is not null and company_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    company_id := company_raw::uuid;
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_agg(key order by key), '[]'::jsonb)
      into changed_fields
    from (
      select key
      from jsonb_object_keys(coalesce(new_payload, '{}'::jsonb)) as key
      where (old_payload -> key) is distinct from (new_payload -> key)
    ) changes;
  end if;

  action_name := case tg_op when 'INSERT' then 'crear' when 'UPDATE' then 'actualizar' else 'eliminar' end;
  action_description := case tg_op
    when 'INSERT' then 'Registro creado en ' || replace(tg_table_name, '_', ' ')
    when 'UPDATE' then 'Registro actualizado en ' || replace(tg_table_name, '_', ' ')
    else 'Registro eliminado de ' || replace(tg_table_name, '_', ' ')
  end;

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
    metadata,
    before_data,
    after_data
  ) values (
    auth.uid(),
    company_id,
    action_name,
    tg_table_name,
    row_payload ->> 'id',
    coalesce(nullif(tg_argv[0], ''), private.audit_module_for_entity(tg_table_name)),
    action_description,
    'exitoso',
    'database_trigger',
    jsonb_build_object('operacion', tg_op, 'campos_modificados', changed_fields),
    old_payload,
    new_payload
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.capture_audit_change() from public, anon;

-- Auditoría automática de todas las entidades operativas modificables. Las
-- tablas de secretos MFA y los datos oficiales automáticos se excluyen para no
-- persistir material sensible ni generar ruido masivo; esos flujos ya emiten
-- eventos de aplicación resumidos.
do $$
declare
  item record;
  trigger_name text;
begin
  for item in
    select * from (values
      ('empresas', 'Clientes y comercial'),
      ('leads', 'Clientes y comercial'),
      ('servicios_contratados', 'Clientes y comercial'),
      ('contactos_empresa', 'Clientes y comercial'),
      ('obligaciones', 'Operación'),
      ('tareas', 'Operación'),
      ('solicitudes_documentos', 'Documentos'),
      ('documentos', 'Documentos'),
      ('datos_empresa', 'Operación'),
      ('notificaciones', 'Notificaciones'),
      ('honorarios', 'Cobranza'),
      ('tickets', 'Soporte'),
      ('ticket_mensajes', 'Soporte'),
      ('usuarios_organizacion', 'Seguridad y accesos'),
      ('empresa_usuarios', 'Seguridad y accesos'),
      ('trabajadores', 'Remuneraciones'),
      ('contratos_trabajo', 'Remuneraciones'),
      ('parametros_remuneraciones', 'Remuneraciones'),
      ('periodos_remuneraciones', 'Remuneraciones'),
      ('conceptos_remuneracion', 'Remuneraciones'),
      ('movimientos_remuneracion', 'Remuneraciones'),
      ('novedades_remuneraciones', 'Remuneraciones'),
      ('liquidaciones', 'Remuneraciones'),
      ('liquidacion_detalles', 'Remuneraciones'),
      ('vacaciones', 'Remuneraciones'),
      ('licencias_medicas', 'Remuneraciones'),
      ('finiquitos', 'Remuneraciones'),
      ('plan_cuentas', 'Contabilidad'),
      ('periodos_contables', 'Contabilidad'),
      ('asientos_contables', 'Contabilidad'),
      ('movimientos_contables', 'Contabilidad'),
      ('documentos_tributarios', 'Contabilidad'),
      ('cuentas_bancarias', 'Contabilidad'),
      ('movimientos_bancarios', 'Contabilidad'),
      ('conciliaciones_bancarias', 'Contabilidad'),
      ('importaciones_contables', 'Contabilidad'),
      ('lotes_documentales', 'Documentos'),
      ('archivos_ingesta', 'Documentos')
    ) as audited(table_name, module_name)
  loop
    if to_regclass('public.' || item.table_name) is not null then
      trigger_name := 'audit_change_' || item.table_name;
      execute format('drop trigger if exists %I on public.%I', trigger_name, item.table_name);
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function private.capture_audit_change(%L)',
        trigger_name,
        item.table_name,
        item.module_name
      );
    end if;
  end loop;
end;
$$;

create or replace function private.prevent_audit_event_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'AUDIT_LOG_IS_IMMUTABLE';
end;
$$;

revoke all on function private.prevent_audit_event_mutation() from public, anon;

drop trigger if exists auditoria_eventos_immutable on public.auditoria_eventos;
create trigger auditoria_eventos_immutable
before update or delete on public.auditoria_eventos
for each row execute function private.prevent_audit_event_mutation();

-- Sólo Administrador y Superadministrador pueden consultar el directorio global
-- y la auditoría. Cada usuario conserva lectura de su propio perfil para resolver
-- la sesión, pero no puede enumerar otras cuentas.
drop policy if exists auditoria_admin_select on public.auditoria_eventos;
create policy auditoria_privileged_admin_select on public.auditoria_eventos
for select to authenticated
using ((select private.is_privileged_admin()));

drop policy if exists usuarios_organizacion_select on public.usuarios_organizacion;
create policy usuarios_organizacion_select on public.usuarios_organizacion
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_privileged_admin()));

drop policy if exists empresa_usuarios_select on public.empresa_usuarios;
create policy empresa_usuarios_select on public.empresa_usuarios
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_privileged_admin()));

revoke insert, update, delete on table public.auditoria_eventos from anon, authenticated;
grant select on table public.auditoria_eventos to authenticated;

commit;
