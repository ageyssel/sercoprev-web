export function formatCurrency(value: number | string | null | undefined) {
  const amount = typeof value === 'string' ? Number(value) : value
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(value: string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return 'Sin fecha'
  const date = new Date(`${value.length === 10 ? `${value}T12:00:00` : value}`)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-CL', options ?? {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function daysUntil(value: string | null | undefined) {
  if (!value) return null
  const target = new Date(`${value}T12:00:00`)
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

export function dueDateLabel(value: string | null | undefined) {
  const days = daysUntil(value)
  if (days === null) return 'Sin fecha'
  if (days < 0) return `Vencida hace ${Math.abs(days)} día${Math.abs(days) === 1 ? '' : 's'}`
  if (days === 0) return 'Vence hoy'
  if (days === 1) return 'Vence mañana'
  return `Vence en ${days} días`
}
