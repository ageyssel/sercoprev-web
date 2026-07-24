begin;

-- Un registro de auditoría no debe cambiar cuando se elimina una cuenta o una
-- empresa. Se conservan los UUID como evidencia histórica, sin cascadas que
-- intenten reescribir filas protegidas por el trigger de inmutabilidad.
alter table public.auditoria_eventos
  drop constraint if exists auditoria_eventos_actor_user_id_fkey,
  drop constraint if exists auditoria_eventos_empresa_id_fkey,
  drop constraint if exists auditoria_eventos_target_user_id_fkey;

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

  if new.transaction_code is null or btrim(new.transaction_code) = '' then
    new.transaction_code := 'TX-' || to_char(clock_timestamp() at time zone 'UTC', 'YYYYMMDDHH24MISSMS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  end if;

  new.request_id := coalesce(
    nullif(btrim(new.request_id), ''),
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

commit;
