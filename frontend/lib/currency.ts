export function formatCurrency(amount: number | undefined | null, opts?: { currency?: string; locale?: string }): string {
  const value = typeof amount === 'number' ? amount : 0;
  const currency = opts?.currency ?? 'EUR';
  const locale = opts?.locale ?? 'en-IE';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Fallback
    return `€${value.toFixed(2)}`;
  }
}

export const EUR_SYMBOL = '€';
