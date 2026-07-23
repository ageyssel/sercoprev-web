'use client'

import { useActionState } from 'react'
import { cargarLoteDocumental, type IntakeActionState } from '@/app/admin/document-intake-actions'

const initialState: IntakeActionState = { status: 'idle', message: '' }

export function DocumentIntakeForm() {
  const [state, action, pending] = useActionState(cargarLoteDocumental, initialState)
  return (
    <form action={action} className="grid gap-5">
      <label className="grid gap-2 text-sm font-bold text-slate-700">Nombre del lote<input name="nombre_lote" className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10" placeholder="Ej. Antecedentes tributarios julio 2026" /></label>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Archivos<input name="archivos" type="file" multiple required accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png" className="block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0f2438] file:px-4 file:py-2 file:font-bold file:text-white" /><span className="text-xs font-medium leading-5 text-slate-500">Hasta 20 archivos por lote, 7 MB cada uno y 30 MB totales. Use RUT, periodo y tipo documental en el nombre para aumentar la precisión.</span></label>
      <div className="rounded-2xl border border-[#134b78]/20 bg-[#eaf3f9] p-4 text-sm leading-6 text-[#17324a]"><p className="font-black">Ejemplos de nombres reconocibles</p><p className="mt-1">76.123.456-7_F29_2026-06.pdf · EMPRESA_BALANCE_2025.xlsx · 76123456-7_PREVIRED_JULIO_2026.pdf</p></div>
      {state.message && <p role="status" className={`rounded-xl border px-4 py-3 text-sm font-bold ${state.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{state.message}</p>}
      <button disabled={pending} className="min-h-11 rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white transition hover:bg-[#173d5c] disabled:opacity-60">{pending ? 'Clasificando y almacenando…' : 'Procesar lote documental'}</button>
    </form>
  )
}
