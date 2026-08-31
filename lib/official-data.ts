import { getOfficialIndicators } from '@/lib/chile-indicators'
import {
  AFP_NAMES,
  normalizeOfficialCode,
  parseBancoCentralDailyHtml,
  parseBancoCentralSupplementalHtml,
  parsePreviredHtml,
  type OfficialDataUnit,
  type ParsedOfficialValue,
} from '@/lib/official-data-parsers'
import { createAdminClient } from '@/utils/supabase/admin'

const PREVIRED_URL = 'https://www.previred.com/indicadores-previsionales/'
const BANCO_CENTRAL_DAILY_URL = 'https://si3.bcentral.cl/Indicadoressiete/secure/IndicadoresDiarios.aspx?Idioma=es-CL'
const BANCO_CENTRAL_SUPPLEMENTAL_URL = 'https://www.bcentral.cl/es/web/banco-central/inicio/-/details/contenido-general-ver-todos-los-indicadores-diarios'
const PREVIRED_SOURCE_NAME = 'PREVIRED — Indicadores Previsionales'

export type PayrollFieldStatus = 'official_today' | 'historical_degraded' | 'unavailable'

export type PayrollFieldState = {
  code: string
  status: PayrollFieldStatus
  sourceName?: string
  sourceUrl?: string
  obtainedAt?: string
  sourcePeriod?: string
  referenceDate?: string
  error?: string
}

export type AutomaticPayrollDefaults = {
  period: string
  incomeMinimum?: number
  pensionCapUf?: number
  healthCapUf?: number
  unemploymentCapUf?: number
  healthRate?: number
  sisEmployerRate?: number
  unemploymentWorkerIndefiniteRate?: number
  unemploymentEmployerIndefiniteRate?: number
  unemploymentEmployerFixedRate?: number
  afpRates: Record<string, number>
  sourceName: string
  sourceUrl: string
  obtainedAt?: string
  fromCache: boolean
  trackedAdditionalValues: string[]
  fieldStates: Record<string, PayrollFieldState>
  errors: Record<string, string>
  obtainedCodes: string[]
  degradedCodes: string[]
  unavailableCodes: string[]
  completeOfficialToday: boolean
  hasUsableValues: boolean
}

type OfficialDataSource = 'SII' | 'BANCO_CENTRAL' | 'PREVIRED' | 'SP' | 'AFC' | 'FONASA' | 'ISAPRE'

type OfficialDataRow = {
  fuente_codigo: OfficialDataSource
  codigo: string
  periodo: string
  valor: number
  unidad: OfficialDataUnit
  fuente_nombre: string
  fuente_url: string
  obtenido_at: string
  metadata: Record<string, unknown>
  updated_at: string
}

type HistoricalOfficialDataRow = {
  codigo: string
  periodo: string
  fecha_referencia: string
  valor: number
  fuente_nombre: string
  fuente_url: string
  obtenido_at: string
  metadata: Record<string, unknown>
}

export const REQUIRED_PAYROLL_CODES = [
  'INGRESO_MINIMO_GENERAL',
  'TOPE_IMPONIBLE_AFP_UF',
  'TOPE_IMPONIBLE_SALUD_UF',
  'TOPE_IMPONIBLE_AFC_UF',
  'TASA_SALUD_LEGAL',
  'TASA_SIS_EMPLEADOR',
  'TASA_AFC_TRABAJADOR_INDEFINIDO',
  'TASA_AFC_EMPLEADOR_INDEFINIDO',
  'TASA_AFC_EMPLEADOR_PLAZO',
  ...AFP_NAMES.map((name) => `TASA_AFP_${normalizeOfficialCode(name)}`),
] as const

function periodFromInput(inputDate: string) {
  const match = inputDate.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/)
  if (!match) throw new Error('INVALID_OFFICIAL_DATA_DATE')
  return `${match[1]}-${match[2]}-01`
}

async function fetchOfficialPage(url: string, revalidate = 21600) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SERCOPREV/1.0 (+https://www.sercoprev.cl)' },
    next: { revalidate },
  })
  if (!response.ok) throw new Error(`OFFICIAL_DATA_HTTP_${response.status}`)
  return response.text()
}

async function saveOfficialRows(rows: OfficialDataRow[]) {
  if (rows.length === 0) return
  const admin = createAdminClient()
  const { error } = await admin.from('datos_oficiales').upsert(rows, { onConflict: 'fuente_codigo,codigo,periodo' })
  if (error) throw error
}

function buildRows(
  source: OfficialDataSource,
  sourceName: string,
  sourceUrl: string,
  period: string,
  obtainedAt: string,
  values: ParsedOfficialValue[],
  commonMetadata: Record<string, unknown> = {},
): OfficialDataRow[] {
  return values.map((item) => ({
    fuente_codigo: source,
    codigo: item.code,
    periodo: period,
    valor: item.value,
    unidad: item.unit,
    fuente_nombre: sourceName,
    fuente_url: sourceUrl,
    obtenido_at: obtainedAt,
    metadata: { ...commonMetadata, ...(item.metadata ?? {}) },
    updated_at: obtainedAt,
  }))
}

async function collectPreviredCurrent() {
  const parsed = parsePreviredHtml(await fetchOfficialPage(PREVIRED_URL, 3600))
  const rows = buildRows(
    'PREVIRED',
    PREVIRED_SOURCE_NAME,
    PREVIRED_URL,
    parsed.period,
    parsed.obtainedAt,
    parsed.values,
    { published_for: parsed.period, payment_year: parsed.paymentYear },
  )
  return { ...parsed, rows }
}

async function readLatestHistoricalPayrollValues(period: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('datos_oficiales_versiones')
    .select('codigo, periodo, fecha_referencia, valor, fuente_nombre, fuente_url, obtenido_at, metadata')
    .eq('fuente_codigo', 'PREVIRED')
    .in('codigo', [...REQUIRED_PAYROLL_CODES])
    .lte('periodo', period)
    .order('periodo', { ascending: false })
    .order('fecha_referencia', { ascending: false })
    .order('obtenido_at', { ascending: false })
    .limit(1000)
  if (error) throw error

  const latest = new Map<string, HistoricalOfficialDataRow>()
  for (const row of (data ?? []) as HistoricalOfficialDataRow[]) {
    if (!latest.has(row.codigo)) latest.set(row.codigo, row)
  }
  return latest
}

function unknownError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function valueMap(rows: OfficialDataRow[]) {
  return new Map(rows.map((row) => [row.codigo, row]))
}

function resolvedValue(
  code: string,
  current: Map<string, OfficialDataRow>,
  historical: Map<string, HistoricalOfficialDataRow>,
) {
  const currentRow = current.get(code)
  if (currentRow) return Number(currentRow.valor)
  const historicalRow = historical.get(code)
  if (historicalRow) return Number(historicalRow.valor)
  return undefined
}

export async function syncPreviredCurrent() {
  const parsed = await collectPreviredCurrent()
  await saveOfficialRows(parsed.rows)
  return {
    source: 'PREVIRED',
    period: parsed.period,
    obtainedAt: parsed.obtainedAt,
    values: parsed.rows.length,
    obtainedCodes: parsed.rows.map((row) => row.codigo),
    errors: parsed.errors,
  }
}

export async function syncBancoCentralCurrent() {
  const [dailyHtml, supplementalHtml] = await Promise.all([
    fetchOfficialPage(BANCO_CENTRAL_DAILY_URL, 3600),
    fetchOfficialPage(BANCO_CENTRAL_SUPPLEMENTAL_URL, 3600).catch((error) => {
      console.warn('BANCO_CENTRAL_SUPPLEMENTAL_UNAVAILABLE', error)
      return null
    }),
  ])

  const daily = parseBancoCentralDailyHtml(dailyHtml)
  const supplementalValues = supplementalHtml ? parseBancoCentralSupplementalHtml(supplementalHtml) : []
  const dailyRows = buildRows(
    'BANCO_CENTRAL',
    'Banco Central de Chile — Indicadores diarios',
    BANCO_CENTRAL_DAILY_URL,
    daily.period,
    daily.obtainedAt,
    daily.values,
    { fecha_referencia: daily.referenceDate, publicacion: 'IndicadoresSiete' },
  )
  const supplementalRows = buildRows(
    'BANCO_CENTRAL',
    'Banco Central de Chile — Indicadores económicos',
    BANCO_CENTRAL_SUPPLEMENTAL_URL,
    daily.period,
    daily.obtainedAt,
    supplementalValues,
    { fecha_referencia: daily.referenceDate, publicacion: 'Portal BCCh' },
  )
  const rows = [...dailyRows, ...supplementalRows]
  await saveOfficialRows(rows)

  return {
    source: 'BANCO_CENTRAL',
    period: daily.period,
    referenceDate: daily.referenceDate,
    obtainedAt: daily.obtainedAt,
    values: rows.length,
    supplementalValues: supplementalRows.length,
    errors: daily.errors,
  }
}

export async function getAutomaticPayrollDefaults(inputDate: string): Promise<AutomaticPayrollDefaults> {
  const period = periodFromInput(inputDate)
  let currentRows: OfficialDataRow[] = []
  let currentObtainedAt: string | undefined
  let parserErrors: Record<string, string> = {}
  let sourceFailure: string | null = null

  try {
    const parsed = await collectPreviredCurrent()
    if (parsed.period === period) {
      currentRows = parsed.rows
      currentObtainedAt = parsed.obtainedAt
      parserErrors = parsed.errors
      try {
        await saveOfficialRows(parsed.rows)
      } catch (persistenceError) {
        console.error('PREVIRED_VALUES_NOT_PERSISTED', persistenceError)
      }
    } else {
      sourceFailure = 'PREVIRED_PERIOD_NOT_AVAILABLE'
    }
  } catch (error) {
    sourceFailure = unknownError(error, 'PREVIRED_SYNC_FAILED')
  }

  const current = valueMap(currentRows)
  const missingCodes = REQUIRED_PAYROLL_CODES.filter((code) => !current.has(code))
  let historical = new Map<string, HistoricalOfficialDataRow>()
  let historyFailure: string | null = null

  if (missingCodes.length > 0) {
    try {
      historical = await readLatestHistoricalPayrollValues(period)
    } catch (error) {
      historyFailure = unknownError(error, 'PREVIRED_HISTORY_LOOKUP_FAILED')
    }
  }

  const fieldStates: Record<string, PayrollFieldState> = {}
  const errors: Record<string, string> = {}
  const obtainedCodes: string[] = []
  const degradedCodes: string[] = []
  const unavailableCodes: string[] = []

  for (const code of REQUIRED_PAYROLL_CODES) {
    const currentRow = current.get(code)
    if (currentRow) {
      obtainedCodes.push(code)
      fieldStates[code] = {
        code,
        status: 'official_today',
        sourceName: currentRow.fuente_nombre,
        sourceUrl: currentRow.fuente_url,
        obtainedAt: currentRow.obtenido_at,
        sourcePeriod: currentRow.periodo,
      }
      continue
    }

    const fieldError = parserErrors[code] ?? sourceFailure ?? historyFailure ?? `${code}_NOT_AVAILABLE`
    errors[code] = fieldError
    const historicalRow = historical.get(code)
    if (historicalRow) {
      degradedCodes.push(code)
      fieldStates[code] = {
        code,
        status: 'historical_degraded',
        sourceName: historicalRow.fuente_nombre,
        sourceUrl: historicalRow.fuente_url,
        obtainedAt: historicalRow.obtenido_at,
        sourcePeriod: historicalRow.periodo,
        referenceDate: historicalRow.fecha_referencia,
        error: fieldError,
      }
    } else {
      unavailableCodes.push(code)
      fieldStates[code] = { code, status: 'unavailable', error: fieldError }
    }
  }

  const afpRates: Record<string, number> = {}
  for (const name of AFP_NAMES) {
    const value = resolvedValue(`TASA_AFP_${normalizeOfficialCode(name)}`, current, historical)
    if (value !== undefined && Number.isFinite(value) && value > 0) afpRates[name === 'ProVida' ? 'Provida' : name] = value
  }

  const requiredSet = new Set<string>(REQUIRED_PAYROLL_CODES)
  const trackedAdditionalValues = currentRows.filter((row) => !requiredSet.has(row.codigo)).map((row) => row.codigo)
  const completeOfficialToday = obtainedCodes.length === REQUIRED_PAYROLL_CODES.length
  const hasUsableValues = obtainedCodes.length + degradedCodes.length > 0

  return {
    period,
    incomeMinimum: resolvedValue('INGRESO_MINIMO_GENERAL', current, historical),
    pensionCapUf: resolvedValue('TOPE_IMPONIBLE_AFP_UF', current, historical),
    healthCapUf: resolvedValue('TOPE_IMPONIBLE_SALUD_UF', current, historical),
    unemploymentCapUf: resolvedValue('TOPE_IMPONIBLE_AFC_UF', current, historical),
    healthRate: resolvedValue('TASA_SALUD_LEGAL', current, historical),
    sisEmployerRate: resolvedValue('TASA_SIS_EMPLEADOR', current, historical),
    unemploymentWorkerIndefiniteRate: resolvedValue('TASA_AFC_TRABAJADOR_INDEFINIDO', current, historical),
    unemploymentEmployerIndefiniteRate: resolvedValue('TASA_AFC_EMPLEADOR_INDEFINIDO', current, historical),
    unemploymentEmployerFixedRate: resolvedValue('TASA_AFC_EMPLEADOR_PLAZO', current, historical),
    afpRates,
    sourceName: PREVIRED_SOURCE_NAME,
    sourceUrl: PREVIRED_URL,
    obtainedAt: currentObtainedAt,
    fromCache: obtainedCodes.length === 0,
    trackedAdditionalValues,
    fieldStates,
    errors,
    obtainedCodes,
    degradedCodes,
    unavailableCodes,
    completeOfficialToday,
    hasUsableValues,
  }
}

function chileToday() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

export async function syncAllOfficialData() {
  const tasks = [
    ['SII', () => getOfficialIndicators(chileToday())],
    ['PREVIRED', syncPreviredCurrent],
    ['BANCO_CENTRAL', syncBancoCentralCurrent],
  ] as const

  const settled = await Promise.allSettled(tasks.map(([, task]) => task()))
  return settled.map((result, index) => ({
    source: tasks[index][0],
    ok: result.status === 'fulfilled',
    error: result.status === 'rejected' ? (result.reason instanceof Error ? result.reason.message : 'UNKNOWN_SYNC_ERROR') : null,
  }))
}
