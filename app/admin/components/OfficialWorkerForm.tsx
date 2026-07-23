'use client'

import { useActionState } from 'react'
import { InfoTip } from '@/components/ui/InfoTip'
import { crearTrabajador, type PayrollActionState } from '@/app/admin/payroll-actions'
import type { SelectOption } from '@/app/admin/components/PayrollForms'

const initialState: PayrollActionState = { status: 'idle', message: '' }
const inputClass = 'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-[#17324a] outline-none transition focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'
const AFPS = ['Capital', 'Cuprum', 'Habitat', 'Modelo', 'PlanVital', 'Provida', 'Uno']

export function OfficialWorkerForm({ companyId, costCenters }: { companyId: string; costCenters: SelectOption[] }) {
  const [state, action, pending] = useActionState(crearTrabajador, initialState)

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="RUT" name="rut" required placeholder="12.345.678-9" help="Identificador único dentro de la empresa. Se normaliza sin puntos." />
        <Field label="Nombres" name="nombres" required />
        <Field label="Apellido paterno" name="apellido_paterno" required />
        <Field label="Apellido materno" name="apellido_materno" />
        <Field label="Correo" name="email" type="email" />
        <Field label="Teléfono" name="telefono" type="tel" />
        <Field label="Fecha de nacimiento" name="fecha_nacimiento" type="date" />
        <Field label="Fecha de ingreso" name="fecha_ingreso" type="date" required help="Se usa para antigüedad, vacaciones y cálculos proporcionales." />
        <Select label="AFP" name="afp" options={AFPS} empty="Seleccione AFP" help="Debe coincidir con una administradora configurada en los parámetros legales del periodo." />
        <Select label="Sistema de salud" name="salud_tipo" options={['Fonasa', 'Isapre', 'Sin cotización']} help="Fonasa usa la cotización legal; Isapre compara la cotización legal con el plan pactado en UF." />
        <Field label="Institución de salud" name="salud_institucion" placeholder="Fonasa o nombre Isapre" />
        <Field label="Plan Isapre en UF" name="salud_plan_uf" inputMode="decimal" help="Cantidad de UF pactadas. Se convierte con la UF trazada del periodo." />
        <Select label="Tramo asignación familiar" name="asignacion_familiar_tramo" options={['A', 'B', 'C', 'D', 'Sin tramo']} empty="Seleccione tramo" help="Clasificación informativa para cargas familiares. El pago requiere cargas reconocidas y valores oficiales vigentes." />
        <label className="grid gap-2 text-sm font-bold text-slate-700">Centro de costo<select name="centro_costo_id" className={inputClass}><option value="">Sin asignar</option>{costCenters.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700"><input type="checkbox" name="afc_aplica" defaultChecked />Aplica Seguro de Cesantía <InfoTip>El motor usa el tipo de contrato y las tasas AFC del periodo para determinar cotizaciones del trabajador y empleador.</InfoTip></label>
      {state.message && <p role="status" className={`rounded-xl border px-4 py-3 text-sm font-bold ${state.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white disabled:opacity-60">{pending ? 'Creando…' : 'Crear trabajador'}</button>
    </form>
  )
}

function Field({ label, name, type = 'text', required = false, placeholder, inputMode, help }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string; inputMode?: 'numeric' | 'decimal'; help?: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700"><span className="inline-flex items-center">{label}{help && <InfoTip>{help}</InfoTip>}</span><input name={name} type={type} required={required} placeholder={placeholder} inputMode={inputMode} className={inputClass} /></label>
}

function Select({ label, name, options, empty, help }: { label: string; name: string; options: string[]; empty?: string; help?: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700"><span className="inline-flex items-center">{label}{help && <InfoTip>{help}</InfoTip>}</span><select name={name} className={inputClass}>{empty && <option value="">{empty}</option>}{options.map((option) => <option key={option} value={option === 'Sin tramo' ? '' : option}>{option}</option>)}</select></label>
}
