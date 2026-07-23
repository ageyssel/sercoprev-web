import { createAdminClient } from '@/utils/supabase/admin'
import type { PayrollTaxBracket } from '@/lib/payroll'

const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MONTH_ABBREVIATIONS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

type IndicatorRow = {
  tipo: 'UF' | 'UTM'
  fecha_referencia: string
  valor: number
  fuente_nombre: string
  fuente_url: string
  obtenido_at: string
}

export type OfficialIndicators = {
  date: string
  uf: IndicatorRow
  utm: IndicatorRow
  fromCache: boolean
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function monthStart(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`
}

function decodeHtml(value: string) {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/\s+/g, ' ')
    .trim()
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function parseChileanNumber(value: string) {
  const normalized = value.replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const number = Number(normalized)
  if (!Number.isFinite(number) || number <= 0) throw new Error('OFFICIAL_INDICATOR_INVALID_NUMBER')
  return number
}

function tableRows(html: string) {
  return Array.from(html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi), (rowMatch) =>
    Array.from(rowMatch[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi), (cellMatch) => decodeHtml(cellMatch[1])),
  ).filter((row) => row.length > 0)
}

function monthlyTable(html: string, monthName: string) {
  const marker = new RegExp(`<div\\b[^>]*\\bid=['"]mes_${monthName}['"][^>]*>`, 'i').exec(html)
  if (!marker) return ''
  const section = html.slice(marker.index)
  const tableEnd = section.search(/<\/table>/i)
  return tableEnd >= 0 ? section.slice(0, tableEnd + '</table>'.length) : section
}

function parseUf(html: string, date: Date) {
  const day = date.getUTCDate()
  const monthName = MONTH_NAMES[date.getUTCMonth()]
  const monthSection = monthlyTable(html, monthName)

  if (monthSection) {
    for (const row of tableRows(monthSection)) {
      for (let index = 0; index + 1 < row.length; index += 2) {
        if (Number(row[index]) !== day) continue
        const value = row[index + 1]?.trim()
        if (!value) throw new Error('OFFICIAL_UF_NOT_PUBLISHED')
        return parseChileanNumber(value)
      }
    }
  }

  // Respaldo para formatos históricos del SII que presentan una tabla anual.
  const rows = tableRows(html)
  const targetMonth = MONTH_ABBREVIATIONS[date.getUTCMonth()]
  const headerIndex = rows.findIndex((row) => {
    const normalized = row.map((cell) => normalize(cell))
    return normalized[0] === 'dia' && normalized.includes(targetMonth)
  })
  if (headerIndex < 0) throw new Error('OFFICIAL_UF_TABLE_NOT_FOUND')

  const header = rows[headerIndex].map((cell) => normalize(cell))
  const monthColumn = header.indexOf(targetMonth)
  if (monthColumn < 1) throw new Error('OFFICIAL_UF_MONTH_NOT_FOUND')
  const row = rows.slice(headerIndex + 1).find((candidate) => Number(candidate[0]) === day)
  const value = row?.[monthColumn]
  if (!value) throw new Error('OFFICIAL_UF_NOT_PUBLISHED')
  return parseChileanNumber(value)
}

function parseUtm(html: string, date: Date) {
  const monthName = MONTH_NAMES[date.getUTCMonth()]
  const row = tableRows(html).find((candidate) => normalize(candidate[0] ?? '') === monthName)
  const value = row?.[1]
  if (!value) throw new Error('OFFICIAL_UTM_NOT_PUBLISHED')
  return parseChileanNumber(value)
}

async function fetchOfficialPage(url: string) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SERCOPREV/1.0 (+https://www.sercoprev.cl)' },
    next: { revalidate: 21600 },
  })
  if (!response.ok) throw new Error(`OFFICIAL_SOURCE_HTTP_${response.status}`)
  return response.text()
}

export function buildMonthlyTaxBrackets(utm: number): PayrollTaxBracket[] {
  const safeUtm = Number.isFinite(utm) && utm > 0 ? utm : 0
  const lowerMultiples = [0, 13.5, 30, 50, 70, 90, 120, 310]
  const upperMultiples: Array<number | null> = [13.5, 30, 50, 70, 90, 120, 310, null]
  const factors = [0, 0.04, 0.08, 0.135, 0.23, 0.304, 0.35, 0.4]
  const rebateMultiples = [0, 0.54, 1.74, 4.49, 11.14, 17.8, 23.32, 38.82]

  return lowerMultiples.map((multiple, index) => {
    const from = index === 0 ? 0 : Number((safeUtm * multiple + 0.01).toFixed(2))
    const upper = upperMultiples[index]
    return {
      from,
      to: upper === null ? null : Number((safeUtm * upper).toFixed(2)),
      factor: factors[index],
      rebate: Number((safeUtm * rebateMultiples[index]).toFixed(2)),
    }
  })
}

export async function getOfficialIndicators(inputDate: string): Promise<OfficialIndicators> {
  const parsed = new Date(`${inputDate}T12:00:00Z`)
  if (Number.isNaN(parsed.getTime())) throw new Error('INVALID_INDICATOR_DATE')

  const date = isoDate(parsed)
  const utmDate = monthStart(parsed)
  const year = parsed.getUTCFullYear()
  if (year < 1990 || year > new Date().getUTCFullYear() + 1) throw new Error('INDICATOR_YEAR_OUT_OF_RANGE')

  const admin = createAdminClient()
  const { data: cachedRows } = await admin
    .from('indicadores_oficiales')
    .select('tipo, fecha_referencia, valor, fuente_nombre, fuente_url, obtenido_at')
    .or(`and(tipo.eq.UF,fecha_referencia.eq.${date}),and(tipo.eq.UTM,fecha_referencia.eq.${utmDate})`)

  const cachedUf = (cachedRows ?? []).find((row) => row.tipo === 'UF') as IndicatorRow | undefined
  const cachedUtm = (cachedRows ?? []).find((row) => row.tipo === 'UTM') as IndicatorRow | undefined
  if (cachedUf && cachedUtm) return { date, uf: cachedUf, utm: cachedUtm, fromCache: true }

  const ufUrl = `https://www.sii.cl/valores_y_fechas/uf/uf${year}.htm`
  const utmUrl = `https://www.sii.cl/valores_y_fechas/utm/utm${year}.htm`
  const [ufHtml, utmHtml] = await Promise.all([
    cachedUf ? Promise.resolve('') : fetchOfficialPage(ufUrl),
    cachedUtm ? Promise.resolve('') : fetchOfficialPage(utmUrl),
  ])

  const now = new Date().toISOString()
  const uf: IndicatorRow = cachedUf ?? {
    tipo: 'UF',
    fecha_referencia: date,
    valor: parseUf(ufHtml, parsed),
    fuente_nombre: 'Servicio de Impuestos Internos',
    fuente_url: ufUrl,
    obtenido_at: now,
  }
  const utm: IndicatorRow = cachedUtm ?? {
    tipo: 'UTM',
    fecha_referencia: utmDate,
    valor: parseUtm(utmHtml, parsed),
    fuente_nombre: 'Servicio de Impuestos Internos',
    fuente_url: utmUrl,
    obtenido_at: now,
  }

  const rowsToSave: IndicatorRow[] = []
  if (!cachedUf) rowsToSave.push(uf)
  if (!cachedUtm) rowsToSave.push(utm)
  if (rowsToSave.length > 0) {
    const { error } = await admin.from('indicadores_oficiales').upsert(rowsToSave, { onConflict: 'tipo,fecha_referencia' })
    if (error) console.error('No fue posible guardar indicadores oficiales:', error)
  }

  return { date, uf, utm, fromCache: Boolean(cachedUf || cachedUtm) }
}
