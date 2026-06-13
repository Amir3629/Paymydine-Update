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
  onTableOrder,
  showTableOrder = false,
  tableOrderCount = 0,
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
        showTableOrder: Boolean(showTableOrder),
        tableOrderCount: Number(tableOrderCount || 0),
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

      if (type === "PMD_KAZEN_TABLE_ORDER" || type === "pmd:table-order") {
        void onTableOrder?.()
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
    onTableOrder,
    showTableOrder,
    tableOrderCount,
  ])


  // PMD_KAZEN_TABLE_ORDER_BRIDGE_INJECT_20260613
  // Kazen runs inside an iframe and does not use the normal PayMyDine bottom toolbar.
  // This injects the Table Order action into the iframe bottom bar next to checkout.
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return

    let cancelled = false
    const timers: number[] = []

    const applyButtonStyle = (btn: HTMLButtonElement) => {
      // PMD_FIX_KAZEN_TABLE_ORDER_NO_STYLE_JUMP_20260613
      // One final style only: same family as Waiter / Note / Checkout, no card frame.
      const frame = document.getElementById("pmd-kazen-japanese-frame") as HTMLIFrameElement | null
      const doc = frame?.contentDocument || frame?.contentWindow?.document
      const html = doc?.documentElement
      const body = doc?.body

      const modeText = [
        html?.getAttribute("data-pmd-kazen-mode"),
        html?.getAttribute("data-mode"),
        body?.getAttribute("data-pmd-kazen-mode"),
        body?.getAttribute("data-mode"),
        html?.className,
        body?.className,
      ].join(" ").toLowerCase()

      const isDark = modeText.includes("dark")
      const textColor = isDark ? "#f6e8c8" : "#242320"

      btn.style.setProperty("background", "transparent", "important")
      btn.style.setProperty("background-color", "transparent", "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1px solid ${isDark ? "rgba(198, 164, 93, .46)" : "rgba(36, 35, 32, .18)"}`, "important")
      btn.style.setProperty("box-shadow", isDark ? "inset 0 1px 0 rgba(255,238,196,.05)" : "inset 0 1px 0 rgba(255,255,255,.45)", "important")
      btn.style.setProperty("outline", "0", "important")
      btn.style.setProperty("min-width", "0", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("height", "3.72rem", "important")
      btn.style.setProperty("min-height", "3.72rem", "important")
      btn.style.setProperty("padding", ".48rem .22rem", "important")
      btn.style.setProperty("display", "inline-flex", "important")
      btn.style.setProperty("flex-direction", "column", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("gap", ".24rem", "important")
      btn.style.setProperty("position", "relative", "important")
      btn.style.setProperty("font-family", 'Georgia, "Times New Roman", serif', "important")
      btn.style.setProperty("font-size", ".58rem", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("letter-spacing", ".13em", "important")
      btn.style.setProperty("line-height", "1.05", "important")
      btn.style.setProperty("text-transform", "uppercase", "important")
      btn.style.setProperty("white-space", "normal", "important")
      btn.style.setProperty("text-align", "center", "important")
      btn.style.setProperty("color", textColor, "important")
      btn.style.setProperty("-webkit-text-fill-color", textColor, "important")
      btn.style.setProperty("background", isDark ? "rgba(12, 9, 6, .10)" : "rgba(255, 255, 255, .10)", "important")
      btn.style.setProperty("background-color", isDark ? "rgba(12, 9, 6, .10)" : "rgba(255, 255, 255, .10)", "important")

      btn.querySelectorAll("svg, svg *, span").forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty("color", textColor, "important")
        el.style.setProperty("stroke", textColor, "important")
        el.style.setProperty("-webkit-text-fill-color", textColor, "important")
      })
    }

    const ensure = () => {
      if (cancelled) return

      const frame = document.getElementById("pmd-kazen-japanese-frame") as HTMLIFrameElement | null
      const doc = frame?.contentDocument || frame?.contentWindow?.document
      if (!doc?.body) return

      const existing = doc.querySelector<HTMLButtonElement>('[data-pmd-kazen-table-order-injected="1"]')

      if (!showTableOrder) {
        existing?.remove()
        return
      }

      const buttons = Array.from(doc.querySelectorAll<HTMLButtonElement>("button"))
      const checkoutButton =
        buttons.find((button) => button.getAttribute("data-primary") === "true") ||
        buttons.find((button) => /checkout|pay|order/i.test(button.textContent || ""))

      const targetParent =
        checkoutButton?.parentElement ||
        doc.querySelector<HTMLElement>(".kazen-dock, .kazen-bottom, .kazen-actions, footer") ||
        doc.body

      let btn = existing
      if (!btn) {
        btn = doc.createElement("button")
        btn.type = "button"
        btn.className = "kazen-dock-table-order"
        btn.setAttribute("data-pmd-kazen-table-order-injected", "1")
        btn.setAttribute("data-pmd-kazen-table-order", "1")
        btn.setAttribute("aria-label", "Table order")
        btn.addEventListener("click", (event) => {
          event.preventDefault()
          event.stopPropagation()
          void onTableOrder?.()
        })

        if (checkoutButton?.parentElement) {
          checkoutButton.parentElement.insertBefore(btn, checkoutButton)
        } else {
          targetParent.appendChild(btn)
        }
      }

      const count = Number(tableOrderCount || 0)
      const iconSvg = `
        <svg aria-hidden="true" viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </svg>
      `

      btn.innerHTML = `
        <span data-pmd-kazen-table-order-icon="1">${iconSvg}</span>
        <span data-pmd-kazen-table-order-label="1">Table<br/>Order</span>
        ${count > 0 ? `<b data-pmd-kazen-table-order-badge="1">${count}</b>` : ""}
      `

      applyButtonStyle(btn)

      const badge = btn.querySelector<HTMLElement>("b")
      if (badge) {
        badge.style.setProperty("position", "absolute", "important")
        badge.style.setProperty("top", ".32rem", "important")
        badge.style.setProperty("right", ".42rem", "important")
        badge.style.setProperty("min-width", "1.05rem", "important")
        badge.style.setProperty("height", "1.15rem", "important")
        badge.style.setProperty("display", "inline-flex", "important")
        badge.style.setProperty("align-items", "center", "important")
        badge.style.setProperty("justify-content", "center", "important")
        badge.style.setProperty("border-radius", "999px", "important")
        badge.style.setProperty("background", "#df685d", "important")
        badge.style.setProperty("color", "#fff", "important")
        badge.style.setProperty("-webkit-text-fill-color", "#fff", "important")
        badge.style.setProperty("font-size", ".62rem", "important")
        badge.style.setProperty("line-height", "1", "important")
        badge.style.setProperty("letter-spacing", "0", "important")
      }
    }

    ;[0, 80, 220, 500, 900, 1500, 2600].forEach((ms) => {
      timers.push(window.setTimeout(ensure, ms))
    })

    const observer = new MutationObserver(ensure)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      cancelled = true
      timers.forEach((timer) => window.clearTimeout(timer))
      observer.disconnect()
      try {
        const frame = document.getElementById("pmd-kazen-japanese-frame") as HTMLIFrameElement | null
        const doc = frame?.contentDocument || frame?.contentWindow?.document
        doc?.querySelector('[data-pmd-kazen-table-order-injected="1"]')?.remove()
      } catch {}
    }
  }, [onTableOrder, showTableOrder, tableOrderCount])



  // PMD_KAZEN_TABLE_ORDER_FOUR_BUTTON_DOCK_20260613
  // When Table Order exists, Kazen has 4 dock actions. Force one-row compact layout.
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return

    let cancelled = false
    const timers: number[] = []

    const compact = () => {
      if (cancelled || !showTableOrder) return

      const frame = document.getElementById("pmd-kazen-japanese-frame") as HTMLIFrameElement | null
      const doc = frame?.contentDocument || frame?.contentWindow?.document
      if (!doc?.body) return

      const tableBtn = doc.querySelector<HTMLElement>('[data-pmd-kazen-table-order-injected="1"]')
      if (!tableBtn) return

      const dock = tableBtn.parentElement as HTMLElement | null
      if (!dock) return

      dock.style.setProperty("display", "grid", "important")
      dock.style.setProperty("grid-template-columns", "repeat(4, minmax(0, 1fr))", "important")
      dock.style.setProperty("gap", ".58rem", "important")
      dock.style.setProperty("align-items", "stretch", "important")
      dock.style.setProperty("width", "100%", "important")
      dock.style.setProperty("max-width", "100%", "important")

      Array.from(dock.querySelectorAll<HTMLElement>("button")).forEach((btn) => {
        btn.style.setProperty("min-width", "0", "important")
        btn.style.setProperty("width", "100%", "important")
        btn.style.setProperty("min-height", "3.72rem", "important")
        btn.style.setProperty("height", "3.72rem", "important")
        btn.style.setProperty("padding", ".42rem .28rem", "important")
        btn.style.setProperty("font-size", ".58rem", "important")
        btn.style.setProperty("letter-spacing", ".12em", "important")
        btn.style.setProperty("line-height", "1.05", "important")
        btn.style.setProperty("white-space", "normal", "important")
        btn.style.setProperty("text-align", "center", "important")
        btn.style.setProperty("overflow", "hidden", "important")
      })

      const badge = tableBtn.querySelector<HTMLElement>("[data-pmd-kazen-table-order-badge='1']")
      if (badge) {
        badge.style.setProperty("min-width", "1.05rem", "important")
        badge.style.setProperty("height", "1.05rem", "important")
        badge.style.setProperty("font-size", ".58rem", "important")
        badge.style.setProperty("margin-left", ".15rem", "important")
      }
    }

    ;[0, 50, 120, 260, 600, 1200, 2200].forEach((ms) => {
      timers.push(window.setTimeout(compact, ms))
    })

    const observer = new MutationObserver(compact)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      cancelled = true
      timers.forEach((timer) => window.clearTimeout(timer))
      observer.disconnect()
    }
  }, [showTableOrder, tableOrderCount])



  // PMD_FIX_KAZEN_DOCK_RESET_WHEN_TABLE_ORDER_HIDDEN_20260613
  // When Table Order disappears after payment, remove the injected button and restore the dock to 3 actions.
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return

    let cancelled = false
    const timers: number[] = []

    const resetOrCompactDock = () => {
      if (cancelled) return

      const frame = document.getElementById("pmd-kazen-japanese-frame") as HTMLIFrameElement | null
      const doc = frame?.contentDocument || frame?.contentWindow?.document
      if (!doc?.body) return

      const injected = doc.querySelector<HTMLElement>('[data-pmd-kazen-table-order-injected="1"]')
      const buttons = Array.from(doc.querySelectorAll<HTMLButtonElement>("button"))
      const checkoutButton =
        buttons.find((button) => button.getAttribute("data-primary") === "true") ||
        buttons.find((button) => /checkout|pay|order/i.test(button.textContent || ""))

      const dock =
        injected?.parentElement ||
        checkoutButton?.parentElement ||
        doc.querySelector<HTMLElement>(".kazen-dock, .kazen-bottom, .kazen-actions, footer")

      if (!dock) return

      if (!showTableOrder) {
        injected?.remove()

        dock.style.setProperty("display", "grid", "important")
        dock.style.setProperty("grid-template-columns", "repeat(3, minmax(0, 1fr))", "important")
        dock.style.setProperty("gap", ".8rem", "important")
        dock.style.setProperty("align-items", "stretch", "important")
        dock.style.setProperty("width", "100%", "important")
        dock.style.setProperty("max-width", "100%", "important")

        Array.from(dock.querySelectorAll<HTMLElement>("button")).forEach((btn) => {
          if (btn.getAttribute("data-pmd-kazen-table-order-injected") === "1") return

          btn.style.setProperty("min-width", "0", "important")
          btn.style.setProperty("width", "100%", "important")
          btn.style.setProperty("height", "3.72rem", "important")
          btn.style.setProperty("min-height", "3.72rem", "important")
          btn.style.setProperty("padding", ".48rem .36rem", "important")
        })

        return
      }

      // Table Order active: force 4 equal actions in one row.
      dock.style.setProperty("display", "grid", "important")
      dock.style.setProperty("grid-template-columns", "repeat(4, minmax(0, 1fr))", "important")
      dock.style.setProperty("gap", ".58rem", "important")
      dock.style.setProperty("align-items", "stretch", "important")
      dock.style.setProperty("width", "100%", "important")
      dock.style.setProperty("max-width", "100%", "important")
    }

    ;[0, 60, 160, 360, 720, 1200, 2200].forEach((ms) => {
      timers.push(window.setTimeout(resetOrCompactDock, ms))
    })

    const observer = new MutationObserver(resetOrCompactDock)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })

    return () => {
      cancelled = true
      timers.forEach((timer) => window.clearTimeout(timer))
      observer.disconnect()
    }
  }, [showTableOrder, tableOrderCount])


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

// PMD_ADD_KAZEN_TABLE_ORDER_BOTTOM_BUTTON_FIXED_20260613 bridge patched

// PMD_FIX_KAZEN_TABLE_ORDER_NO_STYLE_JUMP_20260613

// PMD_POLISH_KAZEN_TABLE_ORDER_FRAME_HEIGHT_20260613

// PMD_FIX_KAZEN_DOCK_RESET_WHEN_TABLE_ORDER_HIDDEN_20260613
