export function getPaymentTenantKey(): string {
  if (typeof window === "undefined") return "tenant"
  return window.location.host
}

export function getPaymentTableKey(tableInfo: any): string {
  const p = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
  const qTable = p?.get("table") || p?.get("table_id") || p?.get("table_no")
  const routeTable =
    typeof window !== "undefined"
      ? (window.location.pathname.match(/\/table\/(\d+)/)?.[1] ?? null)
      : null

  return String(tableInfo?.table_id || tableInfo?.table_no || qTable || routeTable || "delivery")
}

export function ensurePaymentGuestSession(): string {
  if (typeof window === "undefined") return ""

  const key = "pmd_guest_session_id"
  let value = localStorage.getItem(key)

  if (!value) {
    value = `g_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(key, value)
  }

  return value
}

export function buildPaymentOpenOrderStorageKeys(tableInfo: any) {
  const tenant = getPaymentTenantKey()
  const tableKey = getPaymentTableKey(tableInfo)
  const guestSessionId = ensurePaymentGuestSession()

  return {
    sessionKey: `pmd_open_order:${tenant}:${tableKey}:${guestSessionId}`,
    legacyKey: `pmd_open_order:${tenant}:${tableKey}`,
    guestSessionId,
    tenant,
    tableKey,
  }
}
