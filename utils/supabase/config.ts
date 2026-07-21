const SUPABASE_URL_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publishableKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim()

  if (!url || !SUPABASE_URL_PATTERN.test(url)) {
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
