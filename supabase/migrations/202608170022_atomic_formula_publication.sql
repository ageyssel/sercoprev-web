begin;

create unique index if not exists formula_versions_one_published_idx
  on public.formula_versions(formula_id)
  where status = 'Publicada';

create or replace function public.publicar_version_formula(
  p_version_id uuid,
  p_actor_user_id uuid
)
returns table (
  formula_id uuid,
  version integer,
  effective_from date
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target public.formula_versions%rowtype;
  current_published public.formula_versions%rowtype;
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'FORBIDDEN';
  end if;

  select * into target
  from public.formula_versions
  where id = p_version_id
  for update;

  if target.id is null then
    raise exception 'FORMULA_VERSION_NOT_FOUND';
  end if;

  if target.status in ('Publicada', 'Reemplazada') then
    raise exception 'FORMULA_VERSION_NOT_PUBLISHABLE';
  end if;

  select * into current_published
  from public.formula_versions
  where formula_id = target.formula_id
    and status = 'Publicada'
    and id <> target.id
  for update;

  if current_published.id is not null then
    if target.effective_from <= current_published.effective_from then
      raise exception 'EFFECTIVE_DATE_MUST_FOLLOW_CURRENT_VERSION';
    end if;

    update public.formula_versions
    set
      status = 'Reemplazada',
      effective_to = target.effective_from - 1,
      updated_at = now()
    where id = current_published.id;
  end if;

  update public.formula_versions
  set
    status = 'Publicada',
    approved_by = p_actor_user_id,
    published_at = now(),
    effective_to = null,
    updated_at = now()
  where id = target.id;

  return query
  select target.formula_id, target.version, target.effective_from;
end;
$$;

revoke all on function public.publicar_version_formula(uuid, uuid) from public, anon, authenticated;
grant execute on function public.publicar_version_formula(uuid, uuid) to service_role;

commit;
