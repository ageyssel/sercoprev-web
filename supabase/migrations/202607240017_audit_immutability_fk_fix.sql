begin;

-- Un registro de auditoría no debe cambiar cuando se elimina una cuenta o una
-- empresa. Se conservan los UUID como evidencia histórica, sin cascadas que
-- intenten reescribir filas protegidas por el trigger de inmutabilidad.
alter table public.auditoria_eventos
  drop constraint if exists auditoria_eventos_actor_user_id_fkey,
  drop constraint if exists auditoria_eventos_empresa_id_fkey,
  drop constraint if exists auditoria_eventos_target_user_id_fkey;

commit;
