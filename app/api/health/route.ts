import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getApplicationBaseUrl, getSupabasePublicConfig } from '@/utils/supabase/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  let publicSupabaseConfig = false
  let applicationBaseUrl = false
  let database = false
  let operationalSchema = false
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

    const schemaChecks = await Promise.all([
      supabase.from('empresas').select('id, estado_cliente, contador_asignado, plan_servicio').limit(1),
      supabase.from('leads').select('id').limit(1),
      supabase.from('obligaciones').select('id').limit(1),
      supabase.from('tareas').select('id, serie_id, periodo_recurrente, es_recurrente').limit(1),
      supabase.from('tarea_series').select('id, meses_anticipacion, activa').limit(1),
      supabase.from('solicitudes_documentos').select('id').limit(1),
      supabase.from('servicios_contratados').select('id').limit(1),
      supabase.from('auditoria_eventos').select('id').limit(1),
      supabase.from('notificaciones').select('id, canal, estado').limit(1),
      supabase.from('honorarios').select('id').limit(1),
      supabase.from('tickets').select('id').limit(1),
      supabase.from('ticket_mensajes').select('id').limit(1),
      supabase.from('contactos_empresa').select('id').limit(1),
    ])

    operationalSchema = schemaChecks.every((result) => !result.error)

    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    documentStorage = !bucketError && Boolean(
      buckets?.some((bucket) => bucket.id === 'documentos' && bucket.public === false),
    )
  } catch {
    database = false
    operationalSchema = false
    administrator = false
    documentStorage = false
  }

  const checks = {
    publicSupabaseConfig,
    applicationBaseUrl,
    database,
    operationalSchema,
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
