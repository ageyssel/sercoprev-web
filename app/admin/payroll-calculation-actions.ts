'use server'

import { revalidatePath } from 'next/cache'
import {
  calculatePayroll,
  type PayrollFormulaExpressions,
  type PayrollMovement,
  type PayrollParameters,
  type PayrollTaxBracket,
} from '@/lib/payroll'
import { requireAdmin } from '@/utils/supabase/require-admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REQUIRED_FORMULA_CODES = [
  'SUELDO_BASE_PAGADO',
  'SEMANA_CORRIDA',
  'GRATIFICACION',
  'ASIGNACIONES_DIARIAS',
  'TOTAL_IMPONIBLE',
  'TOTAL_TRIBUTABLE',
  'TOTAL_NO_IMPONIBLE',
  'BASE_AFP',
  'BASE_SALUD',
  'BASE_AFC',
  'AFP_TRABAJADOR',
  'SALUD_LEGAL',
  'SALUD_TRABAJADOR',
  'AFC_TRABAJADOR',
  'AFC_EMPLEADOR',
  'SIS_EMPLEADOR',
  'BASE_IMPUESTO',
  'IMPUESTO_UNICO',
  'APORTES_EMPLEADOR',
  'LIQUIDO_PAGAR',
] as const

type PayrollCalculationStage =
  | 'carga_periodo'
  | 'carga_parametros'
  | 'carga_trabajadores'
  | 'carga_contratos'
  | 'carga_formulas'
  | 'evaluacion'
  | 'persistencia'

type DiagnosticContext = {
  stage: PayrollCalculationStage
  periodoId: string | null
  trabajadorId: string | null
  operation: string | null
}

type FormulaDiagnosticContext = {
  code: string | null
  version: number | null
}

type FormulaVersionRow = {
  version: number
  expression: string
  effective_from: string
  formula: { code: string } | Array<{ code: string }> | null
}

type ContractRow = {
  id: string
  tipo: 'Indefinido' | 'Plazo fijo' | 'Obra o faena' | 'Honorarios'
  modalidad_pago: 'Mensual' | 'Diaria' | 'Por hora'
  sueldo_base: number | string
  gratificacion_tipo: string
  colacion_diaria: number | string
  movilizacion_diaria: number | string
}

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

function errorDetails(error: unknown) {
  const record = typeof error === 'object' && error !== null ? error as Record<string, unknown> : {}
  const message = error instanceof Error
    ? error.message
    : typeof record.message === 'string'
      ? record.message
      : String(error)
  const detail = typeof record.details === 'string'
    ? record.details
    : typeof record.detail === 'string'
      ? record.detail
      : null

  return {
    code: typeof record.code === 'string' ? record.code : null,
    message,
    detail,
    hint: typeof record.hint === 'string' ? record.hint : null,
    stack: error instanceof Error ? error.stack ?? null : typeof record.stack === 'string' ? record.stack : null,
  }
}

function logCalculationError(
  event: string,
  context: DiagnosticContext,
  formula: FormulaDiagnosticContext,
  error: unknown,
) {
  console.error(event, {
    stage: context.stage,
    periodo_id: context.periodoId,
    trabajador_id: context.trabajadorId,
    operation: context.operation,
    formula_code: formula.code,
    formula_version: formula.version,
    error: errorDetails(error),
  })
}

function validationFailure(
  context: DiagnosticContext,
  formula: FormulaDiagnosticContext,
  message: string,
) {
  console.error('PAYROLL_CALCULATION_VALIDATION_FAILED', {
    stage: context.stage,
    periodo_id: context.periodoId,
    trabajador_id: context.trabajadorId,
    operation: context.operation,
    formula_code: formula.code,
    formula_version: formula.version,
    user_message: message,
  })
}

function stageLabel(stage: PayrollCalculationStage) {
  const labels: Record<PayrollCalculationStage, string> = {
    carga_periodo: 'la carga del período',
    carga_parametros: 'la carga de parámetros',
    carga_trabajadores: 'la carga de trabajadores',
    carga_contratos: 'la carga de contratos',
    carga_formulas: 'la carga de fórmulas',
    evaluacion: 'la evaluación de fórmulas',
    persistencia: 'la persistencia del cálculo',
  }
  return labels[stage]
}

function finiteNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function parameterValidationMessage(raw: Record<string, unknown>) {
  const positiveFields = [
    ['uf', 'UF'],
    ['utm', 'UTM'],
    ['ingreso_minimo', 'ingreso mínimo'],
    ['tope_afp_uf', 'tope AFP'],
    ['tope_salud_uf', 'tope salud'],
    ['tope_afc_uf', 'tope AFC'],
  ] as const
  for (const [field, label] of positiveFields) {
    const value = finiteNumber(raw[field])
    if (value === null || value <= 0) return `Los parámetros del período están incompletos: ${label} no tiene un valor válido mayor que cero.`
  }

  const rateFields = [
    ['tasa_salud', 'tasa de salud'],
    ['tasa_sis_empleador', 'tasa SIS empleador'],
    ['tasa_afc_trabajador_indefinido', 'tasa AFC trabajador indefinido'],
    ['tasa_afc_empleador_indefinido', 'tasa AFC empleador indefinido'],
    ['tasa_afc_empleador_plazo', 'tasa AFC empleador plazo'],
  ] as const
  for (const [field, label] of rateFields) {
    const value = finiteNumber(raw[field])
    if (value === null || value < 0 || value > 1) return `Los parámetros del período están incompletos: ${label} debe ser un decimal válido entre 0 y 1.`
  }

  const afpRates = raw.tasas_afp
  if (!afpRates || typeof afpRates !== 'object' || Array.isArray(afpRates)) {
    return 'Los parámetros del período están incompletos: no existe una tabla válida de tasas AFP.'
  }
  const afpEntries = Object.entries(afpRates as Record<string, unknown>)
  if (afpEntries.length === 0) return 'Los parámetros del período están incompletos: no hay tasas AFP configuradas.'
  for (const [name, rawRate] of afpEntries) {
    const rate = finiteNumber(rawRate)
    if (rate === null || rate <= 0 || rate > 1) return `Los parámetros del período están incompletos: la tasa AFP ${name} no es válida.`
  }

  const brackets = raw.impuesto_segunda_categoria
  if (!Array.isArray(brackets) || brackets.length !== 8) {
    return 'Los parámetros del período están incompletos: deben existir los ocho tramos mensuales de Impuesto Único.'
  }
  for (let index = 0; index < brackets.length; index += 1) {
    const bracket = brackets[index]
    if (!bracket || typeof bracket !== 'object' || Array.isArray(bracket)) {
      return `Los parámetros del período están incompletos: el tramo ${index + 1} de Impuesto Único no es válido.`
    }
    const row = bracket as Record<string, unknown>
    const from = finiteNumber(row.from)
    const factor = finiteNumber(row.factor)
    const rebate = finiteNumber(row.rebate)
    const to = row.to === null ? null : finiteNumber(row.to)
    if (from === null || factor === null || rebate === null || (row.to !== null && to === null)) {
      return `Los parámetros del período están incompletos: el tramo ${index + 1} de Impuesto Único contiene valores inválidos.`
    }
  }

  return null
}

function trackFormulaReads(formulas: PayrollFormulaExpressions, diagnostic: FormulaDiagnosticContext): PayrollFormulaExpressions {
  return new Proxy(formulas, {
    get(target, property, receiver) {
      if (typeof property === 'string' && Object.prototype.hasOwnProperty.call(target, property)) {
        const candidate = target[property]
        diagnostic.code = property
        diagnostic.version = typeof candidate === 'string' ? null : candidate?.version ?? null
      }
      return Reflect.get(target, property, receiver)
    },
  })
}

function logFormulaFallbacks(
  periodoId: string,
  trabajadorId: string,
  formulas: PayrollFormulaExpressions,
  result: ReturnType<typeof calculatePayroll>,
) {
  for (const [code, trace] of Object.entries(result.formulaTrace)) {
    if (trace.source !== 'base' || !formulas[code]) continue
    const configured = formulas[code]
    const version = typeof configured === 'string' ? null : configured.version ?? null
    const warning = result.warnings.find((item) => item.includes(`fórmula publicada ${code}`)) ?? 'La fórmula publicada cayó a la fórmula base de seguridad.'
    console.error('PAYROLL_FORMULA_EVALUATION_FALLBACK', {
      stage: 'evaluacion',
      periodo_id: periodoId,
      trabajador_id: trabajadorId,
      operation: 'calculatePayroll',
      formula_code: code,
      formula_version: version,
      error: { code: null, message: warning, detail: null, hint: null, stack: null },
    })
  }
}

async function audit(
  adminClient: Awaited<ReturnType<typeof requireAdmin>>['adminClient'],
  actorUserId: string,
  input: { empresaId: string; entidadId: string; metadata: Record<string, unknown> },
) {
  const { error } = await adminClient.from('auditoria_eventos').insert({
    actor_user_id: actorUserId,
    empresa_id: input.empresaId,
    accion: 'calcular',
    entidad: 'periodo_remuneraciones',
    entidad_id: input.entidadId,
    module: 'Remuneraciones',
    description: 'Cálculo de periodo de remuneraciones con fórmulas versionadas',
    metadata: input.metadata,
  })
  if (error) {
    logCalculationError(
      'PAYROLL_FORMULA_AUDIT_FAILED',
      { stage: 'persistencia', periodoId: input.entidadId, trabajadorId: null, operation: 'auditoria_eventos.insert' },
      { code: null, version: null },
      error,
    )
  }
}

function automaticNoveltyMovements(novelty: Record<string, unknown> | null): PayrollMovement[] {
  if (!novelty) return []
  const rows: PayrollMovement[] = []
  const add = (code: string, description: string, nature: PayrollMovement['nature'], amount: number, taxable: boolean, incomeTaxable: boolean) => {
    if (Number.isFinite(amount) && amount > 0) rows.push({ code, description, nature, amount, taxable, incomeTaxable })
  }
  add('HORAS_50', `Horas extraordinarias 50% (${Number(novelty.horas_extra_50 ?? 0)} h)`, 'Haber', Number(novelty.monto_horas_extra_50 ?? 0), true, true)
  add('HORAS_100', `Horas extraordinarias 100% (${Number(novelty.horas_extra_100 ?? 0)} h)`, 'Haber', Number(novelty.monto_horas_extra_100 ?? 0), true, true)
  add('BONO_IMP', 'Bonos imponibles del periodo', 'Haber', Number(novelty.bonos_imponibles ?? 0), true, true)
  add('BONO_NO_IMP', 'Bonos no imponibles del periodo', 'Haber', Number(novelty.bonos_no_imponibles ?? 0), false, false)
  add('OTRO_DESC', 'Descuentos adicionales del periodo', 'Descuento', Number(novelty.descuentos_adicionales ?? 0), false, false)
  return rows
}

async function loadPublishedFormulas(
  adminClient: Awaited<ReturnType<typeof requireAdmin>>['adminClient'],
  period: string,
): Promise<PayrollFormulaExpressions> {
  const { data, error } = await adminClient
    .from('formula_versions')
    .select('version, expression, effective_from, formula:formula_definitions(code)')
    .eq('status', 'Publicada')
    .lte('effective_from', period)
    .or(`effective_to.is.null,effective_to.gte.${period}`)
    .order('version', { ascending: false })

  if (error) throw error

  const formulas: PayrollFormulaExpressions = {}
  for (const row of (data ?? []) as unknown as FormulaVersionRow[]) {
    const relation = Array.isArray(row.formula) ? row.formula[0] : row.formula
    const code = relation?.code
    if (!code || formulas[code]) continue
    formulas[code] = {
      expression: row.expression,
      version: Number(row.version),
      effectiveFrom: row.effective_from,
    }
  }
  return formulas
}

export async function calcularPeriodoConFormulas(formData: FormData): Promise<void> {
  const context: DiagnosticContext = {
    stage: 'carga_periodo',
    periodoId: null,
    trabajadorId: null,
    operation: 'requireAdmin',
  }
  const formulaDiagnostic: FormulaDiagnosticContext = { code: null, version: null }

  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
    const periodoId = clean(formData.get('periodo_id'), 40)
    context.periodoId = periodoId || null
    context.operation = 'periodos_remuneraciones.select'
    if (!UUID_PATTERN.test(periodoId)) {
      return validationFailure(context, formulaDiagnostic, 'El período seleccionado no es válido.')
    }

    context.stage = 'carga_periodo'
    const { data: period, error: periodError } = await adminClient
      .from('periodos_remuneraciones')
      .select('id, empresa_id, periodo, parametros_id, estado')
      .eq('id', periodoId)
      .maybeSingle()
    if (periodError) throw periodError
    if (!period) return validationFailure(context, formulaDiagnostic, 'El período de remuneraciones no fue encontrado.')
    if (period.estado === 'Cerrado') return validationFailure(context, formulaDiagnostic, 'El período de remuneraciones está cerrado y no puede recalcularse.')
    if (!period.parametros_id) {
      context.stage = 'carga_parametros'
      context.operation = 'periodos_remuneraciones.parametros_id'
      return validationFailure(context, formulaDiagnostic, 'El período no tiene parámetros legales asociados. Configure y vincule los parámetros antes de calcular.')
    }

    context.stage = 'carga_parametros'
    context.operation = 'parametros_remuneraciones.select'
    const { data: rawParams, error: paramsError } = await adminClient
      .from('parametros_remuneraciones')
      .select('*')
      .eq('id', period.parametros_id)
      .maybeSingle()
    if (paramsError) throw paramsError
    if (!rawParams) return validationFailure(context, formulaDiagnostic, 'No se encontraron los parámetros legales asociados al período.')

    const parameterProblem = parameterValidationMessage(rawParams as Record<string, unknown>)
    if (parameterProblem) return validationFailure(context, formulaDiagnostic, parameterProblem)

    const parameters: PayrollParameters = {
      uf: Number(rawParams.uf),
      ingresoMinimo: Number(rawParams.ingreso_minimo),
      topeAfpUf: Number(rawParams.tope_afp_uf),
      topeSaludUf: Number(rawParams.tope_salud_uf),
      topeAfcUf: Number(rawParams.tope_afc_uf),
      tasaSalud: Number(rawParams.tasa_salud),
      tasaSisEmpleador: Number(rawParams.tasa_sis_empleador),
      tasaAfcTrabajadorIndefinido: Number(rawParams.tasa_afc_trabajador_indefinido),
      tasaAfcEmpleadorIndefinido: Number(rawParams.tasa_afc_empleador_indefinido),
      tasaAfcEmpleadorPlazo: Number(rawParams.tasa_afc_empleador_plazo),
      tasasAfp: (rawParams.tasas_afp ?? {}) as Record<string, number>,
      impuestoSegundaCategoria: (rawParams.impuesto_segunda_categoria ?? []) as PayrollTaxBracket[],
    }

    context.stage = 'carga_formulas'
    context.operation = 'formula_versions.select'
    const formulas = await loadPublishedFormulas(adminClient, String(period.periodo))
    const missingFormulaCodes = REQUIRED_FORMULA_CODES.filter((code) => !formulas[code])
    if (missingFormulaCodes.length > 0) {
      formulaDiagnostic.code = missingFormulaCodes[0]
      formulaDiagnostic.version = null
      return validationFailure(
        context,
        formulaDiagnostic,
        `Falta una versión publicada vigente para ${missingFormulaCodes.length === 1 ? 'la fórmula' : 'las fórmulas'} ${missingFormulaCodes.join(', ')} en el período ${String(period.periodo).slice(0, 7)}.`,
      )
    }

    context.stage = 'carga_trabajadores'
    context.operation = 'trabajadores.select'
    formulaDiagnostic.code = null
    formulaDiagnostic.version = null
    const { data: workers, error: workersError } = await adminClient
      .from('trabajadores')
      .select('id, afp, salud_tipo, salud_plan_uf, afc_aplica')
      .eq('empresa_id', period.empresa_id)
      .eq('estado', 'Activo')
    if (workersError) throw workersError
    const activeWorkers = workers ?? []
    if (activeWorkers.length === 0) return validationFailure(context, formulaDiagnostic, 'No existen trabajadores activos para calcular en este período.')

    for (const worker of activeWorkers) {
      if (worker.afp && parameters.tasasAfp[worker.afp] === undefined) {
        context.trabajadorId = worker.id
        return validationFailure(context, formulaDiagnostic, `Los parámetros del período están incompletos: no existe una tasa configurada para la AFP ${worker.afp} del trabajador ${worker.id}.`)
      }
    }

    const contracts = new Map<string, ContractRow>()
    for (const worker of activeWorkers) {
      context.stage = 'carga_contratos'
      context.trabajadorId = worker.id
      context.operation = 'contratos_trabajo.select'
      const { data: contract, error: contractError } = await adminClient
        .from('contratos_trabajo')
        .select('id, tipo, modalidad_pago, sueldo_base, gratificacion_tipo, colacion_diaria, movilizacion_diaria')
        .eq('trabajador_id', worker.id)
        .eq('estado', 'Vigente')
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (contractError) throw contractError
      if (!contract) {
        return validationFailure(
          context,
          formulaDiagnostic,
          `El trabajador ${worker.id} no tiene un contrato vigente disponible para el período ${String(period.periodo).slice(0, 7)}.`,
        )
      }
      contracts.set(worker.id, contract as ContractRow)
    }

    let calculated = 0
    const warnings: Array<{ trabajador_id: string; warnings: string[] }> = []

    for (const worker of activeWorkers) {
      const contract = contracts.get(worker.id)
      if (!contract) {
        context.stage = 'carga_contratos'
        context.trabajadorId = worker.id
        context.operation = 'contratos_cache'
        return validationFailure(context, formulaDiagnostic, `No fue posible resolver el contrato vigente del trabajador ${worker.id}.`)
      }

      context.stage = 'carga_trabajadores'
      context.trabajadorId = worker.id
      context.operation = 'movimientos_remuneracion+novedades_remuneraciones.select'
      const [movementsResult, noveltyResult] = await Promise.all([
        adminClient.from('movimientos_remuneracion').select('codigo, descripcion, monto, concepto:conceptos_remuneracion(naturaleza, imponible, tributable)').eq('periodo_id', periodoId).eq('trabajador_id', worker.id),
        adminClient.from('novedades_remuneraciones').select('*').eq('periodo_id', periodoId).eq('trabajador_id', worker.id).maybeSingle(),
      ])
      if (movementsResult.error) {
        context.operation = 'movimientos_remuneracion.select'
        throw movementsResult.error
      }
      if (noveltyResult.error) {
        context.operation = 'novedades_remuneraciones.select'
        throw noveltyResult.error
      }
      const rawMovements = movementsResult.data
      const novelty = noveltyResult.data

      context.stage = 'evaluacion'
      context.operation = 'calculatePayroll'
      formulaDiagnostic.code = null
      formulaDiagnostic.version = null
      const manualMovements: PayrollMovement[] = (rawMovements ?? []).map((row) => {
        const relation = row.concepto as unknown as { naturaleza: PayrollMovement['nature']; imponible: boolean; tributable: boolean } | Array<{ naturaleza: PayrollMovement['nature']; imponible: boolean; tributable: boolean }> | null
        const concept = Array.isArray(relation) ? relation[0] : relation
        return {
          code: row.codigo,
          description: row.descripcion,
          nature: concept?.naturaleza ?? 'Haber',
          amount: Number(row.monto),
          taxable: Boolean(concept?.imponible),
          incomeTaxable: Boolean(concept?.tributable),
        }
      })

      const result = calculatePayroll({
        salaryBase: Number(contract.sueldo_base),
        contractType: contract.tipo,
        paymentMode: contract.modalidad_pago,
        gratificationType: contract.gratificacion_tipo,
        workedDays: Number(novelty?.dias_trabajados ?? 30),
        restDays: Number(novelty?.dias_descanso ?? 0),
        variableEarningsForWeekRun: Number(novelty?.haberes_semana_corrida ?? 0),
        dailyMealAllowance: Number(contract.colacion_diaria),
        dailyTransportAllowance: Number(contract.movilizacion_diaria),
        afp: worker.afp,
        healthType: worker.salud_tipo,
        healthPlanUf: worker.salud_plan_uf ? Number(worker.salud_plan_uf) : null,
        unemploymentInsuranceApplies: worker.afc_aplica,
        movements: [...manualMovements, ...automaticNoveltyMovements(novelty as Record<string, unknown> | null)],
        parameters,
        formulas: trackFormulaReads(formulas, formulaDiagnostic),
      })

      logFormulaFallbacks(periodoId, worker.id, formulas, result)
      if (result.warnings.length) warnings.push({ trabajador_id: worker.id, warnings: result.warnings })

      context.stage = 'persistencia'
      context.operation = 'liquidaciones.upsert'
      formulaDiagnostic.code = null
      formulaDiagnostic.version = null
      const { data: payslip, error: payslipError } = await adminClient.from('liquidaciones').upsert({
        periodo_id: periodoId,
        trabajador_id: worker.id,
        sueldo_base: result.salaryBasePaid,
        total_imponible: result.taxableEarnings,
        total_tributable: result.incomeTaxableEarnings,
        total_no_imponible: result.nonTaxableEarnings,
        descuentos_legales: result.afpWorker + result.healthWorker + result.unemploymentWorker + result.incomeTax,
        otros_descuentos: result.otherDeductions,
        aportes_empleador: result.employerContributions,
        liquido_pagar: result.netPay,
        estado: 'Calculada',
        calculo: { ...result, novedad: novelty ?? null, formula_versions: formulas },
      }, { onConflict: 'periodo_id,trabajador_id' }).select('id').single()
      if (payslipError) throw payslipError

      context.operation = 'liquidacion_detalles.delete'
      const { error: deleteDetailsError } = await adminClient.from('liquidacion_detalles').delete().eq('liquidacion_id', payslip.id)
      if (deleteDetailsError) throw deleteDetailsError

      if (result.details.length > 0) {
        context.operation = 'liquidacion_detalles.insert'
        const { error: detailsError } = await adminClient.from('liquidacion_detalles').insert(result.details.map((detail, index) => ({
          liquidacion_id: payslip.id,
          codigo: detail.code,
          descripcion: detail.description,
          naturaleza: detail.nature,
          imponible: ['SUELDO_BASE', 'GRATIFICACION', 'SEMANA_CORRIDA', 'HORAS_50', 'HORAS_100', 'BONO_IMP', 'COMISION'].includes(detail.code),
          tributable: ['SUELDO_BASE', 'GRATIFICACION', 'SEMANA_CORRIDA', 'HORAS_50', 'HORAS_100', 'BONO_IMP', 'COMISION'].includes(detail.code),
          monto: detail.amount,
          orden: index,
        })))
        if (detailsError) throw detailsError
      }
      calculated += 1
    }

    context.stage = 'persistencia'
    context.trabajadorId = null
    context.operation = 'periodos_remuneraciones.update'
    formulaDiagnostic.code = null
    formulaDiagnostic.version = null
    const { error: periodUpdateError } = await adminClient
      .from('periodos_remuneraciones')
      .update({ estado: 'Calculado', calculado_at: new Date().toISOString() })
      .eq('id', periodoId)
    if (periodUpdateError) throw periodUpdateError

    context.operation = 'auditoria_eventos.insert'
    await audit(adminClient, actorUserId, {
      empresaId: period.empresa_id,
      entidadId: periodoId,
      metadata: {
        periodo: period.periodo,
        calculadas: calculated,
        omitidas_sin_contrato: 0,
        formulas_publicadas: Object.keys(formulas).length,
        advertencias: warnings,
      },
    })

    context.operation = 'revalidatePath'
    revalidatePath('/admin/remuneraciones')
    revalidatePath('/admin/remuneraciones/gestion')
    revalidatePath('/admin/remuneraciones/periodos')
  } catch (error) {
    logCalculationError('PAYROLL_CALCULATION_FAILED', context, formulaDiagnostic, error)
    validationFailure(
      context,
      formulaDiagnostic,
      `No fue posible calcular la nómina durante ${stageLabel(context.stage)}. El error técnico quedó registrado en el Worker para diagnóstico.`,
    )
  }
}
