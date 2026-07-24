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
const ACCESS_UNAVAILABLE_MESSAGE = 'El servicio de acceso no está disponible temporalmente. Intente nuevamente en unos segundos'

export async function login(formData: FormData) {
  const email = typeof formData.get('email') === 'string'
    ? String(formData.get('email')).trim().toLowerCase().slice(0, 254)
    : ''
  const password = typeof formData.get('password') === 'string'
    ? String(formData.get('password')).slice(0, 128)
    : ''

  if (!EMAIL_PATTERN.test(email) || password.length < 8) redirect('/login?message=Credenciales incorrectas')

  const supabase = await createClient().catch((error) => {
    console.error('LOGIN_SUPABASE_CLIENT_FAILED', error)
    redirect(`/login?message=${encodeURIComponent(ACCESS_UNAVAILABLE_MESSAGE)}`)
  })

  let authResult
  try {
    authResult = await supabase.auth.signInWithPassword({ email, password })
  } catch (error) {
    console.error('LOGIN_PASSWORD_AUTH_FAILED', error)
    redirect(`/login?message=${encodeURIComponent(ACCESS_UNAVAILABLE_MESSAGE)}`)
  }

  const { data, error } = authResult
  if (error || !data.user) redirect('/login?message=Credenciales incorrectas')

  let context = null
  try {
    context = await resolveUserContext(supabase)
  } catch (contextError) {
    console.error('LOGIN_CONTEXT_RESOLUTION_FAILED', contextError)
    await supabase.auth.signOut().catch(() => undefined)
    redirect('/login?message=No fue posible completar el acceso. Intente nuevamente')
  }

  if (!context) {
    await supabase.auth.signOut().catch(() => undefined)
    redirect('/login?message=La cuenta no está habilitada para el portal')
  }

  if (context.kind === 'staff') {
    const staffEmail = context.user.email?.trim().toLowerCase()
    if (!staffEmail || !EMAIL_PATTERN.test(staffEmail)) {
      await supabase.auth.signOut().catch(() => undefined)
      redirect('/login?message=La cuenta interna no tiene un correo válido configurado')
    }

    let mfaVerified = false
    try {
      mfaVerified = await isCurrentStaffMfaVerified(context.user.id)
    } catch (mfaError) {
      console.error('STAFF_MFA_SESSION_CHECK_FAILED', mfaError)
      await supabase.auth.signOut().catch(() => undefined)
      redirect(`/login?message=${encodeURIComponent(ACCESS_UNAVAILABLE_MESSAGE)}`)
    }

    if (mfaVerified) {
      revalidatePath('/', 'layout')
      if (context.mustChangePassword) redirect('/cuenta/cambiar-clave')
      redirect('/admin')
    }

    let pending = null
    try {
      pending = await getPendingStaffMfaChallenge(context.user.id)
    } catch (mfaError) {
      console.error('STAFF_MFA_PENDING_CHECK_FAILED', mfaError)
      await supabase.auth.signOut().catch(() => undefined)
      redirect(`/login?message=${encodeURIComponent(ACCESS_UNAVAILABLE_MESSAGE)}`)
    }

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
      await clearPendingStaffMfaChallenge(context.user.id).catch(() => undefined)
      await supabase.auth.signOut().catch(() => undefined)
      const code = mfaError instanceof Error ? mfaError.message : ''
      if (code === 'STAFF_MFA_RATE_LIMIT_COOLDOWN') redirect('/login?message=Espere un minuto antes de solicitar otro código')
      if (code === 'STAFF_MFA_RATE_LIMIT_HOURLY') redirect('/login?message=Se alcanzó el límite de códigos. Intente nuevamente en una hora')
      redirect('/login?message=No fue posible enviar el código de seguridad. Intente nuevamente')
    }

    redirect('/login/verificar-codigo?message=Enviamos un código de seguridad a su correo')
  }

  await clearPendingStaffMfaChallenge().catch(() => undefined)
  revalidatePath('/', 'layout')
  if (context.mustChangePassword) redirect('/cuenta/cambiar-clave')
  redirect('/dashboard')
}
