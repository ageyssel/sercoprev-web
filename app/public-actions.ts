'use server'

import { createAdminClient } from '@/utils/supabase/admin'

export type LeadFormState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^[+\d][\d\s()-]{5,24}$/
const ALLOWED_SERVICES = [
  'Contabilidad mensual',
  'Tributación y renta',
  'Remuneraciones y Previred',
  'Constitución o regularización',
  'Asesoría integral',
] as const

function clean(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function notifyLead(input: {
  nombre: string
  empresa: string
  email: string
  telefono: string
  servicio: string
  mensaje: string
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? 'SERCOPREV <onboarding@resend.dev>',
      to: ['contabilidad@sercoprev.cl'],
      reply_to: input.email,
      subject: `Nueva solicitud contable: ${input.empresa || input.nombre}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#17324a">
          <h1>Nueva solicitud desde sercoprev.cl</h1>
          <p><strong>Nombre:</strong> ${escapeHtml(input.nombre)}</p>
          <p><strong>Empresa:</strong> ${escapeHtml(input.empresa || 'No informada')}</p>
          <p><strong>Correo:</strong> ${escapeHtml(input.email)}</p>
          <p><strong>Teléfono:</strong> ${escapeHtml(input.telefono)}</p>
          <p><strong>Servicio:</strong> ${escapeHtml(input.servicio)}</p>
          <p><strong>Mensaje:</strong><br>${escapeHtml(input.mensaje || 'Sin mensaje adicional')}</p>
        </div>
      `,
    }),
  })

  if (!response.ok) {
    console.error('No fue posible notificar el lead por correo:', response.status)
  }
}

export async function crearLead(
  _previousState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  try {
    const honeypot = clean(formData.get('website'), 100)
    if (honeypot) return { status: 'success', message: 'Solicitud recibida correctamente.' }

    const nombre = clean(formData.get('nombre'), 120)
    const empresa = clean(formData.get('empresa'), 160)
    const rut = clean(formData.get('rut'), 20).toUpperCase()
    const email = clean(formData.get('email'), 254).toLowerCase()
    const telefono = clean(formData.get('telefono'), 40)
    const servicio = clean(formData.get('servicio'), 120)
    const mensaje = clean(formData.get('mensaje'), 1500)

    if (nombre.length < 2) return { status: 'error', message: 'Ingrese su nombre.' }
    if (!EMAIL_PATTERN.test(email)) return { status: 'error', message: 'Ingrese un correo válido.' }
    if (!PHONE_PATTERN.test(telefono)) return { status: 'error', message: 'Ingrese un teléfono válido.' }
    if (!ALLOWED_SERVICES.includes(servicio as (typeof ALLOWED_SERVICES)[number])) {
      return { status: 'error', message: 'Seleccione el servicio que necesita.' }
    }

    const supabase = createAdminClient()
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: duplicate } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .eq('telefono', telefono)
      .gte('created_at', tenMinutesAgo)
      .limit(1)
      .maybeSingle()

    if (duplicate) {
      return { status: 'success', message: 'Ya recibimos su solicitud. Nuestro equipo se comunicará con usted.' }
    }

    const { error } = await supabase.from('leads').insert({
      nombre,
      empresa: empresa || null,
      rut: rut || null,
      email,
      telefono,
      servicio,
      mensaje: mensaje || null,
      origen: 'Landing SERCOPREV',
      estado: 'Nuevo',
    })

    if (error) {
      console.error('No fue posible guardar el lead:', error.message)
      return { status: 'error', message: 'No pudimos registrar la solicitud. Contáctenos por WhatsApp.' }
    }

    await notifyLead({ nombre, empresa, email, telefono, servicio, mensaje }).catch(() => undefined)

    return {
      status: 'success',
      message: 'Solicitud enviada. Un asesor de SERCOPREV se comunicará con usted.',
    }
  } catch (error) {
    console.error('Error controlado al registrar lead:', error)
    return { status: 'error', message: 'No pudimos registrar la solicitud. Inténtelo nuevamente.' }
  }
}
