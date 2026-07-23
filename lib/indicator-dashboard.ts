import 'server-only'

import { cache } from 'react'
import { createAdminClient } from '@/utils/supabase/admin'

export type OfficialIndicatorCategory = 'Económicos' | 'Previsionales'

export type OfficialDashboardIndicator = {
  code: string
  label: string
  shortLabel: string
  category: OfficialIndicatorCategory
  value: number
  formattedValue: string
  unit: string
  referenceDate: string
  sourceName: string
  sourceUrl: string
  obtainedAt: string
}

export type OfficialIndicatorDashboard = {
  indicators: OfficialDashboardIndicator[]
  updatedAt: string | null
  hasErrors: boolean
}

type StoredIndicatorRow = {
  fuente_codigo: string
  codigo: string
  fecha_referencia?: string | null
  periodo: string
  valor: number | string
  unidad: string
  fuente_nombre: string
  fuente_url: string
  obtenido_at: string
  metadata?: Record<string, unknown> | null
}

type SiiIndicatorRow = {
  tipo: 'UF' | 'UTM'
  fecha_referencia: string
  valor: number | string
  fuente_nombre: string
  fuente_url: string
  obtenido_at: string
}

const LABELS: Record<string, { label: string; shortLabel?: string; category: OfficialIndicatorCategory; order: number }> = {
  UF: { label: 'Unidad de Fomento', shortLabel: 'UF', category: 'Económicos', order: 10 },
  UTM: { label: 'Unidad Tributaria Mensual', shortLabel: 'UTM', category: 'Económicos', order: 20 },
  DOLAR_OBSERVADO: { label: 'Dólar observado', shortLabel: 'Dólar', category: 'Económicos', order: 30 },
  EURO: { label: 'Euro', category: 'Económicos', order: 40 },
  IPC_VARIACION_MENSUAL: { label: 'IPC, variación mensual', shortLabel: 'IPC mensual', category: 'Económicos', order: 50 },
  IPC_VARIACION_ANUAL: { label: 'IPC, variación anual', shortLabel: 'IPC anual', category: 'Económicos', order: 60 },
  TPM: { label: 'Tasa de Política Monetaria', shortLabel: 'TPM', category: 'Económicos', order: 70 },
  INGRESO_MINIMO_GENERAL: { label: 'Ingreso mínimo general', shortLabel: 'Ingreso mínimo', category: 'Previsionales', order: 100 },
  INGRESO_MINIMO_MENORES_18_MAYORES_65: { label: 'Ingreso mínimo menores de 18 y mayores de 65', shortLabel: 'Ingreso mínimo especial', category: 'Previsionales', order: 110 },
  INGRESO_MINIMO_NO_REMUNERACIONAL: { label: 'Ingreso mínimo no remuneracional', shortLabel: 'Mínimo no remuneracional', category: 'Previsionales', order: 120 },
  TOPE_IMPONIBLE_AFP_UF: { label: 'Tope imponible AFP y salud', shortLabel: 'Tope AFP', category: 'Previsionales', order: 130 },
  TOPE_IMPONIBLE_SALUD_UF: { label: 'Tope imponible de salud', shortLabel: 'Tope salud', category: 'Previsionales', order: 140 },
  TOPE_IMPONIBLE_AFC_UF: { label: 'Tope imponible AFC', shortLabel: 'Tope AFC', category: 'Previsionales', order: 150 },
  TASA_SALUD_LEGAL: { label: 'Cotización legal de salud', shortLabel: 'Salud legal', category: 'Previsionales', order: 160 },
  TASA_SIS_EMPLEADOR: { label: 'Seguro de Invalidez y Sobrevivencia', shortLabel: 'SIS empleador', category: 'Previsionales', order: 170 },
  TASA_AFC_TRABAJADOR_INDEFINIDO: { label: 'AFC trabajador, contrato indefinido', shortLabel: 'AFC trabajador', category: 'Previsionales', order: 180 },
  TASA_AFC_EMPLEADOR_INDEFINIDO: { label: 'AFC empleador, contrato indefinido', shortLabel: 'AFC empleador', category: 'Previsionales', order: 190 },
  TASA_AFC_EMPLEADOR_PLAZO: { label: 'AFC empleador, plazo fijo u obra', shortLabel: 'AFC plazo', category: 'Previsionales', order: 200 },
  TASA_SEGURO_SOCIAL_EMPLEADOR: { label: 'Seguro Social de cargo del empleador', shortLabel: 'Seguro Social', category: 'Previsionales', order: 210 },
  TASA_CCAF_SALUD: { label: 'Distribución de salud a CCAF', shortLabel: 'CCAF salud', category: 'Previsionales', order: 220 },
  TASA_FONASA_CON_CCAF: { label: 'Distribución de salud a FONASA con CCAF', shortLabel: 'FONASA con CCAF', category: 'Previsionales', order: 230 },
}

function normalizeAfpName(code: string) {
  return code
    .replace(/^TASA_AFP_EMPLEADOR_CUENTA_/, '')
    .replace(/^TASA_AFP_/, '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function definition(code: string) {
  const known = LABELS[code]
  if (known) return known
  if (code.startsWith('TASA_AFP_EMPLEADOR_CUENTA_')) {
    const afp = normalizeAfpName(code)
    return { label: `Aporte empleador a cuenta individual AFP ${afp}`, shortLabel: `Aporte ${afp}`, category: 'Previsionales' as const, order: 400 + code.localeCompare('') }
  }
  if (code.startsWith('TASA_AFP_')) {
    const afp = normalizeAfpName(code)
    return { label: `Tasa total AFP ${afp}`, shortLabel: `AFP ${afp}`, category: 'Previsionales' as const, order: 300 + code.localeCompare('') }
  }
  return null
}

function numberValue(value: number | string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatValue(code: string, value: number, unit: string) {
  if (code === 'UF' || code === 'UTM' || unit === 'CLP') {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value)
  }
  if (unit === 'UF') return `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 4 }).format(value)} UF`
  if (unit === 'PORCENTAJE' || unit === 'TASA') {
    return new Intl.NumberFormat('es-CL', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(value)
  }
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 4 }).format(value)
}

function rowReferenceDate(row: StoredIndicatorRow) {
  const metadataDate = typeof row.metadata?.fecha_referencia === 'string' ? row.metadata.fecha_referencia : null
  return row.fecha_referencia || metadataDate || row.periodo
}

function makeIndicator(input: {
  code: string
  value: number
  unit: string
  referenceDate: string
  sourceName: string
  sourceUrl: string
  obtainedAt: string
}): OfficialDashboardIndicator | null {
  const metadata = definition(input.code)
  if (!metadata) return null
  return {
    code: input.code,
    label: metadata.label,
    shortLabel: metadata.shortLabel ?? metadata.label,
    category: metadata.category,
    value: input.value,
    formattedValue: formatValue(input.code, input.value, input.unit),
    unit: input.unit,
    referenceDate: input.referenceDate,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
    obtainedAt: input.obtainedAt,
  }
}

export const getOfficialIndicatorDashboard = cache(async (): Promise<OfficialIndicatorDashboard> => {
  try {
    const admin = createAdminClient()
    const [siiResult, historyResult, currentResult] = await Promise.all([
      admin
        .from('indicadores_oficiales')
        .select('tipo, fecha_referencia, valor, fuente_nombre, fuente_url, obtenido_at')
        .order('fecha_referencia', { ascending: false })
        .limit(80),
      admin
        .from('datos_oficiales_versiones')
        .select('fuente_codigo, codigo, fecha_referencia, periodo, valor, unidad, fuente_nombre, fuente_url, obtenido_at, metadata')
        .order('fecha_referencia', { ascending: false })
        .order('obtenido_at', { ascending: false })
        .limit(300),
      admin
        .from('datos_oficiales')
        .select('fuente_codigo, codigo, periodo, valor, unidad, fuente_nombre, fuente_url, obtenido_at, metadata')
        .order('periodo', { ascending: false })
        .order('obtenido_at', { ascending: false })
        .limit(200),
    ])

    const siiRows = (siiResult.data ?? []) as SiiIndicatorRow[]
    const versionRows = (historyResult.data ?? []) as StoredIndicatorRow[]
    const currentRows = (currentResult.data ?? []) as StoredIndicatorRow[]
    const latestByCode = new Map<string, StoredIndicatorRow>()

    for (const row of [...versionRows, ...currentRows]) {
      if (row.codigo === 'UF_DIARIA' || row.codigo === 'UTM_MENSUAL') continue
      if (!latestByCode.has(row.codigo)) latestByCode.set(row.codigo, row)
    }

    const indicators: OfficialDashboardIndicator[] = []
    for (const type of ['UF', 'UTM'] as const) {
      const row = siiRows.find((item) => item.tipo === type)
      if (!row) continue
      const indicator = makeIndicator({
        code: type,
        value: numberValue(row.valor),
        unit: 'CLP',
        referenceDate: row.fecha_referencia,
        sourceName: row.fuente_nombre,
        sourceUrl: row.fuente_url,
        obtainedAt: row.obtenido_at,
      })
      if (indicator) indicators.push(indicator)
    }

    for (const row of latestByCode.values()) {
      const indicator = makeIndicator({
        code: row.codigo,
        value: numberValue(row.valor),
        unit: row.unidad,
        referenceDate: rowReferenceDate(row),
        sourceName: row.fuente_nombre,
        sourceUrl: row.fuente_url,
        obtainedAt: row.obtenido_at,
      })
      if (indicator) indicators.push(indicator)
    }

    indicators.sort((left, right) => {
      if (left.category !== right.category) return left.category === 'Económicos' ? -1 : 1
      const leftOrder = definition(left.code)?.order ?? 9999
      const rightOrder = definition(right.code)?.order ?? 9999
      return leftOrder - rightOrder || left.label.localeCompare(right.label, 'es')
    })

    const updatedAt = indicators.reduce<string | null>((latest, item) => !latest || item.obtainedAt > latest ? item.obtainedAt : latest, null)
    return {
      indicators,
      updatedAt,
      hasErrors: Boolean(siiResult.error || (historyResult.error && currentResult.error)),
    }
  } catch (error) {
    console.error('OFFICIAL_INDICATOR_DASHBOARD_FAILED', error)
    return { indicators: [], updatedAt: null, hasErrors: true }
  }
})
