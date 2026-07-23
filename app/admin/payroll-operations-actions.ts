'use server'

import { revalidatePath } from 'next/cache'
import {
  calculatePayroll,
  calculateTerminationDraft,
  type PayrollMovement,
  type PayrollParameters,
  type PayrollTaxBracket,
} from '@/lib/payroll'
import { notifyCompany } from '@/lib/notifications'
import { requireAdmin } from '@/utils/supabase/require-admin'
import type { PayrollActionState } from '@/app/admin/payroll-actions'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

function numberValue(value: unknown, fallback = 0) {
  const text = clean(value, 60).replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')
  const number = text ? Number(text) : fallback
  return Number.isFinite(number) ? number : Number.NaN
}

function dateValue(value: unknown) {
  const text = clean(value, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
}

async function audit(
  adminClient: Awaited<ReturnType<typeof requireAdmin>>['adminClient'],
  actorUserId: string,
  input: { empresaId: string; accion: string; entidad: string; entidadId?: string | null; metadata?: Record<string, unknown> },
) {
  await adminClient.from('auditoria_eventos').insert({
    actor_user_id: actorUserId,
    empresa_id: input.empresaId,
    accion: input.accion,
    entidad: input.entidad,
    entidad_id: input.entidadId ?? null,
    metadata: input.metadata ?? {},
  })
}

const BASE_CONCEPTS = [
  { codigo: 'BONO_IMP', nombre: 'Bono imponible', naturaleza: 'Haber', imponible: true, tributable: true },
  { codigo: 'BONO_NO_IMP', nombre: 'Bono no imponible', naturaleza: 'Haber', imponible: false, tributable: false },
  { codigo: 'HORAS_50', nombre: 'Horas extraordinarias 50%', naturaleza: 'Haber', imponible: true, tributable: true },
  { codigo: 'HORAS_100', nombre: 'Horas extraordinarias 100%', naturaleza: 'Haber', imponible: true, tributable: true },
  { codigo: 'COMISION', nombre: 'Comisión', naturaleza: 'Haber', imponible: true, tributable: true },
  { codigo: 'ASIG_FAMILIAR', nombre: 'Asignación familiar', naturaleza: 'Haber', imponible: false, tributable: false },
  { codigo: 'ANTICIPO', nombre: 'Anticipo de remuneración', naturaleza: 'Descuento', imponible: false, tributable: false },
  { codigo: 'PRESTAMO', nombre: 'Cuota de préstamo', naturaleza: 'Descuento', imponible: false, tributable: false },
  { codigo: 'OTRO_DESC', nombre: 'Otro descuento autorizado', naturaleza: 'Descuento', imponible: false, tributable: false },
] as const

export async function crearConceptosBase(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
  const empresaId = clean(formData.get('empresa_id'), 40)
  if (!UUID_PATTERN.test(empresaId)) throw new Error('INVALID_COMPANY')

  const { error } = await adminClient.from('conceptos_remuneracion').upsert(
    BASE_CONCEPTS.map((concept) => ({
      empresa_id: empresaId,
      codigo: concept.codigo,
      nombre: concept.nombre,
      naturaleza: concept.naturaleza,
      imponible: concept.imponible,
      tributable: concept.tributable,
      afecta_semana_corrida: concept.codigo === 'COMISION',
      activo: true,
    })),
    { onConflict: 'empresa_id,codigo' },
  )
  if (error) throw error
  await audit(adminClient, actorUserId, { empresaId, accion: 'crear_base', entidad: 'conceptos_remuneracion', metadata: { total: BASE_CONCEPTS.length } })
  revalidatePath('/admin/remuneraciones')
}

export async function guardarNovedadMensual(
  _state: PayrollActionState,
  formData: FormData,
): Promise<PayrollActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
    const periodoId = clean(formData.get('periodo_id'), 40)
    const trabajadorId = clean(formData.get('trabajador_id'), 40)
    if (!UUID_PATTERN.test(periodoId) || !UUID_PATTERN.test(trabajadorId)) return { status: 'error', message: 'Seleccione periodo y trabajador.' }

    const numeric = {
      dias_trabajados: numberValue(formData.get('dias_trabajados'), 30),
      dias_descanso: numberValue(formData.get('dias_descanso')),
      dias_ausencia: numberValue(formData.get('dias_ausencia')),
      dias_vacaciones: numberValue(formData.get('dias_vacaciones')),
      dias_licencia: numberValue(formData.get('dias_licencia')),
      horas_extra_50: numberValue(formData.get('horas_extra_50')),
      horas_extra_100: numberValue(formData.get('horas_extra_100')),
      monto_horas_extra_50: numberValue(formData.get('monto_horas_extra_50')),
      monto_horas_extra_100: numberValue(formData.get('monto_horas_extra_100')),
      haberes_semana_corrida: numberValue(formData.get('haberes_semana_corrida')),
      bonos_imponibles: numberValue(formData.get('bonos_imponibles')),
      bonos_no_imponibles: numberValue(formData.get('bonos_no_imponibles')),
      descuentos_adicionales: numberValue(formData.get('descuentos_adicionales')),
    }
    if (Object.values(numeric).some((value) => Number.isNaN(value) || value < 0)) return { status: 'error', message: 'Revise días, horas y montos.' }
    if (numeric.dias_trabajados > 31 || numeric.dias_descanso > 31 || numeric.dias_ausencia > 31 || numeric.dias_vacaciones > 31 || numeric.dias_licencia > 31) return { status: 'error', message: 'Los días no pueden superar 31.' }

    const { data: period, error: periodError } = await adminClient.from('periodos_remuneraciones').select('empresa_id, estado').eq('id', periodoId).single()
    if (periodError || !period || period.estado === 'Cerrado') return { status: 'error', message: 'El periodo no está disponible.' }
    const { data: worker, error: workerError } = await adminClient.from('trabajadores').select('empresa_id').eq('id', trabajadorId).single()
    if (workerError || !worker || worker.empresa_id !== period.empresa_id) return { status: 'error', message: 'El trabajador no corresponde a la empresa del periodo.' }

    const { data, error } = await adminClient.from('novedades_remuneraciones').upsert({
      periodo_id: periodoId,
      trabajador_id: trabajadorId,
      ...numeric,
      observaciones: clean(formData.get('observaciones'), 1500) || null,
    }, { onConflict: 'periodo_id,trabajador_id' }).select('id').single()
    if (error) throw error

    await adminClient.from('periodos_remuneraciones').update({ estado: 'Abierto', calculado_at: null }).eq('id', periodoId)
    await audit(adminClient, actorUserId, { empresaId: period.empresa_id, accion: 'guardar', entidad: 'novedad_remuneracion', entidadId: data.id, metadata: { trabajador_id: trabajadorId } })
    revalidatePath('/admin/remuneraciones')
    revalidatePath('/admin/remuneraciones/gestion')
    return { status: 'success', message: 'Novedad mensual guardada. El periodo debe recalcularse.' }
  } catch (error) {
    console.error('Error al guardar novedad:', error)
    return { status: 'error', message: 'No fue posible guardar la novedad mensual.' }
  }
}

export async function crearVacacion(
  _state: PayrollActionState,
  formData: FormData,
): Promise<PayrollActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
    const trabajadorId = clean(formData.get('trabajador_id'), 40)
    const fechaInicio = dateValue(formData.get('fecha_inicio'))
    const fechaFin = dateValue(formData.get('fecha_fin'))
    const dias = numberValue(formData.get('dias_habiles'))
    if (!UUID_PATTERN.test(trabajadorId) || !fechaInicio || !fechaFin || fechaFin < fechaInicio || Number.isNaN(dias) || dias <= 0) return { status: 'error', message: 'Complete un periodo de vacaciones válido.' }

    const { data: worker, error: workerError } = await adminClient.from('trabajadores').select('empresa_id').eq('id', trabajadorId).single()
    if (workerError || !worker) return { status: 'error', message: 'Trabajador no disponible.' }
    const estado = clean(formData.get('estado'), 30) || 'Aprobada'
    if (!['Solicitada', 'Aprobada', 'Rechazada', 'Utilizada', 'Anulada'].includes(estado)) return { status: 'error', message: 'Estado inválido.' }

    const { data, error } = await adminClient.from('vacaciones').insert({
      trabajador_id: trabajadorId,
      tipo: clean(formData.get('tipo'), 80) || 'Feriado legal',
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      dias_habiles: dias,
      estado,
      observaciones: clean(formData.get('observaciones'), 1200) || null,
    }).select('id').single()
    if (error) throw error
    await audit(adminClient, actorUserId, { empresaId: worker.empresa_id, accion: 'crear', entidad: 'vacacion', entidadId: data.id, metadata: { estado, dias } })
    revalidatePath('/admin/remuneraciones/gestion')
    return { status: 'success', message: 'Registro de vacaciones creado.' }
  } catch (error) {
    console.error('Error al crear vacaciones:', error)
    return { status: 'error', message: 'No fue posible registrar las vacaciones.' }
  }
}

export async function crearLicenciaMedica(
  _state: PayrollActionState,
  formData: FormData,
): Promise<PayrollActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
    const trabajadorId = clean(formData.get('trabajador_id'), 40)
    const fechaInicio = dateValue(formData.get('fecha_inicio'))
    const fechaFin = dateValue(formData.get('fecha_fin'))
    const dias = Math.round(numberValue(formData.get('dias')))
    if (!UUID_PATTERN.test(trabajadorId) || !fechaInicio || !fechaFin || fechaFin < fechaInicio || !Number.isInteger(dias) || dias <= 0) return { status: 'error', message: 'Complete una licencia válida.' }

    const { data: worker, error: workerError } = await adminClient.from('trabajadores').select('empresa_id').eq('id', trabajadorId).single()
    if (workerError || !worker) return { status: 'error', message: 'Trabajador no disponible.' }
    const estado = clean(formData.get('estado'), 30) || 'Informada'
    if (!['Informada', 'Tramitada', 'Autorizada', 'Reducida', 'Rechazada'].includes(estado)) return { status: 'error', message: 'Estado inválido.' }

    const { data, error } = await adminClient.from('licencias_medicas').insert({
      trabajador_id: trabajadorId,
      folio: clean(formData.get('folio'), 100) || null,
      tipo: clean(formData.get('tipo'), 100) || null,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      dias,
      estado,
    }).select('id').single()
    if (error) throw error
    await audit(adminClient, actorUserId, { empresaId: worker.empresa_id, accion: 'crear', entidad: 'licencia_medica', entidadId: data.id, metadata: { estado, dias } })
    revalidatePath('/admin/remuneraciones/gestion')
    return { status: 'success', message: 'Licencia médica registrada.' }
  } catch (error) {
    console.error('Error al crear licencia:', error)
    return { status: 'error', message: 'No fue posible registrar la licencia.' }
  }
}

export async function crearFiniquitoBorrador(
  _state: PayrollActionState,
  formData: FormData,
): Promise<PayrollActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
    const trabajadorId = clean(formData.get('trabajador_id'), 40)
    const fechaTermino = dateValue(formData.get('fecha_termino'))
    const monthlySalary = numberValue(formData.get('remuneracion_mensual'))
    const years = numberValue(formData.get('anos_servicio'))
    const vacationDays = numberValue(formData.get('dias_vacaciones_pendientes'))
    if (!UUID_PATTERN.test(trabajadorId) || !fechaTermino || [monthlySalary, years, vacationDays].some(Number.isNaN)) return { status: 'error', message: 'Complete los antecedentes del finiquito.' }

    const { data: worker, error: workerError } = await adminClient.from('trabajadores').select('empresa_id').eq('id', trabajadorId).single()
    if (workerError || !worker) return { status: 'error', message: 'Trabajador no disponible.' }
    const draft = calculateTerminationDraft({
      monthlySalary,
      yearsOfService: years,
      pendingVacationDays: vacationDays,
      noticePaid: formData.get('aviso_previo') === 'on',
      severanceYears: formData.get('indemnizacion_anos') === 'on',
      pendingEarnings: numberValue(formData.get('remuneraciones_pendientes')),
      otherEarnings: numberValue(formData.get('otros_haberes')),
      deductions: numberValue(formData.get('descuentos')),
    })

    const { data, error } = await adminClient.from('finiquitos').insert({
      trabajador_id: trabajadorId,
      causal_codigo: clean(formData.get('causal_codigo'), 80) || 'Pendiente de revisión',
      fecha_termino: fechaTermino,
      aviso_previo: draft.notice,
      indemnizacion_anos_servicio: draft.severance,
      vacaciones_proporcionales: draft.vacation,
      remuneraciones_pendientes: draft.pendingEarnings,
      otros_haberes: draft.otherEarnings,
      descuentos: draft.deductions,
      total_pagar: draft.total,
      estado: 'Borrador',
      calculo: { ...draft, remuneracion_mensual: monthlySalary, anos_servicio: years, dias_vacaciones_pendientes: vacationDays },
    }).select('id').single()
    if (error) throw error
    await audit(adminClient, actorUserId, { empresaId: worker.empresa_id, accion: 'crear_borrador', entidad: 'finiquito', entidadId: data.id, metadata: { total: draft.total } })
    revalidatePath('/admin/remuneraciones/gestion')
    return { status: 'success', message: `Borrador de finiquito calculado por $${draft.total.toLocaleString('es-CL')}. Requiere revisión legal antes de emitir.` }
  } catch (error) {
    console.error('Error al crear finiquito:', error)
    return { status: 'error', message: 'No fue posible calcular el borrador de finiquito.' }
  }
}

function automaticNoveltyMovements(novelty: Record<string, unknown> | null): PayrollMovement[] {
  if (!novelty) return []
  const rows: PayrollMovement[] = []
  const add = (code: string, description: string, nature: PayrollMovement['nature'], amount: number, taxable: boolean, incomeTaxable: boolean) => {
    if (amount > 0) rows.push({ code, description, nature, amount, taxable, incomeTaxable })
  }
  add('HORAS_50', `Horas extraordinarias 50% (${Number(novelty.horas_extra_50 ?? 0)} h)`, 'Haber', Number(novelty.monto_horas_extra_50 ?? 0), true, true)
  add('HORAS_100', `Horas extraordinarias 100% (${Number(novelty.horas_extra_100 ?? 0)} h)`, 'Haber', Number(novelty.monto_horas_extra_100 ?? 0), true, true)
  add('BONO_IMP', 'Bonos imponibles del periodo', 'Haber', Number(novelty.bonos_imponibles ?? 0), true, true)
  add('BONO_NO_IMP', 'Bonos no imponibles del periodo', 'Haber', Number(novelty.bonos_no_imponibles ?? 0), false, false)
  add('OTRO_DESC', 'Descuentos adicionales del periodo', 'Descuento', Number(novelty.descuentos_adicionales ?? 0), false, false)
  return rows
}

export async function calcularPeriodoConNovedades(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
  const periodoId = clean(formData.get('periodo_id'), 40)
  if (!UUID_PATTERN.test(periodoId)) throw new Error('INVALID_PERIOD')

  const { data: period, error: periodError } = await adminClient.from('periodos_remuneraciones').select('id, empresa_id, periodo, parametros_id, estado').eq('id', periodoId).single()
  if (periodError || !period || period.estado === 'Cerrado') throw new Error('PERIOD_NOT_AVAILABLE')

  const { data: rawParams, error: paramsError } = await adminClient.from('parametros_remuneraciones').select('*').eq('id', period.parametros_id).single()
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

  const { data: workers, error: workersError } = await adminClient.from('trabajadores').select('id, afp, salud_tipo, salud_plan_uf, afc_aplica').eq('empresa_id', period.empresa_id).eq('estado', 'Activo')
  if (workersError) throw workersError
  let calculated = 0
  let skipped = 0

  for (const worker of workers ?? []) {
    const [{ data: contract }, { data: rawMovements }, { data: novelty }] = await Promise.all([
      adminClient.from('contratos_trabajo').select('tipo, modalidad_pago, sueldo_base, gratificacion_tipo, colacion_diaria, movilizacion_diaria').eq('trabajador_id', worker.id).eq('estado', 'Vigente').order('fecha_inicio', { ascending: false }).limit(1).maybeSingle(),
      adminClient.from('movimientos_remuneracion').select('codigo, descripcion, monto, concepto:conceptos_remuneracion(naturaleza, imponible, tributable)').eq('periodo_id', periodoId).eq('trabajador_id', worker.id),
      adminClient.from('novedades_remuneraciones').select('*').eq('periodo_id', periodoId).eq('trabajador_id', worker.id).maybeSingle(),
    ])
    if (!contract) { skipped += 1; continue }

    const manualMovements: PayrollMovement[] = (rawMovements ?? []).map((row) => {
      const relation = row.concepto as unknown as { naturaleza: PayrollMovement['nature']; imponible: boolean; tributable: boolean } | Array<{ naturaleza: PayrollMovement['nature']; imponible: boolean; tributable: boolean }> | null
      const concept = Array.isArray(relation) ? relation[0] : relation
      return { code: row.codigo, description: row.descripcion, nature: concept?.naturaleza ?? 'Haber', amount: Number(row.monto), taxable: Boolean(concept?.imponible), incomeTaxable: Boolean(concept?.tributable) }
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
    })

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
      calculo: { ...result, novedad: novelty ?? null },
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

  await adminClient.from('periodos_remuneraciones').update({ estado: 'Calculado', calculado_at: new Date().toISOString() }).eq('id', periodoId)
  await audit(adminClient, actorUserId, { empresaId: period.empresa_id, accion: 'calcular', entidad: 'periodo_remuneraciones', entidadId: periodoId, metadata: { periodo: period.periodo, calculadas: calculated, omitidas_sin_contrato: skipped } })
  revalidatePath('/admin/remuneraciones')
  revalidatePath('/admin/remuneraciones/gestion')
}

export async function cerrarPeriodoRemuneraciones(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
  const periodoId = clean(formData.get('periodo_id'), 40)
  if (!UUID_PATTERN.test(periodoId)) throw new Error('INVALID_PERIOD')

  const { data: period, error: periodError } = await adminClient.from('periodos_remuneraciones').select('empresa_id, periodo, estado').eq('id', periodoId).single()
  if (periodError || !period || !['Calculado', 'Revisión', 'Rectificado'].includes(period.estado)) throw new Error('PERIOD_NOT_READY')
  const { data: payslips, error: payslipsError } = await adminClient.from('liquidaciones').select('id, liquido_pagar').eq('periodo_id', periodoId)
  if (payslipsError || !payslips || payslips.length === 0) throw new Error('NO_PAYSLIPS')
  if (payslips.some((item) => Number(item.liquido_pagar) < 0)) throw new Error('NEGATIVE_PAYSLIP')

  await adminClient.from('liquidaciones').update({ estado: 'Revisada' }).eq('periodo_id', periodoId).eq('estado', 'Calculada')
  const { error } = await adminClient.from('periodos_remuneraciones').update({ estado: 'Cerrado', cerrado_at: new Date().toISOString() }).eq('id', periodoId)
  if (error) throw error
  await audit(adminClient, actorUserId, { empresaId: period.empresa_id, accion: 'cerrar', entidad: 'periodo_remuneraciones', entidadId: periodoId, metadata: { periodo: period.periodo, liquidaciones: payslips.length } })

  await notifyCompany({
    adminClient,
    empresaId: period.empresa_id,
    event: 'remuneraciones_periodo_cerrado',
    subject: `Remuneraciones disponibles: ${String(period.periodo).slice(0, 7)}`,
    title: 'SERCOPREV cerró el periodo de remuneraciones',
    paragraphs: ['Las liquidaciones revisadas del periodo ya están disponibles en el Portal de Clientes.', 'Revise los totales y contacte al equipo SERCOPREV si necesita aclaraciones.'],
    details: [{ label: 'Periodo', value: String(period.periodo).slice(0, 7) }, { label: 'Liquidaciones', value: String(payslips.length) }],
    ctaLabel: 'Revisar remuneraciones',
    ctaUrl: `${process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'}/dashboard/remuneraciones`,
  })

  revalidatePath('/admin/remuneraciones')
  revalidatePath('/dashboard/remuneraciones')
  revalidatePath('/admin/notificaciones')
}
