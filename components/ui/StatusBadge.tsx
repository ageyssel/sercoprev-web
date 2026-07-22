const palettes: Record<string, string> = {
  Activo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Aprobado: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Completada: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Ganado: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Pagada: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Presentada: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Recibido: 'border-blue-200 bg-blue-50 text-blue-700',
  'En curso': 'border-blue-200 bg-blue-50 text-blue-700',
  'En proceso': 'border-blue-200 bg-blue-50 text-blue-700',
  Contactado: 'border-blue-200 bg-blue-50 text-blue-700',
  Evaluación: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  'Propuesta enviada': 'border-indigo-200 bg-indigo-50 text-indigo-700',
  'En revisión': 'border-indigo-200 bg-indigo-50 text-indigo-700',
  Pendiente: 'border-amber-200 bg-amber-50 text-amber-800',
  Solicitado: 'border-amber-200 bg-amber-50 text-amber-800',
  Nuevo: 'border-amber-200 bg-amber-50 text-amber-800',
  'Esperando cliente': 'border-orange-200 bg-orange-50 text-orange-800',
  Observado: 'border-orange-200 bg-orange-50 text-orange-800',
  'Requiere atención': 'border-orange-200 bg-orange-50 text-orange-800',
  Vencida: 'border-red-200 bg-red-50 text-red-700',
  Vencido: 'border-red-200 bg-red-50 text-red-700',
  Crítica: 'border-red-200 bg-red-50 text-red-700',
  Bloqueada: 'border-red-200 bg-red-50 text-red-700',
  Suspendido: 'border-slate-300 bg-slate-100 text-slate-700',
  Archivado: 'border-slate-300 bg-slate-100 text-slate-600',
  Descartado: 'border-slate-300 bg-slate-100 text-slate-600',
  'No aplica': 'border-slate-300 bg-slate-100 text-slate-600',
}

export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const palette = palettes[status] ?? 'border-slate-200 bg-slate-50 text-slate-700'
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold leading-none ${palette} ${className}`}>
      {status}
    </span>
  )
}
