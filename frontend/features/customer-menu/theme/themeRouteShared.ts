export type PmdStateSetter<T = any> = (value: T | ((prev: T) => T)) => void

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
  setSharedTableOrder: PmdStateSetter<any>
  setLocalOpenOrder: PmdStateSetter<any>
  setHasLocalOpenOrder: (value: boolean) => void
}) {
  const { setSharedTableOrder, setLocalOpenOrder, setHasLocalOpenOrder } = params

  return function handleOpenOrderUpdate(snapshot: any) {
    if (snapshot?.status === "draft" || snapshot?.draft_id) {
      setSharedTableOrder(snapshot)
      return
    }

    if (snapshot?.paymentStatus === "paid" || snapshot?.status === "paid") {
      const normalizedPaid = snapshot?.orderId ? snapshot : { ...snapshot, orderId: snapshot?.order_id }
      setLocalOpenOrder(normalizedPaid)
      setHasLocalOpenOrder(!!normalizedPaid?.orderId)
      setSharedTableOrder((prev: any) =>
        prev?.order_id && String(prev.order_id) === String(normalizedPaid?.orderId)
          ? ({ ...prev, status: "paid", paymentStatus: "paid" } as any)
          : prev
      )
      return
    }

    if (snapshot?.orderId || snapshot?.order_id) {
      const normalized = snapshot?.orderId ? snapshot : { ...snapshot, orderId: snapshot.order_id }
      setLocalOpenOrder(normalized)
      setHasLocalOpenOrder(true)
      setSharedTableOrder((prev: any) => prev?.draft_id ? null : prev)
    }
  }
}
