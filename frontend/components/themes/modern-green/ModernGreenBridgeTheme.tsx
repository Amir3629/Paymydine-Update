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
  children,
}: ModernGreenBridgeThemeProps) {
  useEffect(() => {
    if (typeof window === "undefined") return

    const sendSync = () => {
      const frame = document.getElementById("pmd-modern-green-frame") as HTMLIFrameElement | null
      if (!frame?.contentWindow) return

      const lastItem = lastInteractedItem?.item || cartItems?.[cartItems.length - 1]?.item || null

      frame.contentWindow.postMessage({
        type: "PMD_MODERN_GREEN_SYNC",
        restaurantName,
        logoUrl,
        tableNumber,
        categories,
        items: sourceItems.map((item) => ({
          id: itemId(item),
          name: itemName(item),
          description: itemDescription(item),
          price: Number(item?.price || 0),
          category: String(item?.category || item?.category_name || "Menu"),
          image: itemImage(item),
          images: Array.isArray(item?.images) ? item.images : [],
          is_bestseller: Boolean(item?.is_bestseller),
          is_recommended: Boolean(item?.is_recommended || item?.is_featured || item?.is_popular || item?.is_chef_recommended),
        })),
        cart: {
          count: totalItems,
          total: totalPrice,
          lastItemName: lastItem ? itemName(lastItem) : "",
          lastItemPrice: lastItem ? Number(lastItem?.price || 0) : 0,
          lines: Array.isArray(cartItems) ? cartItems.map(cartLineFrom) : [],
        },
      }, window.location.origin)
    }

    const findItem = (rawId: unknown) => {
      const id = String(rawId || "")
      return sourceItems.find((candidate) => itemId(candidate) === id)
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const msg = event.data
      if (!msg || typeof msg !== "object") return

      const type = String((msg as any).type || "")

      if (type === "PMD_MODERN_GREEN_READY") {
        sendSync()
        return
      }

      if (type === "PMD_MODERN_GREEN_ADD_ITEM") {
        const found = findItem((msg as any).itemId)
        if (found) onAddItem(found, Math.max(1, Number((msg as any).quantity || 1)))
        window.setTimeout(sendSync, 100)
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

    sendSync()
    const timers = [
      window.setTimeout(sendSync, 250),
      window.setTimeout(sendSync, 900),
      window.setTimeout(sendSync, 1600),
    ]

    window.addEventListener("message", handleMessage)

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
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
    <div className="pmd-customer-page page--menu relative min-h-screen w-full bg-[#010302]">
      <iframe
        id="pmd-modern-green-frame"
        title="Modern Green menu"
        src={src}
        className="block h-screen w-full border-0"
        style={{ width: "100%", height: "100dvh", minHeight: "100vh", border: 0, display: "block", background: "#010302" }}
      />
      {children}
    </div>
  )
}
