'use client'

import { useActionState } from 'react'
import {
  crearContrato,
  crearMovimientoRemuneracion,
  crearPeriodoRemuneraciones,
  crearTrabajador,
  guardarParametrosRemuneraciones,
  type PayrollActionState,
} from '@/app/admin/payroll-actions'

const initialState: PayrollActionState = { status: 'idle', message: '' }
const inputClass = 'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-[#17324a] outline-none transition focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'
const areaClass = 'rounded-xl border border-slate-300 bg-white px-3 py-3 font-mono text-xs text-[#17324a] outline-none transition focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'

export type SelectOption = { id: string; label: string }

export function WorkerForm({ companyId, costCenters }: { companyId: string; costCenters: SelectOption[] }) {
  const [state, action, pending] = useActionState(crearTrabajador, initialState)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="RUT" name="rut" required placeholder="12.345.678-9" />
        <Field label="Nombres" name="nombres" required />
        <Field label="Apellido paterno" name="apellido_paterno" required />
        <Field label="Apellido materno" name="apellido_materno" />
        <Field label="Correo" name="email" type="email" />
        <Field label="Teléfono" name="telefono" type="tel" />
        <Field label="Fecha de nacimiento" name="fecha_nacimiento" type="date" />
        <Field label="Fecha de ingreso" name="fecha_ingreso" type="date" required />
        <Field label="AFP" name="afp" placeholder="Capital, Habitat…" />
        <Select label="Salud" name="salud_tipo" options={['Fonasa', 'Isapre', 'Sin cotización']} />
        <Field label="Institución de salud" name="salud_institucion" />
        <Field label="Plan Isapre UF" name="salud_plan_uf" inputMode="decimal" />
        <label className="grid gap-2 text-sm font-bold text-slate-700">Centro de costo<select name="centro_costo_id" className={inputClass}><option value="">Sin asignar</option>{costCenters.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700"><input type="checkbox" name="afc_aplica" defaultChecked />Aplica Seguro de Cesantía</label>
      <Feedback state={state} />
      <Submit pending={pending} text="Crear trabajador" />
    </form>
  )
}

export function ContractForm({ workers }: { workers: SelectOption[] }) {
  const [state, action, pending] = useActionState(crearContrato, initialState)
  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold text-slate-700">Trabajador<select name="trabajador_id" required className={inputClass}><option value="">Seleccione</option>{workers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Select label="Tipo de contrato" name="tipo" options={['Indefinido', 'Plazo fijo', 'Obra o faena', 'Honorarios']} />
        <Field label="Cargo" name="cargo" required />
        <Field label="Jornada semanal" name="jornada_horas" inputMode="decimal" placeholder="44" />
        <Field label="Fecha de inicio" name="fecha_inicio" type="date" required />
        <Field label="Fecha de término" name="fecha_termino" type="date" />
        <Field label="Sueldo base" name="sueldo_base" inputMode="numeric" required />
        <Select label="Modalidad de pago" name="modalidad_pago" options={['Mensual', 'Diaria', 'Por hora']} />
        <Select label="Gratificación" name="gratificacion_tipo" options={['Artículo 50', 'Sin gratificación', 'Convencional']} />
        <Field label="Días por semana" name="dias_semana" type="number" defaultValue="5" />
        <Field label="Colación diaria" name="colacion_diaria" inputMode="numeric" defaultValue="0" />
        <Field label="Movilización diaria" name="movilizacion_diaria" inputMode="numeric" defaultValue="0" />
      </div>
      <Feedback state={state} />
      <Submit pending={pending} text="Registrar contrato" />
    </form>
  )
}

export function PayrollPeriodForm({ companyId }: { companyId: string }) {
  const [state, action, pending] = useActionState(crearPeriodoRemuneraciones, initialState)
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <input type="hidden" name="empresa_id" value={companyId} />
      <Field label="Periodo" name="periodo" type="month" required />
      <Submit pending={pending} text="Abrir periodo" />
      <div className="sm:col-span-2"><Feedback state={state} /></div>
    </form>
  )
}

export function PayrollParametersForm({ companyId }: { companyId?: string }) {
  const [state, action, pending] = useActionState(guardarParametrosRemuneraciones, initialState)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId ?? ''} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Periodo" name="periodo" type="month" required />
        <Field label="UF" name="uf" inputMode="decimal" required />
        <Field label="UTM" name="utm" inputMode="numeric" required />
        <Field label="Ingreso mínimo" name="ingreso_minimo" inputMode="numeric" required />
        <Field label="Tope AFP (UF)" name="tope_afp_uf" inputMode="decimal" required />
        <Field label="Tope salud (UF)" name="tope_salud_uf" inputMode="decimal" required />
        <Field label="Tope AFC (UF)" name="tope_afc_uf" inputMode="decimal" required />
        <Field label="Tasa salud" name="tasa_salud" inputMode="decimal" defaultValue="0.07" />
        <Field label="Tasa SIS empleador" name="tasa_sis_empleador" inputMode="decimal" />
        <Field label="AFC trabajador indefinido" name="tasa_afc_trabajador_indefinido" inputMode="decimal" defaultValue="0.006" />
        <Field label="AFC empleador indefinido" name="tasa_afc_empleador_indefinido" inputMode="decimal" defaultValue="0.024" />
        <Field label="AFC empleador plazo" name="tasa_afc_empleador_plazo" inputMode="decimal" defaultValue="0.03" />
      </div>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Tasas AFP en JSON<textarea name="tasas_afp" rows={5} className={areaClass} defaultValue={'{\n  "Capital": 0.0,\n  "Habitat": 0.0\n}'} /></label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Tramos mensuales de Impuesto Único en JSON<textarea name="impuesto_segunda_categoria" rows={7} className={areaClass} defaultValue={'[\n  {"from": 0, "to": null, "factor": 0, "rebate": 0}\n]'} /></label>
      <Field label="Fuente oficial y fecha de verificación" name="fuente" placeholder="URL o referencia normativa" />
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-800">Las tasas deben validarse para cada periodo antes de calcular. El sistema no presume valores legales vigentes.</p>
      <Feedback state={state} />
      <Submit pending={pending} text="Guardar parámetros" />
    </form>
  )
}

export function PayrollMovementForm({ periods, workers, concepts }: { periods: SelectOption[]; workers: SelectOption[]; concepts: SelectOption[] }) {
  const [state, action, pending] = useActionState(crearMovimientoRemuneracion, initialState)
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 xl:items-end">
      <OptionField label="Periodo" name="periodo_id" options={periods} />
      <OptionField label="Trabajador" name="trabajador_id" options={workers} />
      <OptionField label="Concepto" name="concepto_id" options={concepts} />
      <Field label="Cantidad" name="cantidad" inputMode="decimal" defaultValue="1" />
      <Field label="Monto" name="monto" inputMode="numeric" required />
      <div className="sm:col-span-2 xl:col-span-5"><Feedback state={state} /></div>
      <div className="sm:col-span-2 xl:col-span-5"><Submit pending={pending} text="Agregar movimiento" /></div>
    </form>
  )
}

function Field({ label, name, type = 'text', required = false, placeholder, inputMode, defaultValue }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; inputMode?: 'numeric' | 'decimal'; defaultValue?: string }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}<input name={name} type={type} required={required} placeholder={placeholder} inputMode={inputMode} defaultValue={defaultValue} className={inputClass} /></label>
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}<select name={name} className={inputClass}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
}

function OptionField({ label, name, options }: { label: string; name: string; options: SelectOption[] }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}<select name={name} required className={inputClass}><option value="">Seleccione</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
}

function Feedback({ state }: { state: PayrollActionState }) {
  if (!state.message) return null
  return <p role="status" className={`rounded-xl border px-4 py-3 text-sm font-bold ${state.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{state.message}</p>
}

function Submit({ pending, text }: { pending: boolean; text: string }) {
  return <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white transition hover:bg-[#173d5c] disabled:opacity-60">{pending ? 'Procesando…' : text}</button>
}
