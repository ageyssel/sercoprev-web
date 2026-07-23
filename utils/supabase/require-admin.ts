import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { resolveUserContext, type StaffRole } from '@/utils/supabase/user-context'

export async function requireAdmin(allowedRoles?: StaffRole[]) {
  const sessionClient = await createClient()
  const context = await resolveUserContext(sessionClient)

  if (!context) throw new Error('UNAUTHENTICATED')
  if (context.kind !== 'staff' || !context.canWrite) throw new Error('FORBIDDEN')
  if (allowedRoles && !allowedRoles.includes(context.role)) throw new Error('FORBIDDEN_ROLE')

  return {
    actorUserId: context.user.id,
    actorName: context.displayName,
    actorRole: context.role,
    adminClient: createAdminClient(),
    sessionClient,
  }
}
