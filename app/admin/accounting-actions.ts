'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/supabase/require-admin'

export type AccountingActionState = { status: 'idle' | 'success' | 'error'; message: string }

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

function monthValue(value: unknown) {
  const text = clean(value, 10)
  return /^\d{4}-\d{2}$/.test(text) ? `${text}-01` : /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text.slice(0, 7)}-01` : null
}

async function audit(adminClient: Awaited<ReturnType<typeof requireAdmin>>['adminClient'], actorUserId: string, input: { empresaId: string; accion: string; entidad: string; entidadId?: string | null; metadata?: Record<string, unknown> }) {
  await adminClient.from('auditoria_eventos').insert({ actor_user_id: actorUserId, empresa_id: input.empresaId, accion: input.accion, entidad: input.entidad, entidad_id: input.entidadId ?? null, metadata: input.metadata ?? {} })
}

export async function crearCentroCosto(_state: AccountingActionState, formData: FormData): Promise<AccountingActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador'])
    const empresaId = clean(formData.get('empresa_id'), 40)
    const codigo = clean(formData.get('codigo'), 40)
    const nombre = clean(formData.get('nombre'), 160)
    if (!UUID_PATTERN.test(empresaId) || !codigo || nombre.length < 2) return { status: 'error', message: 'Complete empresa, código y nombre.' }
    const { data, error } = await adminClient.from('centros_costo').insert({ empresa_id: empresaId, codigo, nombre, activo: true }).select('id').single()
    if (error) throw error
    await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'centro_costo', entidadId: data.id })
    revalidatePath('/admin/contabilidad')
    revalidatePath('/admin/remuneraciones')
    return { status: 'success', message: 'Centro de costo creado.' }
  } catch (error) {
    console.error('Error al crear centro de costo:', error)
    return { status: 'error', message: 'No fue posible crear el centro de costo.' }
  }
}

export async function crearCuentaContable(_state: AccountingActionState, formData: FormData): Promise<AccountingActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador'])
    const empresaId = clean(formData.get('empresa_id'), 40)
    const codigo = clean(formData.get('codigo'), 40)
    const nombre = clean(formData.get('nombre'), 180)
    const tipo = clean(formData.get('tipo'), 30)
    const naturaleza = clean(formData.get('naturaleza'), 20)
    if (!UUID_PATTERN.test(empresaId) || !codigo || nombre.length < 2) return { status: 'error', message: 'Complete los datos de la cuenta.' }
    if (!['Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Gasto', 'Orden'].includes(tipo)) return { status: 'error', message: 'Tipo de cuenta inválido.' }
    if (!['Deudora', 'Acreedora'].includes(naturaleza)) return { status: 'error', message: 'Naturaleza inválida.' }

    const { data, error } = await adminClient.from('plan_cuentas').insert({
      empresa_id: empresaId,
      codigo,
      nombre,
      tipo,
      naturaleza,
      nivel: Math.min(9, Math.max(1, Math.round(numberValue(formData.get('nivel'), 1)))),
      cuenta_padre_id: UUID_PATTERN.test(clean(formData.get('cuenta_padre_id'), 40)) ? clean(formData.get('cuenta_padre_id'), 40) : null,
      imputable: formData.get('imputable') === 'on',
      activo: true,
    }).select('id').single()
    if (error) throw error
    await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'cuenta_contable', entidadId: data.id })
    revalidatePath('/admin/contabilidad')
    return { status: 'success', message: 'Cuenta contable creada.' }
  } catch (error) {
    console.error('Error al crear cuenta:', error)
    return { status: 'error', message: 'No fue posible crear la cuenta. Revise si el código ya existe.' }
  }
}

export async function crearPeriodoContable(_state: AccountingActionState, formData: FormData): Promise<AccountingActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador'])
    const empresaId = clean(formData.get('empresa_id'), 40)
    const periodo = monthValue(formData.get('periodo'))
    if (!UUID_PATTERN.test(empresaId) || !periodo) return { status: 'error', message: 'Seleccione empresa y periodo.' }
    const { data, error } = await adminClient.from('periodos_contables').insert({ empresa_id: empresaId, periodo, estado: 'Abierto' }).select('id').single()
    if (error) throw error
    await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'periodo_contable', entidadId: data.id, metadata: { periodo } })
    revalidatePath('/admin/contabilidad')
    return { status: 'success', message: 'Periodo contable abierto.' }
  } catch (error) {
    console.error('Error al crear periodo contable:', error)
    return { status: 'error', message: 'No fue posible abrir el periodo. Puede que ya exista.' }
  }
}

export async function crearAsientoSimple(_state: AccountingActionState, formData: FormData): Promise<AccountingActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador'])
    const empresaId = clean(formData.get('empresa_id'), 40)
    const periodoId = clean(formData.get('periodo_id'), 40)
    const cuentaDebe = clean(formData.get('cuenta_debe_id'), 40)
    const cuentaHaber = clean(formData.get('cuenta_haber_id'), 40)
    const fecha = dateValue(formData.get('fecha'))
    const glosa = clean(formData.get('glosa'), 500)
    const monto = numberValue(formData.get('monto'))
    const tipo = clean(formData.get('tipo'), 30) || 'Traspaso'
    if (![empresaId, periodoId, cuentaDebe, cuentaHaber].every((value) => UUID_PATTERN.test(value)) || !fecha || glosa.length < 3 || Number.isNaN(monto) || monto <= 0 || cuentaDebe === cuentaHaber) {
      return { status: 'error', message: 'Complete un asiento válido con cuentas diferentes y monto mayor a cero.' }
    }

    const { data: period, error: periodError } = await adminClient.from('periodos_contables').select('estado').eq('id', periodoId).eq('empresa_id', empresaId).single()
    if (periodError || !period || period.estado === 'Cerrado') return { status: 'error', message: 'El periodo no está disponible.' }

    const { data: lastEntry } = await adminClient.from('asientos_contables').select('numero').eq('empresa_id', empresaId).order('numero', { ascending: false }).limit(1).maybeSingle()
    const numero = Number(lastEntry?.numero ?? 0) + 1
    const { data: entry, error: entryError } = await adminClient.from('asientos_contables').insert({
      empresa_id: empresaId,
      periodo_id: periodoId,
      numero,
      fecha,
      tipo,
      glosa,
      estado: 'Borrador',
      origen: 'Manual',
      documento_referencia: clean(formData.get('documento_referencia'), 120) || null,
      created_by: actorUserId,
    }).select('id').single()
    if (entryError) throw entryError

    const { error: linesError } = await adminClient.from('movimientos_contables').insert([
      { asiento_id: entry.id, cuenta_id: cuentaDebe, glosa, debe: monto, haber: 0 },
      { asiento_id: entry.id, cuenta_id: cuentaHaber, glosa, debe: 0, haber: monto },
    ])
    if (linesError) {
      await adminClient.from('asientos_contables').delete().eq('id', entry.id)
      throw linesError
    }

    await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'asiento_contable', entidadId: entry.id, metadata: { numero, monto } })
    revalidatePath('/admin/contabilidad')
    return { status: 'success', message: `Asiento borrador N° ${numero} creado y cuadrado.` }
  } catch (error) {
    console.error('Error al crear asiento:', error)
    return { status: 'error', message: 'No fue posible crear el asiento.' }
  }
}

export async function contabilizarAsiento(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador'])
  const asientoId = clean(formData.get('asiento_id'), 40)
  const empresaId = clean(formData.get('empresa_id'), 40)
  if (!UUID_PATTERN.test(asientoId) || !UUID_PATTERN.test(empresaId)) throw new Error('INVALID_ENTRY')
  const { error } = await adminClient.rpc('contabilizar_asiento', { p_asiento_id: asientoId })
  if (error) throw error
  await audit(adminClient, actorUserId, { empresaId, accion: 'contabilizar', entidad: 'asiento_contable', entidadId: asientoId })
  revalidatePath('/admin/contabilidad')
}

export async function registrarDocumentoTributario(_state: AccountingActionState, formData: FormData): Promise<AccountingActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador'])
    const empresaId = clean(formData.get('empresa_id'), 40)
    const fechaEmision = dateValue(formData.get('fecha_emision'))
    const tipoRegistro = clean(formData.get('tipo_registro'), 30)
    const total = numberValue(formData.get('total'))
    if (!UUID_PATTERN.test(empresaId) || !fechaEmision || !['Compra', 'Venta', 'Honorario', 'Otro'].includes(tipoRegistro) || Number.isNaN(total)) return { status: 'error', message: 'Revise tipo, fecha y total.' }

    const { data, error } = await adminClient.from('documentos_tributarios').insert({
      empresa_id: empresaId,
      tipo_registro: tipoRegistro,
      tipo_documento: clean(formData.get('tipo_documento'), 80) || 'Documento tributario',
      folio: clean(formData.get('folio'), 80) || null,
      rut_contraparte: clean(formData.get('rut_contraparte'), 20) || null,
      razon_social_contraparte: clean(formData.get('razon_social_contraparte'), 180) || null,
      fecha_emision: fechaEmision,
      fecha_recepcion: dateValue(formData.get('fecha_recepcion')),
      neto: numberValue(formData.get('neto')),
      exento: numberValue(formData.get('exento')),
      iva: numberValue(formData.get('iva')),
      otros_impuestos: numberValue(formData.get('otros_impuestos')),
      total,
      estado: 'Registrado',
    }).select('id').single()
    if (error) throw error
    await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'documento_tributario', entidadId: data.id, metadata: { tipoRegistro, total } })
    revalidatePath('/admin/contabilidad')
    return { status: 'success', message: 'Documento tributario registrado.' }
  } catch (error) {
    console.error('Error al registrar documento tributario:', error)
    return { status: 'error', message: 'No fue posible registrar el documento.' }
  }
}
