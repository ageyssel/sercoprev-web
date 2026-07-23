'use client'

import { useActionState } from 'react'
import { InfoTip } from '@/components/ui/InfoTip'
import { guardarParametrosRemuneracionesTrazables } from '@/app/admin/payroll-parameter-actions'
import type { PayrollActionState } from '@/app/admin/payroll-actions'
import type { PayrollParameterDefaults } from '@/app/admin/components/PayrollForms'

const initialState: PayrollActionState = { status: 'idle', message: '' }
const inputClass = 'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-[#17324a] outline-none transition focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'
const areaClass = 'rounded-xl border border-slate-300 bg-white px-3 py-3 font-mono text-xs text-[#17324a] outline-none transition focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'

export function OfficialPayrollParametersForm({ companyId, defaults }: { companyId: string; defaults: PayrollParameterDefaults }) {
  const [state, action, pending] = useActionState(guardarParametrosRemuneracionesTrazables, initialState)

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId} />
      <input type="hidden" name="uf_fecha" value={defaults.ufDate ?? ''} />
      <input type="hidden" name="utm_periodo" value={defaults.utmPeriod ?? ''} />
      <input type="hidden" name="fuente_uf" value={defaults.sourceUf ?? ''} />
      <input type="hidden" name="fuente_utm" value={defaults.sourceUtm ?? ''} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Periodo" name="periodo" type="month" required defaultValue={defaults.period} help="Mes al que pertenecen todas las tasas, topes y tramos. No reutilice parámetros de otro periodo." />
        <Field label="UF" name="uf" inputMode="decimal" required defaultValue={defaults.uf?.toString()} help="Valor diario oficial de la UF para la fecha seleccionada. La fecha y URL quedan almacenadas." />
        <Field label="UTM" name="utm" inputMode="numeric" required defaultValue={defaults.utm?.toString()} help="Valor mensual oficial de la UTM correspondiente al mes seleccionado." />
        <Field label="Ingreso mínimo" name="ingreso_minimo" inputMode="numeric" required help="Ingreso mínimo legal aplicable al periodo y tipo de trabajador. Debe verificarse ante cada cambio normativo." />
        <Field label="Tope AFP (UF)" name="tope_afp_uf" inputMode="decimal" required help="Tope imponible previsional expresado en UF. Se convierte a pesos usando la UF registrada." />
        <Field label="Tope salud (UF)" name="tope_salud_uf" inputMode="decimal" required help="Tope imponible usado para la cotización legal de salud." />
        <Field label="Tope AFC (UF)" name="tope_afc_uf" inputMode="decimal" required help="Tope imponible aplicable al Seguro de Cesantía." />
        <Field label="Tasa salud" name="tasa_salud" inputMode="decimal" defaultValue="0.07" help="Ingrese la tasa como decimal: 7% se registra como 0,07." />
        <Field label="Tasa SIS empleador" name="tasa_sis_empleador" inputMode="decimal" help="Tasa de Seguro de Invalidez y Sobrevivencia de cargo del empleador para el periodo." />
        <Field label="AFC trabajador indefinido" name="tasa_afc_trabajador_indefinido" inputMode="decimal" defaultValue="0.006" help="Tasa de cargo del trabajador con contrato indefinido, expresada como decimal." />
        <Field label="AFC empleador indefinido" name="tasa_afc_empleador_indefinido" inputMode="decimal" defaultValue="0.024" help="Tasa de cargo del empleador con contrato indefinido." />
        <Field label="AFC empleador plazo" name="tasa_afc_empleador_plazo" inputMode="decimal" defaultValue="0.03" help="Tasa de cargo del empleador para contratos a plazo u obra, según la normativa vigente." />
      </div>
      <label className="grid gap-2 text-sm font-bold text-slate-700"><span className="inline-flex items-center">Tasas AFP en JSON <InfoTip>Mapa por nombre de AFP y tasa total de cargo del trabajador, expresada como decimal. Ejemplo: 11,44% se registra como 0.1144.</InfoTip></span><textarea name="tasas_afp" rows={6} className={areaClass} defaultValue={'{\n  "Capital": 0.0,\n  "Habitat": 0.0,\n  "Modelo": 0.0,\n  "PlanVital": 0.0,\n  "Provida": 0.0,\n  "Uno": 0.0\n}'} /></label>
      <label className="grid gap-2 text-sm font-bold text-slate-700"><span className="inline-flex items-center">Tramos mensuales de Impuesto Único <InfoTip>Cada tramo contiene límite inferior, superior, factor y rebaja. El motor aplica el tramo correspondiente sobre la renta líquida imponible tributable.</InfoTip></span><textarea name="impuesto_segunda_categoria" rows={8} className={areaClass} defaultValue={'[\n  {"from": 0, "to": null, "factor": 0, "rebate": 0}\n]'} /></label>
      <Field label="Fuentes y verificación complementaria" name="fuente" defaultValue={defaults.sourceLabel} placeholder="Referencias normativas verificadas" help="Registre aquí fuentes de ingreso mínimo, topes, AFP, SIS, AFC e Impuesto Único. UF y UTM se guardan en campos separados." />
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-800">UF y UTM se precargan desde SII. Los demás parámetros continúan sujetos a verificación profesional por periodo antes de calcular o cerrar.</p>
      {state.message && <p role="status" className={`rounded-xl border px-4 py-3 text-sm font-bold ${state.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white transition hover:bg-[#173d5c] disabled:opacity-60">{pending ? 'Guardando…' : 'Guardar parámetros trazables'}</button>
    </form>
  )
}

function Field({ label, name, type = 'text', required = false, placeholder, inputMode, defaultValue, help }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; inputMode?: 'numeric' | 'decimal'; defaultValue?: string; help?: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700"><span className="inline-flex items-center">{label}{help && <InfoTip>{help}</InfoTip>}</span><input name={name} type={type} required={required} placeholder={placeholder} inputMode={inputMode} defaultValue={defaultValue} className={inputClass} /></label>
}
