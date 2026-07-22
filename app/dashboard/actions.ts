'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

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
  await supabase.auth.signOut()
  return redirect('/login')
}

export async function responderSolicitudDocumento(
  _previousState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { status: 'error', message: 'Su sesión expiró. Ingrese nuevamente.' }

    const { data: empresa, error: companyError } = await supabase
      .from('empresas')
      .select('id, es_admin')
      .eq('user_id', user.id)
      .single()

    if (companyError || !empresa || empresa.es_admin) return { status: 'error', message: 'Cuenta de empresa inválida.' }

    const solicitudId = clean(formData.get('solicitud_id'), 40)
    const file = formData.get('archivo')
    if (!UUID_PATTERN.test(solicitudId)) return { status: 'error', message: 'Solicitud inválida.' }
    if (!(file instanceof File) || file.size === 0) return { status: 'error', message: 'Seleccione un archivo.' }
    if (file.size > MAX_DOCUMENT_SIZE) return { status: 'error', message: 'El archivo no puede superar 7 MB.' }
    if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) return { status: 'error', message: 'Formato no permitido.' }

    const { data: request, error: requestError } = await supabase
      .from('solicitudes_documentos')
      .select('id, empresa_id, titulo, categoria, periodo, estado')
      .eq('id', solicitudId)
      .eq('empresa_id', empresa.id)
      .single()

    if (requestError || !request || ['Aprobado', 'Vencido'].includes(request.estado)) {
      return { status: 'error', message: 'La solicitud ya no está disponible.' }
    }

    const adminClient = createAdminClient()
    const filename = safeFilename(file.name)
    const storagePath = `${empresa.id}/cliente/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${filename}`
    const { error: uploadError } = await adminClient.storage.from('documentos').upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })
    if (uploadError) throw uploadError

    const { data: document, error: insertError } = await adminClient.from('documentos').insert({
      empresa_id: empresa.id,
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
    }).select('id').single()

    if (insertError) {
      await adminClient.storage.from('documentos').remove([storagePath])
      throw insertError
    }

    const { error: updateError } = await adminClient.from('solicitudes_documentos').update({ estado: 'Recibido' }).eq('id', request.id)
    if (updateError) throw updateError

    await adminClient.from('auditoria_eventos').insert({
      actor_user_id: user.id,
      empresa_id: empresa.id,
      accion: 'responder',
      entidad: 'solicitud_documento',
      entidad_id: request.id,
      metadata: { documento_id: document.id, nombre: file.name },
    })

    revalidatePath('/dashboard')
    revalidatePath(`/admin/clientes/${empresa.id}`)
    return { status: 'success', message: 'Documento enviado correctamente. SERCOPREV lo revisará.' }
  } catch (error) {
    console.error('Error al responder solicitud documental:', error)
    return { status: 'error', message: 'No fue posible enviar el documento.' }
  }
}
