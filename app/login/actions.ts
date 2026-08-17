'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'
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

function normalizeRut(value: string) {
  return value.replace(/\./g, '').replace(/\s/g, '').toUpperCase()
}

function isValidChileanRut(value: string) {
  const normalized = normalizeRut(value)
  if (!/^\d{7,8}-[\dK]$/.test(normalized)) return false
  const [body, verifier] = normalized.split('-')
  let sum = 0
  let multiplier = 2
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }
  const remainder = 11 - (sum % 11)
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder)
  return verifier === expected
}

async function resolveAuthEmail(identifier: string) {
  const normalizedIdentifier = identifier.trim().toLowerCase()
  if (EMAIL_PATTERN.test(normalizedIdentifier)) return normalizedIdentifier

  const rut = normalizeRut(identifier)
  if (!isValidChileanRut(rut)) return null

  try {
    const directory = createAdminClient()
    const { data: company, error: companyError } = await directory
      .from('empresas')
      .select('user_id')
      .eq('rut', rut)
      .eq('es_admin', false)
      .limit(1)
      .maybeSingle()

    if (companyError || !company?.user_id) return null
    const { data, error } = await directory.auth.admin.getUserById(company.user_id)
    if (error || !data.user?.email || !EMAIL_PATTERN.test(data.user.email)) return null
    return data.user.email.trim().toLowerCase()
  } catch (error) {
    console.error('LOGIN_RUT_RESOLUTION_FAILED', error)
    return null
  }
}

export async function login(formData: FormData) {
  const identifier = typeof formData.get('identifier') === 'string'
    ? String(formData.get('identifier')).trim().slice(0, 254)
    : typeof formData.get('email') === 'string'
      ? String(formData.get('email')).trim().slice(0, 254)
      : ''
  const password = typeof formData.get('password') === 'string'
    ? String(formData.get('password')).slice(0, 128)
    : ''

  if (!identifier || password.length < 8) redirect('/login?message=Credenciales incorrectas')

  const email = await resolveAuthEmail(identifier)
  if (!email) redirect('/login?message=Credenciales incorrectas')

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

    if (pending) redirect('/login/verificar-codigo?message=Ya enviamos un código vigente a su correo')

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
