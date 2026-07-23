'use server'

import { notifyAdmins } from '@/lib/notifications'
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

    const { data: lead, error } = await supabase.from('leads').insert({
      nombre,
      empresa: empresa || null,
      rut: rut || null,
      email,
      telefono,
      servicio,
      mensaje: mensaje || null,
      origen: 'Landing SERCOPREV',
      estado: 'Nuevo',
    }).select('id').single()

    if (error) {
      console.error('No fue posible guardar el lead:', error.message)
      return { status: 'error', message: 'No pudimos registrar la solicitud. Contáctenos por WhatsApp.' }
    }

    await notifyAdmins({
      adminClient: supabase,
      event: 'nuevo_prospecto',
      subject: `Nuevo prospecto: ${empresa || nombre}`,
      title: 'Nueva solicitud desde sercoprev.cl',
      greeting: 'Equipo SERCOPREV,',
      paragraphs: [
        'Se registró un nuevo prospecto desde el formulario público y ya está disponible en el pipeline comercial.',
        mensaje || 'El prospecto no agregó un mensaje adicional.',
      ],
      details: [
        { label: 'Nombre', value: nombre },
        { label: 'Empresa', value: empresa || 'No informada' },
        { label: 'RUT', value: rut || 'No informado' },
        { label: 'Correo', value: email },
        { label: 'Teléfono', value: telefono },
        { label: 'Servicio', value: servicio },
      ],
      ctaLabel: 'Revisar prospecto',
      ctaUrl: `${process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'}/admin/leads`,
      replyTo: email,
    }).catch(() => undefined)

    await supabase.from('auditoria_eventos').insert({
      actor_user_id: null,
      empresa_id: null,
      accion: 'crear',
      entidad: 'lead',
      entidad_id: lead.id,
      metadata: { origen: 'Landing SERCOPREV' },
    })

    return {
      status: 'success',
      message: 'Solicitud enviada. Un asesor de SERCOPREV se comunicará con usted.',
    }
  } catch (error) {
    console.error('Error controlado al registrar lead:', error)
    return { status: 'error', message: 'No pudimos registrar la solicitud. Inténtelo nuevamente.' }
  }
}
