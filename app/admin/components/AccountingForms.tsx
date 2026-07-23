'use client'

import { useActionState } from 'react'
import {
  crearAsientoSimple,
  crearCentroCosto,
  crearCuentaContable,
  crearPeriodoContable,
  registrarDocumentoTributario,
  type AccountingActionState,
} from '@/app/admin/accounting-actions'

const initialState: AccountingActionState = { status: 'idle', message: '' }
const inputClass = 'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-[#17324a] outline-none transition focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'

export type AccountingOption = { id: string; label: string }

export function CostCenterForm({ companyId }: { companyId: string }) {
  const [state, action, pending] = useActionState(crearCentroCosto, initialState)
  return <form action={action} className="grid gap-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end"><input type="hidden" name="empresa_id" value={companyId} /><Field label="Código" name="codigo" required /><Field label="Nombre" name="nombre" required /><Submit pending={pending} text="Crear" /><div className="sm:col-span-3"><Feedback state={state} /></div></form>
}

export function AccountForm({ companyId, parentAccounts }: { companyId: string; parentAccounts: AccountingOption[] }) {
  const [state, action, pending] = useActionState(crearCuentaContable, initialState)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Código" name="codigo" required />
        <Field label="Nombre" name="nombre" required />
        <Select label="Tipo" name="tipo" options={['Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Gasto', 'Orden']} />
        <Select label="Naturaleza" name="naturaleza" options={['Deudora', 'Acreedora']} />
        <Field label="Nivel" name="nivel" type="number" defaultValue="1" />
        <OptionField label="Cuenta padre" name="cuenta_padre_id" options={parentAccounts} optional />
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700"><input type="checkbox" name="imputable" defaultChecked />Cuenta imputable</label>
      <Feedback state={state} />
      <Submit pending={pending} text="Crear cuenta" />
    </form>
  )
}

export function AccountingPeriodForm({ companyId }: { companyId: string }) {
  const [state, action, pending] = useActionState(crearPeriodoContable, initialState)
  return <form action={action} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><input type="hidden" name="empresa_id" value={companyId} /><Field label="Periodo" name="periodo" type="month" required /><Submit pending={pending} text="Abrir periodo" /><div className="sm:col-span-2"><Feedback state={state} /></div></form>
}

export function SimpleEntryForm({ companyId, periods, accounts }: { companyId: string; periods: AccountingOption[]; accounts: AccountingOption[] }) {
  const [state, action, pending] = useActionState(crearAsientoSimple, initialState)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <OptionField label="Periodo" name="periodo_id" options={periods} />
        <Field label="Fecha" name="fecha" type="date" required />
        <Select label="Tipo" name="tipo" options={['Ingreso', 'Egreso', 'Traspaso', 'Apertura', 'Cierre']} />
        <OptionField label="Cuenta debe" name="cuenta_debe_id" options={accounts} />
        <OptionField label="Cuenta haber" name="cuenta_haber_id" options={accounts} />
        <Field label="Monto" name="monto" inputMode="numeric" required />
        <Field label="Glosa" name="glosa" required />
        <Field label="Documento de referencia" name="documento_referencia" />
      </div>
      <Feedback state={state} />
      <Submit pending={pending} text="Crear asiento cuadrado" />
    </form>
  )
}

export function TaxDocumentForm({ companyId }: { companyId: string }) {
  const [state, action, pending] = useActionState(registrarDocumentoTributario, initialState)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Select label="Registro" name="tipo_registro" options={['Compra', 'Venta', 'Honorario', 'Otro']} />
        <Field label="Tipo documento" name="tipo_documento" required />
        <Field label="Folio" name="folio" />
        <Field label="Fecha emisión" name="fecha_emision" type="date" required />
        <Field label="Fecha recepción" name="fecha_recepcion" type="date" />
        <Field label="RUT contraparte" name="rut_contraparte" />
        <Field label="Razón social contraparte" name="razon_social_contraparte" />
        <Field label="Neto" name="neto" inputMode="numeric" defaultValue="0" />
        <Field label="Exento" name="exento" inputMode="numeric" defaultValue="0" />
        <Field label="IVA" name="iva" inputMode="numeric" defaultValue="0" />
        <Field label="Otros impuestos" name="otros_impuestos" inputMode="numeric" defaultValue="0" />
        <Field label="Total" name="total" inputMode="numeric" required />
      </div>
      <Feedback state={state} />
      <Submit pending={pending} text="Registrar documento" />
    </form>
  )
}

function Field({ label, name, type = 'text', required = false, inputMode, defaultValue }: { label: string; name: string; type?: string; required?: boolean; inputMode?: 'numeric' | 'decimal'; defaultValue?: string }) { return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}<input name={name} type={type} required={required} inputMode={inputMode} defaultValue={defaultValue} className={inputClass} /></label> }
function Select({ label, name, options }: { label: string; name: string; options: string[] }) { return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}<select name={name} className={inputClass}>{options.map((option) => <option key={option}>{option}</option>)}</select></label> }
function OptionField({ label, name, options, optional = false }: { label: string; name: string; options: AccountingOption[]; optional?: boolean }) { return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}<select name={name} required={!optional} className={inputClass}><option value="">{optional ? 'Sin asignar' : 'Seleccione'}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label> }
function Feedback({ state }: { state: AccountingActionState }) { if (!state.message) return null; return <p role="status" className={`rounded-xl border px-4 py-3 text-sm font-bold ${state.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{state.message}</p> }
function Submit({ pending, text }: { pending: boolean; text: string }) { return <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white transition hover:bg-[#173d5c] disabled:opacity-60">{pending ? 'Procesando…' : text}</button> }
