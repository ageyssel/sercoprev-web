'use client'

import { useActionState } from 'react'
import {
  crearFiniquitoBorrador,
  crearLicenciaMedica,
  crearVacacion,
  guardarNovedadMensual,
} from '@/app/admin/payroll-operations-actions'
import type { PayrollActionState } from '@/app/admin/payroll-actions'

const initialState: PayrollActionState = { status: 'idle', message: '' }
const inputClass = 'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-[#17324a] outline-none transition focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'
const textareaClass = 'rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-[#17324a] outline-none transition focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'

export type PayrollOption = { id: string; label: string }

export function MonthlyInputForm({ periods, workers }: { periods: PayrollOption[]; workers: PayrollOption[] }) {
  const [state, action, pending] = useActionState(guardarNovedadMensual, initialState)
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2"><Option label="Periodo" name="periodo_id" options={periods} /><Option label="Trabajador" name="trabajador_id" options={workers} /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Field label="Días trabajados" name="dias_trabajados" inputMode="decimal" defaultValue="30" />
        <Field label="Días descanso" name="dias_descanso" inputMode="decimal" defaultValue="0" />
        <Field label="Días ausencia" name="dias_ausencia" inputMode="decimal" defaultValue="0" />
        <Field label="Días vacaciones" name="dias_vacaciones" inputMode="decimal" defaultValue="0" />
        <Field label="Días licencia" name="dias_licencia" inputMode="decimal" defaultValue="0" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Horas extra 50%" name="horas_extra_50" inputMode="decimal" defaultValue="0" />
        <Field label="Monto horas 50%" name="monto_horas_extra_50" inputMode="numeric" defaultValue="0" />
        <Field label="Horas extra 100%" name="horas_extra_100" inputMode="decimal" defaultValue="0" />
        <Field label="Monto horas 100%" name="monto_horas_extra_100" inputMode="numeric" defaultValue="0" />
        <Field label="Base semana corrida" name="haberes_semana_corrida" inputMode="numeric" defaultValue="0" />
        <Field label="Bonos imponibles" name="bonos_imponibles" inputMode="numeric" defaultValue="0" />
        <Field label="Bonos no imponibles" name="bonos_no_imponibles" inputMode="numeric" defaultValue="0" />
        <Field label="Descuentos adicionales" name="descuentos_adicionales" inputMode="numeric" defaultValue="0" />
      </div>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Observaciones<textarea name="observaciones" rows={3} maxLength={1500} className={textareaClass} /></label>
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-800">Las horas se registran para trazabilidad. El monto se ingresa después de validar el valor hora y recargo aplicable al contrato y periodo.</p>
      <Feedback state={state} />
      <Submit pending={pending} text="Guardar novedad mensual" />
    </form>
  )
}

export function VacationForm({ workers }: { workers: PayrollOption[] }) {
  const [state, action, pending] = useActionState(crearVacacion, initialState)
  return (
    <form action={action} className="grid gap-4">
      <Option label="Trabajador" name="trabajador_id" options={workers} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Field label="Tipo" name="tipo" defaultValue="Feriado legal" /><Field label="Inicio" name="fecha_inicio" type="date" required /><Field label="Fin" name="fecha_fin" type="date" required /><Field label="Días hábiles" name="dias_habiles" inputMode="decimal" required /></div>
      <Select label="Estado" name="estado" options={['Aprobada', 'Solicitada', 'Rechazada', 'Utilizada', 'Anulada']} />
      <label className="grid gap-2 text-sm font-bold text-slate-700">Observaciones<textarea name="observaciones" rows={2} maxLength={1200} className={textareaClass} /></label>
      <Feedback state={state} /><Submit pending={pending} text="Registrar vacaciones" />
    </form>
  )
}

export function MedicalLeaveForm({ workers }: { workers: PayrollOption[] }) {
  const [state, action, pending] = useActionState(crearLicenciaMedica, initialState)
  return (
    <form action={action} className="grid gap-4">
      <Option label="Trabajador" name="trabajador_id" options={workers} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Field label="Folio" name="folio" /><Field label="Tipo" name="tipo" /><Field label="Inicio" name="fecha_inicio" type="date" required /><Field label="Fin" name="fecha_fin" type="date" required /><Field label="Días" name="dias" type="number" required /></div>
      <Select label="Estado" name="estado" options={['Informada', 'Tramitada', 'Autorizada', 'Reducida', 'Rechazada']} />
      <Feedback state={state} /><Submit pending={pending} text="Registrar licencia" />
    </form>
  )
}

export function TerminationDraftForm({ workers }: { workers: PayrollOption[] }) {
  const [state, action, pending] = useActionState(crearFiniquitoBorrador, initialState)
  return (
    <form action={action} className="grid gap-4">
      <Option label="Trabajador" name="trabajador_id" options={workers} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Field label="Causal / código" name="causal_codigo" required /><Field label="Fecha término" name="fecha_termino" type="date" required /><Field label="Remuneración mensual" name="remuneracion_mensual" inputMode="numeric" required /><Field label="Años de servicio" name="anos_servicio" inputMode="decimal" required /><Field label="Días vacaciones pendientes" name="dias_vacaciones_pendientes" inputMode="decimal" defaultValue="0" /><Field label="Remuneraciones pendientes" name="remuneraciones_pendientes" inputMode="numeric" defaultValue="0" /><Field label="Otros haberes" name="otros_haberes" inputMode="numeric" defaultValue="0" /><Field label="Descuentos" name="descuentos" inputMode="numeric" defaultValue="0" /></div>
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700 sm:flex-row sm:gap-6"><label className="flex items-center gap-2"><input type="checkbox" name="aviso_previo" />Incluir aviso previo</label><label className="flex items-center gap-2"><input type="checkbox" name="indemnizacion_anos" />Incluir indemnización por años</label></div>
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold leading-5 text-red-800">Genera sólo un borrador matemático. La causal, topes, base indemnizatoria y procedencia de cada concepto deben revisarse legalmente antes de emitir o firmar.</p>
      <Feedback state={state} /><Submit pending={pending} text="Calcular borrador" />
    </form>
  )
}

function Field({ label, name, type = 'text', required = false, inputMode, defaultValue }: { label: string; name: string; type?: string; required?: boolean; inputMode?: 'numeric' | 'decimal'; defaultValue?: string }) { return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}<input name={name} type={type} required={required} inputMode={inputMode} defaultValue={defaultValue} className={inputClass} /></label> }
function Option({ label, name, options }: { label: string; name: string; options: PayrollOption[] }) { return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}<select name={name} required className={inputClass}><option value="">Seleccione</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label> }
function Select({ label, name, options }: { label: string; name: string; options: string[] }) { return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}<select name={name} className={inputClass}>{options.map((option) => <option key={option}>{option}</option>)}</select></label> }
function Feedback({ state }: { state: PayrollActionState }) { if (!state.message) return null; return <p role="status" className={`rounded-xl border px-4 py-3 text-sm font-bold ${state.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{state.message}</p> }
function Submit({ pending, text }: { pending: boolean; text: string }) { return <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white disabled:opacity-60">{pending ? 'Procesando…' : text}</button> }
