'use client'

import { eliminarLead } from '@/app/admin/lead-actions'

export function LeadDeleteButton({ id }: { id: string }) {
  return (
    <form
      action={eliminarLead}
      onSubmit={(event) => {
        if (!window.confirm('¿Está seguro de eliminar esta solicitud? Podrá restaurarla desde la papelera.')) event.preventDefault()
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="h-9 rounded-lg border border-red-200 bg-red-50 px-3 text-[10px] font-extrabold text-red-700 transition hover:bg-red-100">
        Eliminar
      </button>
    </form>
  )
}
