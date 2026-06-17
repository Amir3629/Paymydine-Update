import type { ThemeLooseBridge } from "@/features/customer-menu/theme/themeRouteTypes"

export type PmdStateSetter<T = ThemeLooseBridge> = (value: T | ((prev: T) => T)) => void

export function normalizeMenuLogoUrl(value: unknown): string {
  const raw = String(value || "").trim()
  if (!raw || raw === "undefined" || raw === "null") return ""

  if (/^https?:\/\//i.test(raw)) return raw

  const clean = raw.replace(/^\/+/, "")
  const filename = clean.split("/").filter(Boolean).pop() || clean

  if (clean.startsWith("assets/media/uploads/")) return `/${clean}`
  if (clean.startsWith("/assets/media/uploads/")) return clean
  if (clean.startsWith("uploads/")) return `/assets/media/${clean}`

  if (!clean.includes("/")) return `/assets/media/uploads/${filename}`
  if (clean.startsWith("assets/media/")) return `/assets/media/uploads/${filename}`

  return `/${clean}`
}

export function createOpenOrderUpdateHandler(params: {
  setSharedTableOrder: PmdStateSetter<ThemeLooseBridge>
  setLocalOpenOrder: PmdStateSetter<ThemeLooseBridge>
  setHasLocalOpenOrder: (value: boolean) => void
}) {
  const { setSharedTableOrder, setLocalOpenOrder, setHasLocalOpenOrder } = params

  return function handleOpenOrderUpdate(snapshot: ThemeLooseBridge) {
    if (snapshot?.status === "draft" || snapshot?.draft_id) {
      setSharedTableOrder(snapshot)
      return
    }

    if (snapshot?.paymentStatus === "paid" || snapshot?.status === "paid") {
      const normalizedPaid = snapshot?.orderId ? snapshot : { ...snapshot, orderId: snapshot?.order_id }
      setLocalOpenOrder(normalizedPaid)
      setHasLocalOpenOrder(!!normalizedPaid?.orderId)
      setSharedTableOrder((prev: ThemeLooseBridge) =>
        prev?.order_id && String(prev.order_id) === String(normalizedPaid?.orderId)
          ? ({ ...prev, status: "paid", paymentStatus: "paid" } as ThemeLooseBridge)
          : prev
      )
      return
    }

    if (snapshot?.orderId || snapshot?.order_id) {
      const normalized = snapshot?.orderId ? snapshot : { ...snapshot, orderId: snapshot.order_id }
      setLocalOpenOrder(normalized)
      setHasLocalOpenOrder(true)
      setSharedTableOrder((prev: ThemeLooseBridge) => prev?.draft_id ? null : prev)
    }
  }
}
