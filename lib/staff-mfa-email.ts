import 'server-only'

import { createAdminClient } from '@/utils/supabase/admin'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function recordDelivery(input: {
  event: string
  recipient: string
  status: 'Enviada' | 'Fallida' | 'Omitida'
  providerId?: string | null
  error?: string | null
  userId: string
  challengeId: string
}) {
  try {
    const admin = createAdminClient()
    await admin.from('notificaciones').insert({
      empresa_id: null,
      canal: 'Email',
      evento: input.event,
      destinatario: input.recipient,
      asunto: 'Código de verificación para ingresar a SERCOPREV',
      estado: input.status,
      proveedor_id: input.providerId ?? null,
      error_mensaje: input.error?.slice(0, 1000) ?? null,
      metadata: {
        security_event: 'staff_email_mfa',
        user_id: input.userId,
        challenge_id: input.challengeId,
      },
      enviada_at: input.status === 'Enviada' ? new Date().toISOString() : null,
    })
  } catch (error) {
    console.error('STAFF_MFA_DELIVERY_LOG_FAILED', error)
  }
}

export async function sendStaffMfaEmail(input: {
  challengeId: string
  userId: string
  email: string
  displayName: string
  code: string
  expiresMinutes: number
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    await recordDelivery({
      event: 'staff_mfa_code',
      recipient: input.email,
      status: 'Omitida',
      error: 'RESEND_API_KEY no está configurada.',
      userId: input.userId,
      challengeId: input.challengeId,
    })
    throw new Error('STAFF_MFA_EMAIL_UNAVAILABLE')
  }

  const subject = 'Código de verificación para ingresar a SERCOPREV'
  const text = [
    `Hola ${input.displayName},`,
    '',
    'Se ingresó correctamente su correo y contraseña de SERCOPREV.',
    'Para completar el acceso, use este código de verificación:',
    '',
    input.code,
    '',
    `El código vence en ${input.expiresMinutes} minutos y solo puede utilizarse una vez.`,
    'La autorización resultante será válida durante 24 horas en este navegador.',
    '',
    'Si usted no intentó ingresar, cambie su contraseña y comuníquese con el administrador.',
    '',
    'SERCOPREV · Seguridad de acceso interno',
  ].join('\n')

  const html = `<!doctype html>
<html lang="es">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
  <body style="margin:0;background:#eef3f6;font-family:Arial,Helvetica,sans-serif;color:#17324a">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">Código temporal para completar su acceso interno a SERCOPREV.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 12px;background:#eef3f6">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;overflow:hidden;border:1px solid #dbe3ea;border-radius:20px;background:#ffffff;box-shadow:0 14px 40px rgba(15,36,56,.09)">
          <tr><td style="padding:26px 30px;background:#0f2438">
            <div style="font-size:25px;font-weight:900;letter-spacing:.04em;color:#ffffff">SERCOPREV</div>
            <div style="margin-top:5px;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#e3bf63">Verificación de acceso interno</div>
          </td></tr>
          <tr><td style="padding:30px">
            <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#475569">Hola ${escapeHtml(input.displayName)},</p>
            <h1 style="margin:0 0 14px;font-size:25px;line-height:1.25;color:#0f2438">Complete su ingreso</h1>
            <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#475569">Su correo y contraseña fueron validados. Ingrese el siguiente código en la plataforma:</p>
            <div style="margin:0 auto 22px;padding:20px;border:1px solid #d7bd77;border-radius:16px;background:#fbf7eb;text-align:center;font-size:34px;font-weight:900;letter-spacing:.22em;color:#0f2438">${escapeHtml(input.code)}</div>
            <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#475569">Este código vence en <strong>${input.expiresMinutes} minutos</strong> y solo puede utilizarse una vez.</p>
            <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#475569">Después de verificarlo, este navegador quedará autorizado por <strong>24 horas</strong>.</p>
            <div style="padding:14px 16px;border-radius:12px;background:#fff7ed;font-size:13px;line-height:1.6;color:#9a3412"><strong>¿No fue usted?</strong> Cambie su contraseña y comuníquese de inmediato con el administrador. Nunca comparta este código.</div>
          </td></tr>
          <tr><td style="padding:18px 30px;background:#eaf3f9;font-size:12px;line-height:1.6;color:#52677a">SERCOPREV · Seguridad de acceso interno</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `staff-mfa-${input.challengeId}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL?.trim() || 'SERCOPREV <portal@sercoprev.cl>',
        to: [input.email],
        subject,
        html,
        text,
      }),
    })

    const payload = await response.json().catch(() => ({})) as { id?: string; message?: string }
    if (!response.ok) throw new Error(payload.message || `Resend respondió HTTP ${response.status}`)

    await recordDelivery({
      event: 'staff_mfa_code',
      recipient: input.email,
      status: 'Enviada',
      providerId: payload.id ?? null,
      userId: input.userId,
      challengeId: input.challengeId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    await recordDelivery({
      event: 'staff_mfa_code',
      recipient: input.email,
      status: 'Fallida',
      error: message,
      userId: input.userId,
      challengeId: input.challengeId,
    })
    throw new Error('STAFF_MFA_EMAIL_DELIVERY_FAILED')
  }
}
