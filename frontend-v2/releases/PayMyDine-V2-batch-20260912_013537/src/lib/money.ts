export function roundMoney(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100
}

export function formatMoney(value: number, currency = 'EUR', locale = 'en'): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))
  } catch {
    return `${roundMoney(value).toFixed(2)} ${currency}`
  }
}
