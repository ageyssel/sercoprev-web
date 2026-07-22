'use client'

import { useActionState } from 'react'
import { AppIcon } from '@/components/AppIcon'
import { responderSolicitudDocumento, type ClientActionState } from '@/app/dashboard/actions'

const initialState: ClientActionState = { status: 'idle', message: '' }

export function RequestUploadForm({ solicitudId }: { solicitudId: string }) {
  const [state, formAction, pending] = useActionState(responderSolicitudDocumento, initialState)

  return (
    <form action={formAction} className="mt-4 grid gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
      <input type="hidden" name="solicitud_id" value={solicitudId} />
      <label className="text-xs font-bold text-slate-700">
        Adjuntar respuesta
        <input
          name="archivo"
          type="file"
          required
          accept=".pdf,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
          className="mt-2 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#0f2438] file:px-3 file:py-2 file:font-bold file:text-white hover:file:bg-[#173d5c]"
        />
      </label>
      {state.message && (
        <p role="status" className={`rounded-lg px-3 py-2 text-xs font-bold ${state.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#134b78] px-3 py-2 text-xs font-black text-white transition hover:bg-[#0f3e65] disabled:opacity-60">
        <AppIcon name="upload" className="h-4 w-4" />
        {pending ? 'Enviando…' : 'Enviar documento'}
      </button>
      <p className="text-[11px] leading-relaxed text-slate-500">PDF, Excel, CSV o imagen. Máximo 7 MB.</p>
    </form>
  )
}
