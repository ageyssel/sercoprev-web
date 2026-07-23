'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { notifyAdmins } from '@/lib/notifications'
import { revokeCurrentStaffMfaSession } from '@/lib/staff-mfa'
import { createClient } from '@/utils/supabase/server'
import { requireClientCompany } from '@/utils/supabase/require-client'

export type ClientActionState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_DOCUMENT_SIZE = 7 * 1024 * 1024
const ALLOWED_DOCUMENT_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'image/jpeg',
  'image/png',
])

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

function safeFilename(value: string) {
  const extension = value.includes('.') ? `.${value.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)}` : ''
  const base = value.replace(/\.[^.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'documento'
  return `${base}${extension}`
}

export async function signOut() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await revokeCurrentStaffMfaSession(user?.id)
  await supabase.auth.signOut()
  return redirect('/login')
}

export async function responderSolicitudDocumento(
  _previousState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  try {
    const { sessionClient, adminClient, user, company, role } = await requireClientCompany()
    if (role === 'Solo lectura') return { status: 'error', message: 'Su rol es de solo lectura y no puede cargar archivos.' }

    const solicitudId = clean(formData.get('solicitud_id'), 40)
    const file = formData.get('archivo')
    if (!UUID_PATTERN.test(solicitudId)) return { status: 'error', message: 'Solicitud inválida.' }
    if (!(file instanceof File) || file.size === 0) return { status: 'error', message: 'Seleccione un archivo.' }
    if (file.size > MAX_DOCUMENT_SIZE) return { status: 'error', message: 'El archivo no puede superar 7 MB.' }
    if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) return { status: 'error', message: 'Formato no permitido.' }

    const { data: request, error: requestError } = await sessionClient
      .from('solicitudes_documentos')
      .select('id, empresa_id, titulo, categoria, periodo, estado')
      .eq('id', solicitudId)
      .eq('empresa_id', company.id)
      .single()

    if (requestError || !request || ['Aprobado', 'Vencido'].includes(request.estado)) {
      return { status: 'error', message: 'La solicitud ya no está disponible.' }
    }

    const filename = safeFilename(file.name)
    const storagePath = `${company.id}/cliente/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${filename}`
    const { error: uploadError } = await adminClient.storage.from('documentos').upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })
    if (uploadError) throw uploadError

    const { data: document, error: insertError } = await adminClient.from('documentos').insert({
      empresa_id: company.id,
      nombre_original: file.name.slice(0, 255),
      storage_path: storagePath,
      categoria: request.categoria,
      periodo: request.periodo,
      descripcion: `Respuesta a solicitud: ${request.titulo}`,
      uploaded_by: user.id,
      solicitud_id: request.id,
      mime_type: file.type,
      file_size: file.size,
      visible_cliente: true,
      fuente_carga: 'Portal cliente',
      clasificacion_estado: 'Confirmada',
    }).select('id').single()

    if (insertError) {
      await adminClient.storage.from('documentos').remove([storagePath])
      throw insertError
    }

    const { error: updateError } = await adminClient.from('solicitudes_documentos').update({ estado: 'Recibido' }).eq('id', request.id)
    if (updateError) throw updateError

    await adminClient.from('auditoria_eventos').insert({
      actor_user_id: user.id,
      empresa_id: company.id,
      accion: 'responder',
      entidad: 'solicitud_documento',
      entidad_id: request.id,
      metadata: { documento_id: document.id, nombre: file.name, rol_cliente: role },
    })

    await notifyAdmins({
      adminClient,
      empresaId: company.id,
      event: 'cliente_cargo_antecedente',
      subject: `Antecedente recibido: ${request.titulo}`,
      title: 'Un cliente respondió una solicitud documental',
      paragraphs: [
        `${company.name} cargó un archivo para atender una solicitud pendiente.`,
        'El estado fue actualizado automáticamente a Recibido y el documento ya está disponible para revisión.',
      ],
      details: [
        { label: 'Empresa', value: company.name },
        { label: 'Solicitud', value: request.titulo },
        { label: 'Archivo', value: file.name.slice(0, 255) },
        { label: 'Categoría', value: request.categoria },
        { label: 'Periodo', value: request.periodo },
      ],
      ctaLabel: 'Revisar ficha del cliente',
      ctaUrl: `${process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'}/admin/clientes/${company.id}`,
    })

    revalidatePath('/dashboard')
    revalidatePath(`/admin/clientes/${company.id}`)
    revalidatePath('/admin/operaciones')
    revalidatePath('/admin/notificaciones')
    return { status: 'success', message: 'Documento enviado correctamente. SERCOPREV lo revisará.' }
  } catch (error) {
    console.error('Error al responder solicitud documental:', error)
    return { status: 'error', message: 'No fue posible enviar el documento.' }
  }
}
