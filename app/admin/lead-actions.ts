'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/supabase/require-admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

async function audit(
  adminClient: Awaited<ReturnType<typeof requireAdmin>>['adminClient'],
  actorUserId: string,
  action: string,
  leadId: string,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await adminClient.from('auditoria_eventos').insert({
    actor_user_id: actorUserId,
    accion: action,
    entidad: 'lead',
    entidad_id: leadId,
    module: 'Clientes y comercial',
    description: action === 'eliminar' ? 'Prospecto enviado a papelera' : action === 'restaurar' ? 'Prospecto restaurado desde papelera' : 'Prospecto eliminado definitivamente',
    metadata,
  })
  if (error) console.error('LEAD_AUDIT_FAILED', error.message)
}

export async function eliminarLead(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador'])
  const id = clean(formData.get('id'), 40)
  const reason = clean(formData.get('motivo'), 500) || 'Eliminación desde bandeja de prospectos'
  if (!UUID_PATTERN.test(id)) throw new Error('INVALID_LEAD')

  const { data: lead, error: leadError } = await adminClient.from('leads').select('id, nombre, empresa, estado, deleted_at').eq('id', id).single()
  if (leadError || !lead || lead.deleted_at) throw new Error('LEAD_NOT_AVAILABLE')

  const { error } = await adminClient.from('leads').update({
    deleted_at: new Date().toISOString(),
    deleted_by: actorUserId,
    delete_reason: reason,
  }).eq('id', id).is('deleted_at', null)
  if (error) throw error

  await audit(adminClient, actorUserId, 'eliminar', id, { nombre: lead.nombre, empresa: lead.empresa, estado: lead.estado, motivo: reason })
  revalidatePath('/admin')
  revalidatePath('/admin/leads')
}

export async function restaurarLead(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador'])
  const id = clean(formData.get('id'), 40)
  if (!UUID_PATTERN.test(id)) throw new Error('INVALID_LEAD')

  const { error } = await adminClient.from('leads').update({
    deleted_at: null,
    deleted_by: null,
    delete_reason: null,
  }).eq('id', id).not('deleted_at', 'is', null)
  if (error) throw error

  await audit(adminClient, actorUserId, 'restaurar', id)
  revalidatePath('/admin')
  revalidatePath('/admin/leads')
}

export async function eliminarLeadDefinitivo(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin(['Superadministrador'])
  const id = clean(formData.get('id'), 40)
  if (!UUID_PATTERN.test(id)) throw new Error('INVALID_LEAD')

  const { data: lead, error: leadError } = await adminClient.from('leads').select('id, nombre, empresa, deleted_at').eq('id', id).single()
  if (leadError || !lead?.deleted_at) throw new Error('LEAD_NOT_IN_TRASH')

  await audit(adminClient, actorUserId, 'eliminar_definitivo', id, { nombre: lead.nombre, empresa: lead.empresa })
  const { error } = await adminClient.from('leads').delete().eq('id', id).not('deleted_at', 'is', null)
  if (error) throw error

  revalidatePath('/admin')
  revalidatePath('/admin/leads')
}
