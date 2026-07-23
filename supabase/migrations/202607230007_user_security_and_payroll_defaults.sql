begin;

alter table public.usuarios_organizacion
  add column if not exists must_change_password boolean not null default true;

-- Los conceptos base se cargan por empresa mediante una acción administrativa,
-- porque su tratamiento puede variar y debe ser revisado antes de calcular.

create index if not exists usuarios_organizacion_password_idx
  on public.usuarios_organizacion(must_change_password)
  where activo = true;

commit;
