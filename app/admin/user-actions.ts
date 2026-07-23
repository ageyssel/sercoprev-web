'use server'

import { revalidatePath } from 'next/cache'
import { sendInvitationEmail } from '@/lib/invitation-email'
import { requireAdmin } from '@/utils/supabase/require-admin'
import type { ClientRole, StaffRole } from '@/utils/supabase/user-context'

export type UserActionState = { status: 'idle' | 'success' | 'error'; message: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const STAFF_ROLES: StaffRole[] = ['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones', 'Cobranza', 'Lectura']
const CLIENT_ROLES: ClientRole[] = ['Administrador cliente', 'Operador', 'Solo lectura']

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

function temporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_'
  const bytes = crypto.getRandomValues(new Uint8Array(18))
  const generated = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('')
  return `S!${generated}9a`
}

async function logInvitation(
  adminClient: Awaited<ReturnType<typeof requireAdmin>>['adminClient'],
  input: { empresaId?: string | null; email: string; event: string; sent: boolean; error?: string | null },
) {
  await adminClient.from('notificaciones').insert({
    empresa_id: input.empresaId ?? null,
    canal: 'Email',
    evento: input.event,
    destinatario: input.email,
    asunto: 'Acceso a SERCOPREV',
    estado: input.sent ? 'Enviada' : 'Fallida',
    error_mensaje: input.error?.slice(0, 1000) ?? null,
    enviada_at: input.sent ? new Date().toISOString() : null,
    metadata: { tipo: 'invitacion_usuario' },
  })
}

export async function crearUsuarioEquipo(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  try {
    const { adminClient, actorUserId, actorRole } = await requireAdmin(['Superadministrador', 'Administrador'])
    const nombre = clean(formData.get('nombre'), 160)
    const email = clean(formData.get('email'), 254).toLowerCase()
    const rol = clean(formData.get('rol'), 40) as StaffRole

    if (nombre.length < 2 || !EMAIL_PATTERN.test(email) || !STAFF_ROLES.includes(rol)) return { status: 'error', message: 'Complete nombre, correo y rol.' }
    if (rol === 'Superadministrador' && actorRole !== 'Superadministrador') return { status: 'error', message: 'Sólo un superadministrador puede crear otro superadministrador.' }

    const password = temporaryPassword()
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, rol, tipo_cuenta: 'equipo_sercoprev' },
    })
    if (authError || !authData.user) return { status: 'error', message: 'No se pudo crear la cuenta. Verifique si el correo ya existe.' }

    const { data: profile, error: profileError } = await adminClient.from('usuarios_organizacion').insert({
      user_id: authData.user.id,
      nombre,
      email,
      rol,
      activo: true,
      must_change_password: true,
      permisos: {},
    }).select('id').single()

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    let emailSent = false
    let emailError: string | null = null
    try {
      const result = await sendInvitationEmail({ email, name: nombre, role: rol, temporaryPassword: password, destination: 'admin' })
      emailSent = result.sent
      emailError = result.reason
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Error desconocido'
    }
    await logInvitation(adminClient, { email, event: 'usuario_equipo_creado', sent: emailSent, error: emailError })
    await adminClient.from('auditoria_eventos').insert({ actor_user_id: actorUserId, accion: 'crear', entidad: 'usuario_organizacion', entidad_id: profile.id, metadata: { rol, email, email_enviado: emailSent } })

    revalidatePath('/admin/usuarios')
    revalidatePath('/admin/notificaciones')
    return { status: 'success', message: emailSent ? 'Usuario del equipo creado y acceso enviado por correo.' : 'Usuario creado. El correo no pudo enviarse; revise Notificaciones y la configuración de Resend.' }
  } catch (error) {
    console.error('Error al crear usuario del equipo:', error)
    return { status: 'error', message: 'No fue posible crear el usuario del equipo.' }
  }
}

export async function crearUsuarioCliente(
  _state: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador'])
    const empresaId = clean(formData.get('empresa_id'), 40)
    const nombre = clean(formData.get('nombre'), 160)
    const email = clean(formData.get('email'), 254).toLowerCase()
    const rol = clean(formData.get('rol'), 40) as ClientRole

    if (!UUID_PATTERN.test(empresaId) || nombre.length < 2 || !EMAIL_PATTERN.test(email) || !CLIENT_ROLES.includes(rol)) return { status: 'error', message: 'Complete empresa, nombre, correo y rol.' }

    const { data: company, error: companyError } = await adminClient.from('empresas').select('razon_social, nombre_fantasia').eq('id', empresaId).eq('es_admin', false).single()
    if (companyError || !company) return { status: 'error', message: 'Empresa no disponible.' }

    const password = temporaryPassword()
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, rol, tipo_cuenta: 'usuario_cliente', empresa_id: empresaId },
    })
    if (authError || !authData.user) return { status: 'error', message: 'No se pudo crear la cuenta. Verifique si el correo ya existe.' }

    const { data: membership, error: membershipError } = await adminClient.from('empresa_usuarios').insert({
      empresa_id: empresaId,
      user_id: authData.user.id,
      nombre,
      email,
      rol,
      activo: true,
      must_change_password: true,
    }).select('id').single()

    if (membershipError) {
      await adminClient.auth.admin.deleteUser(authData.user.id)
      throw membershipError
    }

    const companyName = company.nombre_fantasia || company.razon_social
    let emailSent = false
    let emailError: string | null = null
    try {
      const result = await sendInvitationEmail({ email, name: nombre, role: rol, temporaryPassword: password, destination: 'client', companyName })
      emailSent = result.sent
      emailError = result.reason
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'Error desconocido'
    }
    await logInvitation(adminClient, { empresaId, email, event: 'usuario_cliente_creado', sent: emailSent, error: emailError })
    await adminClient.from('auditoria_eventos').insert({ actor_user_id: actorUserId, empresa_id: empresaId, accion: 'crear', entidad: 'empresa_usuario', entidad_id: membership.id, metadata: { rol, email, email_enviado: emailSent } })

    revalidatePath('/admin/usuarios')
    revalidatePath(`/admin/clientes/${empresaId}`)
    revalidatePath('/admin/notificaciones')
    return { status: 'success', message: emailSent ? 'Usuario del cliente creado y acceso enviado por correo.' : 'Usuario creado. El correo no pudo enviarse; revise Notificaciones y Resend.' }
  } catch (error) {
    console.error('Error al crear usuario del cliente:', error)
    return { status: 'error', message: 'No fue posible crear el usuario del cliente.' }
  }
}

export async function cambiarEstadoUsuario(formData: FormData) {
  const { adminClient, actorUserId, actorRole } = await requireAdmin(['Superadministrador', 'Administrador'])
  const id = clean(formData.get('id'), 40)
  const tipo = clean(formData.get('tipo'), 20)
  const activo = clean(formData.get('activo'), 10) === 'true'
  if (!UUID_PATTERN.test(id) || !['equipo', 'cliente'].includes(tipo)) throw new Error('INVALID_USER')

  const table = tipo === 'equipo' ? 'usuarios_organizacion' : 'empresa_usuarios'
  const { data: profile, error: profileError } = await adminClient.from(table).select('user_id, rol, empresa_id').eq('id', id).single()
  if (profileError || !profile) throw new Error('USER_NOT_FOUND')
  if (tipo === 'equipo' && profile.rol === 'Superadministrador' && actorRole !== 'Superadministrador') throw new Error('FORBIDDEN_ROLE')

  const { error } = await adminClient.from(table).update({ activo }).eq('id', id)
  if (error) throw error
  await adminClient.from('auditoria_eventos').insert({ actor_user_id: actorUserId, empresa_id: profile.empresa_id ?? null, accion: activo ? 'activar' : 'desactivar', entidad: tipo === 'equipo' ? 'usuario_organizacion' : 'empresa_usuario', entidad_id: id, metadata: { rol: profile.rol } })
  revalidatePath('/admin/usuarios')
}

export async function restablecerAccesoUsuario(formData: FormData) {
  const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador'])
  const id = clean(formData.get('id'), 40)
  const tipo = clean(formData.get('tipo'), 20)
  if (!UUID_PATTERN.test(id) || !['equipo', 'cliente'].includes(tipo)) throw new Error('INVALID_USER')

  const table = tipo === 'equipo' ? 'usuarios_organizacion' : 'empresa_usuarios'
  const select = tipo === 'equipo' ? 'user_id, nombre, email, rol' : 'user_id, nombre, email, rol, empresa_id, empresa:empresas(razon_social, nombre_fantasia)'
  const { data: profile, error: profileError } = await adminClient.from(table).select(select).eq('id', id).single()
  if (profileError || !profile) throw new Error('USER_NOT_FOUND')

  const password = temporaryPassword()
  const { error: passwordError } = await adminClient.auth.admin.updateUserById(profile.user_id, { password })
  if (passwordError) throw passwordError
  await adminClient.from(table).update({ must_change_password: true, activo: true }).eq('id', id)

  const relation = 'empresa' in profile ? profile.empresa as unknown as { razon_social: string; nombre_fantasia: string | null } | Array<{ razon_social: string; nombre_fantasia: string | null }> | null : null
  const company = Array.isArray(relation) ? relation[0] : relation
  let emailSent = false
  let emailError: string | null = null
  try {
    const result = await sendInvitationEmail({
      email: profile.email,
      name: profile.nombre,
      role: profile.rol,
      temporaryPassword: password,
      destination: tipo === 'equipo' ? 'admin' : 'client',
      companyName: company?.nombre_fantasia || company?.razon_social || null,
    })
    emailSent = result.sent
    emailError = result.reason
  } catch (error) {
    emailError = error instanceof Error ? error.message : 'Error desconocido'
  }
  await logInvitation(adminClient, { empresaId: 'empresa_id' in profile ? profile.empresa_id : null, email: profile.email, event: 'usuario_acceso_restablecido', sent: emailSent, error: emailError })
  await adminClient.from('auditoria_eventos').insert({ actor_user_id: actorUserId, empresa_id: 'empresa_id' in profile ? profile.empresa_id : null, accion: 'restablecer_acceso', entidad: tipo === 'equipo' ? 'usuario_organizacion' : 'empresa_usuario', entidad_id: id, metadata: { email_enviado: emailSent } })
  revalidatePath('/admin/usuarios')
  revalidatePath('/admin/notificaciones')
}
