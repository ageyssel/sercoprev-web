'use server'

import { revalidatePath } from 'next/cache'
import { findValue, parseCsv, parseDate, parseNumber } from '@/lib/csv'
import { requireAdmin } from '@/utils/supabase/require-admin'
import type { AccountingActionState } from '@/app/admin/accounting-actions'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_CSV_SIZE = 5 * 1024 * 1024

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

async function fingerprint(parts: Array<string | number | null | undefined>) {
  const data = new TextEncoder().encode(parts.map((part) => String(part ?? '').trim().toUpperCase()).join('|'))
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
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

async function csvFile(formData: FormData) {
  const file = formData.get('archivo')
  if (!(file instanceof File) || file.size === 0) throw new Error('Seleccione un archivo CSV.')
  if (file.size > MAX_CSV_SIZE) throw new Error('El archivo no puede superar 5 MB.')
  const lowerName = file.name.toLowerCase()
  if (!lowerName.endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'text/plain' && file.type !== 'application/vnd.ms-excel') throw new Error('El archivo debe ser CSV.')
  return { file, table: parseCsv(await file.text(), 2500) }
}

export async function crearCuentaBancaria(
  _state: AccountingActionState,
  formData: FormData,
): Promise<AccountingActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador'])
    const empresaId = clean(formData.get('empresa_id'), 40)
    const banco = clean(formData.get('banco'), 120)
    const tipoCuenta = clean(formData.get('tipo_cuenta'), 80)
    const numero = clean(formData.get('numero_enmascarado'), 80)
    const cuentaContableId = clean(formData.get('cuenta_contable_id'), 40)
    if (!UUID_PATTERN.test(empresaId) || banco.length < 2 || tipoCuenta.length < 2 || numero.length < 3) return { status: 'error', message: 'Complete los datos de la cuenta bancaria.' }

    const { data, error } = await adminClient.from('cuentas_bancarias').insert({
      empresa_id: empresaId,
      banco,
      tipo_cuenta: tipoCuenta,
      numero_enmascarado: numero,
      moneda: clean(formData.get('moneda'), 10) || 'CLP',
      cuenta_contable_id: UUID_PATTERN.test(cuentaContableId) ? cuentaContableId : null,
      activa: true,
    }).select('id').single()
    if (error) throw error
    await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'cuenta_bancaria', entidadId: data.id })
    revalidatePath('/admin/contabilidad/importaciones')
    return { status: 'success', message: 'Cuenta bancaria creada.' }
  } catch (error) {
    console.error('Error al crear cuenta bancaria:', error)
    return { status: 'error', message: 'No fue posible crear la cuenta bancaria.' }
  }
}

export async function importarRcvCsv(
  _state: AccountingActionState,
  formData: FormData,
): Promise<AccountingActionState> {
  let batchId: string | null = null
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador'])
    const empresaId = clean(formData.get('empresa_id'), 40)
    const tipoRegistro = clean(formData.get('tipo_registro'), 20)
    if (!UUID_PATTERN.test(empresaId) || !['Compra', 'Venta'].includes(tipoRegistro)) return { status: 'error', message: 'Seleccione empresa y tipo de registro.' }
    const { file, table } = await csvFile(formData)

    const { data: batch, error: batchError } = await adminClient.from('importaciones_contables').insert({
      empresa_id: empresaId,
      tipo: tipoRegistro === 'Compra' ? 'RCV compras' : 'RCV ventas',
      nombre_archivo: file.name.slice(0, 255),
      total_filas: table.rows.length,
      estado: 'Procesando',
      creado_por: actorUserId,
    }).select('id').single()
    if (batchError) throw batchError
    batchId = batch.id

    const valid: Array<Record<string, unknown> & { fingerprint: string }> = []
    const errors: Array<{ fila: number; error: string }> = []
    for (let index = 0; index < table.rows.length; index += 1) {
      const row = table.rows[index]
      const tipoDocumento = findValue(row, ['tipo_documento', 'tipo_doc', 'documento', 'tipo_dte'])
      const folio = findValue(row, ['folio', 'numero', 'nro', 'numero_documento'])
      const rut = findValue(row, ['rut_contraparte', 'rut_proveedor', 'rut_cliente', 'rut'])
      const legalName = findValue(row, ['razon_social', 'razon_social_contraparte', 'proveedor', 'cliente'])
      const issueDate = parseDate(findValue(row, ['fecha_emision', 'fecha_docto', 'fecha_documento', 'fecha']))
      const receivedDate = parseDate(findValue(row, ['fecha_recepcion', 'fecha_recibido']))
      const net = parseNumber(findValue(row, ['neto', 'monto_neto', 'neto_afecto']))
      const exempt = parseNumber(findValue(row, ['exento', 'monto_exento']))
      const vat = parseNumber(findValue(row, ['iva', 'iva_recuperable', 'monto_iva']))
      const otherTaxes = parseNumber(findValue(row, ['otros_impuestos', 'impuestos_adicionales', 'otros']))
      const total = parseNumber(findValue(row, ['total', 'monto_total']))

      if (!tipoDocumento || !issueDate || [net, exempt, vat, otherTaxes, total].some(Number.isNaN) || total < 0) {
        errors.push({ fila: index + 2, error: 'Faltan tipo de documento, fecha o montos válidos.' })
        continue
      }
      const rowFingerprint = await fingerprint([empresaId, tipoRegistro, tipoDocumento, folio, rut, issueDate, total])
      valid.push({
        empresa_id: empresaId,
        tipo_registro: tipoRegistro,
        tipo_documento: tipoDocumento.slice(0, 80),
        folio: folio.slice(0, 80) || null,
        rut_contraparte: rut.slice(0, 20) || null,
        razon_social_contraparte: legalName.slice(0, 180) || null,
        fecha_emision: issueDate,
        fecha_recepcion: receivedDate,
        neto: Math.max(0, net),
        exento: Math.max(0, exempt),
        iva: Math.max(0, vat),
        otros_impuestos: Math.max(0, otherTaxes),
        total,
        estado: 'Registrado',
        fingerprint: rowFingerprint,
      })
    }

    const fingerprints = valid.map((row) => row.fingerprint)
    const existing = new Set<string>()
    for (let offset = 0; offset < fingerprints.length; offset += 200) {
      const { data, error } = await adminClient.from('documentos_tributarios').select('fingerprint').eq('empresa_id', empresaId).in('fingerprint', fingerprints.slice(offset, offset + 200))
      if (error) throw error
      for (const row of data ?? []) if (row.fingerprint) existing.add(row.fingerprint)
    }
    const newRows = valid.filter((row) => !existing.has(row.fingerprint))
    for (let offset = 0; offset < newRows.length; offset += 250) {
      const { error } = await adminClient.from('documentos_tributarios').insert(newRows.slice(offset, offset + 250))
      if (error) throw error
    }

    const duplicates = valid.length - newRows.length
    const status = errors.length ? 'Con observaciones' : 'Completada'
    await adminClient.from('importaciones_contables').update({
      insertadas: newRows.length,
      duplicadas: duplicates,
      rechazadas: errors.length,
      estado: status,
      errores: errors.slice(0, 100),
      completado_at: new Date().toISOString(),
    }).eq('id', batch.id)
    await audit(adminClient, actorUserId, { empresaId, accion: 'importar', entidad: 'rcv', entidadId: batch.id, metadata: { tipoRegistro, total: table.rows.length, insertadas: newRows.length, duplicadas: duplicates, rechazadas: errors.length } })
    revalidatePath('/admin/contabilidad')
    revalidatePath('/admin/contabilidad/importaciones')
    return { status: 'success', message: `RCV procesado: ${newRows.length} insertadas, ${duplicates} duplicadas y ${errors.length} rechazadas.` }
  } catch (error) {
    console.error('Error al importar RCV:', error)
    if (batchId) {
      try {
        const { adminClient } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador'])
        await adminClient.from('importaciones_contables').update({ estado: 'Fallida', completado_at: new Date().toISOString(), errores: [{ error: error instanceof Error ? error.message.slice(0, 300) : 'Error desconocido' }] }).eq('id', batchId)
      } catch { /* mantener error original */ }
    }
    return { status: 'error', message: error instanceof Error && error.message.startsWith('El archivo') ? error.message : 'No fue posible importar el RCV.' }
  }
}

export async function importarCartolaCsv(
  _state: AccountingActionState,
  formData: FormData,
): Promise<AccountingActionState> {
  let batchId: string | null = null
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador'])
    const empresaId = clean(formData.get('empresa_id'), 40)
    const bankAccountId = clean(formData.get('cuenta_bancaria_id'), 40)
    if (!UUID_PATTERN.test(empresaId) || !UUID_PATTERN.test(bankAccountId)) return { status: 'error', message: 'Seleccione empresa y cuenta bancaria.' }
    const { data: bankAccount, error: bankError } = await adminClient.from('cuentas_bancarias').select('id').eq('id', bankAccountId).eq('empresa_id', empresaId).eq('activa', true).single()
    if (bankError || !bankAccount) return { status: 'error', message: 'Cuenta bancaria no disponible.' }
    const { file, table } = await csvFile(formData)

    const { data: batch, error: batchError } = await adminClient.from('importaciones_contables').insert({
      empresa_id: empresaId,
      tipo: 'Cartola bancaria',
      nombre_archivo: file.name.slice(0, 255),
      total_filas: table.rows.length,
      estado: 'Procesando',
      creado_por: actorUserId,
    }).select('id').single()
    if (batchError) throw batchError
    batchId = batch.id

    const valid: Array<Record<string, unknown> & { fingerprint: string }> = []
    const errors: Array<{ fila: number; error: string }> = []
    for (let index = 0; index < table.rows.length; index += 1) {
      const row = table.rows[index]
      const date = parseDate(findValue(row, ['fecha', 'fecha_movimiento', 'fecha_contable']))
      const description = findValue(row, ['descripcion', 'detalle', 'glosa', 'movimiento'])
      const reference = findValue(row, ['referencia', 'documento', 'numero_operacion', 'nro_operacion'])
      let debit = parseNumber(findValue(row, ['cargo', 'debe', 'egreso']))
      let credit = parseNumber(findValue(row, ['abono', 'haber', 'ingreso']))
      const signedAmount = parseNumber(findValue(row, ['monto', 'importe']))
      const balance = parseNumber(findValue(row, ['saldo', 'saldo_disponible']))
      if (!Number.isNaN(signedAmount) && debit === 0 && credit === 0) {
        if (signedAmount < 0) debit = Math.abs(signedAmount)
        else credit = signedAmount
      }

      if (!date || !description || [debit, credit].some(Number.isNaN) || (debit <= 0 && credit <= 0) || (debit > 0 && credit > 0)) {
        errors.push({ fila: index + 2, error: 'Faltan fecha, descripción o un único cargo/abono válido.' })
        continue
      }
      const rowFingerprint = await fingerprint([bankAccountId, date, description, reference, debit, credit, Number.isNaN(balance) ? '' : balance])
      valid.push({
        cuenta_bancaria_id: bankAccountId,
        fecha: date,
        descripcion: description.slice(0, 500),
        referencia: reference.slice(0, 180) || null,
        cargo: Math.max(0, debit),
        abono: Math.max(0, credit),
        saldo: Number.isNaN(balance) ? null : balance,
        estado: 'Pendiente',
        fingerprint: rowFingerprint,
      })
    }

    const fingerprints = valid.map((row) => row.fingerprint)
    const existing = new Set<string>()
    for (let offset = 0; offset < fingerprints.length; offset += 200) {
      const { data, error } = await adminClient.from('movimientos_bancarios').select('fingerprint').eq('cuenta_bancaria_id', bankAccountId).in('fingerprint', fingerprints.slice(offset, offset + 200))
      if (error) throw error
      for (const row of data ?? []) if (row.fingerprint) existing.add(row.fingerprint)
    }
    const newRows = valid.filter((row) => !existing.has(row.fingerprint))
    for (let offset = 0; offset < newRows.length; offset += 250) {
      const { error } = await adminClient.from('movimientos_bancarios').insert(newRows.slice(offset, offset + 250))
      if (error) throw error
    }

    const duplicates = valid.length - newRows.length
    const status = errors.length ? 'Con observaciones' : 'Completada'
    await adminClient.from('importaciones_contables').update({ insertadas: newRows.length, duplicadas: duplicates, rechazadas: errors.length, estado: status, errores: errors.slice(0, 100), completado_at: new Date().toISOString() }).eq('id', batch.id)
    await audit(adminClient, actorUserId, { empresaId, accion: 'importar', entidad: 'cartola_bancaria', entidadId: batch.id, metadata: { total: table.rows.length, insertadas: newRows.length, duplicadas: duplicates, rechazadas: errors.length } })
    revalidatePath('/admin/contabilidad/importaciones')
    return { status: 'success', message: `Cartola procesada: ${newRows.length} movimientos, ${duplicates} duplicados y ${errors.length} rechazados.` }
  } catch (error) {
    console.error('Error al importar cartola:', error)
    if (batchId) {
      try {
        const { adminClient } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador'])
        await adminClient.from('importaciones_contables').update({ estado: 'Fallida', completado_at: new Date().toISOString(), errores: [{ error: error instanceof Error ? error.message.slice(0, 300) : 'Error desconocido' }] }).eq('id', batchId)
      } catch { /* mantener error original */ }
    }
    return { status: 'error', message: error instanceof Error && error.message.startsWith('El archivo') ? error.message : 'No fue posible importar la cartola.' }
  }
}

export async function conciliarMovimientosExactos(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador'])
  const empresaId = clean(formData.get('empresa_id'), 40)
  const bankAccountId = clean(formData.get('cuenta_bancaria_id'), 40)
  if (!UUID_PATTERN.test(empresaId) || !UUID_PATTERN.test(bankAccountId)) throw new Error('INVALID_BANK_ACCOUNT')

  const [{ data: bankRows, error: bankError }, { data: entries, error: entryError }] = await Promise.all([
    adminClient.from('movimientos_bancarios').select('id, fecha, cargo, abono').eq('cuenta_bancaria_id', bankAccountId).eq('estado', 'Pendiente').limit(1000),
    adminClient.from('asientos_contables').select('id, fecha, movimientos:movimientos_contables(debe, haber)').eq('empresa_id', empresaId).eq('estado', 'Contabilizado').limit(2000),
  ])
  if (bankError || entryError) throw bankError || entryError

  const candidates = (entries ?? []).map((entry) => ({
    id: entry.id,
    date: entry.fecha,
    amount: (entry.movimientos ?? []).reduce((sum, line) => sum + Number(line.debe || 0), 0),
  }))
  let reconciled = 0
  for (const bank of bankRows ?? []) {
    const amount = Number(bank.cargo || bank.abono || 0)
    const matches = candidates.filter((entry) => entry.date === bank.fecha && Math.abs(entry.amount - amount) < 0.5)
    if (matches.length !== 1) continue
    const { error: relationError } = await adminClient.from('conciliaciones_bancarias').insert({ movimiento_bancario_id: bank.id, asiento_id: matches[0].id, monto: amount, conciliado_por: actorUserId })
    if (relationError) continue
    await adminClient.from('movimientos_bancarios').update({ estado: 'Conciliado', asiento_id: matches[0].id }).eq('id', bank.id)
    reconciled += 1
  }

  await audit(adminClient, actorUserId, { empresaId, accion: 'conciliar_exacto', entidad: 'movimientos_bancarios', metadata: { revisados: bankRows?.length ?? 0, conciliados: reconciled } })
  revalidatePath('/admin/contabilidad/importaciones')
}
