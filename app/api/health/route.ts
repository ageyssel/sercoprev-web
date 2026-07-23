import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getApplicationBaseUrl, getSupabasePublicConfig } from '@/utils/supabase/config'

export const dynamic = 'force-dynamic'

const RELEASE = '2026-07-23-automatic-official-data-1'

export async function GET() {
  let publicSupabaseConfig = false
  let applicationBaseUrl = false
  let database = false
  let operationalSchema = false
  let payrollSchema = false
  let accountingSchema = false
  let officialIndicatorsSchema = false
  let officialDataSchema = false
  let userAccessSchema = false
  let documentIntakeSchema = false
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
    const { data: adminProfile, error: profileError } = await supabase.from('empresas').select('user_id').eq('es_admin', true).limit(1).maybeSingle()
    database = !profileError

    if (!profileError && adminProfile?.user_id) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(adminProfile.user_id)
      administrator = !authError && Boolean(authUser.user)
    }

    const operationalChecks = await Promise.all([
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
    operationalSchema = operationalChecks.every((result) => !result.error)

    const payrollChecks = await Promise.all([
      supabase.from('trabajadores').select('id, empresa_id, estado').limit(1),
      supabase.from('contratos_trabajo').select('id, trabajador_id, estado').limit(1),
      supabase.from('parametros_remuneraciones').select('id, periodo, uf_fecha, utm_periodo, fuente_uf, fuente_utm, indicadores_verificados_at, fuentes_automaticas, parametros_automaticos_at').limit(1),
      supabase.from('periodos_remuneraciones').select('id, periodo, estado').limit(1),
      supabase.from('conceptos_remuneracion').select('id, codigo').limit(1),
      supabase.from('novedades_remuneraciones').select('id, periodo_id, trabajador_id').limit(1),
      supabase.from('liquidaciones').select('id, estado').limit(1),
      supabase.from('vacaciones').select('id, estado').limit(1),
      supabase.from('licencias_medicas').select('id, estado').limit(1),
      supabase.from('finiquitos').select('id, estado').limit(1),
    ])
    payrollSchema = payrollChecks.every((result) => !result.error)

    const indicatorChecks = await Promise.all([
      supabase.from('indicadores_oficiales').select('id, tipo, fecha_referencia, valor, fuente_url, obtenido_at').limit(1),
      supabase.from('parametros_remuneraciones').select('id, uf_fecha, utm_periodo, fuente_uf, fuente_utm, indicadores_verificados_at').limit(1),
    ])
    officialIndicatorsSchema = indicatorChecks.every((result) => !result.error)

    const officialDataChecks = await Promise.all([
      supabase.from('datos_oficiales').select('id, fuente_codigo, codigo, periodo, valor, unidad, fuente_url, obtenido_at').limit(1),
      supabase.from('parametros_remuneraciones').select('id, fuentes_automaticas, parametros_automaticos_at').limit(1),
    ])
    officialDataSchema = officialDataChecks.every((result) => !result.error)

    const accountingChecks = await Promise.all([
      supabase.from('plan_cuentas').select('id, codigo').limit(1),
      supabase.from('periodos_contables').select('id, periodo').limit(1),
      supabase.from('asientos_contables').select('id, numero, estado').limit(1),
      supabase.from('movimientos_contables').select('id, debe, haber').limit(1),
      supabase.from('documentos_tributarios').select('id, tipo_registro, fingerprint').limit(1),
      supabase.from('cuentas_bancarias').select('id').limit(1),
      supabase.from('movimientos_bancarios').select('id, estado, fingerprint').limit(1),
      supabase.from('conciliaciones_bancarias').select('id').limit(1),
      supabase.from('importaciones_contables').select('id, tipo, estado').limit(1),
    ])
    accountingSchema = accountingChecks.every((result) => !result.error)

    const userChecks = await Promise.all([
      supabase.from('usuarios_organizacion').select('id, rol, activo, must_change_password').limit(1),
      supabase.from('empresa_usuarios').select('id, empresa_id, rol, activo, must_change_password').limit(1),
    ])
    userAccessSchema = userChecks.every((result) => !result.error)

    const intakeChecks = await Promise.all([
      supabase.from('lotes_documentales').select('id, estado').limit(1),
      supabase.from('archivos_ingesta').select('id, estado, confianza').limit(1),
      supabase.from('documentos').select('id, lote_id, clasificacion_estado, fuente_carga').limit(1),
    ])
    documentIntakeSchema = intakeChecks.every((result) => !result.error)

    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    documentStorage = !bucketError && Boolean(buckets?.some((bucket) => bucket.id === 'documentos' && bucket.public === false))
  } catch (error) {
    console.error('HEALTH_CHECK_FAILED', error)
    database = false
    operationalSchema = false
    payrollSchema = false
    accountingSchema = false
    officialIndicatorsSchema = false
    officialDataSchema = false
    userAccessSchema = false
    documentIntakeSchema = false
    administrator = false
    documentStorage = false
  }

  const checks = {
    publicSupabaseConfig,
    applicationBaseUrl,
    database,
    operationalSchema,
    payrollSchema,
    accountingSchema,
    officialIndicatorsSchema,
    officialDataSchema,
    userAccessSchema,
    documentIntakeSchema,
    administrator,
    documentStorage,
  }
  const healthy = Object.values(checks).every(Boolean)

  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', release: RELEASE, checks },
    { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow, noarchive' } },
  )
}
