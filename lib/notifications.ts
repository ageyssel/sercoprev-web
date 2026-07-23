import { createAdminClient } from '@/utils/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

type NotificationDetail = {
  label: string
  value: string | null | undefined
}

type NotificationContent = {
  subject: string
  title: string
  greeting?: string
  paragraphs: string[]
  details?: NotificationDetail[]
  ctaLabel?: string
  ctaUrl?: string
  replyTo?: string
}

type CompanyNotificationInput = NotificationContent & {
  adminClient: AdminClient
  empresaId: string
  event: string
  whatsapp?: {
    templateName: string | undefined
    parameters: string[]
  }
}

type AdminNotificationInput = NotificationContent & {
  adminClient: AdminClient
  event: string
  empresaId?: string | null
}

type CompanyRecipient = {
  email: string | null
  phone: string | null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))]
}

function normalizeEmail(value: string | null | undefined) {
  const email = value?.trim().toLowerCase() ?? ''
  return EMAIL_PATTERN.test(email) ? email : null
}

function normalizeWhatsAppPhone(value: string | null | undefined) {
  let digits = value?.replace(/\D/g, '') ?? ''
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 9 && digits.startsWith('9')) digits = `56${digits}`
  if (digits.length === 10 && digits.startsWith('09')) digits = `56${digits.slice(1)}`
  return digits.length >= 10 && digits.length <= 15 ? digits : null
}

function textVersion(content: NotificationContent) {
  const details = (content.details ?? [])
    .filter((item) => item.value)
    .map((item) => `${item.label}: ${item.value}`)
    .join('\n')

  return [
    content.greeting ?? 'Hola,',
    '',
    ...content.paragraphs,
    details ? `\n${details}` : '',
    content.ctaUrl ? `\n${content.ctaLabel ?? 'Abrir portal'}: ${content.ctaUrl}` : '',
    '',
    'SERCOPREV · Contabilidad, prevención y gestión para empresas',
    'Este es un mensaje automático. No comparta sus credenciales.',
  ].filter(Boolean).join('\n')
}

function brandedHtml(content: NotificationContent) {
  const appUrl = process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'
  const details = (content.details ?? []).filter((item) => item.value)
  const preview = escapeHtml(content.paragraphs[0] ?? content.subject)

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(content.subject)}</title>
  </head>
  <body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#17324a">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${preview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #dbe3ea;box-shadow:0 12px 35px rgba(15,36,56,.08)">
            <tr>
              <td style="background:#0f2438;padding:26px 30px">
                <div style="font-size:25px;font-weight:900;letter-spacing:.04em;color:#ffffff">SERCOPREV</div>
                <div style="margin-top:5px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#e3bf63">Portal empresarial</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px">
                <p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#475569">${escapeHtml(content.greeting ?? 'Hola,')}</p>
                <h1 style="margin:0 0 18px;font-size:27px;line-height:1.25;color:#0f2438">${escapeHtml(content.title)}</h1>
                ${content.paragraphs.map((paragraph) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#475569">${escapeHtml(paragraph)}</p>`).join('')}
                ${details.length > 0 ? `
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;border:1px solid #dbe3ea;border-radius:14px;background:#f8fafc">
                    ${details.map((item) => `
                      <tr>
                        <td style="padding:11px 14px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#64748b">${escapeHtml(item.label)}</td>
                        <td style="padding:11px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;text-align:right;color:#17324a">${escapeHtml(String(item.value))}</td>
                      </tr>`).join('')}
                  </table>` : ''}
                ${content.ctaUrl ? `<a href="${escapeHtml(content.ctaUrl)}" style="display:inline-block;margin-top:8px;border-radius:12px;background:#134b78;padding:13px 20px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none">${escapeHtml(content.ctaLabel ?? 'Abrir portal')}</a>` : ''}
                <p style="margin:26px 0 0;font-size:12px;line-height:1.6;color:#94a3b8">Por seguridad, SERCOPREV nunca solicitará su contraseña por correo, WhatsApp o teléfono.</p>
              </td>
            </tr>
            <tr>
              <td style="background:#eaf3f9;padding:18px 30px;font-size:12px;line-height:1.6;color:#52677a">
                SERCOPREV · <a href="${escapeHtml(appUrl)}" style="font-weight:800;color:#134b78;text-decoration:none">${escapeHtml(appUrl.replace(/^https?:\/\//, ''))}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

async function logNotification(
  adminClient: AdminClient,
  input: {
    empresaId?: string | null
    channel: 'Email' | 'WhatsApp'
    event: string
    recipient?: string | null
    subject?: string | null
    status: 'Enviada' | 'Omitida' | 'Fallida'
    providerId?: string | null
    error?: string | null
    metadata?: Record<string, unknown>
  },
) {
  const { error } = await adminClient.from('notificaciones').insert({
    empresa_id: input.empresaId ?? null,
    canal: input.channel,
    evento: input.event,
    destinatario: input.recipient ?? null,
    asunto: input.subject ?? null,
    estado: input.status,
    proveedor_id: input.providerId ?? null,
    error_mensaje: input.error?.slice(0, 1000) ?? null,
    metadata: input.metadata ?? {},
    enviada_at: input.status === 'Enviada' ? new Date().toISOString() : null,
  })
  if (error) console.error('No fue posible registrar la notificación:', error.message)
}

async function sendEmail(
  adminClient: AdminClient,
  input: NotificationContent & {
    event: string
    recipient: string
    empresaId?: string | null
  },
) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    await logNotification(adminClient, {
      empresaId: input.empresaId,
      channel: 'Email',
      event: input.event,
      recipient: input.recipient,
      subject: input.subject,
      status: 'Omitida',
      error: 'RESEND_API_KEY no está configurada.',
    })
    return
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `${input.event}-${input.empresaId ?? 'general'}-${input.recipient}-${crypto.randomUUID()}`.slice(0, 250),
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL?.trim() || 'SERCOPREV <portal@sercoprev.cl>',
        to: [input.recipient],
        reply_to: input.replyTo,
        subject: input.subject,
        html: brandedHtml(input),
        text: textVersion(input),
      }),
    })

    const payload = await response.json().catch(() => ({})) as { id?: string; message?: string }
    if (!response.ok) throw new Error(payload.message || `Resend respondió HTTP ${response.status}`)

    await logNotification(adminClient, {
      empresaId: input.empresaId,
      channel: 'Email',
      event: input.event,
      recipient: input.recipient,
      subject: input.subject,
      status: 'Enviada',
      providerId: payload.id ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('No fue posible enviar correo SERCOPREV:', message)
    await logNotification(adminClient, {
      empresaId: input.empresaId,
      channel: 'Email',
      event: input.event,
      recipient: input.recipient,
      subject: input.subject,
      status: 'Fallida',
      error: message,
    })
  }
}

async function sendWhatsAppTemplate(
  adminClient: AdminClient,
  input: {
    empresaId: string
    event: string
    recipient: string
    templateName: string | undefined
    parameters: string[]
  },
) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim()
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  const templateName = input.templateName?.trim()
  const apiBaseUrl = (process.env.WHATSAPP_API_BASE_URL?.trim() || 'https://graph.facebook.com/v23.0').replace(/\/$/, '')

  if (!accessToken || !phoneNumberId || !templateName) {
    await logNotification(adminClient, {
      empresaId: input.empresaId,
      channel: 'WhatsApp',
      event: input.event,
      recipient: input.recipient,
      status: 'Omitida',
      error: 'La integración de WhatsApp o la plantilla aprobada no está configurada.',
    })
    return
  }

  try {
    const response = await fetch(`${apiBaseUrl}/${encodeURIComponent(phoneNumberId)}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: input.recipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'es_CL' },
          components: [{
            type: 'body',
            parameters: input.parameters.map((parameter) => ({ type: 'text', text: parameter.slice(0, 1024) })),
          }],
        },
      }),
    })

    const payload = await response.json().catch(() => ({})) as { messages?: Array<{ id?: string }>; error?: { message?: string } }
    if (!response.ok) throw new Error(payload.error?.message || `WhatsApp respondió HTTP ${response.status}`)

    await logNotification(adminClient, {
      empresaId: input.empresaId,
      channel: 'WhatsApp',
      event: input.event,
      recipient: input.recipient,
      status: 'Enviada',
      providerId: payload.messages?.[0]?.id ?? null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('No fue posible enviar WhatsApp SERCOPREV:', message)
    await logNotification(adminClient, {
      empresaId: input.empresaId,
      channel: 'WhatsApp',
      event: input.event,
      recipient: input.recipient,
      status: 'Fallida',
      error: message,
    })
  }
}

async function companyRecipients(adminClient: AdminClient, empresaId: string) {
  const [companyResult, contactsResult] = await Promise.all([
    adminClient.from('empresas').select('user_id, razon_social, nombre_fantasia, email_contacto, telefono').eq('id', empresaId).eq('es_admin', false).single(),
    adminClient.from('contactos_empresa').select('email, telefono, principal, recibe_notificaciones').eq('empresa_id', empresaId).eq('recibe_notificaciones', true).order('principal', { ascending: false }),
  ])

  if (companyResult.error || !companyResult.data) throw new Error('No fue posible resolver los destinatarios de la empresa.')

  const company = companyResult.data as {
    user_id: string | null
    razon_social: string
    nombre_fantasia: string | null
    email_contacto: string | null
    telefono: string | null
  }
  const contacts = (contactsResult.data ?? []) as Array<{ email: string | null; telefono: string | null }>
  let accountEmail: string | null = null

  if (company.user_id) {
    const { data } = await adminClient.auth.admin.getUserById(company.user_id)
    accountEmail = normalizeEmail(data.user?.email)
  }

  const emails = unique([
    accountEmail,
    normalizeEmail(company.email_contacto),
    ...contacts.map((contact) => normalizeEmail(contact.email)),
  ])
  const phones = unique([
    ...contacts.map((contact) => normalizeWhatsAppPhone(contact.telefono)),
    normalizeWhatsAppPhone(company.telefono),
  ])

  return {
    companyName: company.nombre_fantasia || company.razon_social,
    recipients: { emails, phones } satisfies { emails: string[]; phones: string[] },
  }
}

export async function notifyCompany(input: CompanyNotificationInput) {
  let resolved: Awaited<ReturnType<typeof companyRecipients>>
  try {
    resolved = await companyRecipients(input.adminClient, input.empresaId)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    await logNotification(input.adminClient, {
      empresaId: input.empresaId,
      channel: 'Email',
      event: input.event,
      subject: input.subject,
      status: 'Fallida',
      error: message,
    })
    return
  }

  if (resolved.recipients.emails.length === 0) {
    await logNotification(input.adminClient, {
      empresaId: input.empresaId,
      channel: 'Email',
      event: input.event,
      subject: input.subject,
      status: 'Omitida',
      error: 'La empresa no tiene correos habilitados para notificaciones.',
    })
  } else {
    await Promise.all(resolved.recipients.emails.map((recipient) => sendEmail(input.adminClient, {
      ...input,
      empresaId: input.empresaId,
      event: input.event,
      recipient,
    })))
  }

  if (input.whatsapp) {
    if (resolved.recipients.phones.length === 0) {
      await logNotification(input.adminClient, {
        empresaId: input.empresaId,
        channel: 'WhatsApp',
        event: input.event,
        status: 'Omitida',
        error: 'La empresa no tiene teléfonos habilitados para notificaciones.',
      })
    } else {
      await Promise.all(resolved.recipients.phones.map((recipient) => sendWhatsAppTemplate(input.adminClient, {
        empresaId: input.empresaId,
        event: input.event,
        recipient,
        templateName: input.whatsapp?.templateName,
        parameters: input.whatsapp?.parameters ?? [],
      })))
    }
  }
}

export async function notifyAdmins(input: AdminNotificationInput) {
  const recipients = unique((process.env.NOTIFICATION_ADMIN_EMAILS?.trim() || 'contabilidad@sercoprev.cl').split(',').map(normalizeEmail))

  if (recipients.length === 0) {
    await logNotification(input.adminClient, {
      empresaId: input.empresaId,
      channel: 'Email',
      event: input.event,
      subject: input.subject,
      status: 'Omitida',
      error: 'No hay destinatarios internos configurados.',
    })
    return
  }

  await Promise.all(recipients.map((recipient) => sendEmail(input.adminClient, {
    ...input,
    empresaId: input.empresaId,
    event: input.event,
    recipient,
  })))
}
