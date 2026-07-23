import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const RELEASE = '2026-07-23-auth-render-hotfix-1'

export async function GET() {
  return NextResponse.json(
    {
      service: 'sercoprev-web',
      release: RELEASE,
      runtime: 'cloudflare-workers',
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    },
  )
}
