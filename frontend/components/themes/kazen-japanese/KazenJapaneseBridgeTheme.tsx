"use client"

import { useEffect, type ReactNode, useRef, useState } from "react"

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
  menuLayout?: "accordion" | "tabs"
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

function rawImageValue(value: any): string {
  if (!value) return ""
  if (typeof value === "string") return value
  return String(value?.url ?? value?.path ?? value?.image_path ?? value?.image ?? value?.src ?? value?.thumb ?? value?.thumbnail ?? "")
}

function itemImageList(item: any): string[] {
  const values: any[] = []
  const push = (value: any) => {
    if (!value) return
    if (Array.isArray(value)) {
      value.forEach(push)
      return
    }
    const raw = rawImageValue(value).trim()
    if (raw) values.push(raw)
  }

  push(item?.image)
  push(item?.image_url)
  push(item?.imageUrl)
  push(item?.image_path)
  push(item?.imagePath)
  push(item?.thumb)
  push(item?.thumbnail)
  push(item?.primary_image)
  push(item?.primaryImage)
  push(item?.images)
  push(item?.gallery)
  push(item?.additional_images)
  push(item?.additionalImages)
  push(item?.media)

  return Array.from(new Set(values))
}

function itemImage(item: any): string {
  return itemImageList(item)[0] || ""
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

function pmdKazenNormalizeMenuLayoutFromAdmin(value: unknown): "accordion" | "tabs" | "" {
  const raw = String(value || "").trim().toLowerCase().replace(/[_\s-]+/g, "-")

  if ([
    "tabs",
    "tab",
    "tabbed",
    "classic",
    "normal",
    "list",
    "flat",
    "category-tabs",
    "categories-top",
    "top-categories",
    "category-tabs-full-item-list",
  ].includes(raw)) {
    return "tabs"
  }

  if (["accordion", "accordions", "collapsed", "expandable", "category-accordion"].includes(raw)) {
    return "accordion"
  }

  return ""
}

function pmdKazenReadMenuLayoutFromPayload(payload: any): "accordion" | "tabs" | "" {
  const keys = [
    "kazen_menu_layout",
    "kazenMenuLayout",
    "menu_layout",
    "menuLayout",
    "food_display_style",
    "foodDisplayStyle",
    "category_display",
    "categoryDisplay",
  ]

  const sources = [
    payload,
    payload?.data,
    payload?.settings,
    payload?.theme,
    payload?.theme?.data,
    payload?.theme?.settings,
    payload?.frontend_theme,
    payload?.frontendTheme,
    payload?.attributes,
    payload?.values,
  ]

  for (const source of sources) {
    if (!source || typeof source !== "object") continue

    for (const key of keys) {
      const normalized = pmdKazenNormalizeMenuLayoutFromAdmin(source?.[key])
      if (normalized) return normalized
    }
  }

  return ""
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
  menuLayout = "accordion",
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

  // PMD_KAZEN_HEADER_LINKS_PARENT_BRIDGE_V6
  // Parent-side permanent version of the browser-console fix.
  // The Kazen menu lives in a same-origin iframe; this scans that iframe and fixes the two new buttons there.
  useEffect(() => {
    if (typeof window === "undefined") return

    let cancelled = false
    let frame = 0
    const timers: number[] = []
    let observer: MutationObserver | null = null

    const fixDocument = (doc: Document, documentIndex: number) => {
      const links =
        doc.querySelector<HTMLElement>(".pmd-kazen-header-links-v4") ||
        doc.querySelector<HTMLElement>(".pmd-kazen-header-links")

      const header =
        doc.querySelector<HTMLElement>("header") ||
        links?.closest<HTMLElement>("section") ||
        links?.parentElement

      if (!links || !header) return false

      header.style.setProperty("position", "relative", "important")

      if (!header.contains(links)) {
        header.appendChild(links)
      }

      const topButtons = Array.from(header.querySelectorAll<HTMLElement>("a,button"))
        .filter((el) => !links.contains(el))
        .map((el) => ({ el, rect: el.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width >= 40 && rect.height >= 40)
        .sort((a, b) => a.rect.top - b.rect.top)
        .slice(0, 3)

      const headerRect = header.getBoundingClientRect()
      const measuredSize = topButtons[0]?.rect?.width ? Math.round(topButtons[0].rect.width) : 82
      const finalSize = Math.max(72, Math.min(86, measuredSize))

      const rowRight = topButtons.length
        ? Math.max(...topButtons.map(({ rect }) => rect.right))
        : headerRect.right

      const rowBottom = topButtons.length
        ? Math.max(...topButtons.map(({ rect }) => rect.bottom))
        : headerRect.top + finalSize

      const right = Math.max(0, Math.round(headerRect.right - rowRight))
      const top = Math.round(rowBottom - headerRect.top + 12)

      links.classList.add("pmd-kazen-bridge-fixed-links-v6")
      links.style.setProperty("position", "absolute", "important")
      links.style.setProperty("top", `${top}px`, "important")
      links.style.setProperty("right", `${right}px`, "important")
      links.style.setProperty("display", "flex", "important")
      links.style.setProperty("flex-direction", "row", "important")
      links.style.setProperty("gap", "12px", "important")
      links.style.setProperty("align-items", "center", "important")
      links.style.setProperty("justify-content", "flex-end", "important")
      links.style.setProperty("margin", "0", "important")
      links.style.setProperty("padding", "0", "important")
      links.style.setProperty("width", "auto", "important")
      links.style.setProperty("height", "auto", "important")
      links.style.setProperty("z-index", "999999", "important")

      const linkButtons = Array.from(links.querySelectorAll<HTMLElement>("a,button"))
      linkButtons.forEach((btn) => {
        btn.className = "pmd-kazen-bridge-fixed-header-link-v6"

        btn.style.setProperty("all", "unset", "important")
        btn.style.setProperty("box-sizing", "border-box", "important")
        btn.style.setProperty("width", `${finalSize}px`, "important")
        btn.style.setProperty("height", `${finalSize}px`, "important")
        btn.style.setProperty("min-width", `${finalSize}px`, "important")
        btn.style.setProperty("min-height", `${finalSize}px`, "important")
        btn.style.setProperty("max-width", `${finalSize}px`, "important")
        btn.style.setProperty("max-height", `${finalSize}px`, "important")
        btn.style.setProperty("flex", `0 0 ${finalSize}px`, "important")
        btn.style.setProperty("display", "inline-flex", "important")
        btn.style.setProperty("align-items", "center", "important")
        btn.style.setProperty("justify-content", "center", "important")
        btn.style.setProperty("border", "1px solid rgba(36,35,32,.22)", "important")
        btn.style.setProperty("border-radius", "0", "important")
        btn.style.setProperty("background", "transparent", "important")
        btn.style.setProperty("box-shadow", "none", "important")
        btn.style.setProperty("cursor", "pointer", "important")
        btn.style.setProperty("color", "#242320", "important")
        btn.style.setProperty("-webkit-text-fill-color", "#242320", "important")
        btn.style.setProperty("text-decoration", "none", "important")
        btn.style.setProperty("overflow", "hidden", "important")

        btn.querySelectorAll<SVGElement>("svg").forEach((svg) => {
          svg.style.setProperty("width", "24px", "important")
          svg.style.setProperty("height", "24px", "important")
          svg.style.setProperty("min-width", "24px", "important")
          svg.style.setProperty("min-height", "24px", "important")
          svg.style.setProperty("max-width", "24px", "important")
          svg.style.setProperty("max-height", "24px", "important")
          svg.style.setProperty("stroke-width", "2", "important")
        })

        btn.querySelectorAll<HTMLElement>("span").forEach((span) => {
          span.style.setProperty("position", "absolute", "important")
          span.style.setProperty("width", "1px", "important")
          span.style.setProperty("height", "1px", "important")
          span.style.setProperty("overflow", "hidden", "important")
          span.style.setProperty("clip", "rect(0 0 0 0)", "important")
          span.style.setProperty("white-space", "nowrap", "important")
        })
      })

      ;(window as any).__PMD_KAZEN_HEADER_LINKS_PARENT_BRIDGE_V6 = {
        documentIndex,
        finalSize,
        top,
        right,
        buttons: linkButtons.length,
      }

      return true
    }

    const fixAll = () => {
      if (cancelled) return
      if (frame) window.cancelAnimationFrame(frame)

      frame = window.requestAnimationFrame(() => {
        let fixed = false

        try {
          fixed = fixDocument(document, 0) || fixed
        } catch {
          // ignore
        }

        Array.from(document.querySelectorAll<HTMLIFrameElement>("iframe")).forEach((iframe, index) => {
          try {
            if (iframe.contentDocument) {
              fixed = fixDocument(iframe.contentDocument, index + 1) || fixed
            }
          } catch {
            // Cross-origin iframes like Stripe are expected and ignored.
          }
        })

        if (fixed) {
          ;(window as any).__PMD_KAZEN_HEADER_LINKS_PARENT_BRIDGE_V6_LAST_RUN = Date.now()
        }
      })
    }

    fixAll()
    timers.push(window.setTimeout(fixAll, 120))
    timers.push(window.setTimeout(fixAll, 450))
    timers.push(window.setTimeout(fixAll, 1100))
    timers.push(window.setTimeout(fixAll, 2200))
    timers.push(window.setInterval(fixAll, 800))

    window.addEventListener("resize", fixAll)
    window.addEventListener("orientationchange", fixAll)

    if (document.body) {
      observer = new MutationObserver(fixAll)
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "src"],
      })
    }

    return () => {
      cancelled = true
      if (frame) window.cancelAnimationFrame(frame)
      timers.forEach((timer) => window.clearTimeout(timer))
      observer?.disconnect()
      window.removeEventListener("resize", fixAll)
      window.removeEventListener("orientationchange", fixAll)
    }
  }, [])

  const [pmdKazenResolvedMenuLayout, setPmdKazenResolvedMenuLayout] = useState<"accordion" | "tabs">(
    pmdKazenNormalizeMenuLayoutFromAdmin(menuLayout) || "accordion"
  )

  useEffect(() => {
    const fromProp = pmdKazenNormalizeMenuLayoutFromAdmin(menuLayout)
    if (fromProp) setPmdKazenResolvedMenuLayout(fromProp)
  }, [menuLayout])

  useEffect(() => {
    if (typeof window === "undefined") return

    let cancelled = false

    const readMenuLayout = async () => {
      // PMD_KAZEN_BRIDGE_SIMPLE_THEME_ONLY_V5
      const endpoints = [
        `/simple-theme?ts=${Date.now()}`,
      ]

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            credentials: "same-origin",
            cache: "no-store",
            headers: { Accept: "application/json" },
          })

          if (!res.ok) continue

          const payload = await res.json()
          const nextLayout = pmdKazenReadMenuLayoutFromPayload(payload)
          console.info("PMD_KAZEN_MENU_LAYOUT_VALUE", nextLayout || null, endpoint)

          console.info("PMD_KAZEN_MENU_LAYOUT_FROM_API", {
            endpoint,
            nextLayout: nextLayout || null,
            hasKazenMenuLayout: Boolean(
              payload?.kazen_menu_layout ||
              payload?.data?.kazen_menu_layout ||
              payload?.settings?.kazen_menu_layout ||
              payload?.theme?.settings?.kazen_menu_layout
            ),
          })

          if (nextLayout && !cancelled) {
            setPmdKazenResolvedMenuLayout(nextLayout)
            ;(window as any).__PMD_KAZEN_MENU_LAYOUT = nextLayout
            window.dispatchEvent(new Event("PMD_KAZEN_FORCE_SYNC"))
            return
          }
        } catch {
          // try next endpoint
        }
      }
    }

    void readMenuLayout()

    return () => {
      cancelled = true
    }
  }, [])

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
        menuLayout: pmdKazenResolvedMenuLayout,
        kazen_menu_layout: pmdKazenResolvedMenuLayout,
        categories,
        items: sourceItems.map((item) => ({
          id: itemId(item),
          name: itemName(item),
          description: itemDescription(item),
          price: Number(item?.price || 0),
          category: String(item?.category || item?.category_name || "Menu"),
          image: itemImage(item),
          images: itemImageList(item),
          gallery: Array.isArray(item?.gallery) ? item.gallery : [],
          additional_images: Array.isArray(item?.additional_images) ? item.additional_images : [],
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
    pmdKazenResolvedMenuLayout,
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




