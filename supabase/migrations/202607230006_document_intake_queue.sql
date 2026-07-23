begin;

create table if not exists public.archivos_ingesta (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes_documentales(id) on delete cascade,
  empresa_id uuid references public.empresas(id) on delete set null,
  documento_id uuid references public.documentos(id) on delete set null,
  nombre_original text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint,
  categoria_sugerida text not null default 'Sin clasificar',
  periodo_sugerido text,
  fecha_sugerida date,
  rut_detectado text,
  confianza smallint not null default 0,
  estado text not null default 'Revisión',
  razones jsonb not null default '[]'::jsonb,
  error_mensaje text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint archivos_ingesta_confianza_check check (confianza between 0 and 100),
  constraint archivos_ingesta_estado_check check (estado in ('Clasificado', 'Revisión', 'Rechazado', 'Error')),
  constraint archivos_ingesta_categoria_check check (categoria_sugerida in ('Impuestos', 'Remuneraciones', 'Legal', 'Contabilidad', 'Tributario', 'Laboral', 'Bancario', 'Contratos', 'Sin clasificar'))
);

create index if not exists archivos_ingesta_lote_estado_idx on public.archivos_ingesta(lote_id, estado);
create index if not exists archivos_ingesta_empresa_created_idx on public.archivos_ingesta(empresa_id, created_at desc);

alter table public.archivos_ingesta enable row level security;
alter table public.archivos_ingesta force row level security;
revoke all on table public.archivos_ingesta from anon;

drop policy if exists archivos_ingesta_admin_select on public.archivos_ingesta;
create policy archivos_ingesta_admin_select on public.archivos_ingesta for select to authenticated
using ((select private.is_admin()));

grant select on table public.archivos_ingesta to authenticated;
revoke insert, update, delete on table public.archivos_ingesta from authenticated;

commit;
