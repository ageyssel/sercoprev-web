'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/supabase/require-admin'
import {
  calculatePayroll,
  type PayrollInput,
  type PayrollMovement,
  type PayrollParameters,
  type PayrollTaxBracket,
} from '@/lib/payroll'

export type PayrollActionState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const RUT_PATTERN = /^\d{7,8}-[0-9K]$/
const VALID_AFPS = ['Capital', 'Cuprum', 'Habitat', 'Modelo', 'PlanVital', 'Provida', 'Uno']

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

function monthValue(value: unknown) {
  const text = clean(value, 10)
  if (/^\d{4}-\d{2}$/.test(text)) return `${text}-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text.slice(0, 7)}-01`
  return null
}

function normalizeRut(value: string) {
  const normalized = value.replace(/\./g, '').replace(/\s/g, '').toUpperCase()
  return RUT_PATTERN.test(normalized) ? normalized : null
}

async function audit(adminClient: Awaited<ReturnType<typeof requireAdmin>>['adminClient'], actorUserId: string, input: { empresaId: string; accion: string; entidad: string; entidadId?: string | null; metadata?: Record<string, unknown> }) {
  await adminClient.from('auditoria_eventos').insert({
    actor_user_id: actorUserId,
    empresa_id: input.empresaId,
    accion: input.accion,
    entidad: input.entidad,
    entidad_id: input.entidadId ?? null,
    metadata: input.metadata ?? {},
  })
}

export async function crearTrabajador(_state: PayrollActionState, formData: FormData): Promise<PayrollActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
    const empresaId = clean(formData.get('empresa_id'), 40)
    const rut = normalizeRut(clean(formData.get('rut'), 20))
    const nombres = clean(formData.get('nombres'), 120)
    const apellidoPaterno = clean(formData.get('apellido_paterno'), 100)
    const fechaIngreso = dateValue(formData.get('fecha_ingreso'))
    const saludTipo = clean(formData.get('salud_tipo'), 30) || 'Fonasa'
    const afp = clean(formData.get('afp'), 80)
    const familyBracket = clean(formData.get('asignacion_familiar_tramo'), 20)

    if (!UUID_PATTERN.test(empresaId) || !rut || nombres.length < 2 || apellidoPaterno.length < 2 || !fechaIngreso) {
      return { status: 'error', message: 'Complete empresa, RUT, nombre, apellido y fecha de ingreso.' }
    }
    if (!['Fonasa', 'Isapre', 'Sin cotización'].includes(saludTipo)) return { status: 'error', message: 'Sistema de salud inválido.' }
    if (afp && !VALID_AFPS.includes(afp)) return { status: 'error', message: 'Seleccione una AFP válida.' }
    if (familyBracket && !['A', 'B', 'C', 'D'].includes(familyBracket)) return { status: 'error', message: 'Tramo de asignación familiar inválido.' }

    const { data, error } = await adminClient.from('trabajadores').insert({
      empresa_id: empresaId,
      rut,
      nombres,
      apellido_paterno: apellidoPaterno,
      apellido_materno: clean(formData.get('apellido_materno'), 100) || null,
      email: clean(formData.get('email'), 254).toLowerCase() || null,
      telefono: clean(formData.get('telefono'), 40) || null,
      fecha_nacimiento: dateValue(formData.get('fecha_nacimiento')),
      fecha_ingreso: fechaIngreso,
      afp: afp || null,
      salud_tipo: saludTipo,
      salud_institucion: clean(formData.get('salud_institucion'), 100) || null,
      salud_plan_uf: numberValue(formData.get('salud_plan_uf')) || null,
      afc_aplica: formData.get('afc_aplica') === 'on',
      asignacion_familiar_tramo: familyBracket || null,
      centro_costo_id: UUID_PATTERN.test(clean(formData.get('centro_costo_id'), 40)) ? clean(formData.get('centro_costo_id'), 40) : null,
    }).select('id').single()

    if (error) throw error
    await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'trabajador', entidadId: data.id, metadata: { afp: afp || null, salud_tipo: saludTipo, asignacion_familiar_tramo: familyBracket || null } })
    revalidatePath('/admin/remuneraciones')
    revalidatePath('/admin/remuneraciones/trabajadores')
    return { status: 'success', message: 'Trabajador creado correctamente.' }
  } catch (error) {
    console.error('Error al crear trabajador:', error)
    return { status: 'error', message: 'No fue posible crear el trabajador. Revise que el RUT no esté repetido.' }
  }
}

export async function crearContrato(_state: PayrollActionState, formData: FormData): Promise<PayrollActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
    const trabajadorId = clean(formData.get('trabajador_id'), 40)
    const tipo = clean(formData.get('tipo'), 40)
    const cargo = clean(formData.get('cargo'), 120)
    const fechaInicio = dateValue(formData.get('fecha_inicio'))
    const sueldoBase = numberValue(formData.get('sueldo_base'))
    const modalidadPago = clean(formData.get('modalidad_pago'), 30) || 'Mensual'

    if (!UUID_PATTERN.test(trabajadorId) || !fechaInicio || cargo.length < 2 || Number.isNaN(sueldoBase) || sueldoBase < 0) {
      return { status: 'error', message: 'Complete trabajador, cargo, inicio y sueldo base.' }
    }
    if (!['Indefinido', 'Plazo fijo', 'Obra o faena', 'Honorarios'].includes(tipo)) return { status: 'error', message: 'Tipo de contrato inválido.' }
    if (!['Mensual', 'Diaria', 'Por hora'].includes(modalidadPago)) return { status: 'error', message: 'Modalidad de pago inválida.' }

    const { data: worker, error: workerError } = await adminClient.from('trabajadores').select('empresa_id').eq('id', trabajadorId).single()
    if (workerError || !worker) return { status: 'error', message: 'Trabajador no disponible.' }

    await adminClient.from('contratos_trabajo').update({ estado: 'Finalizado', fecha_termino: fechaInicio }).eq('trabajador_id', trabajadorId).eq('estado', 'Vigente')

    const { data, error } = await adminClient.from('contratos_trabajo').insert({
      trabajador_id: trabajadorId,
      tipo,
      cargo,
      jornada_horas: numberValue(formData.get('jornada_horas')) || null,
      fecha_inicio: fechaInicio,
      fecha_termino: dateValue(formData.get('fecha_termino')),
      sueldo_base: sueldoBase,
      gratificacion_tipo: clean(formData.get('gratificacion_tipo'), 40) || 'Artículo 50',
      modalidad_pago: modalidadPago,
      dias_semana: Math.min(7, Math.max(1, Math.round(numberValue(formData.get('dias_semana'), 5)))),
      colacion_diaria: Math.max(0, numberValue(formData.get('colacion_diaria'))),
      movilizacion_diaria: Math.max(0, numberValue(formData.get('movilizacion_diaria'))),
      estado: 'Vigente',
    }).select('id').single()
    if (error) throw error

    await audit(adminClient, actorUserId, { empresaId: worker.empresa_id, accion: 'crear', entidad: 'contrato_trabajo', entidadId: data.id, metadata: { trabajadorId, tipo } })
    revalidatePath('/admin/remuneraciones')
    revalidatePath('/admin/remuneraciones/contratos')
    return { status: 'success', message: 'Contrato registrado como vigente.' }
  } catch (error) {
    console.error('Error al crear contrato:', error)
    return { status: 'error', message: 'No fue posible registrar el contrato.' }
  }
}

export async function guardarParametrosRemuneraciones(_state: PayrollActionState, formData: FormData): Promise<PayrollActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
    const empresaTexto = clean(formData.get('empresa_id'), 40)
    const empresaId = UUID_PATTERN.test(empresaTexto) ? empresaTexto : null
    const periodo = monthValue(formData.get('periodo'))
    if (!periodo) return { status: 'error', message: 'Periodo inválido.' }

    const numericFields = {
      uf: numberValue(formData.get('uf')),
      utm: numberValue(formData.get('utm')),
      ingreso_minimo: numberValue(formData.get('ingreso_minimo')),
      tope_afp_uf: numberValue(formData.get('tope_afp_uf')),
      tope_salud_uf: numberValue(formData.get('tope_salud_uf')),
      tope_afc_uf: numberValue(formData.get('tope_afc_uf')),
      tasa_salud: numberValue(formData.get('tasa_salud'), 0.07),
      tasa_sis_empleador: numberValue(formData.get('tasa_sis_empleador')),
      tasa_afc_trabajador_indefinido: numberValue(formData.get('tasa_afc_trabajador_indefinido'), 0.006),
      tasa_afc_empleador_indefinido: numberValue(formData.get('tasa_afc_empleador_indefinido'), 0.024),
      tasa_afc_empleador_plazo: numberValue(formData.get('tasa_afc_empleador_plazo'), 0.03),
    }
    if (Object.values(numericFields).some((value) => Number.isNaN(value) || value < 0)) return { status: 'error', message: 'Revise los parámetros numéricos.' }

    let tasasAfp: Record<string, number>
    let impuesto: PayrollTaxBracket[]
    try {
      tasasAfp = JSON.parse(clean(formData.get('tasas_afp'), 8000) || '{}') as Record<string, number>
      impuesto = JSON.parse(clean(formData.get('impuesto_segunda_categoria'), 12000) || '[]') as PayrollTaxBracket[]
      if (!tasasAfp || Array.isArray(tasasAfp) || !Array.isArray(impuesto)) throw new Error('invalid')
    } catch {
      return { status: 'error', message: 'Las tasas AFP o tramos de impuesto no tienen JSON válido.' }
    }

    const { data, error } = await adminClient.from('parametros_remuneraciones').upsert({
      empresa_id: empresaId,
      periodo,
      ...numericFields,
      tasas_afp: tasasAfp,
      impuesto_segunda_categoria: impuesto,
      fuente: clean(formData.get('fuente'), 500) || null,
      vigente: true,
    }, { onConflict: 'empresa_id,periodo' }).select('id').single()
    if (error) throw error

    if (empresaId) await audit(adminClient, actorUserId, { empresaId, accion: 'actualizar', entidad: 'parametros_remuneraciones', entidadId: data.id, metadata: { periodo } })
    revalidatePath('/admin/remuneraciones')
    return { status: 'success', message: 'Parámetros guardados para el periodo.' }
  } catch (error) {
    console.error('Error al guardar parámetros:', error)
    return { status: 'error', message: 'No fue posible guardar los parámetros.' }
  }
}

export async function crearPeriodoRemuneraciones(_state: PayrollActionState, formData: FormData): Promise<PayrollActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
    const empresaId = clean(formData.get('empresa_id'), 40)
    const periodo = monthValue(formData.get('periodo'))
    if (!UUID_PATTERN.test(empresaId) || !periodo) return { status: 'error', message: 'Empresa o periodo inválido.' }

    const { data: parameters, error: parameterError } = await adminClient.from('parametros_remuneraciones').select('id').eq('periodo', periodo).or(`empresa_id.eq.${empresaId},empresa_id.is.null`).order('empresa_id', { ascending: false, nullsFirst: false }).limit(1).maybeSingle()
    if (parameterError || !parameters) return { status: 'error', message: 'Configure primero los parámetros legales del periodo.' }

    const { data, error } = await adminClient.from('periodos_remuneraciones').upsert({
      empresa_id: empresaId,
      periodo,
      parametros_id: parameters.id,
      estado: 'Abierto',
      cerrado_at: null,
      cerrado_por: null,
    }, { onConflict: 'empresa_id,periodo' }).select('id').single()
    if (error) throw error

    await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'periodo_remuneraciones', entidadId: data.id, metadata: { periodo } })
    revalidatePath('/admin/remuneraciones')
    return { status: 'success', message: 'Periodo de remuneraciones abierto.' }
  } catch (error) {
    console.error('Error al crear periodo:', error)
    return { status: 'error', message: 'No fue posible abrir el periodo.' }
  }
}

export async function crearMovimientoRemuneracion(_state: PayrollActionState, formData: FormData): Promise<PayrollActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
    const periodoId = clean(formData.get('periodo_id'), 40)
    const trabajadorId = clean(formData.get('trabajador_id'), 40)
    const conceptoId = clean(formData.get('concepto_id'), 40)
    const cantidad = numberValue(formData.get('cantidad'), 1)
    const monto = numberValue(formData.get('monto'))
    if (![periodoId, trabajadorId, conceptoId].every((value) => UUID_PATTERN.test(value)) || Number.isNaN(cantidad) || Number.isNaN(monto) || monto < 0) {
      return { status: 'error', message: 'Movimiento inválido.' }
    }

    const [{ data: period }, { data: worker }, { data: concept }] = await Promise.all([
      adminClient.from('periodos_remuneraciones').select('empresa_id, estado').eq('id', periodoId).single(),
      adminClient.from('trabajadores').select('empresa_id').eq('id', trabajadorId).single(),
      adminClient.from('conceptos_remuneracion').select('empresa_id').eq('id', conceptoId).single(),
    ])
    if (!period || !worker || !concept || period.empresa_id !== worker.empresa_id || period.empresa_id !== concept.empresa_id || period.estado === 'Cerrado') {
      return { status: 'error', message: 'Periodo, trabajador o concepto no disponible.' }
    }

    const { data, error } = await adminClient.from('movimientos_remuneracion').insert({
      periodo_id: periodoId,
      trabajador_id: trabajadorId,
      concepto_id: conceptoId,
      cantidad,
      monto,
      origen: 'Manual',
      metadata: {},
    }).select('id').single()
    if (error) throw error

    await audit(adminClient, actorUserId, { empresaId: period.empresa_id, accion: 'crear', entidad: 'movimiento_remuneracion', entidadId: data.id, metadata: { periodoId, trabajadorId, conceptoId } })
    revalidatePath('/admin/remuneraciones')
    return { status: 'success', message: 'Movimiento agregado.' }
  } catch (error) {
    console.error('Error al crear movimiento:', error)
    return { status: 'error', message: 'No fue posible agregar el movimiento.' }
  }
}

export async function calcularPeriodoRemuneraciones(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
  const periodoId = clean(formData.get('periodo_id'), 40)
  if (!UUID_PATTERN.test(periodoId)) throw new Error('INVALID_PERIOD')

  const { data: period, error: periodError } = await adminClient.from('periodos_remuneraciones').select('id, empresa_id, estado, parametros:parametros_remuneraciones(*)').eq('id', periodoId).single()
  if (periodError || !period || period.estado === 'Cerrado') throw new Error('PERIOD_UNAVAILABLE')

  const parametersRow = Array.isArray(period.parametros) ? period.parametros[0] : period.parametros
  if (!parametersRow) throw new Error('PARAMETERS_NOT_FOUND')

  const { data: workers, error: workersError } = await adminClient
    .from('trabajadores')
    .select('id, afp, salud_tipo, salud_plan_uf, afc_aplica, contratos:contratos_trabajo(*)')
    .eq('empresa_id', period.empresa_id)
    .eq('estado', 'Activo')
  if (workersError) throw workersError

  const { data: movementRows, error: movementsError } = await adminClient
    .from('movimientos_remuneracion')
    .select('id, trabajador_id, cantidad, monto, concepto:conceptos_remuneracion(codigo, nombre, naturaleza, imponible, tributable)')
    .eq('periodo_id', periodoId)
  if (movementsError) throw movementsError

  const parameters: PayrollParameters = {
    uf: Number(parametersRow.uf),
    ingresoMinimo: Number(parametersRow.ingreso_minimo),
    topeAfpUf: Number(parametersRow.tope_afp_uf),
    topeSaludUf: Number(parametersRow.tope_salud_uf),
    topeAfcUf: Number(parametersRow.tope_afc_uf),
    tasaSalud: Number(parametersRow.tasa_salud),
    tasaSisEmpleador: Number(parametersRow.tasa_sis_empleador),
    tasaAfcTrabajadorIndefinido: Number(parametersRow.tasa_afc_trabajador_indefinido),
    tasaAfcEmpleadorIndefinido: Number(parametersRow.tasa_afc_empleador_indefinido),
    tasaAfcEmpleadorPlazo: Number(parametersRow.tasa_afc_empleador_plazo),
    tasasAfp: (parametersRow.tasas_afp ?? {}) as Record<string, number>,
    impuestoSegundaCategoria: (parametersRow.impuesto_segunda_categoria ?? []) as PayrollTaxBracket[],
  }

  for (const worker of workers ?? []) {
    const activeContract = (worker.contratos ?? [])
      .filter((contract) => contract.estado === 'Vigente')
      .sort((a, b) => String(b.fecha_inicio).localeCompare(String(a.fecha_inicio)))[0]
    if (!activeContract) continue

    const movements: PayrollMovement[] = (movementRows ?? [])
      .filter((movement) => movement.trabajador_id === worker.id)
      .map((movement) => {
        const concept = Array.isArray(movement.concepto) ? movement.concepto[0] : movement.concepto
        return {
          code: concept?.codigo ?? 'VAR',
          description: concept?.nombre ?? 'Movimiento variable',
          nature: (concept?.naturaleza ?? 'Haber') as PayrollMovement['nature'],
          amount: Number(movement.monto),
          taxable: Boolean(concept?.imponible),
          incomeTaxable: Boolean(concept?.tributable),
        }
      })

    const input: PayrollInput = {
      salaryBase: Number(activeContract.sueldo_base),
      contractType: activeContract.tipo as PayrollInput['contractType'],
      paymentMode: activeContract.modalidad_pago as PayrollInput['paymentMode'],
      gratificationType: activeContract.gratificacion_tipo,
      workedDays: 30,
      restDays: 0,
      variableEarningsForWeekRun: 0,
      dailyMealAllowance: Number(activeContract.colacion_diaria),
      dailyTransportAllowance: Number(activeContract.movilizacion_diaria),
      afp: worker.afp,
      healthType: worker.salud_tipo as PayrollInput['healthType'],
      healthPlanUf: Number(worker.salud_plan_uf || 0),
      unemploymentInsuranceApplies: Boolean(worker.afc_aplica),
      movements,
      parameters,
    }
    const result = calculatePayroll(input)

    const { data: payslip, error: payslipError } = await adminClient.from('liquidaciones').upsert({
      periodo_id: periodoId,
      trabajador_id: worker.id,
      contrato_id: activeContract.id,
      sueldo_base: result.salaryBasePaid,
      total_imponible: result.taxableEarnings,
      total_tributable: result.incomeTaxableEarnings,
      total_no_imponible: result.nonTaxableEarnings,
      descuentos_legales: result.afpWorker + result.healthWorker + result.unemploymentWorker + result.incomeTax,
      otros_descuentos: result.otherDeductions,
      aportes_empleador: result.employerContributions,
      liquido_pagar: result.netPay,
      estado: 'Calculada',
      calculo: result,
    }, { onConflict: 'periodo_id,trabajador_id' }).select('id').single()
    if (payslipError) throw payslipError

    await adminClient.from('liquidacion_detalles').delete().eq('liquidacion_id', payslip.id)
    if (result.details.length > 0) {
      const { error: detailsError } = await adminClient.from('liquidacion_detalles').insert(result.details.map((detail, index) => ({
        liquidacion_id: payslip.id,
        codigo: detail.code,
        descripcion: detail.description,
        naturaleza: detail.nature,
        monto: detail.amount,
        orden: index + 1,
      })))
      if (detailsError) throw detailsError
    }
  }

  await adminClient.from('periodos_remuneraciones').update({ estado: 'Calculado', calculado_at: new Date().toISOString() }).eq('id', periodoId)
  await audit(adminClient, actorUserId, { empresaId: period.empresa_id, accion: 'calcular', entidad: 'periodo_remuneraciones', entidadId: periodoId })
  revalidatePath('/admin/remuneraciones')
}
