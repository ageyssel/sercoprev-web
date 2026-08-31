export type OfficialDataUnit = 'CLP' | 'UF' | 'UTM' | 'PORCENTAJE' | 'INDICE' | 'TASA'

export type ParsedOfficialValue = {
  code: string
  value: number
  unit: OfficialDataUnit
  metadata?: Record<string, unknown>
}

export type ParsedSourceResult = {
  period: string
  obtainedAt: string
  values: ParsedOfficialValue[]
  errors: Record<string, string>
}

export const AFP_NAMES = ['Capital', 'Cuprum', 'Habitat', 'PlanVital', 'ProVida', 'Modelo', 'Uno'] as const

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

const ENGLISH_MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
}

export function normalizeOfficialCode(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase()
}

function decodeNumericEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
}

export function cleanOfficialHtml(value: string) {
  return decodeNumericEntities(value)
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

export function parseChileanOfficialNumber(raw: string) {
  const normalized = raw.trim().replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  if (!normalized) throw new Error('OFFICIAL_DATA_INVALID_NUMBER')
  const value = Number(normalized)
  if (!Number.isFinite(value)) throw new Error('OFFICIAL_DATA_INVALID_NUMBER')
  return value
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

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function firstNumber(text: string, patterns: RegExp[], errorCode: string) {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return parseChileanOfficialNumber(match[1])
  }
  throw new Error(errorCode)
}

function firstPercent(text: string, patterns: RegExp[], errorCode: string) {
  return firstNumber(text, patterns, errorCode) / 100
}

function addValue(values: ParsedOfficialValue[], code: string, value: number, unit: OfficialDataUnit, metadata?: Record<string, unknown>) {
  values.push({ code, value, unit, metadata })
}

export function parsePreviredHtml(html: string, now = new Date()): ParsedSourceResult & { paymentYear: number } {
  const text = cleanOfficialHtml(html)
  const periodMatch = text.match(/Para\s+cotizaciones\s+a\s+pagar\s+en\s+[A-Za-zÁÉÍÓÚáéíóúÑñ]+\s+(\d{4})\s*[.,;:]?\s*\(\s*remuneraciones\s+([A-Za-zÁÉÍÓÚáéíóúÑñ]+)\s+(\d{4})\s*\)/i)
  if (!periodMatch) throw new Error('PREVIRED_PERIOD_NOT_FOUND')

  const paymentYear = Number(periodMatch[1])
  const period = monthPeriod(Number(periodMatch[3]), monthNumber(periodMatch[2]))
  const obtainedAt = now.toISOString()
  const values: ParsedOfficialValue[] = []
  const errors: Record<string, string> = {}

  const capture = (code: string, unit: OfficialDataUnit, reader: () => number, metadata?: Record<string, unknown>) => {
    try {
      addValue(values, code, reader(), unit, metadata)
    } catch (error) {
      errors[code] = errorMessage(error, `${code}_NOT_FOUND`)
    }
  }

  capture('INGRESO_MINIMO_GENERAL', 'CLP', () => firstNumber(text, [
    /Trab\.?\s*Dependientes\s+e\s+Independientes\s*[:\-–—]?\s*\$?\s*([\d.]+)/i,
    /Sueldo\s+M[ií]nimo\s+Trab\.?\s*Dependientes\s+e\s+Independientes\s*[:\-–—]?\s*\$?\s*([\d.]+)/i,
  ], 'PREVIRED_MINIMUM_INCOME_NOT_FOUND'))

  capture('TOPE_IMPONIBLE_AFP_UF', 'UF', () => firstNumber(text, [
    /Para\s+afiliados\s+a\s+una\s+AFP\s*\(\s*([\d.,]+)\s*UF\s*\)/i,
  ], 'PREVIRED_AFP_CAP_NOT_FOUND'))

  const pensionCap = values.find((item) => item.code === 'TOPE_IMPONIBLE_AFP_UF')
  if (pensionCap) {
    addValue(values, 'TOPE_IMPONIBLE_SALUD_UF', pensionCap.value, 'UF', {
      derived_from: 'TOPE_IMPONIBLE_AFP_UF',
      basis: 'renta tope imponible previsional publicada',
    })
  } else {
    errors.TOPE_IMPONIBLE_SALUD_UF = errors.TOPE_IMPONIBLE_AFP_UF ?? 'PREVIRED_HEALTH_CAP_NOT_FOUND'
  }

  capture('TOPE_IMPONIBLE_AFC_UF', 'UF', () => firstNumber(text, [
    /Para\s+Seguro\s+de\s+Cesant[ií]a\s*\(\s*([\d.,]+)\s*UF\s*\)/i,
  ], 'PREVIRED_AFC_CAP_NOT_FOUND'))

  capture('TASA_SALUD_LEGAL', 'PORCENTAJE', () => firstPercent(text, [
    /de\s+lo\s+contrario\s+se\s+debe\s+cotizar\s+el\s*[:\-–—]?\s*([\d.,]+)\s*%\s+a\s+Fonasa/i,
  ], 'PREVIRED_HEALTH_RATE_NOT_FOUND'))

  capture('TASA_SIS_EMPLEADOR', 'PORCENTAJE', () => firstPercent(text, [
    /Tasa\s*SIS\s*[:\-–—]?\s*([\d.,]+)\s*%/i,
    /Seguro\s+de\s+Invalidez\s+y\s+Sobrevivencia\s*\(\s*SIS\s*\)\s*(?:\(\s*\*\s*\))?\s*[:\-–—]?\s*([\d.,]+)\s*%/i,
  ], 'PREVIRED_SIS_RATE_NOT_FOUND'))

  const indefiniteMatch = text.match(/Plazo\s+Indefinido\s*[:\-–—]?\s*([\d.,]+)\s*%\s*(?:R\s*\.?\s*I\s*\.?)?\s*([\d.,]+)\s*%\s*(?:R\s*\.?\s*I\s*\.?)?/i)
  if (indefiniteMatch?.[1] && indefiniteMatch[2]) {
    try {
      addValue(values, 'TASA_AFC_EMPLEADOR_INDEFINIDO', parseChileanOfficialNumber(indefiniteMatch[1]) / 100, 'PORCENTAJE')
      addValue(values, 'TASA_AFC_TRABAJADOR_INDEFINIDO', parseChileanOfficialNumber(indefiniteMatch[2]) / 100, 'PORCENTAJE')
    } catch (error) {
      const message = errorMessage(error, 'PREVIRED_AFC_INDEFINITE_RATES_INVALID')
      errors.TASA_AFC_EMPLEADOR_INDEFINIDO = message
      errors.TASA_AFC_TRABAJADOR_INDEFINIDO = message
    }
  } else {
    errors.TASA_AFC_EMPLEADOR_INDEFINIDO = 'PREVIRED_AFC_INDEFINITE_RATES_NOT_FOUND'
    errors.TASA_AFC_TRABAJADOR_INDEFINIDO = 'PREVIRED_AFC_INDEFINITE_RATES_NOT_FOUND'
  }

  capture('TASA_AFC_EMPLEADOR_PLAZO', 'PORCENTAJE', () => firstPercent(text, [
    /Plazo\s+Fijo\s*[:\-–—]?\s*([\d.,]+)\s*%\s*(?:R\s*\.?\s*I\s*\.?)?/i,
  ], 'PREVIRED_AFC_FIXED_RATE_NOT_FOUND'))

  for (const name of AFP_NAMES) {
    const code = `TASA_AFP_${normalizeOfficialCode(name)}`
    const employerCode = `TASA_AFP_EMPLEADOR_CUENTA_${normalizeOfficialCode(name)}`
    const rowMatch = text.match(new RegExp(`${name}\\s*[:\\-–—]?\\s*([\\d.,]+)\\s*%\\s*([\\d.,]+)\\s*%\\s*([\\d.,]+)\\s*%(?:\\s*([\\d.,]+)\\s*%)?`, 'i'))
    if (!rowMatch?.[1] || !rowMatch[2] || !rowMatch[3]) {
      errors[code] = `PREVIRED_AFP_RATE_NOT_FOUND_${normalizeOfficialCode(name)}`
      continue
    }

    try {
      const percentageColumnsFound = rowMatch[4] ? 4 : 3
      const workerRate = parseChileanOfficialNumber(rowMatch[1]) / 100
      const employerIndividualRate = parseChileanOfficialNumber(rowMatch[2]) / 100
      const totalRate = parseChileanOfficialNumber(rowMatch[3]) / 100
      addValue(values, code, workerRate, 'PORCENTAJE', {
        afp: name,
        component: 'trabajador_total',
        percentage_columns_found: percentageColumnsFound,
        published_total_rate: totalRate,
      })
      addValue(values, employerCode, employerIndividualRate, 'PORCENTAJE', {
        afp: name,
        component: 'empleador_cuenta_individual',
        percentage_columns_found: percentageColumnsFound,
      })
    } catch (error) {
      errors[code] = errorMessage(error, `PREVIRED_AFP_RATE_INVALID_${normalizeOfficialCode(name)}`)
    }
  }

  const socialInsuranceMatch = text.match(/Seguro\s+Social\s+Expectativa\s+de\s+Vida\s*[:\-–—]?\s*([\d.,]+)\s*%/i)
  if (socialInsuranceMatch?.[1]) {
    try {
      addValue(values, 'TASA_SEGURO_SOCIAL_EMPLEADOR', parseChileanOfficialNumber(socialInsuranceMatch[1]) / 100, 'PORCENTAJE')
    } catch {
      // Es un valor complementario: no invalida los campos requeridos.
    }
  }

  const ccafFonasaMatch = text.match(/CCAF\s*[:\-–—]?\s*([\d.,]+)\s*%\s*(?:R\s*\.?\s*I\s*\.?)?\s+FONASA\s*[:\-–—]?\s*([\d.,]+)\s*%\s*(?:R\s*\.?\s*I\s*\.?)?/i)
  if (ccafFonasaMatch?.[1] && ccafFonasaMatch[2]) {
    try {
      addValue(values, 'TASA_CCAF_SALUD', parseChileanOfficialNumber(ccafFonasaMatch[1]) / 100, 'PORCENTAJE')
      addValue(values, 'TASA_FONASA_CON_CCAF', parseChileanOfficialNumber(ccafFonasaMatch[2]) / 100, 'PORCENTAJE')
    } catch {
      // Complementario.
    }
  }

  const minimumSeniorMatch = text.match(/Menores\s+de\s+18\s+y\s+Mayores\s+de\s+65(?:\s+a[nñ]os)?\s*[:\-–—]?\s*\$?\s*([\d.]+)/i)
  if (minimumSeniorMatch?.[1]) {
    try { addValue(values, 'INGRESO_MINIMO_MENORES_18_MAYORES_65', parseChileanOfficialNumber(minimumSeniorMatch[1]), 'CLP') } catch { /* Complementario. */ }
  }

  const minimumNonPayrollMatch = text.match(/Para\s+fines\s+no\s+remuneracionales\s*[:\-–—]?\s*\$?\s*([\d.]+)/i)
  if (minimumNonPayrollMatch?.[1]) {
    try { addValue(values, 'INGRESO_MINIMO_NO_REMUNERACIONAL', parseChileanOfficialNumber(minimumNonPayrollMatch[1]), 'CLP') } catch { /* Complementario. */ }
  }

  return { period, paymentYear, obtainedAt, values, errors }
}

function labelValue(html: string, id: string) {
  const label = html.match(new RegExp(`<label\\b[^>]*\\bid=['"]${id}['"][^>]*>([\\s\\S]*?)<\\/label>`, 'i'))?.[1]
  if (!label) return null
  const text = cleanOfficialHtml(label)
  if (!text || /^(?:ND|N\/D|-)$/i.test(text)) return null
  try {
    const value = parseChileanOfficialNumber(text)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

function bancoCentralReferenceDate(html: string) {
  const input = html.match(/<input\b[^>]*\bid=['"]txtDate['"][^>]*>/i)?.[0]
  const inputDate = input?.match(/\bvalue=['"](\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})['"]/i)
  if (inputDate) {
    const month = ENGLISH_MONTHS[inputDate[2].toLowerCase()]
    if (month) return `${inputDate[3]}-${String(month).padStart(2, '0')}-${String(Number(inputDate[1])).padStart(2, '0')}`
  }

  const scriptDate = html.match(/new Date\((\d{4}),(\d{1,2}),(\d{1,2})\)/i)
  if (scriptDate) {
    const month = Number(scriptDate[2]) + 1
    return `${scriptDate[1]}-${String(month).padStart(2, '0')}-${String(Number(scriptDate[3])).padStart(2, '0')}`
  }

  throw new Error('BANCO_CENTRAL_DATE_NOT_FOUND')
}

export function parseBancoCentralDailyHtml(html: string, now = new Date()): ParsedSourceResult & { referenceDate: string } {
  const referenceDate = bancoCentralReferenceDate(html)
  const [yearText, monthText] = referenceDate.split('-')
  const period = monthPeriod(Number(yearText), Number(monthText))
  const obtainedAt = now.toISOString()
  const values: ParsedOfficialValue[] = []
  const errors: Record<string, string> = {}

  const candidates = [
    ['UF_DIARIA', 'lblValor1_1'],
    ['DOLAR_OBSERVADO', 'lblValor1_3'],
    ['EURO', 'lblValor1_5'],
  ] as const

  for (const [code, id] of candidates) {
    const value = labelValue(html, id)
    if (value !== null && value > 0) addValue(values, code, value, 'CLP')
    else errors[code] = `${code}_NOT_AVAILABLE`
  }

  if (!values.some((item) => item.code === 'UF_DIARIA')) throw new Error('BANCO_CENTRAL_UF_NOT_FOUND')
  return { period, referenceDate, obtainedAt, values, errors }
}

export function parseBancoCentralSupplementalHtml(html: string): ParsedOfficialValue[] {
  const text = cleanOfficialHtml(html)
  const values: ParsedOfficialValue[] = []
  const optional = (code: string, pattern: RegExp, unit: OfficialDataUnit, divisor = 1) => {
    const match = text.match(pattern)
    if (!match?.[1]) return
    try {
      addValue(values, code, parseChileanOfficialNumber(match[1]) / divisor, unit)
    } catch {
      // Un indicador complementario ausente no bloquea los indicadores diarios.
    }
  }

  optional('UTM_MENSUAL', /UTM\s*\([^)]+\)\s*\$?\s*([\d.]+(?:,[\d]+)?)/i, 'CLP')
  optional('TPM', /TPM\s*\(%\)\s*([\d.,-]+)\s*%/i, 'TASA', 100)

  const ipcMatch = text.match(/IPC\s*\([^)]+\)\s*\(Var\.?%\)\s*([\d.,-]+)\s*Mensual\s*([\d.,-]+)\s*Anual/i)
  if (ipcMatch?.[1] && ipcMatch[2]) {
    try {
      addValue(values, 'IPC_VARIACION_MENSUAL', parseChileanOfficialNumber(ipcMatch[1]) / 100, 'TASA')
      addValue(values, 'IPC_VARIACION_ANUAL', parseChileanOfficialNumber(ipcMatch[2]) / 100, 'TASA')
    } catch {
      // Complementario.
    }
  }

  return values
}
