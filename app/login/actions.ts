'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '../../utils/supabase/server'
import { resolveUserContext } from '@/utils/supabase/user-context'
import {
  clearPendingStaffMfaChallenge,
  getPendingStaffMfaChallenge,
  isCurrentStaffMfaVerified,
  startStaffMfaChallenge,
} from '@/lib/staff-mfa'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function login(formData: FormData) {
  const email = typeof formData.get('email') === 'string'
    ? String(formData.get('email')).trim().toLowerCase().slice(0, 254)
    : ''
  const password = typeof formData.get('password') === 'string'
    ? String(formData.get('password')).slice(0, 128)
    : ''

  if (!EMAIL_PATTERN.test(email) || password.length < 8) redirect('/login?message=Credenciales incorrectas')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) redirect('/login?message=Credenciales incorrectas')

  let context = null
  try {
    context = await resolveUserContext(supabase)
  } catch (contextError) {
    console.error('LOGIN_CONTEXT_RESOLUTION_FAILED', contextError)
    await supabase.auth.signOut()
    redirect('/login?message=No fue posible completar el acceso. Intente nuevamente')
  }

  if (!context) {
    await supabase.auth.signOut()
    redirect('/login?message=La cuenta no está habilitada para el portal')
  }

  if (context.kind === 'staff') {
    const staffEmail = context.user.email?.trim().toLowerCase()
    if (!staffEmail || !EMAIL_PATTERN.test(staffEmail)) {
      await supabase.auth.signOut()
      redirect('/login?message=La cuenta interna no tiene un correo válido configurado')
    }

    if (await isCurrentStaffMfaVerified(context.user.id)) {
      revalidatePath('/', 'layout')
      if (context.mustChangePassword) redirect('/cuenta/cambiar-clave')
      redirect('/admin')
    }

    const pending = await getPendingStaffMfaChallenge(context.user.id)
    if (pending) {
      redirect('/login/verificar-codigo?message=Ya enviamos un código vigente a su correo')
    }

    try {
      await startStaffMfaChallenge({
        userId: context.user.id,
        email: staffEmail,
        displayName: context.displayName,
      })
    } catch (mfaError) {
      console.error('STAFF_MFA_CHALLENGE_START_FAILED', mfaError)
      await clearPendingStaffMfaChallenge(context.user.id)
      await supabase.auth.signOut()
      const code = mfaError instanceof Error ? mfaError.message : ''
      if (code === 'STAFF_MFA_RATE_LIMIT_COOLDOWN') redirect('/login?message=Espere un minuto antes de solicitar otro código')
      if (code === 'STAFF_MFA_RATE_LIMIT_HOURLY') redirect('/login?message=Se alcanzó el límite de códigos. Intente nuevamente en una hora')
      redirect('/login?message=No fue posible enviar el código de seguridad. Intente nuevamente')
    }

    redirect('/login/verificar-codigo?message=Enviamos un código de seguridad a su correo')
  }

  await clearPendingStaffMfaChallenge()
  revalidatePath('/', 'layout')
  if (context.mustChangePassword) redirect('/cuenta/cambiar-clave')
  redirect('/dashboard')
}
