import 'server-only'

import { redirect } from 'next/navigation'
import { isCurrentStaffMfaVerified } from '@/lib/staff-mfa'
import { createClient } from '@/utils/supabase/server'
import { resolveUserContext } from '@/utils/supabase/user-context'
import { isPrivilegedAdminRole } from '@/utils/supabase/role-access'

export async function requirePrivilegedAdminPage() {
  const supabase = await createClient()
  const context = await resolveUserContext(supabase)

  if (!context) redirect('/login?message=Debe iniciar sesión para continuar')
  if (context.kind !== 'staff') redirect('/dashboard')
  if (!await isCurrentStaffMfaVerified(context.user.id)) {
    redirect('/login/verificar-codigo?message=Complete la verificación enviada a su correo')
  }
  if (context.mustChangePassword) redirect('/cuenta/cambiar-clave')
  if (!isPrivilegedAdminRole(context.role)) {
    redirect('/admin?message=Su rol no tiene acceso a configuración, usuarios ni auditoría')
  }

  return context
}
