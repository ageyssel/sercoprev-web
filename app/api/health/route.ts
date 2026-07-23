import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getApplicationBaseUrl, getSupabasePublicConfig } from '@/utils/supabase/config'

export const dynamic = 'force-dynamic'

const RELEASE = '2026-07-23-official-sync-operational-1'
const OFFICIAL_DATA_MAX_AGE_MS = 48 * 60 * 60 * 1000

function currentChilePeriod() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-01`
}

function recentlyObtained(value: string | null | undefined) {
  if (!value) return false
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) && timestamp >= Date.now() - OFFICIAL_DATA_MAX_AGE_MS
}

export async function GET() {
  let publicSupabaseConfig = false
  let applicationBaseUrl = false
  let database = false
  let operationalSchema = false
  let payrollSchema = false
  let accountingSchema = false
  let officialIndicatorsSchema = false
  let officialDataSchema = false
  let officialDataHistorySchema = false
  let officialDataFreshness = false
  let closedRecordsProtectionSchema = false
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
      supabase.from('periodos_remuneraciones').select('id, periodo, estado, parametros_id').limit(1),
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

    const historyChecks = await Promise.all([
      supabase.from('datos_oficiales_versiones').select('id, fuente_codigo, codigo, fecha_referencia, periodo, valor, unidad, fuente_url, obtenido_at').limit(1),
      supabase.from('sercoprev_schema_migrations').select('filename').eq('filename', '202607230013_immutable_payroll_and_indicator_history.sql').limit(1),
    ])
    officialDataHistorySchema = historyChecks.every((result) => !result.error)

    const currentPeriod = currentChilePeriod()
    const [siiFreshness, previredFreshness, bancoFreshness] = await Promise.all([
      supabase.from('indicadores_oficiales').select('tipo, obtenido_at').in('tipo', ['UF', 'UTM']).order('obtenido_at', { ascending: false }).limit(10),
      supabase.from('datos_oficiales').select('codigo, obtenido_at').eq('fuente_codigo', 'PREVIRED').eq('periodo', currentPeriod).limit(100),
      supabase.from('datos_oficiales').select('codigo, obtenido_at').eq('fuente_codigo', 'BANCO_CENTRAL').eq('periodo', currentPeriod).limit(100),
    ])
    const siiRows = siiFreshness.data ?? []
    const previredRows = previredFreshness.data ?? []
    const bancoRows = bancoFreshness.data ?? []
    officialDataFreshness = !siiFreshness.error
      && !previredFreshness.error
      && !bancoFreshness.error
      && ['UF', 'UTM'].every((type) => siiRows.some((row) => row.tipo === type && recentlyObtained(row.obtenido_at)))
      && previredRows.some((row) => row.codigo === 'INGRESO_MINIMO_GENERAL' && recentlyObtained(row.obtenido_at))
      && previredRows.some((row) => row.codigo.startsWith('TASA_AFP_') && recentlyObtained(row.obtenido_at))
      && bancoRows.some((row) => row.codigo === 'DOLAR_OBSERVADO' && recentlyObtained(row.obtenido_at))
      && bancoRows.some((row) => row.codigo === 'EURO' && recentlyObtained(row.obtenido_at))

    const { data: protectionMigration, error: protectionError } = await supabase
      .from('sercoprev_schema_migrations')
      .select('filename')
      .eq('filename', '202607230014_closed_record_integrity.sql')
      .maybeSingle()
    closedRecordsProtectionSchema = !protectionError && protectionMigration?.filename === '202607230014_closed_record_integrity.sql'

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
    officialDataHistorySchema = false
    officialDataFreshness = false
    closedRecordsProtectionSchema = false
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
    officialDataHistorySchema,
    officialDataFreshness,
    closedRecordsProtectionSchema,
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
