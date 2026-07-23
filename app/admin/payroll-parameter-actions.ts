'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/supabase/require-admin'
import type { PayrollActionState } from '@/app/admin/payroll-actions'
import type { PayrollTaxBracket } from '@/lib/payroll'
import { getAutomaticPayrollDefaults } from '@/lib/official-data'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{2}[0-9a-f]-[0-9a-f]{12}$/i
const AFP_FIELDS = [
  ['Capital', 'afp_capital'],
  ['Cuprum', 'afp_cuprum'],
  ['Habitat', 'afp_habitat'],
  ['Modelo', 'afp_modelo'],
  ['PlanVital', 'afp_planvital'],
  ['Provida', 'afp_provida'],
  ['Uno', 'afp_uno'],
] as const

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

function numberValue(value: unknown, fallback = 0) {
  const text = clean(value, 60).replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')
  const number = text ? Number(text) : fallback
  return Number.isFinite(number) ? number : Number.NaN
}

function nullableNumber(value: unknown) {
  const text = clean(value, 60)
  if (!text) return null
  return numberValue(text)
}

function monthValue(value: unknown) {
  const text = clean(value, 10)
  if (/^\d{4}-\d{2}$/.test(text)) return `${text}-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text.slice(0, 7)}-01`
  return null
}

function dateValue(value: unknown) {
  const text = clean(value, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
}

function parseAfpRates(formData: FormData) {
  const rates: Record<string, number> = {}
  for (const [name, field] of AFP_FIELDS) {
    const rate = numberValue(formData.get(field), Number.NaN)
    if (Number.isFinite(rate) && rate > 0) rates[name] = rate
  }
  return rates
}

function parseTaxBrackets(formData: FormData) {
  const brackets: PayrollTaxBracket[] = []
  for (let index = 0; index < 8; index += 1) {
    const from = numberValue(formData.get(`tax_from_${index}`), Number.NaN)
    const to = nullableNumber(formData.get(`tax_to_${index}`))
    const factor = numberValue(formData.get(`tax_factor_${index}`), Number.NaN)
    const rebate = numberValue(formData.get(`tax_rebate_${index}`), Number.NaN)
    if ([from, factor, rebate].some(Number.isNaN) || (to !== null && Number.isNaN(to))) continue
    brackets.push({ from, to, factor, rebate })
  }
  return brackets.sort((a, b) => a.from - b.from)
}

function validTaxBrackets(brackets: PayrollTaxBracket[]) {
  if (brackets.length !== 8) return false
  return brackets.every((item, index) => {
    if (item.from < 0 || item.factor < 0 || item.factor > 1 || item.rebate < 0) return false
    if (item.to !== null && item.to < item.from) return false
    if (index === brackets.length - 1 && item.to !== null) return false
    return true
  })
}

function differs(left: number, right: number) {
  return Math.abs(left - right) > Math.max(0.0000005, Math.abs(right) * 0.000001)
}

export async function guardarParametrosRemuneracionesTrazables(
  _state: PayrollActionState,
  formData: FormData,
): Promise<PayrollActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
    const companyText = clean(formData.get('empresa_id'), 40)
    const companyId = UUID_PATTERN.test(companyText) ? companyText : null
    const period = monthValue(formData.get('periodo'))
    if (!period) return { status: 'error', message: 'Periodo inválido.' }

    const numericFields = {
      uf: numberValue(formData.get('uf')),
      utm: numberValue(formData.get('utm')),
      ingreso_minimo: numberValue(formData.get('ingreso_minimo')),
      tope_afp_uf: numberValue(formData.get('tope_afp_uf')),
      tope_salud_uf: numberValue(formData.get('tope_salud_uf')),
      tope_afc_uf: numberValue(formData.get('tope_afc_uf')),
      tasa_salud: numberValue(formData.get('tasa_salud'), 0.07),
      tasa_sis_empleador: numberValue(formData.get('tasa_sis_empleador')),
      tasa_afc_trabajador_indefinido: numberValue(formData.get('tasa_afc_trabajador_indefinido'), 0.006),
      tasa_afc_empleador_indefinido: numberValue(formData.get('tasa_afc_empleador_indefinido'), 0.024),
      tasa_afc_empleador_plazo: numberValue(formData.get('tasa_afc_empleador_plazo'), 0.03),
    }
    if (Object.values(numericFields).some((value) => Number.isNaN(value) || value < 0)) return { status: 'error', message: 'Revise los parámetros numéricos.' }
    if (numericFields.uf <= 0 || numericFields.utm <= 0 || numericFields.ingreso_minimo <= 0 || numericFields.tope_afp_uf <= 0 || numericFields.tope_salud_uf <= 0 || numericFields.tope_afc_uf <= 0) return { status: 'error', message: 'UF, UTM, ingreso mínimo y topes deben ser mayores que cero.' }
    if ([numericFields.tasa_salud, numericFields.tasa_sis_empleador, numericFields.tasa_afc_trabajador_indefinido, numericFields.tasa_afc_empleador_indefinido, numericFields.tasa_afc_empleador_plazo].some((rate) => rate > 1)) return { status: 'error', message: 'Las tasas deben registrarse como decimales entre 0 y 1.' }

    const afpRates = parseAfpRates(formData)
    if (Object.keys(afpRates).length !== AFP_FIELDS.length || Object.values(afpRates).some((rate) => rate > 1)) return { status: 'error', message: 'Complete todas las tasas AFP como decimales válidos.' }
    const taxBrackets = parseTaxBrackets(formData)
    if (!validTaxBrackets(taxBrackets)) return { status: 'error', message: 'Los ocho tramos mensuales de Impuesto Único están incompletos o son inválidos.' }

    const ufDate = dateValue(formData.get('uf_fecha'))
    const utmPeriod = monthValue(formData.get('utm_periodo'))
    const sourceUf = clean(formData.get('fuente_uf'), 500) || null
    const sourceUtm = clean(formData.get('fuente_utm'), 500) || null

    let official: Awaited<ReturnType<typeof getAutomaticPayrollDefaults>> | null = null
    try {
      official = await getAutomaticPayrollDefaults(period)
    } catch (officialError) {
      console.warn('No se pudo comparar la configuración con PREVIRED:', officialError)
    }

    const manualOverrides: string[] = []
    if (official) {
      const comparisons: Array<[string, number, number]> = [
        ['ingreso_minimo', numericFields.ingreso_minimo, official.incomeMinimum],
        ['tope_afp_uf', numericFields.tope_afp_uf, official.pensionCapUf],
        ['tope_salud_uf', numericFields.tope_salud_uf, official.healthCapUf],
        ['tope_afc_uf', numericFields.tope_afc_uf, official.unemploymentCapUf],
        ['tasa_salud', numericFields.tasa_salud, official.healthRate],
        ['tasa_sis_empleador', numericFields.tasa_sis_empleador, official.sisEmployerRate],
        ['tasa_afc_trabajador_indefinido', numericFields.tasa_afc_trabajador_indefinido, official.unemploymentWorkerIndefiniteRate],
        ['tasa_afc_empleador_indefinido', numericFields.tasa_afc_empleador_indefinido, official.unemploymentEmployerIndefiniteRate],
        ['tasa_afc_empleador_plazo', numericFields.tasa_afc_empleador_plazo, official.unemploymentEmployerFixedRate],
      ]
      for (const [field, submitted, expected] of comparisons) if (differs(submitted, expected)) manualOverrides.push(field)
      for (const [name] of AFP_FIELDS) if (official.afpRates[name] !== undefined && differs(afpRates[name], official.afpRates[name])) manualOverrides.push(`tasa_afp_${name}`)
    }

    const automaticTrace = official ? {
      source_name: official.sourceName,
      source_url: official.sourceUrl,
      source_period: official.period,
      obtained_at: official.obtainedAt,
      automatic_fields: REQUIRED_AUTOMATIC_FIELDS,
      manual_overrides: manualOverrides,
      tracked_additional_values: official.trackedAdditionalValues,
    } : {}

    const { data, error } = await adminClient.from('parametros_remuneraciones').upsert({
      empresa_id: companyId,
      periodo: period,
      ...numericFields,
      tasas_afp: afpRates,
      impuesto_segunda_categoria: taxBrackets,
      fuente: clean(formData.get('fuente'), 500) || null,
      uf_fecha: ufDate,
      utm_periodo: utmPeriod,
      fuente_uf: sourceUf,
      fuente_utm: sourceUtm,
      indicadores_verificados_at: ufDate && utmPeriod && sourceUf && sourceUtm ? new Date().toISOString() : null,
      fuentes_automaticas: automaticTrace,
      parametros_automaticos_at: official ? official.obtainedAt : null,
      vigente: true,
    }, { onConflict: 'empresa_id,periodo' }).select('id').single()
    if (error) throw error

    if (companyId) {
      await adminClient.from('auditoria_eventos').insert({
        actor_user_id: actorUserId,
        empresa_id: companyId,
        accion: 'actualizar',
        entidad: 'parametros_remuneraciones',
        entidad_id: data.id,
        metadata: {
          periodo: period,
          uf_fecha: ufDate,
          utm_periodo: utmPeriod,
          fuentes_oficiales: Boolean(sourceUf && sourceUtm && official),
          fuente_previsional: official?.sourceName ?? null,
          anulaciones_manuales: manualOverrides,
          afp_configuradas: Object.keys(afpRates),
          tramos_impuesto: taxBrackets.length,
        },
      })
    }

    revalidatePath('/admin/remuneraciones')
    revalidatePath('/admin/remuneraciones/parametros')
    revalidatePath('/admin/remuneraciones/periodos')
    return { status: 'success', message: manualOverrides.length > 0 ? `Parámetros guardados. Se registraron ${manualOverrides.length} anulaciones manuales de valores automáticos.` : 'Parámetros guardados con trazabilidad automática de fuentes oficiales.' }
  } catch (error) {
    console.error('Error al guardar parámetros trazables:', error)
    return { status: 'error', message: 'No fue posible guardar los parámetros.' }
  }
}

const REQUIRED_AUTOMATIC_FIELDS = [
  'ingreso_minimo',
  'tope_afp_uf',
  'tope_salud_uf',
  'tope_afc_uf',
  'tasa_salud',
  'tasa_sis_empleador',
  'tasa_afc_trabajador_indefinido',
  'tasa_afc_empleador_indefinido',
  'tasa_afc_empleador_plazo',
  'tasas_afp',
] as const
