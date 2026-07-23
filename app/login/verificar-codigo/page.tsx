import { redirect } from 'next/navigation'
import { AppIcon } from '@/components/AppIcon'
import { BrandLogo } from '@/components/BrandLogo'
import { SubmitButton } from '@/app/admin/components/SubmitButton'
import {
  getPendingStaffMfaChallenge,
  isCurrentStaffMfaVerified,
  maskStaffEmail,
} from '@/lib/staff-mfa'
import { createClient } from '@/utils/supabase/server'
import { resolveUserContext } from '@/utils/supabase/user-context'
import { cancelarVerificacion, reenviarCodigo, verificarCodigo } from './actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function VerifyCodePage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const context = await resolveUserContext(supabase)

  if (!context) redirect('/login?message=La sesión expiró. Ingrese nuevamente')
  if (context.kind !== 'staff') redirect('/dashboard')
  if (await isCurrentStaffMfaVerified(context.user.id)) redirect(context.mustChangePassword ? '/cuenta/cambiar-clave' : '/admin')

  const challenge = await getPendingStaffMfaChallenge(context.user.id)
  if (!challenge) redirect('/login?message=El código venció. Ingrese nuevamente para solicitar otro')

  const expiresAt = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(challenge.expires_at))

  return (
    <main className="min-h-screen bg-[#edf2f5] px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <section className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-[#0f2438]/10">
          <div className="bg-[#0f2438] px-7 py-6 text-white sm:px-9">
            <BrandLogo inverse />
            <div className="mt-7 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d6ad4d]/15 text-[#e3bf63] ring-1 ring-[#d6ad4d]/25">
                <AppIcon name="shield" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#e3bf63]">Segundo factor obligatorio</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">Verifique su identidad</h1>
              </div>
            </div>
          </div>

          <div className="p-7 sm:p-9">
            <p className="text-sm leading-6 text-slate-600">
              Enviamos un código de 8 dígitos a <strong className="text-[#17324a]">{maskStaffEmail(challenge.email)}</strong>. Vence aproximadamente a las <strong className="text-[#17324a]">{expiresAt}</strong>.
            </p>

            <div className="mt-5 rounded-xl border border-[#d9c184] bg-[#fcf8ed] p-4 text-sm leading-6 text-[#6f571c]">
              Al verificarlo, este navegador quedará autorizado durante 24 horas. El código es personal, de un solo uso y nunca debe compartirse.
            </div>

            <form action={verificarCodigo} className="mt-7 grid gap-5">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Código de seguridad
                <input
                  name="code"
                  type="text"
                  required
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{8}"
                  minLength={8}
                  maxLength={8}
                  placeholder="00000000"
                  aria-describedby="code-help"
                  className="h-14 w-full rounded-xl border border-slate-300 bg-white px-4 text-center text-2xl font-black tracking-[0.28em] text-[#17324a] outline-none focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10"
                />
                <span id="code-help" className="text-xs font-medium text-slate-500">Ingrese únicamente los 8 números recibidos por correo.</span>
              </label>

              {params.message && <div role="alert" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">{params.message}</div>}

              <SubmitButton text="Verificar e ingresar" loadingText="Verificando código…" className="min-h-12 w-full rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#0f2438]/10 transition hover:bg-[#173d5c]" />
            </form>

            <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
              <form action={reenviarCodigo}>
                <button type="submit" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-[#134b78] transition hover:bg-[#f3f7fa]">Reenviar código</button>
              </form>
              <form action={cancelarVerificacion}>
                <button type="submit" className="min-h-11 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">Cancelar y salir</button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
