'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { resolveUserContext } from '@/utils/supabase/user-context'
import { isCurrentStaffMfaVerified } from '@/lib/staff-mfa'

export type PasswordActionState = { status: 'idle' | 'error'; message: string }

function isStrongPassword(value: string) {
  return value.length >= 12
    && /[a-z]/.test(value)
    && /[A-Z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value)
}

export async function cambiarClave(
  _previousState: PasswordActionState,
  formData: FormData,
): Promise<PasswordActionState> {
  const password = typeof formData.get('password') === 'string' ? String(formData.get('password')) : ''
  const confirmation = typeof formData.get('confirmation') === 'string' ? String(formData.get('confirmation')) : ''

  if (password !== confirmation) return { status: 'error', message: 'Las contraseñas no coinciden.' }
  if (!isStrongPassword(password)) return { status: 'error', message: 'Use al menos 12 caracteres con mayúscula, minúscula, número y símbolo.' }

  const supabase = await createClient()
  const context = await resolveUserContext(supabase)
  if (!context) return { status: 'error', message: 'La sesión expiró. Inicie sesión nuevamente.' }
  if (context.kind === 'staff' && !await isCurrentStaffMfaVerified(context.user.id)) {
    redirect('/login/verificar-codigo?message=Complete la verificación antes de cambiar su contraseña')
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password })
  if (passwordError) {
    console.error('No se pudo actualizar la contraseña:', passwordError.message)
    return { status: 'error', message: 'No se pudo actualizar la contraseña.' }
  }

  const adminClient = createAdminClient()
  const updates = await Promise.all([
    adminClient.from('empresas').update({ must_change_password: false }).eq('user_id', context.user.id),
    adminClient.from('usuarios_organizacion').update({ must_change_password: false }).eq('user_id', context.user.id),
    adminClient.from('empresa_usuarios').update({ must_change_password: false }).eq('user_id', context.user.id),
  ])
  const profileError = updates.find((result) => result.error)?.error
  if (profileError) {
    console.error('Contraseña actualizada, pero falló el indicador de perfil:', profileError.message)
    return { status: 'error', message: 'La contraseña cambió, pero no se pudo completar el perfil. Contacte al administrador.' }
  }

  await adminClient.from('auditoria_eventos').insert({
    actor_user_id: context.user.id,
    empresa_id: context.kind === 'client' ? context.companyId : null,
    accion: 'cambiar_clave',
    entidad: context.kind === 'staff' ? 'usuario_organizacion' : 'empresa_usuario',
    entidad_id: context.user.id,
    metadata: { primer_ingreso: true, segundo_factor_verificado: context.kind === 'staff' },
  })

  revalidatePath('/', 'layout')
  if (context.kind === 'staff') redirect('/admin')
  redirect('/dashboard')
}
