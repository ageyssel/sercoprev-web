-- EJECUCIÓN MANUAL Y ÚNICA
-- 1. Cree primero el usuario administrador en Authentication > Users.
-- 2. Reemplace los tres valores marcados y ejecute este script en SQL Editor.
-- 3. No guarde contraseñas ni claves privadas en este archivo.

do $$
declare
  admin_email text := 'REEMPLAZAR_CORREO_ADMIN';
  admin_rut text := 'REEMPLAZAR_RUT';
  admin_name text := 'SERCOPREV ADMIN';
  admin_user_id uuid;
begin
  select id
    into admin_user_id
  from auth.users
  where lower(email) = lower(admin_email)
  limit 1;

  if admin_user_id is null then
    raise exception 'No existe un usuario Auth con el correo %', admin_email;
  end if;

  insert into public.empresas (
    user_id,
    rut,
    razon_social,
    estado_impuestos,
    es_admin,
    must_change_password
  )
  values (
    admin_user_id,
    admin_rut,
    admin_name,
    'Administración',
    true,
    false
  )
  on conflict (user_id) do update
    set rut = excluded.rut,
        razon_social = excluded.razon_social,
        estado_impuestos = excluded.estado_impuestos,
        es_admin = true,
        must_change_password = false;
end
$$;
