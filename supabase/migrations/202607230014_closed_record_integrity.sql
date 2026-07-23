begin;

-- Cierra la posibilidad de mover datos desde un periodo de remuneraciones cerrado
-- hacia otro abierto mediante una actualización de la clave foránea.
create or replace function private.protect_payroll_period_child()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  old_period uuid;
  new_period uuid;
  old_state text;
  new_state text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    old_period := old.periodo_id;
    select estado into old_state from public.periodos_remuneraciones where id = old_period;
    if old_state = 'Cerrado' then
      raise exception 'CLOSED_PAYROLL_DATA_IMMUTABLE';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    new_period := new.periodo_id;
    select estado into new_state from public.periodos_remuneraciones where id = new_period;
    if new_state = 'Cerrado' then
      raise exception 'CLOSED_PAYROLL_DATA_IMMUTABLE';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.protect_payroll_period_child() from public, anon, authenticated;

create or replace function private.protect_payroll_detail()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  old_liquidation uuid;
  new_liquidation uuid;
  old_state text;
  new_state text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    old_liquidation := old.liquidacion_id;
    select p.estado into old_state
    from public.liquidaciones l
    join public.periodos_remuneraciones p on p.id = l.periodo_id
    where l.id = old_liquidation;
    if old_state = 'Cerrado' then
      raise exception 'CLOSED_PAYROLL_DETAIL_IMMUTABLE';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    new_liquidation := new.liquidacion_id;
    select p.estado into new_state
    from public.liquidaciones l
    join public.periodos_remuneraciones p on p.id = l.periodo_id
    where l.id = new_liquidation;
    if new_state = 'Cerrado' then
      raise exception 'CLOSED_PAYROLL_DETAIL_IMMUTABLE';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.protect_payroll_detail() from public, anon, authenticated;

-- Los periodos contables cerrados permanecen inalterables. Cualquier corrección
-- posterior debe registrarse mediante un asiento de ajuste en un periodo abierto.
create or replace function private.protect_accounting_period()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if tg_op = 'DELETE' then
    if old.estado = 'Cerrado' or exists (
      select 1 from public.asientos_contables where periodo_id = old.id
    ) then
      raise exception 'ACCOUNTING_PERIOD_IMMUTABLE';
    end if;
    return old;
  end if;

  if old.estado = 'Cerrado' then
    raise exception 'CLOSED_ACCOUNTING_PERIOD_IMMUTABLE';
  end if;

  if new.empresa_id is distinct from old.empresa_id
     or new.periodo is distinct from old.periodo then
    raise exception 'ACCOUNTING_PERIOD_IDENTITY_IMMUTABLE';
  end if;

  if new.estado = 'Cerrado' and exists (
    select 1
    from public.asientos_contables
    where periodo_id = old.id and estado = 'Borrador'
  ) then
    raise exception 'ACCOUNTING_PERIOD_HAS_DRAFT_ENTRIES';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_accounting_period() from public, anon, authenticated;

drop trigger if exists periodos_contables_protect_closed on public.periodos_contables;
create trigger periodos_contables_protect_closed
before update or delete on public.periodos_contables
for each row execute function private.protect_accounting_period();

-- Un asiento contabilizado o anulado no se edita ni elimina. Se corrige con un
-- asiento inverso o de ajuste, preservando el libro y su trazabilidad.
create or replace function private.protect_accounting_entry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  old_period_state text;
  new_period_state text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select estado into old_period_state from public.periodos_contables where id = old.periodo_id;
    if old_period_state = 'Cerrado' or old.estado in ('Contabilizado', 'Anulado') then
      raise exception 'POSTED_ACCOUNTING_ENTRY_IMMUTABLE';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select estado into new_period_state from public.periodos_contables where id = new.periodo_id;
    if new_period_state = 'Cerrado' then
      raise exception 'CLOSED_ACCOUNTING_PERIOD_IMMUTABLE';
    end if;
  end if;

  if tg_op = 'UPDATE' and (
    new.empresa_id is distinct from old.empresa_id
    or new.periodo_id is distinct from old.periodo_id
    or new.numero is distinct from old.numero
  ) then
    raise exception 'ACCOUNTING_ENTRY_IDENTITY_IMMUTABLE';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.protect_accounting_entry() from public, anon, authenticated;

drop trigger if exists asientos_contables_protect_posted on public.asientos_contables;
create trigger asientos_contables_protect_posted
before insert or update or delete on public.asientos_contables
for each row execute function private.protect_accounting_entry();

create or replace function private.protect_accounting_movement()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  old_entry_state text;
  new_entry_state text;
  old_period_state text;
  new_period_state text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select a.estado, p.estado into old_entry_state, old_period_state
    from public.asientos_contables a
    join public.periodos_contables p on p.id = a.periodo_id
    where a.id = old.asiento_id;
    if old_entry_state in ('Contabilizado', 'Anulado') or old_period_state = 'Cerrado' then
      raise exception 'POSTED_ACCOUNTING_MOVEMENT_IMMUTABLE';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select a.estado, p.estado into new_entry_state, new_period_state
    from public.asientos_contables a
    join public.periodos_contables p on p.id = a.periodo_id
    where a.id = new.asiento_id;
    if new_entry_state in ('Contabilizado', 'Anulado') or new_period_state = 'Cerrado' then
      raise exception 'POSTED_ACCOUNTING_MOVEMENT_IMMUTABLE';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.protect_accounting_movement() from public, anon, authenticated;

drop trigger if exists movimientos_contables_protect_posted on public.movimientos_contables;
create trigger movimientos_contables_protect_posted
before insert or update or delete on public.movimientos_contables
for each row execute function private.protect_accounting_movement();

create or replace function private.protect_tax_document()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  old_entry_state text;
  new_entry_state text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    if old.estado in ('Contabilizado', 'Anulado') then
      raise exception 'CLOSED_TAX_DOCUMENT_IMMUTABLE';
    end if;
    if old.asiento_id is not null then
      select estado into old_entry_state from public.asientos_contables where id = old.asiento_id;
      if old_entry_state in ('Contabilizado', 'Anulado') then
        raise exception 'CLOSED_TAX_DOCUMENT_IMMUTABLE';
      end if;
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.asiento_id is not null then
    select estado into new_entry_state from public.asientos_contables where id = new.asiento_id;
    if new_entry_state = 'Anulado' then
      raise exception 'INVALID_TAX_DOCUMENT_ENTRY';
    end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.protect_tax_document() from public, anon, authenticated;

drop trigger if exists documentos_tributarios_protect_closed on public.documentos_tributarios;
create trigger documentos_tributarios_protect_closed
before insert or update or delete on public.documentos_tributarios
for each row execute function private.protect_tax_document();

comment on function private.protect_accounting_period() is 'Impide alterar o eliminar periodos contables cerrados o con movimientos históricos.';
comment on function private.protect_accounting_entry() is 'Mantiene inmutables los asientos contabilizados o anulados.';
comment on function private.protect_accounting_movement() is 'Impide alterar movimientos pertenecientes a asientos contabilizados o periodos cerrados.';

commit;
