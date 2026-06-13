"use client"

import { useEffect, type ReactNode } from "react"

type ModernGreenBridgeThemeProps = {
  src: string
  sourceItems: any[]
  cartItems: any[]
  totalItems: number
  totalPrice: number
  lastInteractedItem?: any
  categories: string[]
  restaurantName: string
  logoUrl?: string
  tableNumber?: string | number | null
  onAddItem: (item: any, quantity?: number) => void
  onOpenItem: (item: any) => void
  onCheckout: () => void
  onCallWaiter: () => void | Promise<void>
  onOpenNote: (note?: string) => void | Promise<void>
  onOpenValet: (values?: { name?: string; licensePlate?: string; carModel?: string }) => void | Promise<void>
  onTableOrder?: () => void | Promise<void>
  showTableOrder?: boolean
  tableOrderCount?: number
  children?: ReactNode
}

function itemId(item: any): string {
  return String(item?.id ?? item?.menu_id ?? item?.menuId ?? "")
}

function itemName(item: any): string {
  return String(item?.name ?? item?.menu_name ?? item?.title ?? "Menu item")
}

function itemDescription(item: any): string {
  return String(item?.description ?? item?.menu_description ?? "")
}

function itemImage(item: any): string {
  const images = Array.isArray(item?.images) ? item.images : []
  const firstImage = images[0]
  const fromImages = firstImage
    ? String(firstImage?.url ?? firstImage?.path ?? firstImage?.image_path ?? firstImage)
    : ""

  return String(
    item?.image ??
    item?.image_url ??
    item?.thumb ??
    item?.thumbnail ??
    fromImages ??
    ""
  )
}

function cartLineFrom(cartItem: any) {
  const item = cartItem?.item ?? cartItem
  const quantity = Number(cartItem?.quantity ?? 1)
  return {
    id: itemId(item),
    name: itemName(item),
    unitPrice: Number(item?.price || 0),
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    imageUrl: itemImage(item),
  }
}

export function ModernGreenBridgeTheme({
  src,
  sourceItems,
  cartItems,
  totalItems,
  totalPrice,
  lastInteractedItem,
  categories,
  restaurantName,
  logoUrl,
  tableNumber,
  onAddItem,
  onOpenItem,
  onCheckout,
  onCallWaiter,
  onOpenNote,
  onOpenValet,
  onTableOrder,
  showTableOrder = false,
  tableOrderCount = 0,
  children,
}: ModernGreenBridgeThemeProps) {
  useEffect(() => {
    if (typeof window === "undefined") return

    // PMD_MODERN_GREEN_BRIDGE_STRONG_SYNC_20260611
    const buildPayload = () => {
      const safeSourceItems = Array.isArray(sourceItems) ? sourceItems : []
      const safeCartItems = Array.isArray(cartItems) ? cartItems : []
      const lastItem = lastInteractedItem?.item || safeCartItems?.[safeCartItems.length - 1]?.item || null

      const mappedItems = safeSourceItems.map((item) => ({
        id: itemId(item),
        name: itemName(item),
        description: itemDescription(item),
        price: Number(item?.price || 0),
        category: String(item?.category || item?.category_name || "Menu"),
        image: itemImage(item),
        imageUrl: itemImage(item),
        images: Array.isArray(item?.images) ? item.images : [],
        is_bestseller: Boolean(item?.is_bestseller),
        is_recommended: Boolean(item?.is_recommended || item?.is_featured || item?.is_popular || item?.is_chef_recommended),
      }))

      return {
        type: "PMD_MODERN_GREEN_SYNC",
        restaurantName,
        logoUrl,
        tableNumber,
        categories,
        items: mappedItems,
        menuItems: mappedItems,
        sourceItems: mappedItems,
        cart: {
          count: totalItems,
          total: totalPrice,
          lastItemName: lastItem ? itemName(lastItem) : "",
          lastItemPrice: lastItem ? Number(lastItem?.price || 0) : 0,
          lines: safeCartItems.map(cartLineFrom),
        },
      }
    }

    const sendSync = (reason = "sync") => {
      const frame = document.getElementById("pmd-modern-green-frame") as HTMLIFrameElement | null
      if (!frame?.contentWindow) return

      const payload = buildPayload()

      try {
        console.info("PMD_MODERN_GREEN_BRIDGE_SEND", {
          reason,
          items: Array.isArray(payload.items) ? payload.items.length : 0,
          src: frame.getAttribute("src"),
        })
      } catch {}

      try {
        frame.contentWindow.postMessage(payload, window.location.origin)
        frame.contentWindow.postMessage({ ...payload, type: "PAYMYDINE_MENU_SYNC" }, window.location.origin)
        frame.contentWindow.postMessage({ ...payload, type: "PMD_MENU_SYNC" }, window.location.origin)
      } catch {}

      // fallback in case proxy/origin handling is weird
      try {
        frame.contentWindow.postMessage(payload, "*")
      } catch {}
    }

    const findItem = (rawId: unknown) => {
      const id = String(rawId || "")
      return sourceItems.find((candidate) => itemId(candidate) === id)
    }

    const handleMessage = (event: MessageEvent) => {
      const msg = event.data
      if (!msg || typeof msg !== "object") return

      const type = String((msg as any).type || "")

      if (
        type === "PMD_MODERN_GREEN_READY" ||
        type === "PAYMYDINE_MENU_READY" ||
        type === "PMD_MENU_READY"
      ) {
        sendSync(type)
        window.setTimeout(() => sendSync(type + "_250"), 250)
        window.setTimeout(() => sendSync(type + "_900"), 900)
        return
      }

      if (type === "PMD_MODERN_GREEN_ADD_ITEM") {
        const found = findItem((msg as any).itemId)
        if (found) onAddItem(found, Math.max(1, Number((msg as any).quantity || 1)))
        window.setTimeout(() => sendSync("after_add"), 100)
        return
      }

      if (type === "PMD_MODERN_GREEN_OPEN_ITEM") {
        const found = findItem((msg as any).itemId)
        if (found) onOpenItem(found)
        return
      }

      if (type === "PMD_MODERN_GREEN_CHECKOUT") {
        onCheckout()
        return
      }

      if (type === "PMD_MODERN_GREEN_CALL_WAITER") {
        void onCallWaiter()
        return
      }

      if (type === "PMD_MODERN_GREEN_ADD_NOTE") {
        void onOpenNote(String((msg as any).note || ""))
        return
      }

      if (type === "PMD_MODERN_GREEN_GO_VALET") {
        void onOpenValet((msg as any).values || {})
        return
      }
    }

    const frame = document.getElementById("pmd-modern-green-frame") as HTMLIFrameElement | null
    const handleFrameLoad = () => {
      sendSync("iframe_load")
      window.setTimeout(() => sendSync("iframe_load_250"), 250)
      window.setTimeout(() => sendSync("iframe_load_1000"), 1000)
    }

    frame?.addEventListener("load", handleFrameLoad)
    window.addEventListener("message", handleMessage)

    sendSync("initial")

    const timers = [100, 250, 500, 900, 1500, 2500, 4000, 6500, 10000, 15000].map((ms) =>
      window.setTimeout(() => sendSync("timer_" + ms), ms)
    )

    const interval = window.setInterval(() => sendSync("interval"), 1000)
    const stopInterval = window.setTimeout(() => window.clearInterval(interval), 30000)

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      window.clearTimeout(stopInterval)
      window.clearInterval(interval)
      frame?.removeEventListener("load", handleFrameLoad)
      window.removeEventListener("message", handleMessage)
    }
  }, [
    sourceItems,
    cartItems,
    totalItems,
    totalPrice,
    lastInteractedItem,
    categories,
    restaurantName,
    logoUrl,
    tableNumber,
    onAddItem,
    onOpenItem,
    onCheckout,
    onCallWaiter,
    onOpenNote,
    onOpenValet,
  ])





  return (
    <div data-pmd-mg-whole-menu-bg="1" className="pmd-customer-page page--menu relative min-h-screen w-full bg-[#000000]" style={{ background: "radial-gradient(circle at 86% 0%, rgba(5, 54, 38, .30) 0%, rgba(2, 25, 17, .16) 22%, rgba(0, 6, 4, .96) 46%, rgba(0, 0, 0, 1) 78%, #000000 100%)", backgroundColor: "#000000" }}>
      <iframe
        id="pmd-modern-green-frame"
        title="Modern Green menu"
        src={src}
        className="block h-screen w-full border-0"
        style={{ width: "100%", height: "100dvh", minHeight: "100vh", border: 0, display: "block", background: "#000000" }}
      />
      {children}
    </div>
  )
}
