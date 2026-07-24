begin;

create table if not exists public.pagina_comercial_config (
  id text primary key default 'principal',
  hero_eyebrow text not null default 'Más de 30 años acompañando empresas',
  hero_title text not null default 'Contabilidad clara para tomar decisiones seguras.',
  hero_description text not null default 'Organizamos la gestión contable, tributaria, laboral y documental de su empresa para que tenga control, cumplimiento y acompañamiento profesional durante todo el año.',
  services_eyebrow text not null default 'Servicios',
  services_title text not null default 'Una sola firma para ordenar la gestión de su empresa',
  services_description text not null default 'Integramos contabilidad, impuestos, remuneraciones, trámites y asesoría profesional para entregar una respuesta completa y cercana.',
  team_eyebrow text not null default 'Nuestro equipo',
  team_title text not null default 'Profesionales comprometidos con la gestión de su empresa',
  team_description text not null default 'SERCOPREV organiza su trabajo por especialidades para responder con mayor rapidez y acompañar cada necesidad contable, tributaria y laboral.',
  reviews_eyebrow text not null default 'Experiencias de clientes',
  reviews_title text not null default 'Relaciones construidas con confianza y trabajo constante',
  reviews_description text not null default 'Testimonios de clientes que han confiado su gestión contable, tributaria y laboral a SERCOPREV.',
  reviews_enabled boolean not null default true,
  contact_title text not null default 'Conversemos sobre la situación real de su empresa.',
  contact_description text not null default 'Complete el formulario y nuestro equipo revisará el tipo de apoyo que necesita. También puede contactarnos directamente por teléfono, correo o WhatsApp.',
  footer_description text not null default 'Servicios contables, tributarios, laborales y empresariales para Pymes, con acompañamiento profesional y acceso digital seguro.',
  updated_at timestamptz not null default now()
);

create table if not exists public.pagina_comercial_servicios (
  id uuid primary key default gen_random_uuid(),
  icon text not null default 'briefcase',
  titulo text not null,
  descripcion text not null,
  items text[] not null default '{}'::text[],
  orden integer not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pagina_comercial_servicios_titulo_check check (char_length(titulo) between 2 and 160),
  constraint pagina_comercial_servicios_descripcion_check check (char_length(descripcion) between 2 and 1000),
  constraint pagina_comercial_servicios_icon_check check (icon in ('briefcase', 'users', 'building', 'shield', 'document', 'money', 'tasks', 'settings'))
);

create table if not exists public.pagina_comercial_equipo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  cargo text not null,
  profesion text,
  descripcion text,
  foto_path text,
  foto_alt text,
  orden integer not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pagina_comercial_equipo_nombre_check check (char_length(nombre) between 2 and 160),
  constraint pagina_comercial_equipo_cargo_check check (char_length(cargo) between 2 and 200)
);

create table if not exists public.pagina_comercial_resenas (
  id uuid primary key default gen_random_uuid(),
  nombre_cliente text not null,
  empresa text,
  cargo text,
  resena text not null,
  foto_path text,
  foto_alt text,
  calificacion smallint not null default 5,
  orden integer not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pagina_comercial_resenas_nombre_check check (char_length(nombre_cliente) between 2 and 160),
  constraint pagina_comercial_resenas_texto_check check (char_length(resena) between 10 and 2000),
  constraint pagina_comercial_resenas_calificacion_check check (calificacion between 1 and 5)
);

insert into public.pagina_comercial_config (id)
values ('principal')
on conflict (id) do nothing;

insert into public.pagina_comercial_servicios (icon, titulo, descripcion, items, orden)
select seed.icon, seed.titulo, seed.descripcion, seed.items, seed.orden
from (values
  ('document', 'Contabilidad e impuestos', 'Registros, libros auxiliares, declaraciones y estados financieros para mantener la empresa ordenada y cumplir sus obligaciones.', array[
    'Cálculo y declaración de IVA',
    'Confección de registros contables',
    'Libros auxiliares de ventas y compras',
    'Libros de inventarios y balances',
    'Libros auxiliares tributarios y otros registros',
    'Impuesto anual, devoluciones y justificación de gastos'
  ]::text[], 10),
  ('users', 'Remuneraciones y gestión laboral', 'Administración integral de contratos, pagos, cotizaciones y documentación laboral de cada trabajador.', array[
    'Contratos, anexos y finiquitos',
    'Liquidaciones de sueldo',
    'Presentación de licencias médicas',
    'Vacaciones y feriados legales',
    'Planillas y pago de cotizaciones previsionales',
    'Certificados laborales F30-1',
    'Libros auxiliares de remuneraciones y retenciones'
  ]::text[], 20),
  ('building', 'Trámites y puesta en marcha', 'Gestiones ante organismos públicos y apoyo para constituir, habilitar y mantener operativa una empresa.', array[
    'Trámites ante el Servicio de Impuestos Internos',
    'Trámites ante la Tesorería General de la República',
    'Gestiones ante municipalidades',
    'Tramitaciones ante Seremi de Salud',
    'Documentación contable y mercantil',
    'Formación y puesta en marcha de empresas'
  ]::text[], 30),
  ('shield', 'Asesoría y consultoría profesional', 'Orientación personalizada para resolver contingencias, reducir riesgos y tomar decisiones respaldadas.', array[
    'Contratación y término de relaciones laborales',
    'Pagos y planificación de impuestos',
    'Inversiones y justificación de gastos',
    'Temas tributarios y laborales',
    'Asistencia a comparendos laborales',
    'Consultorías y asesorías específicas'
  ]::text[], 40),
  ('money', 'Balances y estados financieros', 'Preparación de información financiera para conocer la situación y los resultados reales de la empresa.', array[
    'Balance general',
    'Balance clasificado',
    'Estado de resultados',
    'Estado de situación',
    'Declaración de renta de socios y empresa',
    'Informes contables especiales'
  ]::text[], 50)
) as seed(icon, titulo, descripcion, items, orden)
where not exists (select 1 from public.pagina_comercial_servicios);

insert into public.pagina_comercial_equipo (nombre, cargo, profesion, descripcion, orden)
select seed.nombre, seed.cargo, seed.profesion, seed.descripcion, seed.orden
from (values
  ('René G. Morales C.', 'Director Contable General', 'Contador General', 'Dirección de SERCOPREV, asesoría, consultoría y supervisión integral de la contabilidad general.', 10),
  ('Guillermo Paiguano', 'Equipo SERCOPREV', null, 'Cargo, profesión y responsabilidades disponibles para completar desde la configuración de la página comercial.', 20),
  ('José F. Quinchao G.', 'Encargado de Tramitaciones y Asesorías Específicas', 'Contador General', 'Tramitaciones ante el Servicio de Impuestos Internos, consultoría y asesorías específicas.', 30),
  ('Cristián Báez R.', 'Encargado de Impuestos Santiago y Provincias', 'Técnico en Contabilidad', 'Gestión tributaria y de impuestos para clientes de Santiago y regiones.', 40),
  ('Ilka Tarrazona', 'Encargada de Remuneraciones — Vega Central y otros clientes', 'Técnico en Contabilidad', 'Gestión de remuneraciones, documentación laboral y procesos previsionales de su cartera de clientes.', 50),
  ('Gabriela Gatica P.', 'Encargada de Remuneraciones — Santiago y Provincias', 'Contador General', 'Gestión de remuneraciones y procesos laborales para clientes de Santiago, regiones y otras carteras.', 60),
  ('Gisela J. Rosales Sepúlveda', 'Relaciones Públicas', 'Contador General', 'Relaciones públicas, coordinación y atención de requerimientos vinculados con clientes y la firma.', 70)
) as seed(nombre, cargo, profesion, descripcion, orden)
where not exists (select 1 from public.pagina_comercial_equipo);

create index if not exists pagina_comercial_servicios_orden_idx on public.pagina_comercial_servicios(activo, orden, titulo);
create index if not exists pagina_comercial_equipo_orden_idx on public.pagina_comercial_equipo(activo, orden, nombre);
create index if not exists pagina_comercial_resenas_orden_idx on public.pagina_comercial_resenas(activo, orden, created_at desc);

alter table public.pagina_comercial_config enable row level security;
alter table public.pagina_comercial_config force row level security;
alter table public.pagina_comercial_servicios enable row level security;
alter table public.pagina_comercial_servicios force row level security;
alter table public.pagina_comercial_equipo enable row level security;
alter table public.pagina_comercial_equipo force row level security;
alter table public.pagina_comercial_resenas enable row level security;
alter table public.pagina_comercial_resenas force row level security;

drop policy if exists pagina_comercial_config_public_select on public.pagina_comercial_config;
create policy pagina_comercial_config_public_select on public.pagina_comercial_config
for select to anon, authenticated using (id = 'principal');

drop policy if exists pagina_comercial_servicios_public_select on public.pagina_comercial_servicios;
create policy pagina_comercial_servicios_public_select on public.pagina_comercial_servicios
for select to anon, authenticated using (activo = true);

drop policy if exists pagina_comercial_equipo_public_select on public.pagina_comercial_equipo;
create policy pagina_comercial_equipo_public_select on public.pagina_comercial_equipo
for select to anon, authenticated using (activo = true);

drop policy if exists pagina_comercial_resenas_public_select on public.pagina_comercial_resenas;
create policy pagina_comercial_resenas_public_select on public.pagina_comercial_resenas
for select to anon, authenticated using (activo = true);

grant select on public.pagina_comercial_config to anon, authenticated;
grant select on public.pagina_comercial_servicios to anon, authenticated;
grant select on public.pagina_comercial_equipo to anon, authenticated;
grant select on public.pagina_comercial_resenas to anon, authenticated;
revoke insert, update, delete on public.pagina_comercial_config from anon, authenticated;
revoke insert, update, delete on public.pagina_comercial_servicios from anon, authenticated;
revoke insert, update, delete on public.pagina_comercial_equipo from anon, authenticated;
revoke insert, update, delete on public.pagina_comercial_resenas from anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'pagina_comercial_config',
    'pagina_comercial_servicios',
    'pagina_comercial_equipo',
    'pagina_comercial_resenas'
  ] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

do $$
declare
  item record;
  trigger_name text;
begin
  if to_regprocedure('private.capture_audit_change()') is not null then
    for item in select * from (values
      ('pagina_comercial_config', 'Página comercial'),
      ('pagina_comercial_servicios', 'Página comercial'),
      ('pagina_comercial_equipo', 'Página comercial'),
      ('pagina_comercial_resenas', 'Página comercial')
    ) as audited(table_name, module_name)
    loop
      trigger_name := 'audit_change_' || item.table_name;
      execute format('drop trigger if exists %I on public.%I', trigger_name, item.table_name);
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function private.capture_audit_change(%L)',
        trigger_name,
        item.table_name,
        item.module_name
      );
    end loop;
  end if;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pagina-comercial',
  'pagina-comercial',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists pagina_comercial_public_read on storage.objects;
create policy pagina_comercial_public_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'pagina-comercial');

commit;
