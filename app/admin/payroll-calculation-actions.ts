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

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
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
  if (error) console.error('PAYROLL_FORMULA_AUDIT_FAILED', error.message)
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

type FormulaVersionRow = {
  version: number
  expression: string
  effective_from: string
  formula: { code: string } | Array<{ code: string }> | null
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

  if (error) {
    console.error('PAYROLL_FORMULA_LOAD_FAILED', error.message)
    return {}
  }

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

export async function calcularPeriodoConFormulas(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
  const periodoId = clean(formData.get('periodo_id'), 40)
  if (!UUID_PATTERN.test(periodoId)) throw new Error('INVALID_PERIOD')

  const { data: period, error: periodError } = await adminClient
    .from('periodos_remuneraciones')
    .select('id, empresa_id, periodo, parametros_id, estado')
    .eq('id', periodoId)
    .single()
  if (periodError || !period || period.estado === 'Cerrado') throw new Error('PERIOD_NOT_AVAILABLE')

  const [{ data: rawParams, error: paramsError }, formulas] = await Promise.all([
    adminClient.from('parametros_remuneraciones').select('*').eq('id', period.parametros_id).single(),
    loadPublishedFormulas(adminClient, String(period.periodo)),
  ])
  if (paramsError || !rawParams) throw new Error('PAYROLL_PARAMETERS_MISSING')

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

  const { data: workers, error: workersError } = await adminClient
    .from('trabajadores')
    .select('id, afp, salud_tipo, salud_plan_uf, afc_aplica')
    .eq('empresa_id', period.empresa_id)
    .eq('estado', 'Activo')
  if (workersError) throw workersError

  let calculated = 0
  let skipped = 0
  const warnings: Array<{ trabajador_id: string; warnings: string[] }> = []

  for (const worker of workers ?? []) {
    const [{ data: contract }, { data: rawMovements }, { data: novelty }] = await Promise.all([
      adminClient.from('contratos_trabajo').select('id, tipo, modalidad_pago, sueldo_base, gratificacion_tipo, colacion_diaria, movilizacion_diaria').eq('trabajador_id', worker.id).eq('estado', 'Vigente').order('fecha_inicio', { ascending: false }).limit(1).maybeSingle(),
      adminClient.from('movimientos_remuneracion').select('codigo, descripcion, monto, concepto:conceptos_remuneracion(naturaleza, imponible, tributable)').eq('periodo_id', periodoId).eq('trabajador_id', worker.id),
      adminClient.from('novedades_remuneraciones').select('*').eq('periodo_id', periodoId).eq('trabajador_id', worker.id).maybeSingle(),
    ])
    if (!contract) {
      skipped += 1
      continue
    }

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
      formulas,
    })

    if (result.warnings.length) warnings.push({ trabajador_id: worker.id, warnings: result.warnings })

    const { data: payslip, error: payslipError } = await adminClient.from('liquidaciones').upsert({
      periodo_id: periodoId,
      trabajador_id: worker.id,
      contrato_id: contract.id,
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

    await adminClient.from('liquidacion_detalles').delete().eq('liquidacion_id', payslip.id)
    if (result.details.length > 0) {
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

  const { error: periodUpdateError } = await adminClient
    .from('periodos_remuneraciones')
    .update({ estado: 'Calculado', calculado_at: new Date().toISOString() })
    .eq('id', periodoId)
  if (periodUpdateError) throw periodUpdateError

  await audit(adminClient, actorUserId, {
    empresaId: period.empresa_id,
    entidadId: periodoId,
    metadata: {
      periodo: period.periodo,
      calculadas: calculated,
      omitidas_sin_contrato: skipped,
      formulas_publicadas: Object.keys(formulas).length,
      advertencias: warnings,
    },
  })

  revalidatePath('/admin/remuneraciones')
  revalidatePath('/admin/remuneraciones/gestion')
  revalidatePath('/admin/remuneraciones/periodos')
}
