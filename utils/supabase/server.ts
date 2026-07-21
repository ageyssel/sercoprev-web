import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabasePublicConfig } from './config'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, publishableKey } = getSupabasePublicConfig()

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // En Server Components las cookies solo pueden escribirse desde
          // Server Actions, Route Handlers o Proxy. Proxy refresca la sesión.
        }
      },
    },
  })
}
