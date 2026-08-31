export const RATE_DECIMAL_PLACES = 6

export function roundRateDecimal(value: number) {
  if (!Number.isFinite(value)) return Number.NaN
  return Number(value.toFixed(RATE_DECIMAL_PLACES))
}

export function percentageToDecimalRate(percentage: number) {
  if (!Number.isFinite(percentage)) return Number.NaN
  return roundRateDecimal(percentage / 100)
}

export function parseDecimalRateInput(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') return Number.NaN
  const text = String(value).trim().replace(/\s/g, '').replace(',', '.')
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return Number.NaN
  const parsed = Number(text)
  return Number.isFinite(parsed) ? roundRateDecimal(parsed) : Number.NaN
}
