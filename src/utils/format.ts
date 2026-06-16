/**
 * Formats a crypto price with smart decimal precision.
 *
 * - >= 1000 : comma-separated, 2 decimal places  (e.g. 65,432.10)
 * - 1–999   : 2 decimal places                   (e.g. 12.34)
 * - < 1     : 4 significant digits from the first non-zero decimal digit
 *             (e.g. 0.001234, 0.00001234, 0.5678)
 */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'

  const abs = Math.abs(value)

  if (abs === 0) return '0'

  if (abs >= 1000) {
    return value.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  }

  if (abs >= 1) {
    return value.toFixed(3)
  }

  // Count leading zeros after the decimal point
  const str = abs.toFixed(20)
  const decimalPart = str.split('.')[1] ?? ''
  let leadingZeros = 0
  for (const ch of decimalPart) {
    if (ch !== '0') break
    leadingZeros++
  }

  return value.toFixed(leadingZeros + 4)
}
