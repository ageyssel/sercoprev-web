import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig } from './config'

type AdminClientContext = {
  actorUserId?: string | null
  requestId?: string | null
}

export function createAdminClient(context: AdminClientContext = {}) {
  const { url } = getSupabasePublicConfig()
  const secretKey = (
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )?.trim()

  if (!secretKey) {
    throw new Error('Falta SUPABASE_SECRET_KEY en el entorno del servidor.')
  }

  const headers: Record<string, string> = {}
  if (context.actorUserId) headers['x-sercoprev-actor-user-id'] = context.actorUserId
  headers['x-sercoprev-request-id'] = context.requestId || crypto.randomUUID()

  return createClient(url, secretKey, {
    global: { headers },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}
