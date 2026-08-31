'use client'

import { useActionState } from 'react'
import { InfoTip } from '@/components/ui/InfoTip'
import { guardarParametrosRemuneracionesTrazables } from '@/app/admin/payroll-parameter-actions'
import type { PayrollActionState } from '@/app/admin/payroll-actions'
import type { PayrollTaxBracket } from '@/lib/payroll'
import type { PayrollFieldState } from '@/lib/official-data'

const initialState: PayrollActionState = { status: 'idle', message: '' }
const inputClass = 'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-[#17324a] outline-none transition focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'
const compactInputClass = 'h-10 min-w-[120px] rounded-lg border border-slate-300 bg-white px-2 text-right text-xs font-bold text-[#17324a] outline-none focus:border-[#134b78] focus:ring-2 focus:ring-[#134b78]/10'
const AFP_FIELDS = [
  ['Capital', 'afp_capital', 'TASA_AFP_CAPITAL'],
  ['Cuprum', 'afp_cuprum', 'TASA_AFP_CUPRUM'],
  ['Habitat', 'afp_habitat', 'TASA_AFP_HABITAT'],
  ['Modelo', 'afp_modelo', 'TASA_AFP_MODELO'],
  ['PlanVital', 'afp_planvital', 'TASA_AFP_PLANVITAL'],
  ['Provida', 'afp_provida', 'TASA_AFP_PROVIDA'],
  ['Uno', 'afp_uno', 'TASA_AFP_UNO'],
] as const

export type OfficialPayrollParameterDefaults = {
  period?: string
  uf?: number
  utm?: number
  ufDate?: string
  utmPeriod?: string
  sourceUf?: string
  sourceUtm?: string
  sourceLabel?: string
  taxBrackets?: PayrollTaxBracket[]
  incomeMinimum?: number
  pensionCapUf?: number
  healthCapUf?: number
  unemploymentCapUf?: number
  healthRate?: number
  sisEmployerRate?: number
  unemploymentWorkerIndefiniteRate?: number
  unemploymentEmployerIndefiniteRate?: number
  unemploymentEmployerFixedRate?: number
  afpRates?: Record<string, number>
  payrollSourceName?: string
  payrollSourceUrl?: string
  payrollObtainedAt?: string
  automaticPayrollAvailable?: boolean
  automaticPayrollComplete?: boolean
  trackedAdditionalValues?: string[]
  payrollFieldStates?: Record<string, PayrollFieldState>
}

function numberDefault(value: number | undefined, fallback?: number) {
  const resolved = value ?? fallback
  return resolved === undefined || !Number.isFinite(resolved) ? undefined : String(resolved)
}

function sourceStateLabel(state: PayrollFieldState) {
  if (state.status === 'official_today') return 'Oficial · obtenido hoy'
  if (state.status === 'historical_degraded') return `Histórico · no verificado para este período${state.sourcePeriod ? ` · ${state.sourcePeriod.slice(0, 7)}` : ''}`
  return 'No disponible'
}

function SourceState({ state }: { state?: PayrollFieldState }) {
  if (!state) return null
  const className = state.status === 'official_today'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : state.status === 'historical_degraded'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-red-200 bg-red-50 text-red-700'

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${className}`}
      title={state.error ?? undefined}
    >
      {sourceStateLabel(state)}
    </span>
  )
}

export function OfficialPayrollParametersForm({ companyId, defaults }: { companyId: string; defaults: OfficialPayrollParameterDefaults }) {
  const [state, action, pending] = useActionState(guardarParametrosRemuneracionesTrazables, initialState)
  const taxBrackets = defaults.taxBrackets ?? []
  const fieldState = (code: string) => defaults.payrollFieldStates?.[code]

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="empresa_id" value={companyId} />
      <input type="hidden" name="uf_fecha" value={defaults.ufDate ?? ''} />
      <input type="hidden" name="utm_periodo" value={defaults.utmPeriod ?? ''} />
      <input type="hidden" name="fuente_uf" value={defaults.sourceUf ?? ''} />
      <input type="hidden" name="fuente_utm" value={defaults.sourceUtm ?? ''} />
      <input type="hidden" name="fuente_parametros" value={defaults.payrollSourceUrl ?? ''} />
      <input type="hidden" name="parametros_automaticos_at" value={defaults.automaticPayrollComplete ? defaults.payrollObtainedAt ?? '' : ''} />

      <section>
        <h3 className="inline-flex items-center text-base font-black text-[#0f2438]">Indicadores y topes <InfoTip>La UF y UTM se obtienen desde SII. Ingreso mínimo, topes y tasas previsionales generales se consultan en PREVIRED. Cada campo indica si el valor fue obtenido hoy, proviene del historial degradado o no está disponible.</InfoTip></h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Periodo" name="periodo" type="month" required defaultValue={defaults.period} help="Mes al que pertenecen todas las tasas, topes y tramos. No reutilice parámetros de otro periodo." />
          <Field label="UF" name="uf" inputMode="decimal" required defaultValue={numberDefault(defaults.uf)} help="Valor diario oficial de la UF para la fecha seleccionada. La fecha y URL quedan almacenadas." />
          <Field label="UTM" name="utm" inputMode="numeric" required defaultValue={numberDefault(defaults.utm)} help="Valor mensual oficial de la UTM correspondiente al mes seleccionado." />
          <Field label="Ingreso mínimo" name="ingreso_minimo" inputMode="numeric" required defaultValue={numberDefault(defaults.incomeMinimum)} sourceState={fieldState('INGRESO_MINIMO_GENERAL')} help="Renta mínima imponible general publicada para trabajadores dependientes e independientes del periodo." />
          <Field label="Tope AFP (UF)" name="tope_afp_uf" inputMode="decimal" required defaultValue={numberDefault(defaults.pensionCapUf)} sourceState={fieldState('TOPE_IMPONIBLE_AFP_UF')} help="Tope imponible previsional expresado en UF. Se convierte a pesos usando la UF registrada." />
          <Field label="Tope salud (UF)" name="tope_salud_uf" inputMode="decimal" required defaultValue={numberDefault(defaults.healthCapUf)} sourceState={fieldState('TOPE_IMPONIBLE_SALUD_UF')} help="Tope imponible general usado para la cotización legal de salud." />
          <Field label="Tope AFC (UF)" name="tope_afc_uf" inputMode="decimal" required defaultValue={numberDefault(defaults.unemploymentCapUf)} sourceState={fieldState('TOPE_IMPONIBLE_AFC_UF')} help="Tope imponible aplicable al Seguro de Cesantía." />
          <Field label="Tasa salud" name="tasa_salud" inputMode="decimal" required defaultValue={numberDefault(defaults.healthRate, 0.07)} sourceState={fieldState('TASA_SALUD_LEGAL')} help="Tasa legal general de salud como decimal. Los planes ISAPRE específicos de cada trabajador se mantienen en su ficha." />
          <Field label="Tasa SIS empleador" name="tasa_sis_empleador" inputMode="decimal" required defaultValue={numberDefault(defaults.sisEmployerRate)} sourceState={fieldState('TASA_SIS_EMPLEADOR')} help="Tasa de Seguro de Invalidez y Sobrevivencia publicada para el periodo. La fuente puede cambiar de presentación sin alterar la obligación de revisión humana." />
          <Field label="AFC trabajador indefinido" name="tasa_afc_trabajador_indefinido" inputMode="decimal" required defaultValue={numberDefault(defaults.unemploymentWorkerIndefiniteRate, 0.006)} sourceState={fieldState('TASA_AFC_TRABAJADOR_INDEFINIDO')} help="Tasa de cargo del trabajador con contrato indefinido, expresada como decimal." />
          <Field label="AFC empleador indefinido" name="tasa_afc_empleador_indefinido" inputMode="decimal" required defaultValue={numberDefault(defaults.unemploymentEmployerIndefiniteRate, 0.024)} sourceState={fieldState('TASA_AFC_EMPLEADOR_INDEFINIDO')} help="Tasa de cargo del empleador con contrato indefinido." />
          <Field label="AFC empleador plazo" name="tasa_afc_empleador_plazo" inputMode="decimal" required defaultValue={numberDefault(defaults.unemploymentEmployerFixedRate, 0.03)} sourceState={fieldState('TASA_AFC_EMPLEADOR_PLAZO')} help="Tasa de cargo del empleador para contratos a plazo u obra." />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <h3 className="inline-flex items-center text-base font-black text-[#0f2438]">Tasas totales AFP <InfoTip>Se precarga la cotización obligatoria del trabajador más la comisión vigente de cada AFP. La tasa se almacena como decimal.</InfoTip></h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">Cada AFP muestra su estado de fuente de forma independiente. Un valor histórico degradado nunca se etiqueta como vigente o actual.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {AFP_FIELDS.map(([label, field, code]) => (
            <Field key={field} label={label} name={field} inputMode="decimal" required defaultValue={numberDefault(defaults.afpRates?.[label])} sourceState={fieldState(code)} placeholder="0.0000" help={`Tasa total de cargo del trabajador afiliado a AFP ${label}.`} />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4 sm:p-5"><h3 className="inline-flex items-center text-base font-black text-[#0f2438]">Impuesto Único mensual <InfoTip>Los ocho tramos se derivan automáticamente desde la UTM oficial usando los múltiplos, factores y rebajas mensuales publicados por el SII. Revise antes de guardar.</InfoTip></h3><p className="mt-1 text-xs text-slate-500">El impuesto resulta de: renta líquida imponible × factor − rebaja del tramo.</p></div>
        <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-xs"><thead><tr className="bg-slate-50 font-black uppercase text-slate-500"><th className="px-3 py-3">Tramo</th><th className="px-3 py-3 text-right">Desde</th><th className="px-3 py-3 text-right">Hasta</th><th className="px-3 py-3 text-right">Factor</th><th className="px-3 py-3 text-right">Rebaja</th></tr></thead><tbody>{Array.from({ length: 8 }, (_, index) => { const bracket = taxBrackets[index]; return <tr key={index} className="border-t border-slate-100"><td className="px-3 py-3 font-black text-[#134b78]">{index + 1}</td><td className="px-3 py-2"><input aria-label={`Desde tramo ${index + 1}`} name={`tax_from_${index}`} required inputMode="decimal" defaultValue={bracket?.from?.toString() ?? ''} className={compactInputClass} /></td><td className="px-3 py-2"><input aria-label={`Hasta tramo ${index + 1}`} name={`tax_to_${index}`} inputMode="decimal" defaultValue={bracket?.to?.toString() ?? ''} placeholder={index === 7 ? 'Sin límite' : ''} className={compactInputClass} /></td><td className="px-3 py-2"><input aria-label={`Factor tramo ${index + 1}`} name={`tax_factor_${index}`} required inputMode="decimal" defaultValue={bracket?.factor?.toString() ?? ''} className={compactInputClass} /></td><td className="px-3 py-2"><input aria-label={`Rebaja tramo ${index + 1}`} name={`tax_rebate_${index}`} required inputMode="decimal" defaultValue={bracket?.rebate?.toString() ?? ''} className={compactInputClass} /></td></tr> })}</tbody></table></div>
      </section>

      <Field label="Fuentes y observaciones" name="fuente" defaultValue={defaults.sourceLabel} placeholder="Referencias normativas y observaciones" help="Las URLs oficiales y fechas de obtención se guardan por separado. Use este campo para observaciones o justificación de anulaciones manuales." />

      {defaults.automaticPayrollComplete ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold leading-5 text-emerald-800">Todos los campos previsionales requeridos fueron obtenidos hoy desde {defaults.payrollSourceName ?? 'PREVIRED'}. La carga es automática, pero la aprobación continúa siendo humana: revise los valores antes de presionar “Guardar parámetros trazables”.</p>
      ) : defaults.automaticPayrollAvailable ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-800">La consulta previsional está degradada. Algunos campos pueden estar precargados con el último valor histórico conocido y se identifican individualmente como “Histórico · no verificado para este período”. Deben ser verificados por una persona antes de guardar; ningún valor histórico se considera actual automáticamente.</p>
      ) : (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold leading-5 text-red-800">No hay valores previsionales automáticos utilizables para este periodo. Complete y verifique profesionalmente cada campo antes de guardar.</p>
      )}

      {state.message && <p role="status" className={`rounded-xl border px-4 py-3 text-sm font-bold ${state.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white transition hover:bg-[#173d5c] disabled:opacity-60">{pending ? 'Guardando…' : 'Guardar parámetros trazables'}</button>
    </form>
  )
}

function Field({ label, name, type = 'text', required = false, placeholder, inputMode, defaultValue, help, sourceState }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; inputMode?: 'numeric' | 'decimal'; defaultValue?: string; help?: React.ReactNode; sourceState?: PayrollFieldState }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      <span className="inline-flex items-start">{label}{help && <InfoTip>{help}</InfoTip>}</span>
      <SourceState state={sourceState} />
      <input name={name} type={type} required={required} placeholder={placeholder} inputMode={inputMode} defaultValue={defaultValue} className={inputClass} />
    </label>
  )
}
