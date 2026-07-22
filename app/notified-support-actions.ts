'use server'

import {
  cambiarEstadoHonorario,
  cambiarEstadoTicket,
  crearHonorario,
  crearTicketCliente,
  responderTicketAdmin,
  responderTicketCliente,
  type SupportActionState,
} from '@/app/support-actions'
import { notifyAdmins, notifyCompany } from '@/lib/notifications'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireAdmin } from '@/utils/supabase/require-admin'
import { createClient } from '@/utils/supabase/server'

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

async function currentClientContext() {
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return null

  const { data: company } = await sessionClient
    .from('empresas')
    .select('id, razon_social, nombre_fantasia, es_admin')
    .eq('user_id', user.id)
    .single()

  if (!company || company.es_admin) return null
  return { user, company, adminClient: createAdminClient() }
}

export async function crearHonorarioNotificado(
  previousState: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  const result = await crearHonorario(previousState, formData)
  if (result.status !== 'success') return result

  try {
    const { adminClient } = await requireAdmin()
    const empresaId = clean(formData.get('empresa_id'), 40)
    const periodo = clean(formData.get('periodo'), 80)
    const concepto = clean(formData.get('concepto'), 180) || 'Honorarios profesionales'
    const monto = clean(formData.get('monto'), 40)
    const vencimiento = clean(formData.get('fecha_vencimiento'), 10)
    const notas = clean(formData.get('notas'), 1500)

    await notifyCompany({
      adminClient,
      empresaId,
      event: 'honorario_creado',
      subject: `Nuevo honorario disponible: ${periodo}`,
      title: 'SERCOPREV registró un nuevo honorario',
      paragraphs: [
        'El detalle del cobro ya se encuentra disponible en el Portal de Clientes.',
        notas || 'Revise el concepto, monto y fecha de vencimiento desde su cuenta.',
      ],
      details: [
        { label: 'Periodo', value: periodo },
        { label: 'Concepto', value: concepto },
        { label: 'Monto', value: monto ? `$${monto}` : null },
        { label: 'Vencimiento', value: vencimiento },
      ],
      ctaLabel: 'Revisar honorarios',
      ctaUrl: `${process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'}/dashboard/cobranza`,
    })
  } catch (error) {
    console.error('El honorario fue creado, pero no se pudo procesar la notificación:', error)
  }

  return result
}

export async function cambiarEstadoHonorarioNotificado(formData: FormData) {
  await cambiarEstadoHonorario(formData)

  try {
    const { adminClient } = await requireAdmin()
    const empresaId = clean(formData.get('empresa_id'), 40)
    const estado = clean(formData.get('estado'), 40)

    await notifyCompany({
      adminClient,
      empresaId,
      event: 'honorario_estado',
      subject: `Estado de honorario actualizado: ${estado}`,
      title: 'Se actualizó el estado de un honorario',
      paragraphs: ['SERCOPREV actualizó la información de cobranza disponible para su empresa.'],
      details: [{ label: 'Nuevo estado', value: estado }],
      ctaLabel: 'Revisar cobranza',
      ctaUrl: `${process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'}/dashboard/cobranza`,
    })
  } catch (error) {
    console.error('El estado fue actualizado, pero no se pudo procesar la notificación:', error)
  }
}

export async function crearTicketClienteNotificado(
  previousState: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  const result = await crearTicketCliente(previousState, formData)
  if (result.status !== 'success') return result

  try {
    const context = await currentClientContext()
    if (!context) return result
    const asunto = clean(formData.get('asunto'), 180)
    const categoria = clean(formData.get('categoria'), 80)
    const prioridad = clean(formData.get('prioridad'), 20)
    const mensaje = clean(formData.get('mensaje'), 5000)

    await notifyAdmins({
      adminClient: context.adminClient,
      empresaId: context.company.id,
      event: 'ticket_cliente_creado',
      subject: `Nueva consulta: ${asunto}`,
      title: 'Un cliente abrió una nueva consulta',
      paragraphs: [
        `${context.company.nombre_fantasia || context.company.razon_social} envió una consulta desde el portal.`,
        mensaje,
      ],
      details: [
        { label: 'Empresa', value: context.company.nombre_fantasia || context.company.razon_social },
        { label: 'Categoría', value: categoria },
        { label: 'Prioridad', value: prioridad },
      ],
      ctaLabel: 'Responder consulta',
      ctaUrl: `${process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'}/admin/tickets`,
    })
  } catch (error) {
    console.error('La consulta fue creada, pero no se pudo procesar la notificación:', error)
  }

  return result
}

export async function responderTicketClienteNotificado(
  previousState: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  const result = await responderTicketCliente(previousState, formData)
  if (result.status !== 'success') return result

  try {
    const context = await currentClientContext()
    if (!context) return result
    const ticketId = clean(formData.get('ticket_id'), 40)
    const mensaje = clean(formData.get('mensaje'), 5000)
    const { data: ticket } = await context.adminClient.from('tickets').select('asunto').eq('id', ticketId).eq('empresa_id', context.company.id).maybeSingle()

    await notifyAdmins({
      adminClient: context.adminClient,
      empresaId: context.company.id,
      event: 'ticket_cliente_respuesta',
      subject: `Nueva respuesta del cliente: ${ticket?.asunto || 'Consulta'}`,
      title: 'Un cliente respondió una consulta',
      paragraphs: [
        `${context.company.nombre_fantasia || context.company.razon_social} agregó información a una conversación existente.`,
        mensaje,
      ],
      ctaLabel: 'Revisar conversación',
      ctaUrl: `${process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'}/admin/tickets`,
    })
  } catch (error) {
    console.error('La respuesta fue publicada, pero no se pudo procesar la notificación:', error)
  }

  return result
}

export async function responderTicketAdminNotificado(
  previousState: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  const result = await responderTicketAdmin(previousState, formData)
  if (result.status !== 'success') return result

  try {
    const { adminClient } = await requireAdmin()
    const empresaId = clean(formData.get('empresa_id'), 40)
    const ticketId = clean(formData.get('ticket_id'), 40)
    const mensaje = clean(formData.get('mensaje'), 5000)
    const { data: ticket } = await adminClient.from('tickets').select('asunto').eq('id', ticketId).eq('empresa_id', empresaId).maybeSingle()

    await notifyCompany({
      adminClient,
      empresaId,
      event: 'ticket_admin_respuesta',
      subject: `SERCOPREV respondió: ${ticket?.asunto || 'Su consulta'}`,
      title: 'Hay una nueva respuesta en su portal',
      paragraphs: [
        'El equipo SERCOPREV respondió una consulta de su empresa.',
        mensaje,
      ],
      ctaLabel: 'Leer respuesta',
      ctaUrl: `${process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'}/dashboard/consultas`,
    })
  } catch (error) {
    console.error('La respuesta fue publicada, pero no se pudo procesar la notificación:', error)
  }

  return result
}

export async function cambiarEstadoTicketNotificado(formData: FormData) {
  await cambiarEstadoTicket(formData)

  try {
    const { adminClient } = await requireAdmin()
    const empresaId = clean(formData.get('empresa_id'), 40)
    const ticketId = clean(formData.get('ticket_id'), 40)
    const estado = clean(formData.get('estado'), 40)
    const { data: ticket } = await adminClient.from('tickets').select('asunto').eq('id', ticketId).eq('empresa_id', empresaId).maybeSingle()

    await notifyCompany({
      adminClient,
      empresaId,
      event: 'ticket_estado',
      subject: `Consulta actualizada: ${ticket?.asunto || 'Consulta'}`,
      title: 'Cambió el estado de una consulta',
      paragraphs: ['SERCOPREV actualizó el seguimiento de una conversación registrada en el portal.'],
      details: [{ label: 'Nuevo estado', value: estado }],
      ctaLabel: 'Revisar consultas',
      ctaUrl: `${process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'}/dashboard/consultas`,
    })
  } catch (error) {
    console.error('El estado fue actualizado, pero no se pudo procesar la notificación:', error)
  }
}
