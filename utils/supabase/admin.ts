import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicConfig } from './config'

export function createAdminClient() {
  const { url } = getSupabasePublicConfig()
  const secretKey = (
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )?.trim()

  if (!secretKey) {
    throw new Error('Falta SUPABASE_SECRET_KEY en el entorno del servidor.')
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}
