begin;

create table if not exists public.honorarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  periodo text not null,
  concepto text not null default 'Honorarios profesionales',
  monto numeric(14,2) not null,
  fecha_emision date,
  fecha_vencimiento date not null,
  estado text not null default 'Pendiente',
  fecha_pago date,
  documento_id uuid references public.documentos(id) on delete set null,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint honorarios_monto_check check (monto >= 0),
  constraint honorarios_estado_check check (estado in ('Pendiente', 'Pagado', 'Vencido', 'Anulado'))
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  creado_por uuid references auth.users(id) on delete set null,
  asunto text not null,
  categoria text not null default 'Consulta general',
  prioridad text not null default 'Media',
  estado text not null default 'Abierto',
  asignado_a text,
  ultimo_mensaje_at timestamptz not null default now(),
  cerrado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tickets_asunto_length check (char_length(asunto) between 3 and 180),
  constraint tickets_categoria_check check (categoria in ('Contabilidad', 'Impuestos', 'Remuneraciones', 'Documentos', 'Legal', 'Cobranza', 'Consulta general')),
  constraint tickets_prioridad_check check (prioridad in ('Baja', 'Media', 'Alta', 'Crítica')),
  constraint tickets_estado_check check (estado in ('Abierto', 'En revisión', 'Esperando cliente', 'Resuelto', 'Cerrado'))
);

create table if not exists public.ticket_mensajes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  autor_user_id uuid references auth.users(id) on delete set null,
  autor_tipo text not null,
  mensaje text not null,
  created_at timestamptz not null default now(),
  constraint ticket_mensajes_autor_check check (autor_tipo in ('Cliente', 'SERCOPREV')),
  constraint ticket_mensajes_length check (char_length(mensaje) between 1 and 5000)
);

create table if not exists public.contactos_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nombre text not null,
  cargo text,
  email text,
  telefono text,
  principal boolean not null default false,
  recibe_notificaciones boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contactos_nombre_length check (char_length(nombre) between 2 and 160)
);

create index if not exists honorarios_empresa_vencimiento_idx on public.honorarios(empresa_id, fecha_vencimiento desc);
create index if not exists honorarios_estado_vencimiento_idx on public.honorarios(estado, fecha_vencimiento);
create index if not exists tickets_empresa_estado_idx on public.tickets(empresa_id, estado, ultimo_mensaje_at desc);
create index if not exists tickets_estado_ultimo_idx on public.tickets(estado, ultimo_mensaje_at desc);
create index if not exists ticket_mensajes_ticket_created_idx on public.ticket_mensajes(ticket_id, created_at);
create index if not exists contactos_empresa_principal_idx on public.contactos_empresa(empresa_id, principal desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['honorarios', 'tickets', 'contactos_empresa']
  loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create or replace function private.touch_ticket_activity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.tickets
  set ultimo_mensaje_at = now(),
      estado = case when new.autor_tipo = 'Cliente' and estado in ('Resuelto', 'Cerrado') then 'Abierto' else estado end
  where id = new.ticket_id;
  return new;
end;
$$;

revoke all on function private.touch_ticket_activity() from public, anon;
grant execute on function private.touch_ticket_activity() to authenticated, service_role;

drop trigger if exists ticket_mensajes_touch_ticket on public.ticket_mensajes;
create trigger ticket_mensajes_touch_ticket
after insert on public.ticket_mensajes
for each row execute function private.touch_ticket_activity();

drop trigger if exists honorarios_touch_company on public.honorarios;
create trigger honorarios_touch_company
after insert or update or delete on public.honorarios
for each row execute function private.touch_company_activity();

drop trigger if exists tickets_touch_company on public.tickets;
create trigger tickets_touch_company
after insert or update or delete on public.tickets
for each row execute function private.touch_company_activity();

alter table public.honorarios enable row level security;
alter table public.honorarios force row level security;
alter table public.tickets enable row level security;
alter table public.tickets force row level security;
alter table public.ticket_mensajes enable row level security;
alter table public.ticket_mensajes force row level security;
alter table public.contactos_empresa enable row level security;
alter table public.contactos_empresa force row level security;

drop policy if exists honorarios_select_own_or_admin on public.honorarios;
create policy honorarios_select_own_or_admin on public.honorarios for select to authenticated
using (empresa_id = (select private.current_empresa_id()) or (select private.is_admin()));

drop policy if exists tickets_select_own_or_admin on public.tickets;
create policy tickets_select_own_or_admin on public.tickets for select to authenticated
using (empresa_id = (select private.current_empresa_id()) or (select private.is_admin()));

drop policy if exists ticket_mensajes_select_own_or_admin on public.ticket_mensajes;
create policy ticket_mensajes_select_own_or_admin on public.ticket_mensajes for select to authenticated
using (
  exists (
    select 1
    from public.tickets t
    where t.id = ticket_id
      and (t.empresa_id = (select private.current_empresa_id()) or (select private.is_admin()))
  )
);

drop policy if exists contactos_admin_select on public.contactos_empresa;
create policy contactos_admin_select on public.contactos_empresa for select to authenticated
using ((select private.is_admin()));

revoke all on table public.honorarios from anon;
revoke all on table public.tickets from anon;
revoke all on table public.ticket_mensajes from anon;
revoke all on table public.contactos_empresa from anon;

grant select on table public.honorarios to authenticated;
grant select on table public.tickets to authenticated;
grant select on table public.ticket_mensajes to authenticated;
grant select on table public.contactos_empresa to authenticated;

revoke insert, update, delete on table public.honorarios from authenticated;
revoke insert, update, delete on table public.tickets from authenticated;
revoke insert, update, delete on table public.ticket_mensajes from authenticated;
revoke insert, update, delete on table public.contactos_empresa from authenticated;

commit;
