'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/utils/supabase/require-admin'
import type { PayrollActionState } from '@/app/admin/payroll-actions'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, maxLength) : ''
}

function monthValue(value: unknown) {
  const text = clean(value, 10)
  if (/^\d{4}-\d{2}$/.test(text)) return `${text}-01`
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text.slice(0, 7)}-01`
  return null
}

export async function abrirPeriodoRemuneracionesSeguro(
  _state: PayrollActionState,
  formData: FormData,
): Promise<PayrollActionState> {
  try {
    const { adminClient, actorUserId } = await requireAdmin(['Superadministrador', 'Administrador', 'Contador', 'Remuneraciones'])
    const empresaId = clean(formData.get('empresa_id'), 40)
    const periodo = monthValue(formData.get('periodo'))
    if (!UUID_PATTERN.test(empresaId) || !periodo) return { status: 'error', message: 'Empresa o periodo inválido.' }

    const { data: existing, error: existingError } = await adminClient
      .from('periodos_remuneraciones')
      .select('id, estado')
      .eq('empresa_id', empresaId)
      .eq('periodo', periodo)
      .maybeSingle()
    if (existingError) throw existingError
    if (existing) {
      return existing.estado === 'Cerrado'
        ? { status: 'error', message: 'El periodo ya está cerrado y sus valores permanecen inalterables. Una corrección debe registrarse como rectificación.' }
        : { status: 'error', message: `El periodo ya existe con estado ${existing.estado}. No se volvió a abrir ni se reemplazaron sus parámetros.` }
    }

    const { data: parameters, error: parameterError } = await adminClient
      .from('parametros_remuneraciones')
      .select('id, uf_fecha, utm_periodo, fuente_uf, fuente_utm')
      .eq('periodo', periodo)
      .or(`empresa_id.eq.${empresaId},empresa_id.is.null`)
      .order('empresa_id', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()
    if (parameterError || !parameters) return { status: 'error', message: 'Configure primero los parámetros legales del mismo periodo.' }

    const { data, error } = await adminClient.from('periodos_remuneraciones').insert({
      empresa_id: empresaId,
      periodo,
      parametros_id: parameters.id,
      estado: 'Abierto',
      cerrado_at: null,
      cerrado_por: null,
    }).select('id').single()
    if (error) throw error

    await adminClient.from('auditoria_eventos').insert({
      actor_user_id: actorUserId,
      empresa_id: empresaId,
      accion: 'crear',
      entidad: 'periodo_remuneraciones',
      entidad_id: data.id,
      metadata: {
        periodo,
        parametros_id: parameters.id,
        uf_fecha_fijada: parameters.uf_fecha,
        utm_periodo_fijado: parameters.utm_periodo,
        fuentes_oficiales: Boolean(parameters.fuente_uf && parameters.fuente_utm),
      },
    })

    revalidatePath('/admin/remuneraciones')
    revalidatePath('/admin/remuneraciones/periodos')
    revalidatePath('/admin/remuneraciones/gestion')
    return {
      status: 'success',
      message: `Periodo abierto con parámetros fijos${parameters.uf_fecha ? ` y UF del ${parameters.uf_fecha}` : ''}. Las consultas posteriores no cambiarán estos valores.`,
    }
  } catch (error) {
    console.error('Error al abrir periodo protegido:', error)
    const errorMessage = typeof error === 'object' && error && 'message' in error ? String(error.message) : String(error)
    if (errorMessage.includes('CLOSED_PAYROLL_PERIOD_IMMUTABLE')) {
      return { status: 'error', message: 'El periodo está cerrado y no puede reabrirse ni sobrescribirse.' }
    }
    return { status: 'error', message: 'No fue posible abrir el periodo.' }
  }
}
