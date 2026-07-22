'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { requireAdmin } from '@/utils/supabase/require-admin'

export type SupportActionState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

function nullable(value: unknown, maxLength: number) {
  const output = clean(value, maxLength)
  return output || null
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T12:00:00`).getTime())
}

function amount(value: unknown) {
  const text = clean(value, 40)
  const normalized = text.replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')
  const number = Number(normalized)
  return Number.isFinite(number) && number >= 0 && number <= 999_999_999_999 ? Math.round(number * 100) / 100 : Number.NaN
}

async function audit(
  adminClient: ReturnType<typeof createAdminClient>,
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

async function requireClientCompany() {
  const sessionClient = await createClient()
  const { data: { user }, error: userError } = await sessionClient.auth.getUser()
  if (userError || !user) throw new Error('UNAUTHENTICATED')

  const { data: company, error: companyError } = await sessionClient
    .from('empresas')
    .select('id, es_admin')
    .eq('user_id', user.id)
    .single()

  if (companyError || !company || company.es_admin) throw new Error('INVALID_CLIENT')

  return { sessionClient, adminClient: createAdminClient(), user, company }
}

export async function crearHonorario(
  _previousState: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin()
    const empresaId = clean(formData.get('empresa_id'), 40)
    const periodo = clean(formData.get('periodo'), 80)
    const concepto = clean(formData.get('concepto'), 180) || 'Honorarios profesionales'
    const monto = amount(formData.get('monto'))
    const fechaEmision = clean(formData.get('fecha_emision'), 10)
    const fechaVencimiento = clean(formData.get('fecha_vencimiento'), 10)

    if (!UUID_PATTERN.test(empresaId) || !periodo || Number.isNaN(monto) || !validDate(fechaVencimiento)) {
      return { status: 'error', message: 'Complete periodo, monto y vencimiento correctamente.' }
    }
    if (fechaEmision && !validDate(fechaEmision)) return { status: 'error', message: 'La fecha de emisión no es válida.' }

    const { data, error } = await adminClient.from('honorarios').insert({
      empresa_id: empresaId,
      periodo,
      concepto,
      monto,
      fecha_emision: fechaEmision || null,
      fecha_vencimiento: fechaVencimiento,
      estado: 'Pendiente',
      notas: nullable(formData.get('notas'), 1500),
    }).select('id').single()

    if (error) throw error
    await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'honorario', entidadId: data.id })
    revalidatePath(`/admin/clientes/${empresaId}`)
    revalidatePath('/admin/cobranza')
    revalidatePath('/dashboard')
    return { status: 'success', message: 'Honorario registrado y visible en el portal.' }
  } catch (error) {
    console.error('Error al crear honorario:', error)
    return { status: 'error', message: 'No fue posible registrar el honorario.' }
  }
}

export async function cambiarEstadoHonorario(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin()
  const id = clean(formData.get('id'), 40)
  const empresaId = clean(formData.get('empresa_id'), 40)
  const estado = clean(formData.get('estado'), 40)
  if (!UUID_PATTERN.test(id) || !['Pendiente', 'Pagado', 'Vencido', 'Anulado'].includes(estado)) throw new Error('INVALID_FEE_STATUS')

  const fechaPago = estado === 'Pagado' ? new Date().toISOString().slice(0, 10) : null
  const { error } = await adminClient.from('honorarios').update({ estado, fecha_pago: fechaPago }).eq('id', id)
  if (error) throw error
  await audit(adminClient, actorUserId, { empresaId: UUID_PATTERN.test(empresaId) ? empresaId : null, accion: 'cambiar_estado', entidad: 'honorario', entidadId: id, metadata: { estado } })
  if (UUID_PATTERN.test(empresaId)) revalidatePath(`/admin/clientes/${empresaId}`)
  revalidatePath('/admin/cobranza')
  revalidatePath('/dashboard')
}

export async function crearContactoEmpresa(
  _previousState: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin()
    const empresaId = clean(formData.get('empresa_id'), 40)
    const nombre = clean(formData.get('nombre'), 160)
    const email = clean(formData.get('email'), 254).toLowerCase()
    const telefono = clean(formData.get('telefono'), 40)
    if (!UUID_PATTERN.test(empresaId) || nombre.length < 2) return { status: 'error', message: 'Ingrese un contacto válido.' }

    const principal = formData.get('principal') === 'on'
    if (principal) await adminClient.from('contactos_empresa').update({ principal: false }).eq('empresa_id', empresaId)

    const { data, error } = await adminClient.from('contactos_empresa').insert({
      empresa_id: empresaId,
      nombre,
      cargo: nullable(formData.get('cargo'), 120),
      email: email || null,
      telefono: telefono || null,
      principal,
      recibe_notificaciones: formData.get('recibe_notificaciones') === 'on',
    }).select('id').single()
    if (error) throw error

    await audit(adminClient, actorUserId, { empresaId, accion: 'crear', entidad: 'contacto_empresa', entidadId: data.id })
    revalidatePath(`/admin/clientes/${empresaId}`)
    return { status: 'success', message: 'Contacto agregado.' }
  } catch (error) {
    console.error('Error al crear contacto:', error)
    return { status: 'error', message: 'No fue posible agregar el contacto.' }
  }
}

export async function crearTicketCliente(
  _previousState: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const { adminClient, user, company } = await requireClientCompany()
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
    revalidatePath('/dashboard')
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
    const { sessionClient, adminClient, user, company } = await requireClientCompany()
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
    revalidatePath('/dashboard')
    revalidatePath('/admin/tickets')
    return { status: 'success', message: 'Respuesta enviada.' }
  } catch (error) {
    console.error('Error al responder ticket:', error)
    return { status: 'error', message: 'No fue posible enviar la respuesta.' }
  }
}

export async function responderTicketAdmin(
  _previousState: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin()
    const ticketId = clean(formData.get('ticket_id'), 40)
    const empresaId = clean(formData.get('empresa_id'), 40)
    const mensaje = clean(formData.get('mensaje'), 5000)
    if (!UUID_PATTERN.test(ticketId) || !UUID_PATTERN.test(empresaId) || mensaje.length < 1) return { status: 'error', message: 'Respuesta inválida.' }

    const { error } = await adminClient.from('ticket_mensajes').insert({
      ticket_id: ticketId,
      autor_user_id: actorUserId,
      autor_tipo: 'SERCOPREV',
      mensaje,
    })
    if (error) throw error

    await adminClient.from('tickets').update({ estado: 'Esperando cliente' }).eq('id', ticketId).eq('empresa_id', empresaId)
    await audit(adminClient, actorUserId, { empresaId, accion: 'responder', entidad: 'ticket', entidadId: ticketId })
    revalidatePath('/admin/tickets')
    revalidatePath(`/admin/clientes/${empresaId}`)
    revalidatePath('/dashboard')
    return { status: 'success', message: 'Respuesta publicada en el portal del cliente.' }
  } catch (error) {
    console.error('Error al responder ticket como administrador:', error)
    return { status: 'error', message: 'No fue posible publicar la respuesta.' }
  }
}

export async function cambiarEstadoTicket(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin()
  const ticketId = clean(formData.get('ticket_id'), 40)
  const empresaId = clean(formData.get('empresa_id'), 40)
  const estado = clean(formData.get('estado'), 40)
  if (!UUID_PATTERN.test(ticketId) || !['Abierto', 'En revisión', 'Esperando cliente', 'Resuelto', 'Cerrado'].includes(estado)) throw new Error('INVALID_TICKET_STATUS')

  const { error } = await adminClient.from('tickets').update({
    estado,
    cerrado_at: estado === 'Cerrado' ? new Date().toISOString() : null,
  }).eq('id', ticketId)
  if (error) throw error
  await audit(adminClient, actorUserId, { empresaId: UUID_PATTERN.test(empresaId) ? empresaId : null, accion: 'cambiar_estado', entidad: 'ticket', entidadId: ticketId, metadata: { estado } })
  revalidatePath('/admin/tickets')
  if (UUID_PATTERN.test(empresaId)) revalidatePath(`/admin/clientes/${empresaId}`)
  revalidatePath('/dashboard')
}
