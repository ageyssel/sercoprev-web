import { getOfficialIndicators } from '@/lib/chile-indicators'
import { createAdminClient } from '@/utils/supabase/admin'

const PREVIRED_URL = 'https://www.previred.com/indicadores-previsionales/'
const BANCO_CENTRAL_URL = 'https://www.bcentral.cl/es/web/banco-central/inicio/-/details/contenido-general-ver-todos-los-indicadores-diarios'

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

const AFP_NAMES = ['Capital', 'Cuprum', 'Habitat', 'PlanVital', 'ProVida', 'Modelo', 'Uno'] as const

export type AutomaticPayrollDefaults = {
  period: string
  incomeMinimum: number
  pensionCapUf: number
  healthCapUf: number
  unemploymentCapUf: number
  healthRate: number
  sisEmployerRate: number
  unemploymentWorkerIndefiniteRate: number
  unemploymentEmployerIndefiniteRate: number
  unemploymentEmployerFixedRate: number
  afpRates: Record<string, number>
  sourceName: string
  sourceUrl: string
  obtainedAt: string
  fromCache: boolean
  trackedAdditionalValues: string[]
}

type OfficialDataSource = 'SII' | 'BANCO_CENTRAL' | 'PREVIRED' | 'SP' | 'AFC' | 'FONASA' | 'ISAPRE'
type OfficialDataUnit = 'CLP' | 'UF' | 'UTM' | 'PORCENTAJE' | 'INDICE' | 'TASA'

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

type StoredOfficialDataRow = Pick<OfficialDataRow, 'codigo' | 'valor' | 'fuente_nombre' | 'fuente_url' | 'obtenido_at' | 'metadata'>

const REQUIRED_PAYROLL_CODES = [
  'INGRESO_MINIMO_GENERAL',
  'TOPE_IMPONIBLE_AFP_UF',
  'TOPE_IMPONIBLE_AFC_UF',
  'TASA_SALUD_LEGAL',
  'TASA_SIS_EMPLEADOR',
  'TASA_AFC_TRABAJADOR_INDEFINIDO',
  'TASA_AFC_EMPLEADOR_INDEFINIDO',
  'TASA_AFC_EMPLEADOR_PLAZO',
  ...AFP_NAMES.map((name) => `TASA_AFP_${normalizeCode(name)}`),
] as const

function normalizeCode(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase()
}

function cleanHtml(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&oacute;/gi, 'ó')
    .replace(/&aacute;/gi, 'á')
    .replace(/&eacute;/gi, 'é')
    .replace(/&iacute;/gi, 'í')
    .replace(/&uacute;/gi, 'ú')
    .replace(/&ntilde;/gi, 'ñ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseChileanNumber(raw: string) {
  const normalized = raw.trim().replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const value = Number(normalized)
  if (!Number.isFinite(value)) throw new Error('OFFICIAL_DATA_INVALID_NUMBER')
  return value
}

function matchNumber(text: string, pattern: RegExp, errorCode: string) {
  const match = text.match(pattern)
  if (!match?.[1]) throw new Error(errorCode)
  return parseChileanNumber(match[1])
}

function matchPercent(text: string, pattern: RegExp, errorCode: string) {
  return matchNumber(text, pattern, errorCode) / 100
}

function monthNumber(monthName: string) {
  const normalized = monthName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const month = MONTHS[normalized]
  if (!month) throw new Error('OFFICIAL_DATA_INVALID_MONTH')
  return month
}

function monthPeriod(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function periodFromInput(inputDate: string) {
  const match = inputDate.match(/^(\d{4})-(\d{2})-(\d{2})$/)
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

function buildRow(input: Omit<OfficialDataRow, 'updated_at'>): OfficialDataRow {
  return { ...input, updated_at: input.obtenido_at }
}

function parsePrevired(html: string) {
  const text = cleanHtml(html)
  const periodMatch = text.match(/Para cotizaciones a pagar en\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]+\s+(\d{4})\s*\(remuneraciones\s+([A-Za-zÁÉÍÓÚáéíóúÑñ]+)\s+(\d{4})\)/i)
  if (!periodMatch) throw new Error('PREVIRED_PERIOD_NOT_FOUND')

  const periodYear = Number(periodMatch[3])
  const periodMonth = monthNumber(periodMatch[2])
  const period = monthPeriod(periodYear, periodMonth)
  const obtainedAt = new Date().toISOString()
  const sourceMetadata = { published_for: period, payment_year: Number(periodMatch[1]) }

  const pensionCapUf = matchNumber(text, /Para afiliados a una AFP\s*\(([\d.,]+)\s*UF\)/i, 'PREVIRED_AFP_CAP_NOT_FOUND')
  const unemploymentCapUf = matchNumber(text, /Para Seguro de Cesant[ií]a\s*\(([\d.,]+)\s*UF\)/i, 'PREVIRED_AFC_CAP_NOT_FOUND')
  const incomeMinimum = matchNumber(text, /Trab\.?\s*Dependientes e Independientes:\s*\$\s*([\d.]+)/i, 'PREVIRED_MINIMUM_INCOME_NOT_FOUND')
  const healthRate = matchPercent(text, /de lo contrario se debe cotizar el\s+([\d.,]+)%\s+a Fonasa/i, 'PREVIRED_HEALTH_RATE_NOT_FOUND')
  const sisRate = matchPercent(text, /Tasa SIS\s+([\d.,]+)%/i, 'PREVIRED_SIS_RATE_NOT_FOUND')
  const afcIndefiniteMatch = text.match(/Plazo Indefinido\s+([\d.,]+)%\s*R\.?I\.?\s+([\d.,]+)%\s*R\.?I\.?/i)
  if (!afcIndefiniteMatch) throw new Error('PREVIRED_AFC_INDEFINITE_RATES_NOT_FOUND')
  const afcEmployerIndefinite = parseChileanNumber(afcIndefiniteMatch[1]) / 100
  const afcWorkerIndefinite = parseChileanNumber(afcIndefiniteMatch[2]) / 100
  const afcEmployerFixed = matchPercent(text, /Plazo Fijo\s+([\d.,]+)%\s*R\.?I\.?/i, 'PREVIRED_AFC_FIXED_RATE_NOT_FOUND')

  const afpRates: Record<string, number> = {}
  const rows: OfficialDataRow[] = []
  const add = (codigo: string, valor: number, unidad: OfficialDataUnit, metadata: Record<string, unknown> = {}) => {
    rows.push(buildRow({
      fuente_codigo: 'PREVIRED',
      codigo,
      periodo: period,
      valor,
      unidad,
      fuente_nombre: 'PREVIRED — Indicadores Previsionales',
      fuente_url: PREVIRED_URL,
      obtenido_at: obtainedAt,
      metadata: { ...sourceMetadata, ...metadata },
    }))
  }

  add('INGRESO_MINIMO_GENERAL', incomeMinimum, 'CLP')
  add('TOPE_IMPONIBLE_AFP_UF', pensionCapUf, 'UF')
  add('TOPE_IMPONIBLE_SALUD_UF', pensionCapUf, 'UF', { derived_from: 'TOPE_IMPONIBLE_AFP_UF', basis: 'renta tope imponible previsional publicada' })
  add('TOPE_IMPONIBLE_AFC_UF', unemploymentCapUf, 'UF')
  add('TASA_SALUD_LEGAL', healthRate, 'PORCENTAJE')
  add('TASA_SIS_EMPLEADOR', sisRate, 'PORCENTAJE')
  add('TASA_AFC_TRABAJADOR_INDEFINIDO', afcWorkerIndefinite, 'PORCENTAJE')
  add('TASA_AFC_EMPLEADOR_INDEFINIDO', afcEmployerIndefinite, 'PORCENTAJE')
  add('TASA_AFC_EMPLEADOR_PLAZO', afcEmployerFixed, 'PORCENTAJE')

  for (const name of AFP_NAMES) {
    const rowMatch = text.match(new RegExp(`${name}\\s+([\\d.,]+)%\\s+([\\d.,]+)%\\s+([\\d.,]+)%\\s+([\\d.,]+)%`, 'i'))
    if (!rowMatch) throw new Error(`PREVIRED_AFP_RATE_NOT_FOUND_${normalizeCode(name)}`)
    const workerRate = parseChileanNumber(rowMatch[1]) / 100
    const employerIndividualRate = parseChileanNumber(rowMatch[2]) / 100
    afpRates[name === 'ProVida' ? 'Provida' : name] = workerRate
    add(`TASA_AFP_${normalizeCode(name)}`, workerRate, 'PORCENTAJE', { afp: name, component: 'trabajador_total' })
    add(`TASA_AFP_EMPLEADOR_CUENTA_${normalizeCode(name)}`, employerIndividualRate, 'PORCENTAJE', { afp: name, component: 'empleador_cuenta_individual' })
  }

  const socialInsuranceMatch = text.match(/Seguro Social\s+Expectativa de Vida\s+([\d.,]+)%/i)
  if (socialInsuranceMatch?.[1]) add('TASA_SEGURO_SOCIAL_EMPLEADOR', parseChileanNumber(socialInsuranceMatch[1]) / 100, 'PORCENTAJE')

  const ccafFonasaMatch = text.match(/CCAF\s+([\d.,]+)%\s*R\.?I\.?\s+FONASA\s+([\d.,]+)%\s*R\.?I\.?/i)
  if (ccafFonasaMatch) {
    add('TASA_CCAF_SALUD', parseChileanNumber(ccafFonasaMatch[1]) / 100, 'PORCENTAJE')
    add('TASA_FONASA_CON_CCAF', parseChileanNumber(ccafFonasaMatch[2]) / 100, 'PORCENTAJE')
  }

  const minimumSeniorMatch = text.match(/Menores de 18 y Mayores de 65:\s*\$\s*([\d.]+)/i)
  if (minimumSeniorMatch?.[1]) add('INGRESO_MINIMO_MENORES_18_MAYORES_65', parseChileanNumber(minimumSeniorMatch[1]), 'CLP')
  const minimumNonPayrollMatch = text.match(/Para fines no remuneracionales:\s*\$\s*([\d.]+)/i)
  if (minimumNonPayrollMatch?.[1]) add('INGRESO_MINIMO_NO_REMUNERACIONAL', parseChileanNumber(minimumNonPayrollMatch[1]), 'CLP')

  return { period, obtainedAt, rows, afpRates }
}

function parseBancoCentral(html: string) {
  const text = cleanHtml(html)
  const dateMatch = text.match(/(\d{1,2}) de ([A-Za-zÁÉÍÓÚáéíóúÑñ]+) de (\d{4})/i)
  if (!dateMatch) throw new Error('BANCO_CENTRAL_DATE_NOT_FOUND')
  const day = Number(dateMatch[1])
  const month = monthNumber(dateMatch[2])
  const year = Number(dateMatch[3])
  const period = monthPeriod(year, month)
  const referenceDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const obtainedAt = new Date().toISOString()

  const candidates: Array<{ code: string; value: number; unit: OfficialDataUnit }> = []
  const optional = (code: string, pattern: RegExp, unit: OfficialDataUnit, divisor = 1) => {
    const match = text.match(pattern)
    if (match?.[1]) candidates.push({ code, value: parseChileanNumber(match[1]) / divisor, unit })
  }

  optional('UF_DIARIA', /\bUF\b\s*\$\s*([\d.]+,[\d]+)/i, 'CLP')
  optional('UTM_MENSUAL', /UTM\s*\([^)]+\)\s*\$\s*([\d.]+(?:,[\d]+)?)/i, 'CLP')
  optional('DOLAR_OBSERVADO', /D[oó]lar Observado\s*\$\s*([\d.]+,[\d]+)/i, 'CLP')
  optional('EURO', /\bEuro\b\s*\$\s*([\d.]+,[\d]+)/i, 'CLP')
  optional('TPM', /TPM\s*\(%\)\s*([\d.,-]+)%/i, 'TASA', 100)

  const ipcMatch = text.match(/IPC\s*\([^)]+\)\s*\(Var\.?%\)\s*([\d.,-]+)\s*Mensual\s*([\d.,-]+)\s*Anual/i)
  if (ipcMatch) {
    candidates.push({ code: 'IPC_VARIACION_MENSUAL', value: parseChileanNumber(ipcMatch[1]) / 100, unit: 'TASA' })
    candidates.push({ code: 'IPC_VARIACION_ANUAL', value: parseChileanNumber(ipcMatch[2]) / 100, unit: 'TASA' })
  }

  if (candidates.length < 3) throw new Error('BANCO_CENTRAL_INDICATORS_INCOMPLETE')

  const rows = candidates.map(({ code, value, unit }) => buildRow({
    fuente_codigo: 'BANCO_CENTRAL',
    codigo: code,
    periodo: period,
    valor: value,
    unidad: unit,
    fuente_nombre: 'Banco Central de Chile — Indicadores diarios',
    fuente_url: BANCO_CENTRAL_URL,
    obtenido_at: obtainedAt,
    metadata: { fecha_referencia: referenceDate },
  }))

  return { period, referenceDate, obtainedAt, rows }
}

async function readCachedPayroll(period: string): Promise<AutomaticPayrollDefaults | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('datos_oficiales')
    .select('codigo, valor, fuente_nombre, fuente_url, obtenido_at, metadata')
    .eq('fuente_codigo', 'PREVIRED')
    .eq('periodo', period)
  if (error) throw error

  const rows = (data ?? []) as StoredOfficialDataRow[]
  const byCode = new Map(rows.map((row) => [row.codigo, row]))
  if (!REQUIRED_PAYROLL_CODES.every((code) => byCode.has(code))) return null

  const value = (code: string) => Number(byCode.get(code)?.valor ?? Number.NaN)
  const afpRates: Record<string, number> = {}
  for (const name of AFP_NAMES) {
    afpRates[name === 'ProVida' ? 'Provida' : name] = value(`TASA_AFP_${normalizeCode(name)}`)
  }
  if (Object.values(afpRates).some((rate) => !Number.isFinite(rate) || rate <= 0)) return null

  const reference = byCode.get('INGRESO_MINIMO_GENERAL')!
  const additional = rows
    .filter((row) => row.codigo.startsWith('TASA_SEGURO_SOCIAL') || row.codigo.startsWith('TASA_CCAF') || row.codigo.startsWith('TASA_FONASA') || row.codigo.startsWith('TASA_AFP_EMPLEADOR_CUENTA'))
    .map((row) => row.codigo)

  return {
    period,
    incomeMinimum: value('INGRESO_MINIMO_GENERAL'),
    pensionCapUf: value('TOPE_IMPONIBLE_AFP_UF'),
    healthCapUf: value('TOPE_IMPONIBLE_SALUD_UF') || value('TOPE_IMPONIBLE_AFP_UF'),
    unemploymentCapUf: value('TOPE_IMPONIBLE_AFC_UF'),
    healthRate: value('TASA_SALUD_LEGAL'),
    sisEmployerRate: value('TASA_SIS_EMPLEADOR'),
    unemploymentWorkerIndefiniteRate: value('TASA_AFC_TRABAJADOR_INDEFINIDO'),
    unemploymentEmployerIndefiniteRate: value('TASA_AFC_EMPLEADOR_INDEFINIDO'),
    unemploymentEmployerFixedRate: value('TASA_AFC_EMPLEADOR_PLAZO'),
    afpRates,
    sourceName: reference.fuente_nombre,
    sourceUrl: reference.fuente_url,
    obtainedAt: reference.obtenido_at,
    fromCache: true,
    trackedAdditionalValues: additional,
  }
}

export async function syncPreviredCurrent() {
  const parsed = parsePrevired(await fetchOfficialPage(PREVIRED_URL, 3600))
  await saveOfficialRows(parsed.rows)
  return { source: 'PREVIRED', period: parsed.period, obtainedAt: parsed.obtainedAt, values: parsed.rows.length }
}

export async function syncBancoCentralCurrent() {
  const parsed = parseBancoCentral(await fetchOfficialPage(BANCO_CENTRAL_URL, 3600))
  await saveOfficialRows(parsed.rows)
  return { source: 'BANCO_CENTRAL', period: parsed.period, referenceDate: parsed.referenceDate, obtainedAt: parsed.obtainedAt, values: parsed.rows.length }
}

export async function getAutomaticPayrollDefaults(inputDate: string): Promise<AutomaticPayrollDefaults> {
  const period = periodFromInput(inputDate)
  const cached = await readCachedPayroll(period)
  if (cached) return cached

  const synced = await syncPreviredCurrent()
  if (synced.period !== period) {
    const historical = await readCachedPayroll(period)
    if (historical) return historical
    throw new Error('PREVIRED_PERIOD_NOT_AVAILABLE')
  }

  const current = await readCachedPayroll(period)
  if (!current) throw new Error('PREVIRED_SYNC_INCOMPLETE')
  return { ...current, fromCache: false }
}

function chileToday() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
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
