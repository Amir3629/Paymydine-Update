"use client"

import { useEffect, type ReactNode, useRef } from "react"

type KazenJapaneseBridgeThemeProps = {
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

export function KazenJapaneseBridgeTheme({
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
}: KazenJapaneseBridgeThemeProps) {

  // PMD_KAZEN_FETCH_ADMIN_LOGO_LIKE_HOMEPAGE_20260611
  const pmdKazenBridgeLogoRef = useRef("")

  useEffect(() => {
    if (typeof window === "undefined") return

    let cancelled = false

    const normalizeAdminLogoUrl = (value: unknown) => {
      const raw = String(value || "").trim()
      if (!raw || raw === "undefined" || raw === "null" || raw.startsWith("data:")) return ""

      if (/^https?:\/\//i.test(raw)) return raw

      const clean = raw.replace(/^\/+/, "")
      const filename = clean.split("/").filter(Boolean).pop() || clean

      if (clean.startsWith("assets/media/uploads/")) return `/${clean}`
      if (clean.startsWith("assets/media/attachments/")) return `/${clean}`
      if (clean.startsWith("uploads/")) return `/assets/media/${clean}`
      if (clean.startsWith("storage/")) return `/${clean}`
      if (!clean.includes("/")) return `/assets/media/uploads/${filename}`

      return `/${clean}`
    }

    const readLogoFromPayload = (payload: any) => {
      const candidates = [
        payload?.site_logo_url,
        payload?.logo_url,
        payload?.site_logo,
        payload?.logo,
        payload?.restaurant_logo,
        payload?.restaurantLogoUrl,
        payload?.merchant_logo,
        payload?.business_logo,
        payload?.brand_logo,
        payload?.data?.site_logo_url,
        payload?.data?.logo_url,
        payload?.data?.site_logo,
        payload?.data?.logo,
        payload?.data?.restaurant_logo,
        payload?.data?.restaurantLogoUrl,
        payload?.data?.merchant_logo,
        payload?.data?.business_logo,
        payload?.data?.brand_logo,
        payload?.settings?.site_logo_url,
        payload?.settings?.logo_url,
        payload?.settings?.site_logo,
        payload?.settings?.logo,
        payload?.merchant?.site_logo_url,
        payload?.merchant?.logo_url,
        payload?.merchant?.site_logo,
        payload?.merchant?.logo,
      ]

      for (const candidate of candidates) {
        const normalized = normalizeAdminLogoUrl(candidate)
        if (normalized) return normalized
      }

      return ""
    }

    const loadAdminLogo = async () => {
      const endpoints = [
        `/settings?ts=${Date.now()}`,
        `/api/v1/settings-wrapped?ts=${Date.now()}`,
        `/api/settings?ts=${Date.now()}`,
      ]

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            credentials: "omit",
            cache: "no-store",
            headers: { Accept: "application/json" },
          })

          if (!res.ok) continue

          const payload = await res.json()
          const logo = readLogoFromPayload(payload)

          if (logo) {
            pmdKazenBridgeLogoRef.current = logo
            ;(window as any).__PMD_EFFECTIVE_LOGO_URL = logo
            ;(window as any).__PMD_LOGO_URL = logo

            if (!cancelled) {
              window.dispatchEvent(new Event("PMD_KAZEN_FORCE_SYNC"))
            }

            return
          }
        } catch {
          // try next endpoint
        }
      }
    }

    void loadAdminLogo()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const sendSync = () => {
      const frame = document.getElementById("pmd-kazen-japanese-frame") as HTMLIFrameElement | null
      if (!frame?.contentWindow) return

      const lastItem = lastInteractedItem?.item || cartItems?.[cartItems.length - 1]?.item || null

      // PMD_KAZEN_ADMIN_LOGO_ONLY_BRIDGE_20260611
      const bridgeRestaurantName = String(
        restaurantName ||
        (window as any).__PMD_RESTAURANT_NAME ||
        (window as any).__PMD_BUSINESS_NAME ||
        "Kazen"
      )

      const normalizeLogoUrl = (value: unknown) => {
        const raw = String(value || "").trim()
        if (!raw || raw === "undefined" || raw === "null" || raw.startsWith("data:")) return ""

        if (/^https?:\/\//i.test(raw)) return raw

        const clean = raw.replace(/^\/+/, "")
        const filename = clean.split("/").filter(Boolean).pop() || clean

        if (clean.startsWith("assets/media/uploads/")) return `/${clean}`
        if (clean.startsWith("assets/media/attachments/")) return `/${clean}`
        if (clean.startsWith("uploads/")) return `/assets/media/${clean}`
        if (clean.startsWith("storage/")) return `/${clean}`
        if (!clean.includes("/")) return `/assets/media/uploads/${filename}`

        return `/${clean}`
      }

      const bridgeLogoUrl = String(
        normalizeLogoUrl(logoUrl) ||
        pmdKazenBridgeLogoRef.current ||
        normalizeLogoUrl((window as any).__PMD_EFFECTIVE_LOGO_URL) ||
        normalizeLogoUrl((window as any).__PMD_LOGO_URL) ||
        ""
      )

      const safeTableNumber = (value: unknown) => {
        const text = String(value || "").trim()
        if (!text || /delivery/i.test(text)) return ""
        return text.match(/\d+/)?.[0] || ""
      }

      const pathTable =
        window.location.pathname.match(/table[-/](\d+)/i)?.[1] ||
        window.location.search.match(/table_id=(\d+)/i)?.[1] ||
        ""

      const bridgeTableNumber =
        safeTableNumber(tableNumber) ||
        safeTableNumber((window as any).__PMD_DISPLAY_TABLE_NUMBER) ||
        safeTableNumber((window as any).__PMD_TABLE_NUMBER) ||
        pathTable ||
        null

      frame.contentWindow.postMessage({
        type: "PMD_KAZEN_SYNC",
        restaurantName: bridgeRestaurantName,
        logoUrl: bridgeLogoUrl,
        effectiveLogoUrl: bridgeLogoUrl,
        tableNumber: bridgeTableNumber,
        displayTableNumber: bridgeTableNumber,
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

    const handleForceSync = () => sendSync()

    const findItem = (rawId: unknown) => {
      const id = String(rawId || "")
      return sourceItems.find((candidate) => itemId(candidate) === id)
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const msg = event.data
      if (!msg || typeof msg !== "object") return

      const type = String((msg as any).type || "")

      if (type === "PMD_KAZEN_READY") {
        sendSync()
        return
      }

      if (type === "PMD_KAZEN_ADD_ITEM") {
        const found = findItem((msg as any).itemId)
        if (found) onAddItem(found, Math.max(1, Number((msg as any).quantity || 1)))
        window.setTimeout(sendSync, 100)
        return
      }

      if (type === "PMD_KAZEN_OPEN_ITEM") {
        const found = findItem((msg as any).itemId)
        if (found) onOpenItem(found)
        return
      }

      if (type === "PMD_KAZEN_CHECKOUT") {
        onCheckout()
        return
      }

      if (type === "PMD_KAZEN_CALL_WAITER") {
        void onCallWaiter()
        return
      }

      if (type === "PMD_KAZEN_ADD_NOTE") {
        void onOpenNote(String((msg as any).note || ""))
        return
      }

      if (type === "PMD_KAZEN_GO_VALET") {
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
    window.addEventListener("PMD_KAZEN_FORCE_SYNC", handleForceSync)

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      window.removeEventListener("message", handleMessage)
      window.removeEventListener("PMD_KAZEN_FORCE_SYNC", handleForceSync)
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
    <div
      data-pmd-kazen-theme="1"
      className="pmd-customer-page page--menu relative min-h-screen w-full"
      style={{ background: "#f7f3ec", color: "#1f1f1d" }}
    >
      <iframe
        id="pmd-kazen-japanese-frame"
        title="Kazen Japanese Minimal Menu"
        src={src}
        className="block h-screen w-full border-0"
        style={{ width: "100%", height: "100dvh", minHeight: "100vh", border: 0, display: "block", background: "#f7f3ec" }}
      />
      {children}
    </div>
  )
}
