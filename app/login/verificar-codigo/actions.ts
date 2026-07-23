'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  clearPendingStaffMfaChallenge,
  startStaffMfaChallenge,
  verifyStaffMfaCode,
} from '@/lib/staff-mfa'
import { createClient } from '@/utils/supabase/server'
import { resolveUserContext } from '@/utils/supabase/user-context'

async function authenticatedStaff() {
  const supabase = await createClient()
  const context = await resolveUserContext(supabase)
  if (!context) {
    await supabase.auth.signOut()
    redirect('/login?message=La sesión expiró. Ingrese nuevamente')
  }
  if (context.kind !== 'staff') redirect('/dashboard')
  return { supabase, context }
}

export async function verificarCodigo(formData: FormData) {
  const code = typeof formData.get('code') === 'string' ? String(formData.get('code')) : ''
  const { supabase, context } = await authenticatedStaff()

  let result: Awaited<ReturnType<typeof verifyStaffMfaCode>>
  try {
    result = await verifyStaffMfaCode(context.user.id, code)
  } catch (error) {
    console.error('STAFF_MFA_VERIFICATION_FAILED', error)
    redirect('/login/verificar-codigo?message=No fue posible verificar el código. Intente nuevamente')
  }

  if (!result.ok) {
    if (result.reason === 'expired') {
      await clearPendingStaffMfaChallenge(context.user.id)
      await supabase.auth.signOut()
      redirect('/login?message=El código venció. Ingrese nuevamente para solicitar otro')
    }
    if (result.reason === 'locked') {
      await clearPendingStaffMfaChallenge(context.user.id)
      await supabase.auth.signOut()
      redirect('/login?message=El código fue bloqueado por demasiados intentos. Ingrese nuevamente')
    }
    const remaining = result.remaining === null ? '' : ` Le quedan ${result.remaining} intentos.`
    redirect(`/login/verificar-codigo?message=Código incorrecto.${remaining}`)
  }

  revalidatePath('/', 'layout')
  if (context.mustChangePassword) redirect('/cuenta/cambiar-clave')
  redirect('/admin')
}

export async function reenviarCodigo() {
  const { context } = await authenticatedStaff()
  const email = context.user.email?.trim().toLowerCase()
  if (!email) redirect('/login?message=La cuenta interna no tiene un correo válido configurado')

  let failureCode = ''
  try {
    await startStaffMfaChallenge({
      userId: context.user.id,
      email,
      displayName: context.displayName,
    })
  } catch (error) {
    failureCode = error instanceof Error ? error.message : 'UNKNOWN'
    if (!['STAFF_MFA_RATE_LIMIT_COOLDOWN', 'STAFF_MFA_RATE_LIMIT_HOURLY'].includes(failureCode)) {
      console.error('STAFF_MFA_RESEND_FAILED', error)
    }
  }

  if (failureCode === 'STAFF_MFA_RATE_LIMIT_COOLDOWN') {
    redirect('/login/verificar-codigo?message=Debe esperar un minuto antes de solicitar otro código')
  }
  if (failureCode === 'STAFF_MFA_RATE_LIMIT_HOURLY') {
    redirect('/login/verificar-codigo?message=Se alcanzó el límite de códigos por hora. Intente más tarde')
  }
  if (failureCode) redirect('/login/verificar-codigo?message=No fue posible reenviar el código')

  redirect('/login/verificar-codigo?message=Enviamos un nuevo código a su correo')
}

export async function cancelarVerificacion() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await clearPendingStaffMfaChallenge(user?.id)
  await supabase.auth.signOut()
  redirect('/login?message=Verificación cancelada')
}
