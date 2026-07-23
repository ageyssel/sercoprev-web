const palettes: Record<string, { className: string; dot: string }> = {
  Activo: { className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  Aprobado: { className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  Completada: { className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  Ganado: { className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  Pagada: { className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  Presentada: { className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  Cuadrado: { className: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  Recibido: { className: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  'En curso': { className: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  'En proceso': { className: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  Contactado: { className: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  Evaluación: { className: 'border-indigo-200 bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  'Propuesta enviada': { className: 'border-indigo-200 bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  'En revisión': { className: 'border-indigo-200 bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  Pendiente: { className: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  Solicitado: { className: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  Nuevo: { className: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' },
  'Esperando cliente': { className: 'border-orange-200 bg-orange-50 text-orange-800', dot: 'bg-orange-500' },
  Observado: { className: 'border-orange-200 bg-orange-50 text-orange-800', dot: 'bg-orange-500' },
  'Requiere atención': { className: 'border-orange-200 bg-orange-50 text-orange-800', dot: 'bg-orange-500' },
  Vencida: { className: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500' },
  Vencido: { className: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500' },
  Crítica: { className: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500' },
  Bloqueada: { className: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500' },
  Descuadrado: { className: 'border-red-200 bg-red-50 text-red-700', dot: 'bg-red-500' },
  Suspendido: { className: 'border-slate-300 bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  Archivado: { className: 'border-slate-300 bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  Descartado: { className: 'border-slate-300 bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  'No aplica': { className: 'border-slate-300 bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
}

export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const palette = palettes[status] ?? { className: 'border-slate-200 bg-slate-50 text-slate-700', dot: 'bg-slate-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-extrabold leading-none tracking-[0.01em] ${palette.className} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${palette.dot}`} aria-hidden="true" />
      {status}
    </span>
  )
}
