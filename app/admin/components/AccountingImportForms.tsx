'use client'

import { useActionState } from 'react'
import {
  crearCuentaBancaria,
  importarCartolaCsv,
  importarRcvCsv,
} from '@/app/admin/accounting-import-actions'
import type { AccountingActionState } from '@/app/admin/accounting-actions'

const initialState: AccountingActionState = { status: 'idle', message: '' }
const inputClass = 'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-[#17324a] outline-none transition focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'

export type ImportOption = { id: string; label: string }

export function BankAccountForm({ companyId, accounts }: { companyId: string; accounts: ImportOption[] }) {
  const [state, action, pending] = useActionState(crearCuentaBancaria, initialState)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId} />
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Banco" name="banco" required /><Field label="Tipo de cuenta" name="tipo_cuenta" required placeholder="Cuenta corriente" /><Field label="Número enmascarado" name="numero_enmascarado" required placeholder="•••• 1234" /><Field label="Moneda" name="moneda" defaultValue="CLP" /><label className="grid gap-2 text-sm font-bold text-slate-700 sm:col-span-2">Cuenta contable asociada<select name="cuenta_contable_id" className={inputClass}><option value="">Sin asociar</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}</select></label></div>
      <Feedback state={state} /><Submit pending={pending} text="Crear cuenta bancaria" />
    </form>
  )
}

export function RcvImportForm({ companyId }: { companyId: string }) {
  const [state, action, pending] = useActionState(importarRcvCsv, initialState)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId} />
      <label className="grid gap-2 text-sm font-bold text-slate-700">Registro<select name="tipo_registro" className={inputClass}><option>Compra</option><option>Venta</option></select></label>
      <FileField />
      <p className="rounded-xl border border-[#134b78]/20 bg-[#eaf3f9] p-4 text-xs font-semibold leading-5 text-[#17324a]">Reconoce encabezados equivalentes a tipo documento, folio, RUT, razón social, fecha, neto, exento, IVA, otros impuestos y total. Los registros se deduplican mediante huella de contenido.</p>
      <Feedback state={state} /><Submit pending={pending} text="Importar RCV" />
    </form>
  )
}

export function BankCsvImportForm({ companyId, bankAccounts }: { companyId: string; bankAccounts: ImportOption[] }) {
  const [state, action, pending] = useActionState(importarCartolaCsv, initialState)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId} />
      <label className="grid gap-2 text-sm font-bold text-slate-700">Cuenta bancaria<select name="cuenta_bancaria_id" required className={inputClass}><option value="">Seleccione</option>{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}</select></label>
      <FileField />
      <p className="rounded-xl border border-[#134b78]/20 bg-[#eaf3f9] p-4 text-xs font-semibold leading-5 text-[#17324a]">Encabezados esperados: fecha, descripción o glosa, referencia, cargo/abono o monto firmado y saldo opcional.</p>
      <Feedback state={state} /><Submit pending={pending} text="Importar cartola" />
    </form>
  )
}

function FileField() { return <label className="grid gap-2 text-sm font-bold text-slate-700">Archivo CSV<input name="archivo" type="file" required accept=".csv,text/csv,text/plain" className="block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0f2438] file:px-4 file:py-2 file:font-bold file:text-white" /><span className="text-xs font-medium text-slate-500">Máximo 5 MB y 2.500 filas. Delimitadores coma, punto y coma o tabulación.</span></label> }
function Field({ label, name, required = false, placeholder, defaultValue }: { label: string; name: string; required?: boolean; placeholder?: string; defaultValue?: string }) { return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}<input name={name} required={required} placeholder={placeholder} defaultValue={defaultValue} className={inputClass} /></label> }
function Feedback({ state }: { state: AccountingActionState }) { if (!state.message) return null; return <p role="status" className={`rounded-xl border px-4 py-3 text-sm font-bold ${state.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{state.message}</p> }
function Submit({ pending, text }: { pending: boolean; text: string }) { return <button type="submit" disabled={pending} className="min-h-11 rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white disabled:opacity-60">{pending ? 'Procesando…' : text}</button> }
