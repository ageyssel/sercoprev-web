begin;

-- Un registro de auditoría no debe cambiar cuando se elimina una cuenta o una
-- empresa. Se conservan los UUID como evidencia histórica, sin cascadas que
-- intenten reescribir filas protegidas por el trigger de inmutabilidad.
alter table public.auditoria_eventos
  drop constraint if exists auditoria_eventos_actor_user_id_fkey,
  drop constraint if exists auditoria_eventos_empresa_id_fkey,
  drop constraint if exists auditoria_eventos_target_user_id_fkey;

-- Obtiene el usuario autenticado real. Cuando una Server Action opera con la
-- clave privilegiada, requireAdmin propaga el actor en un encabezado interno.
-- Una sesión autenticada normal siempre prevalece y no puede suplantarse.
create or replace function private.current_audit_actor_id()
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, auth
as $$
declare
  request_headers jsonb := '{}'::jsonb;
  candidate text;
begin
  if auth.uid() is not null then
    return auth.uid();
  end if;

  begin
    request_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  exception when others then
    request_headers := '{}'::jsonb;
  end;

  candidate := nullif(request_headers ->> 'x-sercoprev-actor-user-id', '');
  if candidate is not null and candidate ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return candidate::uuid;
  end if;
  return null;
end;
$$;

revoke all on function private.current_audit_actor_id() from public, anon;
grant execute on function private.current_audit_actor_id() to authenticated, service_role;

-- Completa automáticamente la huella técnica disponible en PostgREST/Workers
-- sin persistir la IP en texto claro. El hash permite correlacionar eventos sin
-- exponer el dato original.
create or replace function private.enrich_audit_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth, extensions
as $$
declare
  resolved_name text;
  resolved_email text;
  resolved_role text;
  target_id uuid;
  request_headers jsonb := '{}'::jsonb;
  client_ip text;
begin
  begin
    request_headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  exception when others then
    request_headers := '{}'::jsonb;
  end;

  new.actor_user_id := coalesce(new.actor_user_id, private.current_audit_actor_id());

  if new.transaction_code is null or btrim(new.transaction_code) = '' then
    new.transaction_code := 'TX-' || to_char(clock_timestamp() at time zone 'UTC', 'YYYYMMDDHH24MISSMS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;

  new.request_id := coalesce(
    nullif(btrim(new.request_id), ''),
    nullif(request_headers ->> 'x-sercoprev-request-id', ''),
    nullif(request_headers ->> 'cf-ray', ''),
    nullif(request_headers ->> 'x-request-id', ''),
    new.transaction_code
  );
  new.user_agent := coalesce(
    nullif(btrim(new.user_agent), ''),
    nullif(left(request_headers ->> 'user-agent', 1000), '')
  );

  client_ip := coalesce(
    nullif(request_headers ->> 'cf-connecting-ip', ''),
    nullif(request_headers ->> 'x-real-ip', ''),
    nullif(split_part(request_headers ->> 'x-forwarded-for', ',', 1), '')
  );
  if new.ip_hash is null and client_ip is not null then
    new.ip_hash := encode(digest(btrim(client_ip), 'sha256'), 'hex');
  end if;

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
    select u.user_id, u.nombre, u.email
      into target_id, new.target_user_name, new.target_user_email
    from public.usuarios_organizacion u
    where u.id::text = new.entidad_id
    limit 1;
  elsif new.entidad in ('empresa_usuario', 'empresa_usuarios') and new.entidad_id is not null then
    select eu.user_id, eu.nombre, eu.email
      into target_id, new.target_user_name, new.target_user_email
    from public.empresa_usuarios eu
    where eu.id::text = new.entidad_id
    limit 1;
  end if;

  new.target_user_id := coalesce(new.target_user_id, target_id);
  return new;
end;
$$;

revoke all on function private.enrich_audit_event() from public, anon;

-- Reemplaza la captura genérica para que toda operación realizada con el
-- cliente privilegiado conserve el actor interno propagado por requireAdmin.
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
    private.current_audit_actor_id(),
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

commit;
