import { NextResponse } from 'next/server'
import { getApplicationBaseUrl, getSupabasePublicConfig } from '@/utils/supabase/config'

export const dynamic = 'force-dynamic'

export function GET() {
  let publicSupabaseConfig = false
  let applicationBaseUrl = false

  try {
    getSupabasePublicConfig()
    publicSupabaseConfig = true
  } catch {
    publicSupabaseConfig = false
  }

  try {
    getApplicationBaseUrl()
    applicationBaseUrl = true
  } catch {
    applicationBaseUrl = false
  }

  const checks = {
    publicSupabaseConfig,
    applicationBaseUrl,
    supabaseSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY?.trim()),
  }

  const runtimeOverrides = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    supabasePublishableKey: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
    ),
    applicationBaseUrl: Boolean(process.env.APP_BASE_URL?.trim()),
  }

  const healthy = Object.values(checks).every(Boolean)

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      checks,
      runtimeOverrides,
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  )
}
