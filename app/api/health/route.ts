import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export function GET() {
  const checks = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    supabasePublishableKey: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
    ),
    applicationBaseUrl: Boolean(process.env.APP_BASE_URL?.trim()),
    supabaseSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY?.trim()),
  }

  const healthy = Object.values(checks).every(Boolean)

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      checks,
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  )
}
