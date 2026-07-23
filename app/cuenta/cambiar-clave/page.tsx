import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ChangePasswordForm } from './ChangePasswordForm'
import { resolveUserContext } from '@/utils/supabase/user-context'
import { isCurrentStaffMfaVerified } from '@/lib/staff-mfa'

export const dynamic = 'force-dynamic'

export default async function ChangePasswordPage() {
  const supabase = await createClient()
  const context = await resolveUserContext(supabase)

  if (!context) redirect('/login')
  if (context.kind === 'staff' && !await isCurrentStaffMfaVerified(context.user.id)) {
    redirect('/login/verificar-codigo?message=Complete la verificación antes de cambiar su contraseña')
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
        <div className="relative mx-auto mb-6 h-14 w-52">
          <Image src="/logo.png" alt="SERCOPREV" fill className="object-contain" priority />
        </div>

        <h1 className="text-2xl font-black text-[#0f172a] text-center">
          Proteja su cuenta
        </h1>
        <p className="mt-3 mb-7 text-center text-sm leading-relaxed text-gray-600">
          Antes de ingresar al portal debe reemplazar la contraseña temporal.
        </p>

        <ChangePasswordForm />
      </section>
    </main>
  )
}
