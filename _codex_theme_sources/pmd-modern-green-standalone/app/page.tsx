"use client"

import React from "react"
import { useEffect, useMemo, useState } from "react"




// PMD_SINGLE_FOOTER_LOGO_CLEAN_FINAL_20260611

// PMD_FOOTER_USE_DARK_LOGO_BY_REAL_CANVAS_20260611
function pmdFooterUseDarkLogo() {
  if (typeof window === "undefined" || typeof document === "undefined") return false

  const parseRgb = (value: string) => {
    const match = String(value || "").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
    if (!match) return null
    const r = Number(match[1])
    const g = Number(match[2])
    const b = Number(match[3])
    return (0.2126 * r) + (0.7152 * g) + (0.0722 * b)
  }

  const candidates = [
    getComputedStyle(document.body).backgroundColor,
    getComputedStyle(document.documentElement).backgroundColor,
    getComputedStyle(document.querySelector("main") || document.body).backgroundColor,
  ]

  const luminance = candidates.map(parseRgb).find((v) => typeof v === "number")
  return typeof luminance === "number" ? luminance < 105 : false
}

function pmdInstallSinglePayMyDineFooterLogo() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {}

  const forcedKind = "modern-green"
  const lightLogo = "/assets/media/uploads/PMD.png?v=1780008763"
  const darkLogo = "/assets/media/uploads/PMDD.png?v=1780008763"
  const finalSelector = '[data-pmd-single-footer-logo="1"]'

  const oldSelectors = [
    '[data-pmd-menu-footer-logo="1"]',
    '[data-pmd-shared-paymydine-footer-logo="1"]',
    '[data-pmd-shared-footer-logo="1"]',
    '.pmd-menu-theme-footer-logo',
    '.pmd-shared-paymydine-footer-logo',
    '.pmd-paymydine-footer-logo',
    '.pmd-footer-paymydine-logo'
  ].join(',')

  const themeText = () => {
    const chunks = []
    try {
      chunks.push(document.documentElement.getAttribute("data-theme") || "")
      chunks.push(document.body.getAttribute("data-theme") || "")
      chunks.push(document.documentElement.getAttribute("data-mode") || "")
      chunks.push(document.body.getAttribute("data-mode") || "")
      chunks.push(document.documentElement.className || "")
      chunks.push(document.body.className || "")
    } catch {}
    return chunks.join(" ").toLowerCase()
  }

  const isKazen = () => themeText().includes("kazen") || Boolean(document.querySelector("#pmd-kazen-japanese-frame, .kazen-page"))
  const isOrganic = () => String(forcedKind) === "organic" || themeText().includes("organic") || themeText().includes("botanical") || Boolean(document.querySelector('[class*="organic"], [class*="botanical"], [data-pmd-organic]'))
  const isModernGreen = () => themeText().includes("modern_green") || themeText().includes("modern-green") || Boolean(document.querySelector('[class*="modern-green"], [class*="modernGreen"], [data-pmd-modern], [data-pmd-mg-button-v2]'))

  const isTarget = () => String(forcedKind) !== "auto" || isOrganic() || isModernGreen()
  const kind = () => isOrganic() ? "organic" : "modern-green"

  const isExplicitDark = () => {
    const html = document.documentElement
    const body = document.body
    const attrs = [
      html.getAttribute("data-mode"),
      body.getAttribute("data-mode"),
      html.getAttribute("data-color-mode"),
      body.getAttribute("data-color-mode"),
      html.getAttribute("data-appearance"),
      body.getAttribute("data-appearance"),
    ].map((v) => String(v || "").toLowerCase())

    if (html.classList.contains("dark") || body.classList.contains("dark")) return true
    if (attrs.some((v) => v === "dark")) return true

    try {
      for (const storage of [window.localStorage, window.sessionStorage]) {
        for (let i = 0; i < storage.length; i += 1) {
          const key = String(storage.key(i) || "").toLowerCase()
          if (!/mode|appearance|color-scheme|color_mode|dark/.test(key)) continue
          const value = String(storage.getItem(storage.key(i) || "") || "").toLowerCase().trim()
          if (value === "dark") return true
          if (/dark/.test(key) && value === "true") return true
        }
      }
    } catch {}

    return false
  }

  const ensureStyle = () => {
    if (document.getElementById("pmd-single-footer-logo-style")) return

    const style = document.createElement("style")
    style.id = "pmd-single-footer-logo-style"
    style.textContent = `

/* PMD_FOOTER_EXTRA_GAP_CSS_20260611 */
html body .pmd-single-footer-logo[data-theme-kind="organic"] {
  position: relative !important;
  z-index: 1 !important;
  clear: both !important;
  margin: 96px auto 150px !important;
}

html body .pmd-single-footer-logo[data-theme-kind="modern-green"] {
  position: relative !important;
  z-index: 1 !important;
  clear: both !important;
  margin: 84px auto 150px !important;
}

html body .pmd-single-footer-logo img {
  width: 82px !important;
  max-width: 82px !important;
  height: auto !important;
  object-fit: contain !important;
}


      .pmd-single-footer-logo {
        width: 100% !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        margin: 110px auto 160px !important;
        padding: 0 16px !important;
        opacity: 1 !important;
        filter: none !important;
        pointer-events: none !important;
        position: relative !important;
        z-index: 1 !important;
        clear: both !important;
      }

      .pmd-single-footer-logo img {
        display: block !important;
        width: 82px !important;
        max-width: 82px !important;
        min-width: 82px !important;
        height: auto !important;
        object-fit: contain !important;
        opacity: 1 !important;
        filter: none !important;
        mix-blend-mode: normal !important;
      }

      .pmd-single-footer-logo[data-theme-kind="organic"] {
        margin-top: 135px !important;
        margin-bottom: 190px !important;
      }

      .pmd-single-footer-logo[data-theme-kind="modern-green"] {
        margin-top: 120px !important;
        margin-bottom: 170px !important;
      }
    `
    document.head.appendChild(style)
  }

  const cleanup = (keep: Element | null) => {
    document.querySelectorAll(oldSelectors).forEach((el) => {
      if (el !== keep) el.remove()
    })

    document.querySelectorAll('img[src*="/PMD.png"], img[src*="/PMDD.png"]').forEach((img) => {
      if (img.closest(finalSelector)) return
      if (img.closest(".kazen-paymydine-footer-logo")) return

      const parent = img.parentElement
      if (parent && parent.children.length <= 1 && /pmd|paymydine|footer|logo/i.test(parent.className || "")) parent.remove()
      else img.remove()
    })

    const logos = Array.from(document.querySelectorAll(finalSelector))
    logos.forEach((el, idx) => {
      if (idx > 0 && el !== keep) el.remove()
    })
  }

  let queued = false

  const ensure = () => {
    if (queued) return
    queued = true

    window.requestAnimationFrame(() => {
      queued = false
      ensureStyle()

      if (isKazen() || !isTarget()) {
        cleanup(null)
        return
      }

      const target = document.querySelector("main") || document.querySelector('[role="main"]') || document.body
      let footer = document.querySelector(finalSelector)

      if (!footer) {
        footer = document.createElement("div")
        footer.className = "pmd-single-footer-logo"
        footer.setAttribute("data-pmd-single-footer-logo", "1")
        footer.innerHTML = '<img alt="PayMyDine" />'
      }

      footer.setAttribute("data-theme-kind", kind())

      const img = footer.querySelector("img") as HTMLImageElement | null
      if (!img) return
      img.src = pmdFooterUseDarkLogo() ? darkLogo : lightLogo
      img.alt = "PayMyDine"

      cleanup(footer)
      target.appendChild(footer)
    })
  }

  ensure()

  const timers = [
    window.setTimeout(ensure, 200),
    window.setTimeout(ensure, 700),
    window.setTimeout(ensure, 1500),
    window.setTimeout(ensure, 3000),
  ]

  const observer = new MutationObserver(ensure)
  observer.observe(document.body, { childList: true, subtree: true, attributes: true })

  return () => {
    timers.forEach((timer) => window.clearTimeout(timer))
    observer.disconnect()
  }
}


import {
  ModernGreenItemDetailCard,
  ModernGreenMenuSections,
  ModernGreenMenuShell,
  ModernGreenNoteCard,
  ModernGreenOrderReviewCard,
  ModernGreenPaymentCard,
  ModernGreenThemeActions,
  ModernGreenValetCard,
  ModernGreenValetSuccessCard,
  ModernGreenWaiterCard,
  ThemeModal,
  type CartLine,
  type MenuCategory,
  type MenuItem,
  type MenuSection,
  type OrderTotals,
  type PaymentMethodOption,
  type ThemeMode,
  type TipOption,
  type ValetFormValues,
} from "@/components/themes/modern-green"

type LiveItem = {
  id: string | number
  name?: string
  menu_name?: string
  title?: string
  description?: string
  menu_description?: string
  price?: number | string
  category?: string
  category_name?: string
  image?: string
  image_url?: string
  thumb?: string
  thumbnail?: string
  images?: any[]
  is_bestseller?: boolean
  is_recommended?: boolean
}

type LiveCartLine = {
  id: string
  name: string
  unitPrice: number
  quantity: number
  imageUrl?: string
}

type LivePayload = {
  restaurantName?: string
  restaurantLogoUrl?: string
  tableNumber?: string | number | null
  categories?: string[]
  items?: LiveItem[]
  cart?: {
    count?: number
    total?: number
    lastItemName?: string
    lastItemPrice?: number
    lines?: LiveCartLine[]
  }
}

const emptyPayload: LivePayload = {
  restaurantName: "Verdant",
  restaurantLogoUrl: "",
  tableNumber: null,
  categories: ["All"],
  items: [],
  cart: { count: 0, total: 0, lines: [] },
}

function post(type: string, payload: Record<string, any> = {}) {
  if (typeof window === "undefined") return
  window.parent?.postMessage({ type, ...payload }, window.location.origin)
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function safeId(value: unknown) {
  return String(value ?? "").trim()
}

function itemName(item: LiveItem) {
  return String(item.name || item.menu_name || item.title || "Menu item")
}

function itemDescription(item: LiveItem) {
  return String(item.description || item.menu_description || "")
}

function itemPrice(item: LiveItem) {
  return Number(item.price || 0)
}

function itemCategory(item: LiveItem) {
  return String(item.category || item.category_name || "Menu")
}

function imageOf(item: LiveItem) {
  const first = Array.isArray(item.images) && item.images[0] ? item.images[0] : null
  const raw =
    item.image ||
    item.image_url ||
    item.thumb ||
    item.thumbnail ||
    (first ? String(first?.url || first?.path || first?.image_path || first) : "")

  if (!raw) return "/newfrontend/images/hero-dish-dark.png"

  const value = String(raw)
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return value
  return `/${value.replace(/^\/+/, "")}`
}

function toThemeItem(item: LiveItem): MenuItem {
  const bestseller = Boolean(item.is_bestseller)
  const recommended = Boolean(item.is_recommended)

  return {
    id: safeId(item.id),
    name: itemName(item),
    description: itemDescription(item),
    price: itemPrice(item),
    imageUrl: imageOf(item),
    badge: bestseller
      ? { label: "Bestseller", tone: "accent" }
      : recommended
        ? { label: "Signature", tone: "accent" }
        : undefined,
  }
}

function normalizeTableLabel(value: LivePayload["tableNumber"]) {
  const raw = String(value ?? "").trim()
  if (!raw || raw === "0" || raw.toLowerCase() === "delivery" || raw.toLowerCase() === "null") {
    return "Delivery"
  }
  return raw.toLowerCase().startsWith("table") ? raw.replace(/^table\s*/i, "") : raw
}

function normalizeLogoUrl(value: unknown) {
  const raw = String(value || "").trim()
  if (!raw || raw === "undefined" || raw === "null") return ""

  if (/^https?:\/\//i.test(raw)) return raw

  const clean = raw.replace(/^\/+/, "")
  const filename = clean.split("/").filter(Boolean).pop() || clean

  if (clean.startsWith("assets/media/uploads/")) return `/${clean}`
  if (clean.startsWith("uploads/")) return `/assets/media/${clean}`
  if (!clean.includes("/")) return `/assets/media/uploads/${filename}`
  if (clean.startsWith("assets/media/")) return `/assets/media/uploads/${filename}`

  return `/${clean}`
}

export default function Page() {
  // PMD_SINGLE_FOOTER_LOGO_CALL_CLEAN_FINAL_20260611

const [payload, setPayload] = useState<LivePayload>(emptyPayload)
  const [backendLogoUrl, setBackendLogoUrl] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [search, setSearch] = useState("")
  const [mode, setMode] = useState<ThemeMode>("dark")
  const [activePanel, setActivePanel] = useState<null | "waiter" | "waiter-success" | "note" | "note-success" | "checkout" | "payment" | "valet" | "valet-success">(null)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [note, setNote] = useState("")
  const [valetValues, setValetValues] = useState<ValetFormValues>({ name: "", licensePlate: "", carModel: "" })
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("card")
  const [selectedTipId, setSelectedTipId] = useState("none")
  const [customTip, setCustomTip] = useState("")
  const [couponValue, setCouponValue] = useState("")
  const [paymentContact, setPaymentContact] = useState({ cardholderName: "", email: "", phone: "" })

useEffect(() => {
    // PMD_MODERN_GREEN_STANDALONE_RECEIVER_20260611
    const handleMessage = (event: MessageEvent) => {
      if (event.origin && event.origin !== window.location.origin) return

      const raw = event.data || {}
      const msg = (raw && typeof raw === "object") ? raw as Record<string, any> : {}
      const merged = (msg.payload && typeof msg.payload === "object")
        ? { ...msg, ...msg.payload }
        : msg

      const allowedTypes = [
        "PMD_MODERN_GREEN_SYNC",
        "PAYMYDINE_MENU_SYNC",
        "PMD_MENU_SYNC",
      ]

      const hasItems =
        Array.isArray(merged.items) ||
        Array.isArray(merged.menuItems) ||
        Array.isArray(merged.sourceItems) ||
        Array.isArray(merged.menuData)

      if (!allowedTypes.includes(String(merged.type || "")) && !hasItems) return

      const incomingItems =
        Array.isArray(merged.items) ? merged.items :
        Array.isArray(merged.menuItems) ? merged.menuItems :
        Array.isArray(merged.sourceItems) ? merged.sourceItems :
        Array.isArray(merged.menuData) ? merged.menuData :
        []

      const incomingCategories =
        Array.isArray(merged.categories) && merged.categories.length
          ? merged.categories
          : Array.from(new Set(
              incomingItems
                .map((item: any) => String(item.category || item.category_name || "Menu").trim())
                .filter(Boolean)
            ))

      console.info("PMD_MODERN_GREEN_STANDALONE_RECEIVED", {
        type: merged.type,
        items: incomingItems.length,
        categories: incomingCategories.length,
      })

      setPayload({
        restaurantName: merged.restaurantName || merged.businessName || merged.restaurant_name || "Verdant",
        restaurantLogoUrl: normalizeLogoUrl(merged.logoUrl || merged.restaurantLogoUrl || merged.logo || merged.restaurant_logo || ""),
        tableNumber: merged.tableNumber ?? merged.table_no ?? merged.tableId ?? merged.table_id ?? null,
        categories: incomingCategories.length ? incomingCategories : ["Menu"],
        items: incomingItems,
        cart: merged.cart || { count: 0, total: 0, lines: [] },
      })
    }

    window.addEventListener("message", handleMessage)

    post("PMD_MODERN_GREEN_READY")
    const readyTimer = window.setTimeout(() => post("PMD_MODERN_GREEN_READY"), 250)
    const readyInterval = window.setInterval(() => post("PMD_MODERN_GREEN_READY"), 1200)

    return () => {
      window.removeEventListener("message", handleMessage)
      window.clearTimeout(readyTimer)
      window.clearInterval(readyInterval)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadLogoFromBackend() {
      try {
        const res = await fetch(`/api/v1/settings-wrapped?modernGreenLogo=${Date.now()}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        })
        const json = await res.json()
        const data = json?.data || json || {}
        const logo = normalizeLogoUrl(
          data.site_logo ||
          data.logoUrl ||
          data.logo_url ||
          data.logo ||
          data.restaurant_logo ||
          data.favicon_logo ||
          ""
        )

        if (!cancelled && logo) setBackendLogoUrl(logo)
      } catch {
        // Logo is optional; keep the header clean if not available.
      }
    }

    loadLogoFromBackend()

    return () => {
      cancelled = true
    }
  }, [])

  const tableLabel = normalizeTableLabel(payload.tableNumber)
  const liveItems = payload.items || []
  const cartCount = Number(payload.cart?.count || 0)
  const cartTotal = Number(payload.cart?.total || 0)
  const cartLines: CartLine[] = (payload.cart?.lines || []).map((line) => ({
    id: String(line.id),
    name: line.name,
    unitPrice: Number(line.unitPrice || 0),
    quantity: Number(line.quantity || 1),
    imageUrl: line.imageUrl,
  }))

  const categories: MenuCategory[] = useMemo(() => {
    const names = payload.categories?.length ? payload.categories : []
    const clean = names.filter(Boolean).filter((name) => name !== "All")
    return [
      { id: "all", label: "All" },
      ...clean.map((name) => ({ id: name, label: name })),
    ]
  }, [payload.categories])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()

    return liveItems.filter((item) => {
      const categoryOk = activeCategory === "all" || itemCategory(item) === activeCategory
      const queryOk = !q || `${itemName(item)} ${itemDescription(item)}`.toLowerCase().includes(q)
      return categoryOk && queryOk
    })
  }, [liveItems, activeCategory, search])

  const sections: MenuSection[] = useMemo(() => {
    const result: MenuSection[] = []

    if (activeCategory === "all") {
      const featured = filteredItems
        .filter((item) => item.is_bestseller || item.is_recommended)
        .slice(0, 2)

      if (featured.length) {
        result.push({
          id: "chefs-favorites",
          title: "Chef's Favorites",
          subtitle: "Hand-picked by our kitchen tonight",
          items: featured.map(toThemeItem),
        })
      }

      const grouped = new Map<string, LiveItem[]>()
      filteredItems.forEach((item) => {
        const cat = itemCategory(item)
        if (!grouped.has(cat)) grouped.set(cat, [])
        grouped.get(cat)!.push(item)
      })

      grouped.forEach((items, category) => {
        result.push({
          id: category.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "menu",
          title: category,
          items: items.map(toThemeItem),
        })
      })
    } else {
      result.push({
        id: activeCategory.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "menu",
        title: activeCategory,
        items: filteredItems.map(toThemeItem),
      })
    }

    return result
  }, [filteredItems, activeCategory])

  const heroImage = mode === "light" ? "/newfrontend/images/hero-dish-light.png" : "/newfrontend/images/hero-dish-dark.png"
  const checkoutLines = cartLines.length
    ? cartLines
    : cartCount > 0
      ? [{ id: "order", name: payload.cart?.lastItemName || "Current order", unitPrice: cartTotal, quantity: cartCount, imageUrl: undefined }]
      : []
  const selectedTip = selectedTipId === "five" ? cartTotal * 0.05 : selectedTipId === "ten" ? cartTotal * 0.10 : selectedTipId === "custom" ? Number(customTip || 0) : 0
  const totals: OrderTotals = { subtotal: cartTotal, tip: selectedTip || undefined, total: cartTotal + (selectedTip || 0) }

  const paymentMethods: PaymentMethodOption[] = [
    { id: "card", label: "Card", icon: "card" },
    { id: "paypal", label: "PayPal", icon: "paypal" },
    { id: "cash", label: "Cash", icon: "cash" },
  ]

  const tipOptions: TipOption[] = [
    { id: "none", label: "No tip", percent: 0 },
    { id: "five", label: "5%", percent: 5 },
    { id: "ten", label: "10%", percent: 10 },
    { id: "custom", label: "Custom", percent: null },
  ]

  return (
    <div className="modern-green-theme min-h-screen bg-[var(--mg-page-bg)]" data-mode={mode}>
      <ModernGreenMenuShell
        mode={mode}
        brandName={payload.restaurantName || "Verdant"}
        logoUrl={payload.restaurantLogoUrl || backendLogoUrl}
        tableLabel={tableLabel}
        languageLabel="Language"
        heroTitle={<>Ready to order?</>}
        heroSubtitle="Browse, choose, and send your order from the table."
        heroImageUrl={heroImage}
        categories={categories}
        activeCategory={activeCategory}
        searchValue={search}
        onSelectCategory={setActiveCategory}
        onSearchChange={setSearch}
        onOpenValet={() => setActivePanel("valet")}
        onOpenLanguage={() => post("PMD_MODERN_GREEN_LANGUAGE")}
        onSelectTable={() => post("PMD_MODERN_GREEN_TABLE")}
        onToggleMode={setMode}
      >
        {liveItems.length ? (
          <ModernGreenMenuSections
            sections={sections}
            formatPrice={formatEuro}
            onAddItem={(itemId) => post("PMD_MODERN_GREEN_ADD_ITEM", { itemId, quantity: 1 })}
            onSelectItem={(item) => setSelectedItem(item)}
          />
        ) : (
          <div className="mg-glass rounded-3xl p-5 text-center text-sm text-[var(--mg-text-soft)]">
            Loading PayMyDine menu…
          </div>
        )}
      </ModernGreenMenuShell>

      <ModernGreenThemeActions
        cartTotal={cartTotal}
        cartCount={cartCount}
        formatPrice={formatEuro}
        onCallWaiter={() => setActivePanel("waiter")}
        onOpenNote={() => setActivePanel("note")}
        onCheckout={() => post("PMD_MODERN_GREEN_CHECKOUT")}
      />

      <ThemeModal open={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem?.name} mode={mode}>
        {selectedItem && (
          <ModernGreenItemDetailCard
            item={selectedItem}
            formatPrice={formatEuro}
            onAddItem={(itemId) => {
              post("PMD_MODERN_GREEN_ADD_ITEM", { itemId, quantity: 1 })
              setSelectedItem(null)
            }}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </ThemeModal>

      <ThemeModal open={activePanel === "waiter"} onClose={() => setActivePanel(null)} title="Call waiter" mode={mode}>
        <ModernGreenWaiterCard
          tableLabel={tableLabel}
          onCallWaiter={() => { post("PMD_MODERN_GREEN_CALL_WAITER"); setActivePanel("waiter-success") }}
          onCancel={() => setActivePanel(null)}
        />
      </ThemeModal>

      <ThemeModal open={activePanel === "note"} onClose={() => setActivePanel(null)} title="Add a note" mode={mode}>
        <ModernGreenNoteCard
          value={note}
          onChange={setNote}
          onSubmit={() => {
            post("PMD_MODERN_GREEN_ADD_NOTE", { note })
            setNote("")
            setActivePanel("note-success")
          }}
          onCancel={() => setActivePanel(null)}
        />
      </ThemeModal>

            {/* PMD_MODERN_GREEN_WAITER_SUCCESS_PANEL_20260610 */}
      <ThemeModal open={activePanel === "waiter-success"} onClose={() => setActivePanel(null)} title="Waiter notified" mode={mode}>
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mg-green)] text-[var(--mg-on-green)]">
            ✓
          </div>
          <p className="text-sm font-semibold text-[var(--mg-text)]">Thanks, we’ve notified the staff.</p>
          <p className="text-xs text-[var(--mg-text-soft)]">Someone will come to your table shortly.</p>
          <button
            type="button"
            onClick={() => setActivePanel(null)}
            className="mt-2 w-full rounded-full bg-[var(--mg-green)] px-4 py-3 text-sm font-bold text-[var(--mg-on-green)]"
          >
            Done
          </button>
        </div>
      </ThemeModal>


      {/* PMD_MODERN_GREEN_WAITER_SUCCESS_PHASE8 */}
      <ThemeModal
        open={activePanel === "waiter-success"}
        onClose={() => setActivePanel(null)}
        title="Waiter called"
        mode={mode}
      >
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mg-green)] text-[var(--mg-on-green)] text-xl font-bold">
            ✓
          </div>
          <p className="text-sm font-semibold text-[var(--mg-text)]">
            A waiter will come to your table soon.
          </p>
          <p className="text-xs text-[var(--mg-text-soft)]">
            Thank you, your request has been sent successfully.
          </p>
          <button
            type="button"
            onClick={() => setActivePanel(null)}
            className="mt-2 w-full rounded-full bg-[var(--mg-green)] px-4 py-3 text-sm font-bold text-[var(--mg-on-green)]"
          >
            OK
          </button>
        </div>
      </ThemeModal>


      {/* PMD_MODERN_GREEN_WAITER_SUCCESS_FIXED_20260610 */}
      <ThemeModal
        open={activePanel === "waiter-success"}
        onClose={() => setActivePanel(null)}
        title="Waiter called"
        mode={mode}
      >
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mg-green)] text-xl font-black text-[var(--mg-on-green)]">
            ✓
          </div>
          <p className="text-sm font-semibold text-[var(--mg-text)]">
            A waiter will come to your table soon.
          </p>
          <p className="text-xs leading-relaxed text-[var(--mg-text-soft)]">
            Your request has been sent successfully.
          </p>
          <button
            type="button"
            onClick={() => setActivePanel(null)}
            className="mt-2 w-full rounded-full bg-[var(--mg-green)] px-4 py-3 text-sm font-bold text-[var(--mg-on-green)]"
          >
            OK
          </button>
        </div>
      </ThemeModal>

<ThemeModal open={activePanel === "note-success"} onClose={() => setActivePanel(null)} title="Note received" mode={mode}>
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--mg-green-soft)] text-[var(--mg-green)]">✓</div>
          <p className="text-sm text-[var(--mg-text-soft)]">Thanks, we received your note.</p>
          <button
            type="button"
            onClick={() => setActivePanel(null)}
            className="w-full rounded-2xl bg-[var(--mg-green)] px-5 py-3 font-semibold text-[var(--mg-on-green)]"
          >
            Done
          </button>
        </div>
      </ThemeModal>

      <ThemeModal open={activePanel === "checkout"} onClose={() => setActivePanel(null)} title="Checkout" mode={mode}>
        {checkoutLines.length ? (
          <ModernGreenOrderReviewCard
            lines={checkoutLines}
            totals={totals}
            tableLabel={tableLabel}
            formatPrice={formatEuro}
            onContinueOrdering={() => setActivePanel(null)}
            onConfirm={() => setActivePanel("payment")}
          />
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-[var(--mg-text-soft)]">Your order is still empty.</p>
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="w-full rounded-2xl bg-[var(--mg-green)] px-5 py-3 font-semibold text-[var(--mg-on-green)]"
            >
              Continue browsing
            </button>
          </div>
        )}
      </ThemeModal>

      <ThemeModal open={activePanel === "payment"} onClose={() => setActivePanel(null)} title="Payment" mode={mode}>
        <ModernGreenPaymentCard
          totals={totals}
          formatPrice={formatEuro}
          methods={paymentMethods}
          selectedMethodId={selectedPaymentMethodId}
          tipOptions={tipOptions}
          selectedTipId={selectedTipId}
          customTip={customTip}
          couponValue={couponValue}
          cardholderName={paymentContact.cardholderName}
          email={paymentContact.email}
          phone={paymentContact.phone}
          onSelectMethod={setSelectedPaymentMethodId}
          onSelectTip={setSelectedTipId}
          onCustomTipChange={setCustomTip}
          onCouponChange={setCouponValue}
          onApplyCoupon={() => {}}
          onChangeCardField={(field, value) => setPaymentContact((current) => ({ ...current, [field]: value }))}
          onPay={() => {
            setActivePanel(null)
            post("PMD_MODERN_GREEN_CHECKOUT")
          }}
        />
      </ThemeModal>

      <ThemeModal open={activePanel === "valet"} onClose={() => setActivePanel(null)} title="Valet parking" mode={mode}>
        <ModernGreenValetCard
          values={valetValues}
          onChangeField={(field, value) => setValetValues((current) => ({ ...current, [field]: value }))}
          onSubmit={() => {
            post("PMD_MODERN_GREEN_GO_VALET", { values: valetValues })
            setActivePanel("valet-success")
          }}
          onCancel={() => setActivePanel(null)}
        />
      </ThemeModal>

      <ThemeModal open={activePanel === "valet-success"} onClose={() => setActivePanel(null)} title="Valet requested" mode={mode}>
        <ModernGreenValetSuccessCard onDone={() => setActivePanel(null)} />
      </ThemeModal>
    </div>
  )
}
