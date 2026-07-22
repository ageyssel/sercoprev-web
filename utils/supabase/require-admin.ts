import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

export async function requireAdmin() {
  const sessionClient = await createClient()
  const { data: { user }, error: userError } = await sessionClient.auth.getUser()

  if (userError || !user) throw new Error('UNAUTHENTICATED')

  const { data: profile, error: profileError } = await sessionClient
    .from('empresas')
    .select('id, es_admin, razon_social')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile?.es_admin) throw new Error('FORBIDDEN')

  return {
    actorUserId: user.id,
    actorName: profile.razon_social,
    adminClient: createAdminClient(),
    sessionClient,
  }
}
