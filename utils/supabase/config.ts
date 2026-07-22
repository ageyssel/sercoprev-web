const SUPABASE_URL_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i

// Estos valores son públicos por diseño: Next.js los entrega al navegador y
// Supabase protege el acceso real mediante Auth y RLS. Mantenerlos como respaldo
// evita que una variable omitida en Workers Builds deje el portal en HTTP 500.
const DEFAULT_SUPABASE_URL = 'https://kxrxlygnhukfmdgqhoaz.supabase.co'
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_LpXB0WEd-O8Y5ARxeEZ2hQ_xhw3jP1n'

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL
  const publishableKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim() || DEFAULT_SUPABASE_PUBLISHABLE_KEY

  if (!SUPABASE_URL_PATTERN.test(url)) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL no está configurada correctamente.')
  }

  if (!publishableKey) {
    throw new Error('Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.')
  }

  return { url, publishableKey }
}

export function getApplicationBaseUrl() {
  const configuredUrl = process.env.APP_BASE_URL?.trim()

  if (!configuredUrl) {
    return 'https://www.sercoprev.cl'
  }

  const parsedUrl = new URL(configuredUrl)

  if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
    throw new Error('APP_BASE_URL debe usar HTTP o HTTPS.')
  }

  return parsedUrl.origin
}
