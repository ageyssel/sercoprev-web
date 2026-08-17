begin;

-- Evita división por cero incluso cuando IF evalúa sus argumentos de forma estricta.
update public.formula_definitions
set
  default_expression = 'ROUND((VARIABLE_EARNINGS_WEEK_RUN / MAX(WORKED_DAYS, 1)) * REST_DAYS * IF(WORKED_DAYS > 0, 1, 0))',
  updated_at = now()
where code = 'SEMANA_CORRIDA';

update public.formula_versions v
set
  expression = 'ROUND((VARIABLE_EARNINGS_WEEK_RUN / MAX(WORKED_DAYS, 1)) * REST_DAYS * IF(WORKED_DAYS > 0, 1, 0))',
  updated_at = now()
from public.formula_definitions d
where v.formula_id = d.id
  and d.code = 'SEMANA_CORRIDA'
  and v.version = 1
  and v.status = 'Publicada';

commit;
