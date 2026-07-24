import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin/AdminShell'
import { createClient } from '@/utils/supabase/server'
import { resolveUserContext } from '@/utils/supabase/user-context'
import { isCurrentStaffMfaVerified } from '@/lib/staff-mfa'
import { isPrivilegedAdminRole } from '@/utils/supabase/role-access'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  let context = null

  try {
    context = await resolveUserContext(supabase)
  } catch (error) {
    console.error('ADMIN_LAYOUT_CONTEXT_RESOLUTION_FAILED', error)
    redirect('/login?message=No fue posible cargar su sesión. Ingrese nuevamente')
  }

  if (!context) redirect('/login?message=La sesión no está habilitada para este portal')
  if (context.kind !== 'staff') redirect('/dashboard')
  if (!await isCurrentStaffMfaVerified(context.user.id)) redirect('/login/verificar-codigo?message=Complete la verificación enviada a su correo')
  if (context.mustChangePassword) redirect('/cuenta/cambiar-clave')

  return (
    <AdminShell
      adminName={`${context.displayName} · ${context.role}`}
      canManageSettings={isPrivilegedAdminRole(context.role)}
    >
      {children}
    </AdminShell>
  )
}
