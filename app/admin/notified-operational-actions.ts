'use server'

import { revalidatePath } from 'next/cache'
import { notifyCompany } from '@/lib/notifications'
import { requireAdmin } from '@/utils/supabase/require-admin'
import type { OperationalActionState } from '@/app/admin/operational-actions'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
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
  adminClient: Awaited<ReturnType<typeof requireAdmin>>['adminClient'],
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

export async function crearObligacionNotificada(
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
    const requiereAccionCliente = formData.get('requiere_accion_cliente') === 'on'
    const descripcion = nullable(formData.get('descripcion'), 1500)
    const periodo = nullable(formData.get('periodo'), 80)

    if (!UUID_PATTERN.test(empresaId) || titulo.length < 2 || tipo.length < 2 || !validDate(fecha)) {
      return { status: 'error', message: 'Complete título, tipo y fecha de vencimiento.' }
    }
    if (!['Baja', 'Media', 'Alta', 'Crítica'].includes(prioridad)) return { status: 'error', message: 'Prioridad inválida.' }
    if (Number.isNaN(monto)) return { status: 'error', message: 'Monto inválido.' }

    const { data, error } = await adminClient.from('obligaciones').insert({
      empresa_id: empresaId,
      titulo,
      tipo,
      periodo,
      fecha_vencimiento: fecha,
      estado: 'Pendiente',
      prioridad,
      monto,
      requiere_accion_cliente: requiereAccionCliente,
      descripcion,
    }).select('id').single()

    if (error) throw error
    await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'obligacion', entidadId: data.id })

    if (requiereAccionCliente) {
      await notifyCompany({
        adminClient,
        empresaId,
        event: 'obligacion_requiere_accion',
        subject: `Acción requerida: ${titulo}`,
        title: 'Hay una obligación que requiere su atención',
        paragraphs: [
          'SERCOPREV registró una obligación que necesita información, antecedentes o una acción de su empresa.',
          descripcion || 'Revise el detalle en su portal y comuníquese con el equipo si necesita orientación.',
        ],
        details: [
          { label: 'Obligación', value: titulo },
          { label: 'Tipo', value: tipo },
          { label: 'Periodo', value: periodo },
          { label: 'Vencimiento', value: fecha },
          { label: 'Prioridad', value: prioridad },
        ],
        ctaLabel: 'Revisar obligación',
        ctaUrl: `${process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'}/dashboard`,
      })
    }

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

export async function crearTareaProgramada(
  _previousState: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin()
    const empresaId = clean(formData.get('empresa_id'), 40)
    const titulo = clean(formData.get('titulo'), 180)
    const fecha = clean(formData.get('fecha_vencimiento'), 10)
    const prioridad = clean(formData.get('prioridad'), 20) || 'Media'
    const responsable = nullable(formData.get('responsable'), 160)
    const descripcion = nullable(formData.get('descripcion'), 1500)
    const recurrencia = clean(formData.get('recurrencia'), 20) || 'Una vez'
    const mesesAnticipacion = Number(clean(formData.get('meses_anticipacion'), 2) || '6')

    if (!UUID_PATTERN.test(empresaId) || titulo.length < 2) return { status: 'error', message: 'Ingrese un título válido.' }
    if (fecha && !validDate(fecha)) return { status: 'error', message: 'Fecha inválida.' }
    if (!['Baja', 'Media', 'Alta', 'Crítica'].includes(prioridad)) return { status: 'error', message: 'Prioridad inválida.' }
    if (!['Una vez', 'Mensual'].includes(recurrencia)) return { status: 'error', message: 'Periodicidad inválida.' }

    if (recurrencia === 'Mensual') {
      if (!fecha) return { status: 'error', message: 'Defina la primera fecha de vencimiento de la serie mensual.' }
      if (![3, 6, 12].includes(mesesAnticipacion)) return { status: 'error', message: 'Seleccione una anticipación válida.' }

      const firstDate = new Date(`${fecha}T12:00:00Z`)
      const { data: series, error: seriesError } = await adminClient.from('tarea_series').insert({
        empresa_id: empresaId,
        titulo,
        descripcion,
        responsable,
        prioridad,
        dia_vencimiento: firstDate.getUTCDate(),
        meses_anticipacion: mesesAnticipacion,
        fecha_inicio: fecha,
        activa: true,
      }).select('id').single()
      if (seriesError) throw seriesError

      const { error: materializationError } = await adminClient.rpc('materializar_tareas_recurrentes', { p_empresa_id: empresaId })
      if (materializationError) throw materializationError

      await audit(adminClient, actorUserId, {
        empresaId,
        accion: 'crear',
        entidad: 'tarea_serie',
        entidadId: series.id,
        metadata: { periodicidad: 'Mensual', meses_anticipacion: mesesAnticipacion },
      })
    } else {
      const { data, error } = await adminClient.from('tareas').insert({
        empresa_id: empresaId,
        titulo,
        descripcion,
        responsable,
        fecha_vencimiento: fecha || null,
        estado: 'Pendiente',
        prioridad,
        es_recurrente: false,
      }).select('id').single()
      if (error) throw error
      await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'tarea', entidadId: data.id })
    }

    revalidatePath('/admin')
    revalidatePath('/admin/operaciones')
    revalidatePath(`/admin/clientes/${empresaId}`)
    return {
      status: 'success',
      message: recurrencia === 'Mensual'
        ? `Serie mensual creada con ${mesesAnticipacion} meses de anticipación.`
        : 'Tarea creada.',
    }
  } catch (error) {
    console.error('Error al crear tarea:', error)
    return { status: 'error', message: 'No fue posible crear la tarea.' }
  }
}

export async function crearSolicitudDocumentoNotificada(
  _previousState: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin()
    const empresaId = clean(formData.get('empresa_id'), 40)
    const titulo = clean(formData.get('titulo'), 180)
    const categoria = clean(formData.get('categoria'), 40)
    const fecha = clean(formData.get('fecha_limite'), 10)
    const periodo = nullable(formData.get('periodo'), 80)
    const descripcion = nullable(formData.get('descripcion'), 1500)

    if (!UUID_PATTERN.test(empresaId) || titulo.length < 2) return { status: 'error', message: 'Ingrese un título válido.' }
    if (!['Impuestos', 'Remuneraciones', 'Legal'].includes(categoria)) return { status: 'error', message: 'Categoría inválida.' }
    if (fecha && !validDate(fecha)) return { status: 'error', message: 'Fecha inválida.' }

    const { data, error } = await adminClient.from('solicitudes_documentos').insert({
      empresa_id: empresaId,
      titulo,
      descripcion,
      categoria,
      periodo,
      fecha_limite: fecha || null,
      estado: 'Solicitado',
      solicitado_por: actorUserId,
    }).select('id').single()
    if (error) throw error

    await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'solicitud_documento', entidadId: data.id })
    await notifyCompany({
      adminClient,
      empresaId,
      event: 'solicitud_documento_creada',
      subject: `Solicitud pendiente: ${titulo}`,
      title: 'SERCOPREV solicita nuevos antecedentes',
      paragraphs: [
        'Se creó una solicitud documental que su empresa debe atender desde el Portal de Clientes.',
        descripcion || 'Revise el detalle, prepare el archivo solicitado y cárguelo directamente en el portal.',
      ],
      details: [
        { label: 'Documento', value: titulo },
        { label: 'Categoría', value: categoria },
        { label: 'Periodo', value: periodo },
        { label: 'Fecha límite', value: fecha || 'Sin fecha límite' },
      ],
      ctaLabel: 'Atender solicitud',
      ctaUrl: `${process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'}/dashboard`,
      whatsapp: {
        templateName: process.env.WHATSAPP_DOCUMENT_REQUEST_TEMPLATE,
        parameters: [titulo, fecha || 'Sin fecha límite', 'Revise el correo enviado por SERCOPREV'],
      },
    })

    revalidatePath('/admin')
    revalidatePath('/admin/operaciones')
    revalidatePath(`/admin/clientes/${empresaId}`)
    revalidatePath('/dashboard')
    return { status: 'success', message: 'Solicitud creada y notificaciones procesadas.' }
  } catch (error) {
    console.error('Error al crear solicitud:', error)
    return { status: 'error', message: 'No fue posible crear la solicitud.' }
  }
}

export async function cargarDocumentoAdministradorNotificado(
  _previousState: OperationalActionState,
  formData: FormData,
): Promise<OperationalActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin()
    const empresaId = clean(formData.get('empresa_id'), 40)
    const categoria = clean(formData.get('categoria'), 40)
    const periodo = nullable(formData.get('periodo'), 80)
    const descripcion = nullable(formData.get('descripcion'), 1000)
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
      periodo,
      descripcion,
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
    await notifyCompany({
      adminClient,
      empresaId,
      event: 'documento_publicado',
      subject: `Nuevo documento disponible: ${file.name.slice(0, 120)}`,
      title: 'SERCOPREV publicó nueva información',
      paragraphs: [
        'Hay un nuevo documento disponible para su empresa en el Portal de Clientes.',
        descripcion || 'Puede revisarlo y descargarlo de forma segura desde el centro documental.',
      ],
      details: [
        { label: 'Archivo', value: file.name.slice(0, 255) },
        { label: 'Categoría', value: categoria },
        { label: 'Periodo', value: periodo },
      ],
      ctaLabel: 'Revisar documentos',
      ctaUrl: `${process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'}/dashboard/documentos`,
    })

    revalidatePath(`/admin/clientes/${empresaId}`)
    revalidatePath('/dashboard')
    return { status: 'success', message: 'Documento publicado y notificación procesada.' }
  } catch (error) {
    console.error('Error al cargar documento:', error)
    return { status: 'error', message: 'No fue posible cargar el documento.' }
  }
}
