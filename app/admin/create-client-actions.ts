'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/supabase/require-admin'

export type CreateClientState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

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

function isStrongTemporaryPassword(value: string) {
  return value.length >= 12
    && /[a-z]/.test(value)
    && /[A-Z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value)
}

function internalAuthEmail(rut: string) {
  const key = rut.replace(/[^0-9K]/g, '').toLowerCase()
  return `cliente-${key}@acceso.sercoprev.cl`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function sendWelcomeEmail(email: string, razonSocial: string, rut: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return
  const appBaseUrl = process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? 'SERCOPREV <onboarding@resend.dev>',
      to: [email],
      subject: 'Su acceso al Portal de Clientes SERCOPREV',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0f172a"><h1 style="color:#1e3a8a">Bienvenido a SERCOPREV</h1><p>La cuenta de <strong>${escapeHtml(razonSocial)}</strong> fue creada correctamente.</p><p>Ingrese en <a href="${appBaseUrl}/login">${appBaseUrl.replace(/^https?:\/\//, '')}/login</a> usando el RUT <strong>${escapeHtml(rut)}</strong> y la contraseña temporal que SERCOPREV le entregará por un canal seguro.</p><p>Al ingresar deberá reemplazar inmediatamente esa contraseña.</p></div>`,
    }),
  })
  if (!response.ok) throw new Error(`Resend respondió ${response.status}`)
}

export async function crearClienteConRut(
  _previousState: CreateClientState,
  formData: FormData,
): Promise<CreateClientState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador'])
    const razonSocial = clean(formData.get('razon_social'), 160)
    const rut = normalizeRut(clean(formData.get('rut'), 20))
    const contactEmail = clean(formData.get('email'), 254).toLowerCase()
    const password = typeof formData.get('password') === 'string' ? String(formData.get('password')) : ''

    if (razonSocial.length < 2) return { status: 'error', message: 'Ingrese una razón social válida.' }
    if (!isValidChileanRut(rut)) return { status: 'error', message: 'El RUT ingresado no es válido.' }
    if (contactEmail && !EMAIL_PATTERN.test(contactEmail)) return { status: 'error', message: 'El correo de contacto no es válido.' }
    if (!isStrongTemporaryPassword(password)) return { status: 'error', message: 'La contraseña temporal debe tener 12 caracteres e incluir mayúscula, minúscula, número y símbolo.' }

    const { data: existingCompany } = await adminClient.from('empresas').select('id').eq('rut', rut).limit(1).maybeSingle()
    if (existingCompany) return { status: 'error', message: 'Ya existe un cliente registrado con ese RUT.' }

    const authEmail = contactEmail || internalAuthEmail(rut)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        razon_social: razonSocial,
        login_rut: rut,
        contact_email: contactEmail || null,
        auth_email_is_internal: !contactEmail,
      },
    })

    if (authError || !authData.user) {
      console.error('CREATE_CLIENT_AUTH_FAILED', authError?.message)
      return { status: 'error', message: 'No se pudo crear la cuenta. Revise que el RUT o correo no estén vinculados a otro usuario.' }
    }

    const { data: company, error: profileError } = await adminClient.from('empresas').insert({
      user_id: authData.user.id,
      rut,
      razon_social: razonSocial,
      email_contacto: contactEmail || null,
      estado_impuestos: 'Pendiente',
      es_admin: false,
      must_change_password: true,
    }).select('id').single()

    if (profileError || !company) {
      await adminClient.auth.admin.deleteUser(authData.user.id)
      console.error('CREATE_CLIENT_PROFILE_FAILED', profileError?.message)
      return { status: 'error', message: 'No se pudo registrar la empresa. La creación del acceso fue revertida.' }
    }

    await adminClient.from('auditoria_eventos').insert({
      actor_user_id: actorUserId,
      empresa_id: company.id,
      accion: 'crear',
      entidad: 'empresa',
      entidad_id: company.id,
      module: 'Clientes y comercial',
      description: 'Cliente creado con acceso por RUT',
      metadata: { rut, correo_contacto: Boolean(contactEmail), acceso: 'rut_password' },
    })

    if (contactEmail) {
      try {
        await sendWelcomeEmail(contactEmail, razonSocial, rut)
      } catch (emailError) {
        console.error('CREATE_CLIENT_WELCOME_EMAIL_FAILED', emailError)
      }
    }

    revalidatePath('/admin')
    revalidatePath('/admin/clientes')
    return {
      status: 'success',
      message: contactEmail
        ? 'Cliente creado. Podrá ingresar con su RUT y contraseña temporal; el correo quedó registrado como contacto.'
        : 'Cliente creado sin correo. Podrá ingresar con su RUT y la contraseña temporal.',
    }
  } catch (error) {
    console.error('CREATE_CLIENT_FAILED', error)
    return { status: 'error', message: 'No fue posible crear el cliente o su sesión administrativa no está habilitada.' }
  }
}
