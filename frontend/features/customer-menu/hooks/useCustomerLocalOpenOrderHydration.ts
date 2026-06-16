import type { Dispatch, SetStateAction } from "react"
import { useEffect } from "react"

type SearchParamsLike = {
  get: (name: string) => string | null
}

type LocalOpenOrder = Record<string, any> | null

interface UseCustomerLocalOpenOrderHydrationProps {
  tableInfo?: any
  searchParams?: SearchParamsLike | null
  existingOrderId: number | null
  setExistingOrderId: (value: number | null) => void
  hasDraftTableOrderWithoutRealOrder: boolean
  setHasLocalOpenOrder: (value: boolean) => void
  setLocalOpenOrder: Dispatch<SetStateAction<LocalOpenOrder>>
}


export function useCustomerLocalOpenOrderHydration(props: UseCustomerLocalOpenOrderHydrationProps) {
  const {
    tableInfo,
    searchParams,
    existingOrderId,
    setExistingOrderId,
    hasDraftTableOrderWithoutRealOrder,
    setHasLocalOpenOrder,
    setLocalOpenOrder,
  } = props

  useEffect(() => {
    if (typeof window === "undefined") return
    if (hasDraftTableOrderWithoutRealOrder) {
      setExistingOrderId(null)
      setHasLocalOpenOrder(false)
      setLocalOpenOrder(null)
      return
    }
    const tenant = window.location.host
    const tableKey = String(tableInfo?.table_id || tableInfo?.table_no || searchParams?.get("table") || searchParams?.get("table_id") || searchParams?.get("table_no") || (window.location.pathname.match(/\/table\/(\d+)/)?.[1] ?? "delivery"))
    const guestSessionId = localStorage.getItem('pmd_guest_session_id') || `g_${Date.now()}_${Math.random().toString(36).slice(2,10)}`
    localStorage.setItem('pmd_guest_session_id', guestSessionId)
    const key = `pmd_open_order:${tenant}:${tableKey}:${guestSessionId}`
    const legacyKey = `pmd_open_order:${tenant}:${tableKey}`
    try {
      let raw = localStorage.getItem(key)
      let restoredFromLegacy = false
      if (!raw) {
        const legacyRaw = localStorage.getItem(legacyKey)
        if (legacyRaw) {
          try {
            const legacy = JSON.parse(legacyRaw)
            const hasValidCore = Number(legacy?.orderId || 0) > 0 && Number(legacy?.total || 0) > 0
            const isPaid = legacy?.paymentStatus === "paid" || legacy?.status === "paid"
            const tenantConflict = legacy?.tenant != null && String(legacy.tenant) !== tenant
            const tableConflict = legacy?.tableKey != null && String(legacy.tableKey) !== tableKey
            if (!hasValidCore || isPaid || tenantConflict || tableConflict) {
              localStorage.removeItem(legacyKey)
            } else {
              const migrated = { ...legacy, guestSessionId, tenant, tableKey }
              localStorage.setItem(key, JSON.stringify(migrated))
              localStorage.removeItem(legacyKey)
              raw = JSON.stringify(migrated)
              restoredFromLegacy = true
            }
          } catch {}
        }
      }
      if (!raw) { setHasLocalOpenOrder(false); setLocalOpenOrder(null); return }
      const parsed = JSON.parse(raw)
      const hasValidCore =
        parsed &&
        typeof parsed === "object" &&
        Number(parsed?.total || 0) > 0 &&
        Number(parsed?.orderId || 0) > 0
      const matchesContext =
        String(parsed?.guestSessionId || "") === guestSessionId &&
        String(parsed?.tenant || "") === tenant &&
        String(parsed?.tableKey || "") === tableKey
      if (!hasValidCore || (!restoredFromLegacy && !matchesContext)) {
        localStorage.removeItem(key)
        setHasLocalOpenOrder(false)
        setLocalOpenOrder(null)
        return
      }
      setHasLocalOpenOrder(!!parsed?.orderId)
      setLocalOpenOrder(parsed)
      if (!existingOrderId && parsed?.orderId) setExistingOrderId(Number(parsed.orderId))
    } catch { setHasLocalOpenOrder(false); setLocalOpenOrder(null) }
  }, [tableInfo, searchParams, existingOrderId, hasDraftTableOrderWithoutRealOrder])
}
