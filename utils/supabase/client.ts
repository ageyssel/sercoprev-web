import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Nuevamente, quitamos el "!" para que no explote si no hay URL en el build
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  )
}