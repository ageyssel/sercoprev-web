import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { resolveUserContext, type StaffRole } from '@/utils/supabase/user-context'
import { isCurrentStaffMfaVerified } from '@/lib/staff-mfa'

export async function requireAdmin(allowedRoles?: StaffRole[]) {
  const sessionClient = await createClient()
  const context = await resolveUserContext(sessionClient)

  if (!context) throw new Error('UNAUTHENTICATED')
  if (context.kind !== 'staff' || !context.canWrite) throw new Error('FORBIDDEN')
  if (!await isCurrentStaffMfaVerified(context.user.id)) throw new Error('MFA_REQUIRED')
  if (context.mustChangePassword) throw new Error('PASSWORD_CHANGE_REQUIRED')
  if (allowedRoles && !allowedRoles.includes(context.role)) throw new Error('FORBIDDEN_ROLE')

  return {
    actorUserId: context.user.id,
    actorName: context.displayName,
    actorRole: context.role,
    adminClient: createAdminClient({ actorUserId: context.user.id }),
    sessionClient,
  }
}
