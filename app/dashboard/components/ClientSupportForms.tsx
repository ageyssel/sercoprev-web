'use client'

import { useActionState } from 'react'
import { AppIcon } from '@/components/AppIcon'
import { type SupportActionState } from '@/app/support-actions'
import { crearTicketClienteNotificado, responderTicketClienteNotificado } from '@/app/notified-support-actions'

const initialState: SupportActionState = { status: 'idle', message: '' }
const textareaClass = 'rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-[#17324a] outline-none transition placeholder:text-slate-400 focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10'

export function NewClientTicketForm() {
  const [state, action, pending] = useActionState(crearTicketClienteNotificado, initialState)
  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold text-slate-700">Asunto<input name="asunto" required minLength={3} maxLength={180} className="h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-[#134b78] focus:ring-4 focus:ring-[#134b78]/10" placeholder="Ej. Consulta sobre pago de IVA" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">Categoría<select name="categoria" defaultValue="Consulta general" className="h-11 rounded-xl border border-slate-300 px-3 text-sm"><option>Contabilidad</option><option>Impuestos</option><option>Remuneraciones</option><option>Documentos</option><option>Legal</option><option>Cobranza</option><option>Consulta general</option></select></label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">Prioridad<select name="prioridad" defaultValue="Media" className="h-11 rounded-xl border border-slate-300 px-3 text-sm"><option>Baja</option><option>Media</option><option>Alta</option><option>Crítica</option></select></label>
      </div>
      <label className="grid gap-2 text-sm font-bold text-slate-700">Mensaje<textarea name="mensaje" required rows={4} maxLength={5000} className={textareaClass} placeholder="Explique su consulta con el contexto necesario." /></label>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0f2438] px-5 py-3 text-sm font-black text-white transition hover:bg-[#173d5c] disabled:opacity-60"><AppIcon name="message" className="h-4 w-4" />{pending ? 'Enviando…' : 'Enviar consulta'}</button>
    </form>
  )
}

export function ClientTicketReplyForm({ ticketId }: { ticketId: string }) {
  const [state, action, pending] = useActionState(responderTicketClienteNotificado, initialState)
  return (
    <form action={action} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <label className="grid gap-2 text-xs font-bold text-slate-700">Añadir respuesta<textarea name="mensaje" required rows={3} maxLength={5000} className={textareaClass} placeholder="Escriba su respuesta o información adicional." /></label>
      <Feedback state={state} compact />
      <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#134b78] px-4 py-2 text-xs font-black text-white transition hover:bg-[#0f3e65] disabled:opacity-60"><AppIcon name="message" className="h-4 w-4" />{pending ? 'Enviando…' : 'Responder'}</button>
    </form>
  )
}

function Feedback({ state, compact = false }: { state: SupportActionState; compact?: boolean }) {
  if (!state.message) return null
  return <p role="status" className={`rounded-xl border px-3 py-2 ${compact ? 'text-xs' : 'text-sm'} font-bold ${state.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{state.message}</p>
}
