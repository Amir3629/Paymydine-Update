"use client"

import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { Check, ChevronLeft, Minus, Plus, Search, ShoppingBag, X } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import type { MenuItem } from "@/lib/data"
import { useCartStore } from "@/store/cart-store"
import { usePaymentSettingsStore } from "@/store/cms/payment-settings-store"
import { useTaxSettingsStore } from "@/store/cms/tax-settings-store"

const PaymentModal = dynamic(
  () =>
    import("@/features/customer-menu/checkout/CheckoutModalHost")
      .then((module) => module.PaymentModal),
  {
    ssr: false,
    loading: () => null,
  },
)

function safeColor(value: string | null, fallback: string) {
  const raw = String(value || "").trim()
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : fallback
}

function normalizeImage(value: unknown): string {
  const raw = String(value || "").trim()
  if (!raw) return ""
  if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) return raw
  if (raw.startsWith("assets/")) return "/" + raw
  if (raw.startsWith("uploads/")) return "/assets/media/" + raw
  return "/assets/media/uploads/" + raw
}

function normalizeMenuItem(raw: any): MenuItem {
  const stock = raw?.stock_qty
  return {
    ...raw,
    id: Number(raw?.id || raw?.menu_id || 0),
    name: String(raw?.name || raw?.menu_name || "Menu item"),
    description: String(raw?.description || raw?.menu_description || ""),
    price: Number(raw?.price || raw?.menu_price || 0),
    image: normalizeImage(raw?.image || raw?.menu_photo),
    category: String(raw?.category_name || raw?.category || "Menu"),
    category_name: String(raw?.category_name || raw?.category || "Menu"),
    category_id: raw?.category_id,
    options: Array.isArray(raw?.options) ? raw.options : [],
    available:
      raw?.available !== false &&
      raw?.is_stock_out !== true &&
      raw?.is_stock_out !== 1 &&
      (stock == null || Number(stock) > 0),
  } as MenuItem
}

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "EUR",
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return "€" + Number(value || 0).toFixed(2)
  }
}

export default function KioskMenuPage() {
  const params = useSearchParams()
  const sessionId = params.get("kiosk_session") || "kiosk"
  const serviceMode =
    params.get("kiosk_order_type") === "pickup" ? "pickup" : "dine_in"

  const background = safeColor(params.get("kiosk_bg"), "#050508")
  const text = safeColor(params.get("kiosk_text"), "#F7F7FB")
  const muted = safeColor(params.get("kiosk_muted"), "#AAA7B4")
  const accent = safeColor(params.get("kiosk_accent"), "#FF3B93")
  const surface = safeColor(params.get("kiosk_surface"), "#0D0D14")
  const restaurantName =
    String(params.get("kiosk_name") || "PayMyDine").trim() || "PayMyDine"
  const restaurantLogo = String(params.get("kiosk_logo") || "").trim()

  const {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  } = useCartStore()
  const { merchantSettings, loadMerchantSettings } = usePaymentSettingsStore()
  const { loadVATSettings } = useTaxSettingsStore()

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [category, setCategory] = useState("All")
  const [query, setQuery] = useState("")
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  useEffect(() => {
    const previousSession =
      window.sessionStorage.getItem("pmd-kiosk-ui-session")
    if (previousSession !== sessionId) {
      clearCart()
      window.sessionStorage.setItem("pmd-kiosk-ui-session", sessionId)
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError("")
      try {
        const response = await apiClient.getMenu()
        const rawData: any = response?.data ?? response ?? {}
        const rawItems = Array.isArray(rawData)
          ? rawData
          : Array.isArray(rawData?.items)
            ? rawData.items
            : []

        if (!cancelled) {
          setMenuItems(
            rawItems
              .map(normalizeMenuItem)
              .filter((item: MenuItem) => item.id > 0),
          )
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Menu could not be loaded.",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    // Payment/tax settings are warmed in parallel but do not block menu paint.
    void Promise.resolve(loadMerchantSettings()).catch(() => {})
    void Promise.resolve(loadVATSettings()).catch(() => {})

    return () => {
      cancelled = true
    }
  }, [sessionId, clearCart, loadMerchantSettings, loadVATSettings])

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          menuItems
            .map((item) => String(item.category_name || item.category || "").trim())
            .filter(Boolean),
        ),
      ),
    ],
    [menuItems],
  )

  const visibleItems = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return menuItems.filter((item) => {
      if (item.available === false) return false
      const itemCategory = String(item.category_name || item.category || "")
      if (category !== "All" && itemCategory !== category) return false
      if (!needle) return true

      return (
        String(item.name || "").toLowerCase().includes(needle) ||
        String(item.description || "").toLowerCase().includes(needle) ||
        itemCategory.toLowerCase().includes(needle)
      )
    })
  }, [menuItems, category, query])

  const totalItems = items.reduce(
    (sum, entry) => sum + Number(entry.quantity || 0),
    0,
  )
  const subtotal = items.reduce(
    (sum, entry) =>
      sum +
      Number(entry.quantity || 0) *
        Number(entry.item?.price || 0),
    0,
  )
  const currency = String(merchantSettings?.currency || "EUR")

  const addItem = (item: MenuItem) => {
    addToCart(item, 1)
  }

  return (
    <div
      data-pmd-kiosk-menu="v5"
      style={{
        ["--k-bg" as any]: background,
        ["--k-text" as any]: text,
        ["--k-muted" as any]: muted,
        ["--k-accent" as any]: accent,
        ["--k-surface" as any]: surface,
      }}
      className="min-h-[100dvh] bg-[var(--k-bg)] text-[var(--k-text)]"
    >
      <style>{`
        html,body{background:var(--k-bg)!important;overscroll-behavior:none}
        [data-pmd-kiosk-menu]{font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif}
        .pmd-kiosk-scroll::-webkit-scrollbar{display:none}
        .pmd-kiosk-card{content-visibility:auto;contain-intrinsic-size:280px}
      `}</style>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[color:var(--k-bg)]/95 px-5 pb-3 pt-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          {restaurantLogo ? (
            <img
              src={restaurantLogo}
              alt=""
              className="h-11 w-11 rounded-xl bg-white object-contain p-1"
            />
          ) : (
            <img
              src="/brand/paymydine-logo.svg"
              alt=""
              className="h-11 w-11 object-contain"
            />
          )}

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-black tracking-tight">
              {restaurantName}
            </h1>
            <div
              className="mt-0.5 text-xs font-bold uppercase tracking-[.16em]"
              style={{ color: muted }}
            >
              {serviceMode === "pickup" ? "Take Away" : "Eat Here"}
            </div>
          </div>

          <div
            className="rounded-full px-3 py-2 text-xs font-black"
            style={{
              background: surface,
              color: accent,
              border: "1px solid rgba(255,255,255,.10)",
            }}
          >
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </div>
        </div>

        <div className="mx-auto mt-3 flex max-w-6xl items-center gap-2">
          <label
            className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-4 py-3"
            style={{
              background: surface,
              border: "1px solid rgba(255,255,255,.10)",
            }}
          >
            <Search size={18} style={{ color: muted }} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search menu"
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:opacity-60"
              style={{ color: text }}
              autoComplete="off"
              spellCheck={false}
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="grid h-7 w-7 place-items-center rounded-full"
                style={{ background: "rgba(255,255,255,.08)" }}
              >
                <X size={14} />
              </button>
            ) : null}
          </label>
        </div>

        <nav className="pmd-kiosk-scroll mx-auto mt-3 flex max-w-6xl gap-2 overflow-x-auto pb-1">
          {categories.map((entry) => {
            const active = entry === category
            return (
              <button
                key={entry}
                type="button"
                onClick={() => setCategory(entry)}
                className="shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition"
                style={{
                  background: active ? accent : surface,
                  color: active ? background : text,
                  border: "1px solid rgba(255,255,255,.09)",
                }}
              >
                {entry}
              </button>
            )
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-32 pt-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-64 animate-pulse rounded-3xl"
                style={{ background: surface }}
              />
            ))}
          </div>
        ) : loadError ? (
          <div
            className="mx-auto mt-14 max-w-md rounded-3xl p-8 text-center"
            style={{ background: surface }}
          >
            <p className="text-lg font-black">Menu unavailable</p>
            <p className="mt-2 text-sm" style={{ color: muted }}>
              {loadError}
            </p>
            <button
              type="button"
              className="mt-6 rounded-2xl px-5 py-3 font-black"
              style={{ background: accent, color: background }}
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visibleItems.map((item) => {
              const cartEntry = items.find(
                (entry) => Number(entry.item.id) === Number(item.id),
              )
              const quantity = Number(cartEntry?.quantity || 0)

              return (
                <article
                  key={item.id}
                  className="pmd-kiosk-card overflow-hidden rounded-3xl"
                  style={{
                    background: surface,
                    border: "1px solid rgba(255,255,255,.09)",
                    boxShadow: "0 18px 50px rgba(0,0,0,.16)",
                  }}
                >
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-black/10">
                      {item.image ? (
                        <img
                          src={String(item.image)}
                          alt={String(item.name || "")}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="px-4 pb-2 pt-4">
                      <h2 className="line-clamp-2 text-base font-black leading-tight">
                        {item.name}
                      </h2>
                      <p
                        className="mt-1 line-clamp-2 min-h-9 text-xs leading-4"
                        style={{ color: muted }}
                      >
                        {item.description || item.category_name || item.category}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center justify-between gap-2 px-4 pb-4 pt-2">
                    <span className="text-base font-black">
                      {money(Number(item.price || 0), currency)}
                    </span>

                    {quantity > 0 ? (
                      <div
                        className="flex items-center rounded-full p-1"
                        style={{ background: "rgba(255,255,255,.08)" }}
                      >
                        <button
                          type="button"
                          className="grid h-9 w-9 place-items-center rounded-full"
                          onClick={() =>
                            quantity <= 1
                              ? removeFromCart(item)
                              : updateQuantity(Number(item.id), quantity - 1)
                          }
                        >
                          <Minus size={16} />
                        </button>
                        <span className="min-w-8 text-center text-sm font-black">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          className="grid h-9 w-9 place-items-center rounded-full"
                          style={{ background: accent, color: background }}
                          onClick={() => addItem(item)}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addItem(item)}
                        className="flex h-11 items-center gap-2 rounded-full px-4 text-sm font-black"
                        style={{ background: accent, color: background }}
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {!loading && !loadError && visibleItems.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-lg font-black">Nothing found</p>
            <p className="mt-2 text-sm" style={{ color: muted }}>
              Try another category or search.
            </p>
          </div>
        ) : null}
      </main>

      {totalItems > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 p-4">
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            className="mx-auto flex min-h-16 w-full max-w-2xl items-center gap-4 rounded-[22px] px-5 text-left shadow-2xl"
            style={{
              background: accent,
              color: background,
              boxShadow: "0 20px 60px rgba(0,0,0,.40)",
            }}
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-black/10">
              <ShoppingBag size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-black uppercase tracking-[.12em] opacity-75">
                Review order
              </span>
              <span className="block text-lg font-black">
                {totalItems} {totalItems === 1 ? "item" : "items"}
              </span>
            </span>
            <span className="text-lg font-black">
              {money(subtotal, currency)}
            </span>
          </button>
        </div>
      ) : null}

      {selectedItem ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 backdrop-blur-sm md:items-center md:justify-center"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="max-h-[90dvh] w-full overflow-y-auto rounded-[30px] md:max-w-xl"
            style={{ background: surface, color: text }}
            onClick={(event) => event.stopPropagation()}
          >
            {selectedItem.image ? (
              <div className="aspect-[16/10] overflow-hidden rounded-t-[30px] bg-black/10">
                <img
                  src={String(selectedItem.image)}
                  alt={String(selectedItem.name || "")}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}

            <div className="p-6">
              <button
                type="button"
                className="mb-4 flex items-center gap-1 text-sm font-black"
                style={{ color: accent }}
                onClick={() => setSelectedItem(null)}
              >
                <ChevronLeft size={18} />
                Back
              </button>
              <h2 className="text-2xl font-black">{selectedItem.name}</h2>
              {selectedItem.description ? (
                <p className="mt-3 text-sm leading-6" style={{ color: muted }}>
                  {selectedItem.description}
                </p>
              ) : null}

              {Array.isArray(selectedItem.options) &&
              selectedItem.options.length > 0 ? (
                <div
                  className="mt-4 rounded-2xl px-4 py-3 text-sm"
                  style={{
                    background: "rgba(255,255,255,.06)",
                    color: muted,
                  }}
                >
                  Options and extras can be selected in the order review.
                </div>
              ) : null}

              <div className="mt-6 flex items-center justify-between gap-4">
                <span className="text-xl font-black">
                  {money(Number(selectedItem.price || 0), currency)}
                </span>
                <button
                  type="button"
                  className="flex h-12 items-center gap-2 rounded-full px-6 font-black"
                  style={{ background: accent, color: background }}
                  onClick={() => {
                    addItem(selectedItem)
                    setSelectedItem(null)
                  }}
                >
                  <Plus size={18} />
                  Add to order
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <PaymentModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        items={items}
        tableInfo={null}
        existingOrderId={null}
        pendingSummary={null}
        initialSubmittedOrder={null}
        initialCheckoutStep="review"
        preferPersonalReview={true}
        checkoutVisualTheme="neutral"
      />

      <div className="pointer-events-none fixed bottom-2 right-3 z-20 hidden items-center gap-1 text-[10px] font-bold opacity-40 md:flex">
        <Check size={11} />
        PayMyDine Kiosk
      </div>
    </div>
  )
}
