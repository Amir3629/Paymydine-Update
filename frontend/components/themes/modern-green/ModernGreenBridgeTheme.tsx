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


  // PMD_MODERN_GREEN_TABLE_ORDER_BRIDGE_INJECT_20260613
  // Modern Green iframe owns its dock, so inject Table Order action into that iframe.
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return

    let cancelled = false
    const timers: number[] = []

    const paintButton = (btn: HTMLButtonElement) => {
      btn.style.setProperty("min-height", "52px", "important")
      btn.style.setProperty("display", "inline-flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("gap", "6px", "important")
      btn.style.setProperty("padding", "10px 12px", "important")
      btn.style.setProperty("border", "1px solid rgba(41, 188, 126, .45)", "important")
      btn.style.setProperty("background", "rgba(3, 5, 4, .92)", "important")
      btn.style.setProperty("background-color", "rgba(3, 5, 4, .92)", "important")
      btn.style.setProperty("color", "#eafff4", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#eafff4", "important")
      btn.style.setProperty("font-size", "11px", "important")
      btn.style.setProperty("font-weight", "800", "important")
      btn.style.setProperty("letter-spacing", ".12em", "important")
      btn.style.setProperty("text-transform", "uppercase", "important")
      btn.style.setProperty("border-radius", "14px", "important")
      btn.style.setProperty("box-shadow", "0 12px 28px rgba(0,0,0,.22)", "important")
      btn.style.setProperty("white-space", "nowrap", "important")
      btn.style.setProperty("cursor", "pointer", "important")
    }

    const ensure = () => {
      if (cancelled) return

      const frame = document.getElementById("pmd-modern-green-frame") as HTMLIFrameElement | null
      const doc = frame?.contentDocument || frame?.contentWindow?.document
      if (!doc?.body) return

      const existing = doc.querySelector<HTMLButtonElement>('[data-pmd-modern-green-table-order-injected="1"]')

      if (!showTableOrder) {
        existing?.remove()
        return
      }

      const buttons = Array.from(doc.querySelectorAll<HTMLButtonElement>("button"))
      const checkoutButton =
        buttons.find((button) => /checkout|cart|pay|order/i.test(button.textContent || "") || /checkout|cart|pay|order/i.test(button.getAttribute("aria-label") || "")) ||
        buttons[buttons.length - 1]

      const dock =
        checkoutButton?.parentElement ||
        doc.querySelector<HTMLElement>("[data-pmd-modern-green-dock], .modern-green-dock, .bottom-actions, footer") ||
        doc.body

      let btn = existing
      if (!btn) {
        btn = doc.createElement("button")
        btn.type = "button"
        btn.className = "pmd-modern-green-table-order"
        btn.setAttribute("data-pmd-modern-green-table-order-injected", "1")
        btn.setAttribute("data-pmd-table-order-action", "1")
        btn.setAttribute("aria-label", "Table order")
        btn.addEventListener("click", (event) => {
          event.preventDefault()
          event.stopPropagation()
          void onTableOrder?.()
        })

        if (checkoutButton?.parentElement) {
          checkoutButton.parentElement.insertBefore(btn, checkoutButton)
        } else {
          dock.appendChild(btn)
        }
      }

      const count = Number(tableOrderCount || 0)
      btn.innerHTML = count > 0
        ? `Table order <b data-pmd-modern-green-table-order-badge="1">${count}</b>`
        : "Table order"

      paintButton(btn)

      const badge = btn.querySelector<HTMLElement>("b")
      if (badge) {
        badge.style.setProperty("min-width", "18px", "important")
        badge.style.setProperty("height", "18px", "important")
        badge.style.setProperty("display", "inline-flex", "important")
        badge.style.setProperty("align-items", "center", "important")
        badge.style.setProperty("justify-content", "center", "important")
        badge.style.setProperty("border-radius", "999px", "important")
        badge.style.setProperty("background", "#29bc7e", "important")
        badge.style.setProperty("color", "#03110b", "important")
        badge.style.setProperty("-webkit-text-fill-color", "#03110b", "important")
        badge.style.setProperty("font-size", "11px", "important")
        badge.style.setProperty("letter-spacing", "0", "important")
      }

      // Keep 4 action buttons in one row when possible.
      const dockButtons = Array.from(dock.querySelectorAll<HTMLElement>("button"))
      if (dockButtons.length >= 4) {
        dock.style.setProperty("display", "grid", "important")
        dock.style.setProperty("grid-template-columns", "repeat(4, minmax(0, 1fr))", "important")
        dock.style.setProperty("gap", "8px", "important")
        dockButtons.forEach((button) => {
          button.style.setProperty("min-width", "0", "important")
          button.style.setProperty("width", "100%", "important")
          button.style.setProperty("white-space", "normal", "important")
        })
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
        const frame = document.getElementById("pmd-modern-green-frame") as HTMLIFrameElement | null
        const doc = frame?.contentDocument || frame?.contentWindow?.document
        doc?.querySelector('[data-pmd-modern-green-table-order-injected="1"]')?.remove()
      } catch {}
    }
  }, [onTableOrder, showTableOrder, tableOrderCount])



  // PMD_POLISH_MODERN_GREEN_TABLE_ORDER_ICON_ACTION_20260613
  // Visual only: no separate frame for Table Order, same style family as Waiter / Note.
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return

    let cancelled = false
    const timers: number[] = []

    const iconSvg = `
      <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </svg>
    `

    const polish = () => {
      if (cancelled) return

      const frame = document.getElementById("pmd-modern-green-frame") as HTMLIFrameElement | null
      const doc = frame?.contentDocument || frame?.contentWindow?.document
      if (!doc?.body) return

      const btn = doc.querySelector<HTMLButtonElement>('[data-pmd-modern-green-table-order-injected="1"]')
      if (!btn) return

      const count = Number(tableOrderCount || 0)
      btn.innerHTML = `
        <span data-pmd-modern-green-table-order-icon="1">${iconSvg}</span>
        <span data-pmd-modern-green-table-order-label="1">Table<br/>Order</span>
        ${count > 0 ? `<b data-pmd-modern-green-table-order-badge="1">${count}</b>` : ""}
      `

      btn.style.setProperty("background", "transparent", "important")
      btn.style.setProperty("background-color", "transparent", "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", "0", "important")
      btn.style.setProperty("box-shadow", "none", "important")
      btn.style.setProperty("outline", "0", "important")
      btn.style.setProperty("min-width", "0", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("height", "54px", "important")
      btn.style.setProperty("min-height", "54px", "important")
      btn.style.setProperty("padding", "4px 2px", "important")
      btn.style.setProperty("display", "inline-flex", "important")
      btn.style.setProperty("flex-direction", "column", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("gap", "3px", "important")
      btn.style.setProperty("position", "relative", "important")
      btn.style.setProperty("font-size", "13px", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("line-height", "1.05", "important")
      btn.style.setProperty("letter-spacing", ".01em", "important")
      btn.style.setProperty("text-transform", "none", "important")
      btn.style.setProperty("color", "rgba(235, 255, 244, .78)", "important")
      btn.style.setProperty("-webkit-text-fill-color", "rgba(235, 255, 244, .78)", "important")
      btn.style.setProperty("white-space", "normal", "important")

      btn.querySelectorAll<HTMLElement>("svg, svg *, [data-pmd-modern-green-table-order-icon='1'], [data-pmd-modern-green-table-order-label='1']").forEach((el) => {
        el.style.setProperty("color", "rgba(235, 255, 244, .78)", "important")
        el.style.setProperty("stroke", "rgba(235, 255, 244, .78)", "important")
        el.style.setProperty("-webkit-text-fill-color", "rgba(235, 255, 244, .78)", "important")
      })

      const badge = btn.querySelector<HTMLElement>("[data-pmd-modern-green-table-order-badge='1']")
      if (badge) {
        badge.style.setProperty("position", "absolute", "important")
        badge.style.setProperty("top", "4px", "important")
        badge.style.setProperty("right", "14px", "important")
        badge.style.setProperty("min-width", "18px", "important")
        badge.style.setProperty("height", "18px", "important")
        badge.style.setProperty("display", "inline-flex", "important")
        badge.style.setProperty("align-items", "center", "important")
        badge.style.setProperty("justify-content", "center", "important")
        badge.style.setProperty("border-radius", "999px", "important")
        badge.style.setProperty("background", "#29bc7e", "important")
        badge.style.setProperty("color", "#03110b", "important")
        badge.style.setProperty("-webkit-text-fill-color", "#03110b", "important")
        badge.style.setProperty("font-size", "11px", "important")
        badge.style.setProperty("font-weight", "900", "important")
        badge.style.setProperty("letter-spacing", "0", "important")
      }

      const dock = btn.parentElement as HTMLElement | null
      if (dock) {
        dock.style.setProperty("grid-template-columns", "repeat(4, minmax(0, 1fr))", "important")
        dock.style.setProperty("gap", "8px", "important")
      }
    }

    ;[0, 40, 90, 180, 360, 720, 1200, 2200].forEach((ms) => {
      timers.push(window.setTimeout(polish, ms))
    })

    const observer = new MutationObserver(polish)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })

    return () => {
      cancelled = true
      timers.forEach((timer) => window.clearTimeout(timer))
      observer.disconnect()
    }
  }, [tableOrderCount, showTableOrder])


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
