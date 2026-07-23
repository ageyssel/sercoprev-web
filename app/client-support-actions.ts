'use server'

import { revalidatePath } from 'next/cache'
import type { SupportActionState } from '@/app/support-actions'
import { requireClientCompany } from '@/utils/supabase/require-client'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

async function audit(adminClient: Awaited<ReturnType<typeof requireClientCompany>>['adminClient'], actorUserId: string, input: { empresaId: string; accion: string; entidad: string; entidadId?: string | null }) {
  await adminClient.from('auditoria_eventos').insert({
    actor_user_id: actorUserId,
    empresa_id: input.empresaId,
    accion: input.accion,
    entidad: input.entidad,
    entidad_id: input.entidadId ?? null,
    metadata: {},
  })
}

export async function crearTicketCliente(
  _previousState: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const { adminClient, user, company, role } = await requireClientCompany()
    if (role === 'Solo lectura') return { status: 'error', message: 'Su rol es de solo lectura y no puede crear consultas.' }

    const asunto = clean(formData.get('asunto'), 180)
    const categoria = clean(formData.get('categoria'), 80)
    const prioridad = clean(formData.get('prioridad'), 20) || 'Media'
    const mensaje = clean(formData.get('mensaje'), 5000)
    const categories = ['Contabilidad', 'Impuestos', 'Remuneraciones', 'Documentos', 'Legal', 'Cobranza', 'Consulta general']
    if (asunto.length < 3 || mensaje.length < 3 || !categories.includes(categoria)) return { status: 'error', message: 'Complete asunto, categoría y mensaje.' }
    if (!['Baja', 'Media', 'Alta', 'Crítica'].includes(prioridad)) return { status: 'error', message: 'Prioridad inválida.' }

    const { data: ticket, error: ticketError } = await adminClient.from('tickets').insert({
      empresa_id: company.id,
      creado_por: user.id,
      asunto,
      categoria,
      prioridad,
      estado: 'Abierto',
    }).select('id').single()
    if (ticketError) throw ticketError

    const { error: messageError } = await adminClient.from('ticket_mensajes').insert({
      ticket_id: ticket.id,
      autor_user_id: user.id,
      autor_tipo: 'Cliente',
      mensaje,
    })
    if (messageError) {
      await adminClient.from('tickets').delete().eq('id', ticket.id)
      throw messageError
    }

    await audit(adminClient, user.id, { empresaId: company.id, accion: 'crear', entidad: 'ticket', entidadId: ticket.id })
    revalidatePath('/dashboard/consultas')
    revalidatePath('/admin/tickets')
    return { status: 'success', message: 'Consulta enviada. SERCOPREV responderá desde este mismo hilo.' }
  } catch (error) {
    console.error('Error al crear ticket:', error)
    return { status: 'error', message: 'No fue posible enviar la consulta.' }
  }
}

export async function responderTicketCliente(
  _previousState: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const { sessionClient, adminClient, user, company, role } = await requireClientCompany()
    if (role === 'Solo lectura') return { status: 'error', message: 'Su rol es de solo lectura y no puede responder consultas.' }

    const ticketId = clean(formData.get('ticket_id'), 40)
    const mensaje = clean(formData.get('mensaje'), 5000)
    if (!UUID_PATTERN.test(ticketId) || mensaje.length < 1) return { status: 'error', message: 'Respuesta inválida.' }

    const { data: ticket, error } = await sessionClient.from('tickets').select('id, estado').eq('id', ticketId).eq('empresa_id', company.id).single()
    if (error || !ticket || ticket.estado === 'Cerrado') return { status: 'error', message: 'La consulta ya no admite respuestas.' }

    const { error: insertError } = await adminClient.from('ticket_mensajes').insert({
      ticket_id: ticketId,
      autor_user_id: user.id,
      autor_tipo: 'Cliente',
      mensaje,
    })
    if (insertError) throw insertError

    await audit(adminClient, user.id, { empresaId: company.id, accion: 'responder', entidad: 'ticket', entidadId: ticketId })
    revalidatePath('/dashboard/consultas')
    revalidatePath('/admin/tickets')
    return { status: 'success', message: 'Respuesta enviada.' }
  } catch (error) {
    console.error('Error al responder ticket:', error)
    return { status: 'error', message: 'No fue posible enviar la respuesta.' }
  }
}
