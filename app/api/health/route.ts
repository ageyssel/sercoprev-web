import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getApplicationBaseUrl, getSupabasePublicConfig } from '@/utils/supabase/config'

export const dynamic = 'force-dynamic'

const RELEASE = '2026-07-24-comprehensive-audit-rbac-1'
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

  // Cada bloque usa consultas representativas. La migración productiva valida
  // exhaustivamente tablas, columnas y triggers antes de desplegar; el health
  // comprueba aquí disponibilidad funcional sin superar el límite de
  // subsolicitudes de Cloudflare Workers.
  const operationalSchema = await safeCheck('OPERATIONAL_SCHEMA', async () => {
    const supabase = createAdminClient()
    return allSucceeded(await Promise.all([
      supabase.from('empresas').select('id, estado_cliente, contador_asignado, plan_servicio').limit(1),
      supabase.from('tareas').select('id, serie_id, periodo_recurrente, es_recurrente').limit(1),
      supabase.from('solicitudes_documentos').select('id, estado').limit(1),
      supabase.from('auditoria_eventos').select('id, accion').limit(1),
      supabase.from('notificaciones').select('id, canal, estado').limit(1),
    ]))
  })

  const payrollSchema = await safeCheck('PAYROLL_SCHEMA', async () => {
    const supabase = createAdminClient()
    return allSucceeded(await Promise.all([
      supabase.from('trabajadores').select('id, empresa_id, estado').limit(1),
      supabase.from('parametros_remuneraciones').select('id, periodo, uf_fecha, utm_periodo, fuentes_automaticas').limit(1),
      supabase.from('periodos_remuneraciones').select('id, periodo, estado, parametros_id').limit(1),
      supabase.from('liquidaciones').select('id, estado').limit(1),
      supabase.from('finiquitos').select('id, estado').limit(1),
    ]))
  })

  const accountingSchema = await safeCheck('ACCOUNTING_SCHEMA', async () => {
    const supabase = createAdminClient()
    return allSucceeded(await Promise.all([
      supabase.from('plan_cuentas').select('id, codigo').limit(1),
      supabase.from('periodos_contables').select('id, periodo').limit(1),
      supabase.from('asientos_contables').select('id, numero, estado').limit(1),
      supabase.from('movimientos_contables').select('id, debe, haber').limit(1),
      supabase.from('documentos_tributarios').select('id, tipo_registro, fingerprint').limit(1),
    ]))
  })

  const officialIndicatorsSchema = await safeCheck('OFFICIAL_INDICATORS_SCHEMA', async () => {
    const { error } = await createAdminClient()
      .from('indicadores_oficiales')
      .select('id, tipo, fecha_referencia, valor, fuente_url, obtenido_at')
      .limit(1)
    return !error
  })

  const officialDataSchema = await safeCheck('OFFICIAL_DATA_SCHEMA', async () => {
    const { error } = await createAdminClient()
      .from('datos_oficiales')
      .select('id, fuente_codigo, codigo, periodo, valor, unidad, fuente_url, obtenido_at')
      .limit(1)
    return !error
  })

  const officialDataHistorySchema = await safeCheck('OFFICIAL_DATA_HISTORY_SCHEMA', async () => {
    const supabase = createAdminClient()
    return allSucceeded(await Promise.all([
      supabase.from('datos_oficiales_versiones').select('id, fuente_codigo, codigo, fecha_referencia, periodo, valor').limit(1),
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

  const auditTrailSchema = await safeCheck('AUDIT_TRAIL_SCHEMA', async () => {
    const supabase = createAdminClient()
    const [audit, migration] = await Promise.all([
      supabase.from('auditoria_eventos').select('id, transaction_code, actor_name, actor_email, actor_role, target_user_id, module, description, result, source, request_id, before_data, after_data, created_at').limit(1),
      supabase.from('sercoprev_schema_migrations').select('filename').eq('filename', '202607240016_comprehensive_audit_and_admin_rbac.sql').maybeSingle(),
    ])
    return !audit.error
      && !migration.error
      && migration.data?.filename === '202607240016_comprehensive_audit_and_admin_rbac.sql'
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
    const [lots, files, documents, migration] = await Promise.all([
      supabase.from('lotes_documentales').select('id').limit(1),
      supabase.from('archivos_ingesta').select('id').limit(1),
      supabase.from('documentos').select('id').limit(1),
      supabase.from('sercoprev_schema_migrations').select('filename').eq('filename', '202607230006_document_intake_queue.sql').maybeSingle(),
    ])
    return !lots.error
      && !files.error
      && !documents.error
      && !migration.error
      && migration.data?.filename === '202607230006_document_intake_queue.sql'
  })

  const administrator = await safeCheck('ADMINISTRATOR', async () => {
    const directory = createAdminClient()
    const [directAdmin, staffAdmin] = await Promise.all([
      directory.from('empresas').select('user_id').eq('es_admin', true).not('user_id', 'is', null).limit(1),
      directory.from('usuarios_organizacion').select('user_id').eq('activo', true).in('rol', ['Superadministrador', 'Administrador']).limit(1),
    ])
    if (directAdmin.error || staffAdmin.error) return false
    return Boolean(directAdmin.data?.[0]?.user_id ?? staffAdmin.data?.[0]?.user_id)
  })

  const documentStorage = await safeCheck('DOCUMENT_STORAGE', async () => {
    const { data, error } = await createAdminClient().storage.getBucket('documentos')
    return !error && data?.id === 'documentos' && data.public === false
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
    auditTrailSchema,
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
