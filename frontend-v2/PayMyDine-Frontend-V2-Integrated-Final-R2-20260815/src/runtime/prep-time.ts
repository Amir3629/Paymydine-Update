export function formatPrepTime(minutes: number | null | undefined): string {
  const value = Math.max(0, Math.round(Number(minutes) || 0))
  if (!value) return ''
  if (value === 10) return '5–10 min'
  if (value === 20) return '10–20 min'
  if (value === 30) return '20–30 min'
  if (value === 45) return '30–45 min'
  return `~${value} min`
}
