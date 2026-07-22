'use client'

import { useActionState } from 'react'
import { crearLead, type LeadFormState } from '@/app/public-actions'
import { AppIcon } from '@/components/AppIcon'

const initialState: LeadFormState = { status: 'idle', message: '' }

export function LeadForm() {
  const [state, formAction, pending] = useActionState(crearLead, initialState)

  return (
    <form action={formAction} className="grid gap-4" aria-label="Solicitar evaluación contable">
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Sitio web</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre y apellido" name="nombre" placeholder="Ej. Marcela Soto" autoComplete="name" required />
        <Field label="Empresa" name="empresa" placeholder="Ej. Comercial Soto SpA" autoComplete="organization" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Correo" name="email" type="email" placeholder="nombre@empresa.cl" autoComplete="email" required />
        <Field label="Teléfono" name="telefono" type="tel" placeholder="+56 9 1234 5678" autoComplete="tel" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="RUT empresa" name="rut" placeholder="76.123.456-7" />
        <label className="grid gap-2 text-sm font-bold text-[#17324a]">
          Servicio que necesita
          <select name="servicio" required defaultValue="" className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-[#17324a] outline-none transition focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10">
            <option value="" disabled>Seleccione una opción</option>
            <option>Contabilidad mensual</option>
            <option>Tributación y renta</option>
            <option>Remuneraciones y Previred</option>
            <option>Constitución o regularización</option>
            <option>Asesoría integral</option>
          </select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-bold text-[#17324a]">
        Cuéntenos brevemente qué necesita
        <textarea name="mensaje" rows={4} maxLength={1500} className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-[#17324a] outline-none transition focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10" placeholder="Situación actual, número de trabajadores, régimen o principal dificultad." />
      </label>

      {state.message && (
        <div role="status" aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm font-bold ${state.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {state.message}
        </div>
      )}

      <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#0f2438]/15 transition hover:bg-[#173d5c] disabled:cursor-wait disabled:opacity-60">
        {pending ? 'Enviando solicitud…' : 'Solicitar evaluación'}
        {!pending && <AppIcon name="arrow-right" className="h-4 w-4" />}
      </button>
      <p className="text-xs leading-relaxed text-slate-500">Sus datos serán utilizados únicamente para responder esta solicitud comercial.</p>
    </form>
  )
}

function Field({
  label,
  name,
  type = 'text',
  placeholder,
  autoComplete,
  required = false,
}: {
  label: string
  name: string
  type?: string
  placeholder: string
  autoComplete?: string
  required?: boolean
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#17324a]">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        maxLength={254}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-[#17324a] outline-none transition placeholder:text-slate-400 focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10"
      />
    </label>
  )
}
