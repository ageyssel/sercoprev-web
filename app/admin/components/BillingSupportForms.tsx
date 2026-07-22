'use client'

import { useActionState } from 'react'
import { AppIcon } from '@/components/AppIcon'
import {
  crearContactoEmpresa,
  crearHonorario,
  responderTicketAdmin,
  type SupportActionState,
} from '@/app/support-actions'

const initialState: SupportActionState = { status: 'idle', message: '' }
const inputClass = 'h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-[#17324a] outline-none transition placeholder:text-slate-400 focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'
const textareaClass = 'rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-[#17324a] outline-none transition placeholder:text-slate-400 focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'

export function FeeForm({ companyId, defaultAmount }: { companyId: string; defaultAmount?: number | null }) {
  const [state, action, pending] = useActionState(crearHonorario, initialState)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Periodo" name="periodo" required placeholder="Julio 2026" />
        <Field label="Concepto" name="concepto" defaultValue="Honorarios profesionales" required />
        <Field label="Monto" name="monto" defaultValue={defaultAmount?.toString()} inputMode="numeric" required placeholder="350000" />
        <Field label="Fecha de emisión" name="fecha_emision" type="date" />
        <Field label="Fecha de vencimiento" name="fecha_vencimiento" type="date" required />
      </div>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Notas<textarea name="notas" rows={2} maxLength={1500} className={textareaClass} placeholder="Detalle visible o condiciones del cobro." /></label>
      <Feedback state={state} />
      <Submit pending={pending} text="Registrar honorario" loading="Registrando…" icon="money" />
    </form>
  )
}

export function CompanyContactForm({ companyId }: { companyId: string }) {
  const [state, action, pending] = useActionState(crearContactoEmpresa, initialState)
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="empresa_id" value={companyId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" name="nombre" required placeholder="Nombre completo" />
        <Field label="Cargo" name="cargo" placeholder="Gerente, administración…" />
        <Field label="Correo" name="email" type="email" placeholder="contacto@empresa.cl" />
        <Field label="Teléfono" name="telefono" type="tel" placeholder="+56 9…" />
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700 sm:flex-row sm:items-center sm:gap-6">
        <label className="flex items-center gap-2"><input type="checkbox" name="principal" className="h-4 w-4 rounded" />Contacto principal</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="recibe_notificaciones" defaultChecked className="h-4 w-4 rounded" />Recibe notificaciones</label>
      </div>
      <Feedback state={state} />
      <Submit pending={pending} text="Agregar contacto" loading="Agregando…" icon="plus" />
    </form>
  )
}

export function AdminTicketReplyForm({ ticketId, companyId }: { ticketId: string; companyId: string }) {
  const [state, action, pending] = useActionState(responderTicketAdmin, initialState)
  return (
    <form action={action} className="mt-4 grid gap-3 rounded-2xl border border-[#134b78]/20 bg-[#eaf3f9] p-4">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <input type="hidden" name="empresa_id" value={companyId} />
      <label className="grid gap-2 text-xs font-black uppercase tracking-wide text-[#134b78]">Responder al cliente<textarea name="mensaje" rows={3} required maxLength={5000} className={textareaClass} placeholder="Escriba una respuesta clara y accionable." /></label>
      <Feedback state={state} compact />
      <Submit pending={pending} text="Publicar respuesta" loading="Publicando…" icon="message" compact />
    </form>
  )
}

function Field({ label, name, type = 'text', defaultValue, placeholder, required = false, inputMode }: { label: string; name: string; type?: string; defaultValue?: string | null; placeholder?: string; required?: boolean; inputMode?: 'numeric' }) {
  return <label className="grid gap-2 text-sm font-bold text-slate-700">{label}<input name={name} type={type} defaultValue={defaultValue ?? ''} placeholder={placeholder} required={required} inputMode={inputMode} className={inputClass} /></label>
}

function Feedback({ state, compact = false }: { state: SupportActionState; compact?: boolean }) {
  if (!state.message) return null
  return <p role="status" className={`rounded-xl border px-3 py-2 ${compact ? 'text-xs' : 'text-sm'} font-bold ${state.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{state.message}</p>
}

function Submit({ pending, text, loading, icon, compact = false }: { pending: boolean; text: string; loading: string; icon: 'money' | 'plus' | 'message'; compact?: boolean }) {
  return <button type="submit" disabled={pending} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#0f2438] font-black text-white transition hover:bg-[#173d5c] disabled:opacity-60 ${compact ? 'min-h-10 px-4 py-2 text-xs' : 'min-h-11 px-5 py-3 text-sm'}`}><AppIcon name={icon} className="h-4 w-4" />{pending ? loading : text}</button>
}
