type InvitationInput = {
  email: string
  name: string
  role: string
  temporaryPassword: string
  destination: 'admin' | 'client'
  companyName?: string | null
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}

export async function sendInvitationEmail(input: InvitationInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return { sent: false, reason: 'RESEND_API_KEY no configurada' }

  const baseUrl = process.env.APP_BASE_URL?.trim() || 'https://www.sercoprev.cl'
  const target = `${baseUrl}/login`
  const scope = input.destination === 'admin' ? 'equipo SERCOPREV' : input.companyName || 'Portal de Clientes'
  const subject = input.destination === 'admin' ? 'Su acceso al equipo SERCOPREV' : `Su acceso a ${input.companyName || 'SERCOPREV'}`

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#17324a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #dbe3ea;border-radius:20px;overflow:hidden"><tr><td style="background:#0f2438;padding:26px 30px"><div style="font-size:25px;font-weight:900;color:#fff">SERCOPREV</div><div style="margin-top:5px;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#e3bf63">Acceso seguro</div></td></tr><tr><td style="padding:30px"><p style="margin:0 0 14px;color:#475569">Hola ${escapeHtml(input.name)},</p><h1 style="margin:0 0 18px;font-size:27px;color:#0f2438">Su cuenta fue creada</h1><p style="margin:0 0 14px;line-height:1.7;color:#475569">Se habilitó un acceso para <strong>${escapeHtml(scope)}</strong> con el rol <strong>${escapeHtml(input.role)}</strong>.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;border:1px solid #dbe3ea;border-radius:14px;background:#f8fafc"><tr><td style="padding:12px 14px;font-size:12px;font-weight:800;color:#64748b">CORREO</td><td style="padding:12px 14px;text-align:right;font-weight:700">${escapeHtml(input.email)}</td></tr><tr><td style="padding:12px 14px;border-top:1px solid #e2e8f0;font-size:12px;font-weight:800;color:#64748b">CONTRASEÑA TEMPORAL</td><td style="padding:12px 14px;border-top:1px solid #e2e8f0;text-align:right;font-family:monospace;font-weight:900">${escapeHtml(input.temporaryPassword)}</td></tr></table><p style="margin:0 0 18px;line-height:1.7;color:#475569">Al iniciar sesión deberá reemplazar inmediatamente la contraseña temporal.</p><a href="${escapeHtml(target)}" style="display:inline-block;border-radius:12px;background:#134b78;padding:13px 20px;font-size:14px;font-weight:800;color:#fff;text-decoration:none">Ingresar a SERCOPREV</a><p style="margin:26px 0 0;font-size:12px;line-height:1.6;color:#94a3b8">No reenvíe este correo. SERCOPREV nunca solicitará su contraseña por correo, WhatsApp o teléfono.</p></td></tr><tr><td style="background:#eaf3f9;padding:18px 30px;font-size:12px;color:#52677a">SERCOPREV · ${escapeHtml(baseUrl.replace(/^https?:\/\//, ''))}</td></tr></table></td></tr></table></body></html>`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL?.trim() || 'SERCOPREV <portal@sercoprev.cl>',
      to: [input.email],
      subject,
      html,
      text: `Hola ${input.name}\n\nSu cuenta SERCOPREV fue creada.\nRol: ${input.role}\nCorreo: ${input.email}\nContraseña temporal: ${input.temporaryPassword}\nIngreso: ${target}\n\nAl ingresar deberá cambiar la contraseña temporal.`,
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(`Resend respondió ${response.status}: ${details.slice(0, 300)}`)
  }
  return { sent: true, reason: null }
}
