import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getApplicationBaseUrl, getSupabasePublicConfig } from '@/utils/supabase/config'

export const dynamic = 'force-dynamic'

const RELEASE = '2026-07-23-staff-email-mfa-health-1'
const OFFICIAL_DATA_MAX_AGE_MS = 48 * 60 * 60 * 1000

type QueryResult = { error: unknown }

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

function allSucceeded(results: QueryResult[]) {
  return results.every((result) => !result.error)
}

async function safeCheck(name: string, check: () => Promise<boolean>) {
  try {
    return await check()
  } catch (error) {
    console.error(`HEALTH_${name}_FAILED`, error)
    return false
  }
}

export async function GET() {
  const publicSupabaseConfig = await safeCheck('PUBLIC_SUPABASE_CONFIG', async () => {
    getSupabasePublicConfig()
    return true
  })

  const applicationBaseUrl = await safeCheck('APPLICATION_BASE_URL', async () => {
    getApplicationBaseUrl()
    return true
  })

  const database = await safeCheck('DATABASE', async () => {
    const { error } = await createAdminClient().from('empresas').select('id').limit(1)
    return !error
  })

  const operationalSchema = await safeCheck('OPERATIONAL_SCHEMA', async () => {
    const supabase = createAdminClient()
    const results = await Promise.all([
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
    return allSucceeded(results)
  })

  const payrollSchema = await safeCheck('PAYROLL_SCHEMA', async () => {
    const supabase = createAdminClient()
    const results = await Promise.all([
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
    return allSucceeded(results)
  })

  const accountingSchema = await safeCheck('ACCOUNTING_SCHEMA', async () => {
    const supabase = createAdminClient()
    const results = await Promise.all([
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
    return allSucceeded(results)
  })

  const officialIndicatorsSchema = await safeCheck('OFFICIAL_INDICATORS_SCHEMA', async () => {
    const supabase = createAdminClient()
    return allSucceeded(await Promise.all([
      supabase.from('indicadores_oficiales').select('id, tipo, fecha_referencia, valor, fuente_url, obtenido_at').limit(1),
      supabase.from('parametros_remuneraciones').select('id, uf_fecha, utm_periodo, fuente_uf, fuente_utm, indicadores_verificados_at').limit(1),
    ]))
  })

  const officialDataSchema = await safeCheck('OFFICIAL_DATA_SCHEMA', async () => {
    const supabase = createAdminClient()
    return allSucceeded(await Promise.all([
      supabase.from('datos_oficiales').select('id, fuente_codigo, codigo, periodo, valor, unidad, fuente_url, obtenido_at').limit(1),
      supabase.from('parametros_remuneraciones').select('id, fuentes_automaticas, parametros_automaticos_at').limit(1),
    ]))
  })

  const officialDataHistorySchema = await safeCheck('OFFICIAL_DATA_HISTORY_SCHEMA', async () => {
    const supabase = createAdminClient()
    return allSucceeded(await Promise.all([
      supabase.from('datos_oficiales_versiones').select('id, fuente_codigo, codigo, fecha_referencia, periodo, valor, unidad, fuente_url, obtenido_at').limit(1),
      supabase.from('sercoprev_schema_migrations').select('filename').eq('filename', '202607230013_immutable_payroll_and_indicator_history.sql').limit(1),
    ]))
  })

  const officialDataFreshness = await safeCheck('OFFICIAL_DATA_FRESHNESS', async () => {
    const supabase = createAdminClient()
    const currentPeriod = currentChilePeriod()
    const [sii, previred, banco] = await Promise.all([
      supabase.from('indicadores_oficiales').select('tipo, obtenido_at').in('tipo', ['UF', 'UTM']).order('obtenido_at', { ascending: false }).limit(10),
      supabase.from('datos_oficiales').select('codigo, obtenido_at').eq('fuente_codigo', 'PREVIRED').eq('periodo', currentPeriod).limit(100),
      supabase.from('datos_oficiales').select('codigo, obtenido_at').eq('fuente_codigo', 'BANCO_CENTRAL').eq('periodo', currentPeriod).limit(100),
    ])
    if (sii.error || previred.error || banco.error) return false
    const siiRows = sii.data ?? []
    const previredRows = previred.data ?? []
    const bancoRows = banco.data ?? []
    return ['UF', 'UTM'].every((type) => siiRows.some((row) => row.tipo === type && recentlyObtained(row.obtenido_at)))
      && previredRows.some((row) => row.codigo === 'INGRESO_MINIMO_GENERAL' && recentlyObtained(row.obtenido_at))
      && previredRows.some((row) => row.codigo.startsWith('TASA_AFP_') && recentlyObtained(row.obtenido_at))
      && bancoRows.some((row) => row.codigo === 'DOLAR_OBSERVADO' && recentlyObtained(row.obtenido_at))
      && bancoRows.some((row) => row.codigo === 'EURO' && recentlyObtained(row.obtenido_at))
  })

  const closedRecordsProtectionSchema = await safeCheck('CLOSED_RECORDS_PROTECTION_SCHEMA', async () => {
    const { data, error } = await createAdminClient()
      .from('sercoprev_schema_migrations')
      .select('filename')
      .eq('filename', '202607230014_closed_record_integrity.sql')
      .maybeSingle()
    return !error && data?.filename === '202607230014_closed_record_integrity.sql'
  })

  const userAccessSchema = await safeCheck('USER_ACCESS_SCHEMA', async () => {
    const supabase = createAdminClient()
    return allSucceeded(await Promise.all([
      supabase.from('usuarios_organizacion').select('id, rol, activo, must_change_password').limit(1),
      supabase.from('empresa_usuarios').select('id, empresa_id, rol, activo, must_change_password').limit(1),
    ]))
  })

  const staffMfaSchema = await safeCheck('STAFF_MFA_SCHEMA', async () => {
    const supabase = createAdminClient()
    const [challenge, session, migration] = await Promise.all([
      supabase.from('staff_mfa_challenges').select('id, user_id, expires_at, consumed_at, attempts').limit(1),
      supabase.from('staff_mfa_sessions').select('id, user_id, expires_at, revoked_at').limit(1),
      supabase.from('sercoprev_schema_migrations').select('filename').eq('filename', '202607230015_staff_email_mfa.sql').maybeSingle(),
    ])
    return !challenge.error
      && !session.error
      && !migration.error
      && migration.data?.filename === '202607230015_staff_email_mfa.sql'
  })

  const staffMfaEmailDeliveryConfigured = Boolean(process.env.RESEND_API_KEY?.trim())

  const documentIntakeSchema = await safeCheck('DOCUMENT_INTAKE_SCHEMA', async () => {
    const supabase = createAdminClient()
    return allSucceeded(await Promise.all([
      supabase.from('lotes_documentales').select('id, estado').limit(1),
      supabase.from('archivos_ingesta').select('id, estado, confianza').limit(1),
      supabase.from('documentos').select('id, lote_id, clasificacion_estado, fuente_carga').limit(1),
    ]))
  })

  const administrator = await safeCheck('ADMINISTRATOR', async () => {
    const directory = createAdminClient()
    const [directAdmin, staffAdmin] = await Promise.all([
      directory.from('empresas').select('user_id').eq('es_admin', true).not('user_id', 'is', null).limit(1),
      directory.from('usuarios_organizacion').select('user_id').eq('activo', true).in('rol', ['Superadministrador', 'Administrador']).limit(1),
    ])
    if (directAdmin.error || staffAdmin.error) return false
    const userId = directAdmin.data?.[0]?.user_id ?? staffAdmin.data?.[0]?.user_id
    if (!userId) return false

    // Se usa un cliente separado para que una incidencia de Auth nunca altere
    // las cabeceras o el estado de los controles de datos y Storage.
    const { data, error } = await createAdminClient().auth.admin.getUserById(userId)
    return !error && Boolean(data.user)
  })

  const documentStorage = await safeCheck('DOCUMENT_STORAGE', async () => {
    const { data, error } = await createAdminClient().storage.listBuckets()
    return !error && Boolean(data?.some((bucket) => bucket.id === 'documentos' && bucket.public === false))
  })

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
    staffMfaSchema,
    staffMfaEmailDeliveryConfigured,
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
