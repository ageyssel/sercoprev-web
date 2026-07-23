import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { resolveUserContext } from '@/utils/supabase/user-context'

export async function requireClientCompany() {
  const sessionClient = await createClient()
  const context = await resolveUserContext(sessionClient)

  if (!context) throw new Error('UNAUTHENTICATED')
  if (context.kind !== 'client') throw new Error('INVALID_CLIENT')

  return {
    sessionClient,
    adminClient: createAdminClient(),
    user: context.user,
    company: {
      id: context.companyId,
      name: context.companyName,
    },
    role: context.role,
    displayName: context.displayName,
    mustChangePassword: context.mustChangePassword,
  }
}
