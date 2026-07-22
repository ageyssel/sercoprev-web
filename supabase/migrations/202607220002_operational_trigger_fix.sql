begin;

create or replace function private.touch_company_activity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_empresa_id uuid;
begin
  if tg_op = 'DELETE' then
    target_empresa_id := old.empresa_id;
  else
    target_empresa_id := new.empresa_id;
  end if;

  if target_empresa_id is not null then
    update public.empresas
    set ultima_actividad_at = now()
    where id = target_empresa_id;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.touch_company_activity() from public, anon;
grant execute on function private.touch_company_activity() to authenticated, service_role;

commit;
