'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/supabase/require-admin'
import type { PayrollActionState } from '@/app/admin/payroll-actions'
import type { PayrollTaxBracket } from '@/lib/payroll'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

function numberValue(value: unknown, fallback = 0) {
  const text = clean(value, 60).replace(/\s/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')
  const number = text ? Number(text) : fallback
  return Number.isFinite(number) ? number : Number.NaN
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

    let afpRates: Record<string, number>
    let taxBrackets: PayrollTaxBracket[]
    try {
      afpRates = JSON.parse(clean(formData.get('tasas_afp'), 8000) || '{}') as Record<string, number>
      taxBrackets = JSON.parse(clean(formData.get('impuesto_segunda_categoria'), 12000) || '[]') as PayrollTaxBracket[]
      if (!afpRates || Array.isArray(afpRates) || !Array.isArray(taxBrackets)) throw new Error('invalid')
    } catch {
      return { status: 'error', message: 'Las tasas AFP o tramos de impuesto no tienen JSON válido.' }
    }

    const ufDate = dateValue(formData.get('uf_fecha'))
    const utmPeriod = monthValue(formData.get('utm_periodo'))
    const sourceUf = clean(formData.get('fuente_uf'), 500) || null
    const sourceUtm = clean(formData.get('fuente_utm'), 500) || null

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
        metadata: { periodo: period, uf_fecha: ufDate, utm_periodo: utmPeriod, fuentes_oficiales: Boolean(sourceUf && sourceUtm) },
      })
    }

    revalidatePath('/admin/remuneraciones')
    revalidatePath('/admin/remuneraciones/parametros')
    revalidatePath('/admin/remuneraciones/periodos')
    return { status: 'success', message: 'Parámetros guardados con trazabilidad de indicadores.' }
  } catch (error) {
    console.error('Error al guardar parámetros trazables:', error)
    return { status: 'error', message: 'No fue posible guardar los parámetros.' }
  }
}
