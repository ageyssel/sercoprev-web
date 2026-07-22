import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getApplicationBaseUrl, getSupabasePublicConfig } from '@/utils/supabase/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  let publicSupabaseConfig = false
  let applicationBaseUrl = false
  let database = false
  let administrator = false
  let documentStorage = false

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

  try {
    const supabase = createAdminClient()

    const { data: adminProfile, error: profileError } = await supabase
      .from('empresas')
      .select('user_id')
      .eq('es_admin', true)
      .limit(1)
      .maybeSingle()

    database = !profileError

    if (!profileError && adminProfile?.user_id) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
        adminProfile.user_id,
      )
      administrator = !authError && Boolean(authUser.user)
    }

    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    documentStorage = !bucketError && Boolean(
      buckets?.some((bucket) => bucket.id === 'documentos' && bucket.public === false),
    )
  } catch {
    database = false
    administrator = false
    documentStorage = false
  }

  const checks = {
    publicSupabaseConfig,
    applicationBaseUrl,
    database,
    administrator,
    documentStorage,
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
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    },
  )
}
