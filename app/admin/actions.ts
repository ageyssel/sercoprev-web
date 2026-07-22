'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export type AdminActionState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

export type ImportActionResult = {
  ok: boolean
  message: string
  inserted?: number
}

const SERVICE_STRUCTURE = {
  'Contabilidad y Tributación': [
    'Contabilidad simplificada',
    'Declaraciones (IVA, Renta)',
    'Balances financieros',
    'Auditorías contables',
  ],
  'Recursos Humanos': [
    'Contratos de trabajo',
    'Liquidaciones y finiquitos',
    'Pago Previred',
    'Representación DT',
  ],
  'Gestión Legal': [
    'Constitución de sociedades',
    'Flujos de caja',
    'Facturación electrónica',
    'Registro INAPI',
  ],
  'Trámites Generales': [
    'Patentes y Resoluciones',
    'Tesorería General (TGR)',
    'Gestiones SII',
    'Conservador (CBRS)',
  ],
} as const

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength)
    : ''
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
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

function toNullableAmount(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const normalized = typeof value === 'string'
    ? value.replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')
    : value
  const amount = Number(normalized)
  return Number.isFinite(amount) && Math.abs(amount) <= 999_999_999_999_999
    ? Math.round(amount * 100) / 100
    : Number.NaN
}

async function sendWelcomeEmail(email: string, razonSocial: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return

  const appBaseUrl = process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? 'SERCOPREV <onboarding@resend.dev>',
      to: [email],
      subject: 'Su acceso al Portal de Clientes SERCOPREV',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0f172a">
          <h1 style="color:#1e3a8a">Bienvenido a SERCOPREV</h1>
          <p>La cuenta de <strong>${escapeHtml(razonSocial)}</strong> fue creada correctamente.</p>
          <p>Ingrese en <a href="${appBaseUrl}/login">${appBaseUrl.replace(/^https?:\/\//, '')}/login</a> usando el correo registrado y la contraseña temporal que SERCOPREV le entregará por un canal seguro.</p>
          <p>Al ingresar deberá reemplazar inmediatamente esa contraseña.</p>
        </div>
      `,
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(`Resend respondió ${response.status}: ${details.slice(0, 300)}`)
  }
}

async function requireAdmin() {
  const sessionClient = await createClient()
  const { data: { user }, error: userError } = await sessionClient.auth.getUser()

  if (userError || !user) {
    throw new Error('UNAUTHENTICATED')
  }

  const { data: profile, error: profileError } = await sessionClient
    .from('empresas')
    .select('id, es_admin')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile?.es_admin) {
    throw new Error('FORBIDDEN')
  }

  return {
    actorUserId: user.id,
    adminClient: createAdminClient(),
  }
}

export async function crearCliente(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const { adminClient } = await requireAdmin()

    const email = cleanText(formData.get('email'), 254).toLowerCase()
    const password = typeof formData.get('password') === 'string'
      ? String(formData.get('password'))
      : ''
    const rut = normalizeRut(cleanText(formData.get('rut'), 20))
    const razonSocial = cleanText(formData.get('razon_social'), 160)

    if (!EMAIL_PATTERN.test(email)) {
      return { status: 'error', message: 'Ingrese un correo electrónico válido.' }
    }

    if (!isValidChileanRut(rut)) {
      return { status: 'error', message: 'El RUT ingresado no es válido.' }
    }

    if (razonSocial.length < 2) {
      return { status: 'error', message: 'Ingrese una razón social válida.' }
    }

    if (!isStrongTemporaryPassword(password)) {
      return {
        status: 'error',
        message: 'La contraseña temporal debe tener 12 caracteres e incluir mayúscula, minúscula, número y símbolo.',
      }
    }

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { razon_social: razonSocial },
    })

    if (authError || !authData.user) {
      console.error('No se pudo crear el usuario en Supabase Auth:', authError?.message)
      return {
        status: 'error',
        message: 'No se pudo crear la cuenta. Verifique si el correo ya está registrado.',
      }
    }

    const { error: profileError } = await adminClient.from('empresas').insert({
      user_id: authData.user.id,
      rut,
      razon_social: razonSocial,
      estado_impuestos: 'Pendiente',
      es_admin: false,
      must_change_password: true,
    })

    if (profileError) {
      await adminClient.auth.admin.deleteUser(authData.user.id)
      console.error('Alta revertida por error al crear la empresa:', profileError.message)
      return {
        status: 'error',
        message: 'No se pudo registrar la empresa. Revise que el RUT no esté duplicado.',
      }
    }

    try {
      await sendWelcomeEmail(email, razonSocial)
    } catch (emailError) {
      console.error('La cuenta fue creada, pero el aviso por correo falló:', emailError)
    }

    revalidatePath('/admin')
    return {
      status: 'success',
      message: 'Cliente creado. Entregue la contraseña temporal por un canal seguro.',
    }
  } catch (error) {
    console.error('Error controlado en crearCliente:', error)
    return {
      status: 'error',
      message: 'No tiene autorización o la configuración del servidor está incompleta.',
    }
  }
}

export async function importarDatosEmpresa(input: unknown): Promise<ImportActionResult> {
  try {
    const { adminClient } = await requireAdmin()

    if (!input || typeof input !== 'object') {
      return { ok: false, message: 'Solicitud de importación inválida.' }
    }

    const payload = input as {
      empresaId?: unknown
      categoria?: unknown
      subcategoria?: unknown
      rows?: unknown
    }

    const empresaId = cleanText(payload.empresaId, 40)
    const categoria = cleanText(payload.categoria, 100)
    const subcategoria = cleanText(payload.subcategoria, 160)
    const rows = Array.isArray(payload.rows) ? payload.rows : []

    if (!UUID_PATTERN.test(empresaId)) {
      return { ok: false, message: 'El cliente seleccionado no es válido.' }
    }

    const allowedSubcategories = SERVICE_STRUCTURE[categoria as keyof typeof SERVICE_STRUCTURE]
    if (!allowedSubcategories || !allowedSubcategories.includes(subcategoria as never)) {
      return { ok: false, message: 'El área o trámite seleccionado no es válido.' }
    }

    if (rows.length === 0 || rows.length > 500) {
      return { ok: false, message: 'La planilla debe contener entre 1 y 500 registros.' }
    }

    const { data: targetCompany, error: companyError } = await adminClient
      .from('empresas')
      .select('id, es_admin')
      .eq('id', empresaId)
      .single()

    if (companyError || !targetCompany || targetCompany.es_admin) {
      return { ok: false, message: 'La empresa seleccionada no está disponible.' }
    }

    const sanitizedRows = rows.map((rawRow, index) => {
      if (!rawRow || typeof rawRow !== 'object') {
        throw new Error(`Fila ${index + 2} inválida.`)
      }

      const row = rawRow as Record<string, unknown>
      const periodo = cleanText(row.periodo, 80)
      const descripcion = cleanText(row.descripcion, 500)
      const estado = cleanText(row.estado, 80) || 'Pendiente'
      const monto = toNullableAmount(row.monto)

      if (!periodo || !descripcion || Number.isNaN(monto)) {
        throw new Error(`Revise periodo, descripción y monto en la fila ${index + 2}.`)
      }

      return {
        empresa_id: empresaId,
        periodo,
        descripcion,
        monto,
        estado,
        categoria,
        subcategoria,
      }
    })

    for (let offset = 0; offset < sanitizedRows.length; offset += 200) {
      const chunk = sanitizedRows.slice(offset, offset + 200)
      const { error: insertError } = await adminClient.from('datos_empresa').insert(chunk)
      if (insertError) throw insertError
    }

    revalidatePath('/admin')
    return {
      ok: true,
      inserted: sanitizedRows.length,
      message: `Se importaron ${sanitizedRows.length} registros correctamente.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error controlado en importarDatosEmpresa:', message)
    return {
      ok: false,
      message: message.startsWith('Revise') || message.startsWith('Fila')
        ? message
        : 'No fue posible completar la importación.',
    }
  }
}
