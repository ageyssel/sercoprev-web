'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/supabase/require-admin'

export type OperationalActionState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'image/jpeg',
  'image/png',
])
const MAX_DOCUMENT_SIZE = 7 * 1024 * 1024

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

function nullable(value: unknown, maxLength: number) {
  const output = clean(value, maxLength)
  return output || null
}

function nullableAmount(value: unknown) {
  const text = clean(value, 40)
  if (!text) return null
  const normalized = text.replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')
  const number = Number(normalized)
  return Number.isFinite(number) && number >= 0 && number <= 999_999_999_999 ? Math.round(number * 100) / 100 : Number.NaN
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime())
}

function safeFilename(value: string) {
  const extension = value.includes('.') ? `.${value.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}` : ''
  const base = value.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'documento'
  return `${base}${extension}`
}

async function audit(
  adminClient: ReturnType<typeof import('@/utils/supabase/admin').createAdminClient>,
  actorUserId: string,
  input: { empresaId?: string | null; accion: string; entidad: string; entidadId?: string | null; metadata?: Record<string, unknown> },
) {
  const { error } = await adminClient.from('auditoria_eventos').insert({
    actor_user_id: actorUserId,
    empresa_id: input.empresaId ?? null,
    accion: input.accion,
    entidad: input.entidad,
    entidad_id: input.entidadId ?? null,
    metadata: input.metadata ?? {},
  })
  if (error) console.error('No fue posible registrar auditoría:', error.message)
}

export async function actualizarCliente(
  _previousState: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin()
    const empresaId = clean(formData.get('empresa_id'), 40)
    if (!UUID_PATTERN.test(empresaId)) return { status: 'error', message: 'Cliente inválido.' }

    const emailContacto = clean(formData.get('email_contacto'), 254).toLowerCase()
    if (emailContacto && !EMAIL_PATTERN.test(emailContacto)) return { status: 'error', message: 'El correo de contacto no es válido.' }

    const honorario = nullableAmount(formData.get('honorario_mensual'))
    if (Number.isNaN(honorario)) return { status: 'error', message: 'El honorario mensual no es válido.' }

    const diaPagoText = clean(formData.get('dia_pago'), 2)
    const diaPago = diaPagoText ? Number(diaPagoText) : null
    if (diaPago !== null && (!Number.isInteger(diaPago) || diaPago < 1 || diaPago > 31)) {
      return { status: 'error', message: 'El día de pago debe estar entre 1 y 31.' }
    }

    const estadoCliente = clean(formData.get('estado_cliente'), 40)
    const allowedStates = ['En incorporación', 'Activo', 'Requiere atención', 'Suspendido', 'Archivado']
    if (!allowedStates.includes(estadoCliente)) return { status: 'error', message: 'Estado de cliente inválido.' }

    const { error } = await adminClient.from('empresas').update({
      nombre_fantasia: nullable(formData.get('nombre_fantasia'), 160),
      tipo_sociedad: nullable(formData.get('tipo_sociedad'), 80),
      giro: nullable(formData.get('giro'), 250),
      regimen_tributario: nullable(formData.get('regimen_tributario'), 120),
      inicio_actividades: validDate(clean(formData.get('inicio_actividades'), 10)) ? clean(formData.get('inicio_actividades'), 10) : null,
      direccion: nullable(formData.get('direccion'), 250),
      comuna: nullable(formData.get('comuna'), 100),
      ciudad: nullable(formData.get('ciudad'), 100),
      representante_legal: nullable(formData.get('representante_legal'), 160),
      representante_rut: nullable(formData.get('representante_rut'), 20),
      telefono: nullable(formData.get('telefono'), 40),
      email_contacto: emailContacto || null,
      contador_asignado: nullable(formData.get('contador_asignado'), 160),
      ejecutivo_asignado: nullable(formData.get('ejecutivo_asignado'), 160),
      estado_cliente: estadoCliente,
      plan_servicio: nullable(formData.get('plan_servicio'), 160),
      honorario_mensual: honorario,
      dia_pago: diaPago,
      notas_internas: nullable(formData.get('notas_internas'), 4000),
      estado_impuestos: clean(formData.get('estado_impuestos'), 60) || 'Pendiente',
      ultima_actividad_at: new Date().toISOString(),
    }).eq('id', empresaId).eq('es_admin', false)

    if (error) throw error
    await audit(adminClient, actorUserId, { empresaId, accion: 'actualizar', entidad: 'empresa', entidadId: empresaId })
    revalidatePath('/admin')
    revalidatePath('/admin/clientes')
    revalidatePath(`/admin/clientes/${empresaId}`)
    revalidatePath('/dashboard')
    return { status: 'success', message: 'Ficha del cliente actualizada correctamente.' }
  } catch (error) {
    console.error('Error al actualizar cliente:', error)
    return { status: 'error', message: 'No fue posible actualizar la ficha.' }
  }
}

export async function crearObligacion(
  _previousState: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin()
    const empresaId = clean(formData.get('empresa_id'), 40)
    const titulo = clean(formData.get('titulo'), 180)
    const tipo = clean(formData.get('tipo'), 100)
    const fecha = clean(formData.get('fecha_vencimiento'), 10)
    const prioridad = clean(formData.get('prioridad'), 20) || 'Media'
    const monto = nullableAmount(formData.get('monto'))

    if (!UUID_PATTERN.test(empresaId) || titulo.length < 2 || tipo.length < 2 || !validDate(fecha)) {
      return { status: 'error', message: 'Complete título, tipo y fecha de vencimiento.' }
    }
    if (!['Baja', 'Media', 'Alta', 'Crítica'].includes(prioridad)) return { status: 'error', message: 'Prioridad inválida.' }
    if (Number.isNaN(monto)) return { status: 'error', message: 'Monto inválido.' }

    const { data, error } = await adminClient.from('obligaciones').insert({
      empresa_id: empresaId,
      titulo,
      tipo,
      periodo: nullable(formData.get('periodo'), 80),
      fecha_vencimiento: fecha,
      estado: 'Pendiente',
      prioridad,
      monto,
      requiere_accion_cliente: formData.get('requiere_accion_cliente') === 'on',
      descripcion: nullable(formData.get('descripcion'), 1500),
    }).select('id').single()

    if (error) throw error
    await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'obligacion', entidadId: data.id })
    revalidatePath('/admin')
    revalidatePath('/admin/operaciones')
    revalidatePath(`/admin/clientes/${empresaId}`)
    revalidatePath('/dashboard')
    return { status: 'success', message: 'Obligación creada.' }
  } catch (error) {
    console.error('Error al crear obligación:', error)
    return { status: 'error', message: 'No fue posible crear la obligación.' }
  }
}

export async function cambiarEstadoObligacion(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin()
  const id = clean(formData.get('id'), 40)
  const empresaId = clean(formData.get('empresa_id'), 40)
  const estado = clean(formData.get('estado'), 40)
  const allowed = ['Pendiente', 'En proceso', 'Esperando cliente', 'Presentada', 'Pagada', 'No aplica', 'Vencida']
  if (!UUID_PATTERN.test(id) || !allowed.includes(estado)) throw new Error('INVALID_OBLIGATION_STATUS')
  const { error } = await adminClient.from('obligaciones').update({
    estado,
    completada_at: ['Presentada', 'Pagada', 'No aplica'].includes(estado) ? new Date().toISOString() : null,
  }).eq('id', id)
  if (error) throw error
  await audit(adminClient, actorUserId, { empresaId: UUID_PATTERN.test(empresaId) ? empresaId : null, accion: 'cambiar_estado', entidad: 'obligacion', entidadId: id, metadata: { estado } })
  revalidatePath('/admin')
  revalidatePath('/admin/operaciones')
  if (UUID_PATTERN.test(empresaId)) revalidatePath(`/admin/clientes/${empresaId}`)
  revalidatePath('/dashboard')
}

export async function crearTarea(
  _previousState: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin()
    const empresaId = clean(formData.get('empresa_id'), 40)
    const titulo = clean(formData.get('titulo'), 180)
    const fecha = clean(formData.get('fecha_vencimiento'), 10)
    const prioridad = clean(formData.get('prioridad'), 20) || 'Media'
    if (!UUID_PATTERN.test(empresaId) || titulo.length < 2) return { status: 'error', message: 'Ingrese un título válido.' }
    if (fecha && !validDate(fecha)) return { status: 'error', message: 'Fecha inválida.' }
    if (!['Baja', 'Media', 'Alta', 'Crítica'].includes(prioridad)) return { status: 'error', message: 'Prioridad inválida.' }

    const { data, error } = await adminClient.from('tareas').insert({
      empresa_id: empresaId,
      titulo,
      descripcion: nullable(formData.get('descripcion'), 1500),
      responsable: nullable(formData.get('responsable'), 160),
      fecha_vencimiento: fecha || null,
      estado: 'Pendiente',
      prioridad,
    }).select('id').single()
    if (error) throw error
    await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'tarea', entidadId: data.id })
    revalidatePath('/admin')
    revalidatePath('/admin/operaciones')
    revalidatePath(`/admin/clientes/${empresaId}`)
    return { status: 'success', message: 'Tarea creada.' }
  } catch (error) {
    console.error('Error al crear tarea:', error)
    return { status: 'error', message: 'No fue posible crear la tarea.' }
  }
}

export async function cambiarEstadoTarea(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin()
  const id = clean(formData.get('id'), 40)
  const empresaId = clean(formData.get('empresa_id'), 40)
  const estado = clean(formData.get('estado'), 40)
  if (!UUID_PATTERN.test(id) || !['Pendiente', 'En curso', 'Bloqueada', 'Completada'].includes(estado)) throw new Error('INVALID_TASK_STATUS')
  const { error } = await adminClient.from('tareas').update({ estado }).eq('id', id)
  if (error) throw error
  await audit(adminClient, actorUserId, { empresaId: UUID_PATTERN.test(empresaId) ? empresaId : null, accion: 'cambiar_estado', entidad: 'tarea', entidadId: id, metadata: { estado } })
  revalidatePath('/admin')
  revalidatePath('/admin/operaciones')
  if (UUID_PATTERN.test(empresaId)) revalidatePath(`/admin/clientes/${empresaId}`)
}

export async function crearSolicitudDocumento(
  _previousState: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin()
    const empresaId = clean(formData.get('empresa_id'), 40)
    const titulo = clean(formData.get('titulo'), 180)
    const categoria = clean(formData.get('categoria'), 40)
    const fecha = clean(formData.get('fecha_limite'), 10)
    if (!UUID_PATTERN.test(empresaId) || titulo.length < 2) return { status: 'error', message: 'Ingrese un título válido.' }
    if (!['Impuestos', 'Remuneraciones', 'Legal'].includes(categoria)) return { status: 'error', message: 'Categoría inválida.' }
    if (fecha && !validDate(fecha)) return { status: 'error', message: 'Fecha inválida.' }

    const { data, error } = await adminClient.from('solicitudes_documentos').insert({
      empresa_id: empresaId,
      titulo,
      descripcion: nullable(formData.get('descripcion'), 1500),
      categoria,
      periodo: nullable(formData.get('periodo'), 80),
      fecha_limite: fecha || null,
      estado: 'Solicitado',
      solicitado_por: actorUserId,
    }).select('id').single()
    if (error) throw error
    await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'solicitud_documento', entidadId: data.id })
    revalidatePath('/admin')
    revalidatePath(`/admin/clientes/${empresaId}`)
    revalidatePath('/dashboard')
    return { status: 'success', message: 'Solicitud enviada al portal del cliente.' }
  } catch (error) {
    console.error('Error al crear solicitud:', error)
    return { status: 'error', message: 'No fue posible crear la solicitud.' }
  }
}

export async function cambiarEstadoSolicitud(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin()
  const id = clean(formData.get('id'), 40)
  const empresaId = clean(formData.get('empresa_id'), 40)
  const estado = clean(formData.get('estado'), 40)
  if (!UUID_PATTERN.test(id) || !['Solicitado', 'Recibido', 'En revisión', 'Observado', 'Aprobado', 'Vencido'].includes(estado)) throw new Error('INVALID_REQUEST_STATUS')
  const { error } = await adminClient.from('solicitudes_documentos').update({ estado }).eq('id', id)
  if (error) throw error
  await audit(adminClient, actorUserId, { empresaId: UUID_PATTERN.test(empresaId) ? empresaId : null, accion: 'cambiar_estado', entidad: 'solicitud_documento', entidadId: id, metadata: { estado } })
  if (UUID_PATTERN.test(empresaId)) revalidatePath(`/admin/clientes/${empresaId}`)
  revalidatePath('/dashboard')
}

export async function cargarDocumentoAdministrador(
  _previousState: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin()
    const empresaId = clean(formData.get('empresa_id'), 40)
    const categoria = clean(formData.get('categoria'), 40)
    const file = formData.get('archivo')
    if (!UUID_PATTERN.test(empresaId)) return { status: 'error', message: 'Cliente inválido.' }
    if (!['Impuestos', 'Remuneraciones', 'Legal'].includes(categoria)) return { status: 'error', message: 'Categoría inválida.' }
    if (!(file instanceof File) || file.size === 0) return { status: 'error', message: 'Seleccione un archivo.' }
    if (file.size > MAX_DOCUMENT_SIZE) return { status: 'error', message: 'El archivo no puede superar 7 MB.' }
    if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) return { status: 'error', message: 'Formato no permitido.' }

    const filename = safeFilename(file.name)
    const storagePath = `${empresaId}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${filename}`
    const { error: uploadError } = await adminClient.storage.from('documentos').upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })
    if (uploadError) throw uploadError

    const { data, error: insertError } = await adminClient.from('documentos').insert({
      empresa_id: empresaId,
      nombre_original: file.name.slice(0, 255),
      storage_path: storagePath,
      categoria,
      periodo: nullable(formData.get('periodo'), 80),
      descripcion: nullable(formData.get('descripcion'), 1000),
      uploaded_by: actorUserId,
      mime_type: file.type,
      file_size: file.size,
      visible_cliente: true,
    }).select('id').single()

    if (insertError) {
      await adminClient.storage.from('documentos').remove([storagePath])
      throw insertError
    }

    await audit(adminClient, actorUserId, { empresaId, accion: 'cargar', entidad: 'documento', entidadId: data.id, metadata: { categoria, nombre: file.name } })
    revalidatePath(`/admin/clientes/${empresaId}`)
    revalidatePath('/dashboard')
    return { status: 'success', message: 'Documento publicado en el portal del cliente.' }
  } catch (error) {
    console.error('Error al cargar documento:', error)
    return { status: 'error', message: 'No fue posible cargar el documento.' }
  }
}

export async function cambiarEstadoLead(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin()
  const id = clean(formData.get('id'), 40)
  const estado = clean(formData.get('estado'), 40)
  const allowed = ['Nuevo', 'Contactado', 'Evaluación', 'Propuesta enviada', 'Ganado', 'Descartado']
  if (!UUID_PATTERN.test(id) || !allowed.includes(estado)) throw new Error('INVALID_LEAD_STATUS')
  const { error } = await adminClient.from('leads').update({ estado }).eq('id', id)
  if (error) throw error
  await audit(adminClient, actorUserId, { accion: 'cambiar_estado', entidad: 'lead', entidadId: id, metadata: { estado } })
  revalidatePath('/admin')
  revalidatePath('/admin/leads')
}

export async function crearServicio(
  _previousState: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin()
    const empresaId = clean(formData.get('empresa_id'), 40)
    const nombre = clean(formData.get('nombre'), 160)
    const honorario = nullableAmount(formData.get('honorario_mensual'))
    const fechaInicio = clean(formData.get('fecha_inicio'), 10)
    if (!UUID_PATTERN.test(empresaId) || nombre.length < 2) return { status: 'error', message: 'Ingrese un servicio válido.' }
    if (Number.isNaN(honorario)) return { status: 'error', message: 'Honorario inválido.' }
    if (fechaInicio && !validDate(fechaInicio)) return { status: 'error', message: 'Fecha inválida.' }

    const { data, error } = await adminClient.from('servicios_contratados').insert({
      empresa_id: empresaId,
      nombre,
      descripcion: nullable(formData.get('descripcion'), 1200),
      estado: 'Activo',
      fecha_inicio: fechaInicio || null,
      honorario_mensual: honorario,
    }).select('id').single()
    if (error) throw error
    await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'servicio', entidadId: data.id })
    revalidatePath(`/admin/clientes/${empresaId}`)
    revalidatePath('/dashboard')
    return { status: 'success', message: 'Servicio agregado.' }
  } catch (error) {
    console.error('Error al crear servicio:', error)
    return { status: 'error', message: 'No fue posible agregar el servicio.' }
  }
}
