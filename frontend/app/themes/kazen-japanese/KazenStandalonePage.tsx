"use client"

import "./kazen-standalone.css"
import React, { useEffect, useMemo, useState } from "react"
import { Bell, Car, Languages, Menu, MessageSquare, Minus, Plus, ShoppingBag } from "lucide-react"
import { ModalCard } from "./KazenStandaloneModalCard"
import { pmdInstallKazenCleanHeaderButtons, pmdInstallKazenFinalDarkMode, pmdInstallKazenPremiumMotion } from "./kazenStandaloneDomRepairs"
import { ALL_CATEGORY, defaultState, itemImage, kazenCategoryIcon, money, normalizeCategories, pmdKazenStableCategoryKey, post, resolveMediaUrl, type KazenItem, type KazenState } from "./kazenStandaloneData"

export default function KazenStandalonePage() {
  // PMD_KAZEN_PREMIUM_MOTION_CALL_20260611
  useEffect(() => pmdInstallKazenPremiumMotion(), [])

  // PMD_KAZEN_CLEAN_HEADER_BUTTONS_CALL_20260611
  useEffect(() => pmdInstallKazenCleanHeaderButtons(), [])

  // PMD_KAZEN_DARK_MODE_FINAL_CLEAN_CALL_20260611
  useEffect(() => pmdInstallKazenFinalDarkMode(), [])

  const [state, setState] = useState<KazenState>(defaultState)
  const [openCategory, setOpenCategory] = useState<string>("")
  const [selectedItem, setSelectedItem] = useState<KazenItem | null>(null)
  const [itemQty, setItemQty] = useState(1)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [waiterOpen, setWaiterOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [valetOpen, setValetOpen] = useState(false)
  const [note, setNote] = useState("")
  const [valetName, setValetName] = useState("")
  const [valetPlate, setValetPlate] = useState("")
  const [valetCar, setValetCar] = useState("")

  useEffect(() => {
    if (typeof document === "undefined") return

    document.documentElement.setAttribute("data-pmd-kazen-active", "1")
    document.body.setAttribute("data-pmd-kazen-active", "1")

    return () => {
      document.documentElement.removeAttribute("data-pmd-kazen-active")
      document.body.removeAttribute("data-pmd-kazen-active")
    }
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      const msg = event.data
      if (!msg || typeof msg !== "object") return
      if (String((msg as any).type || "") !== "PMD_KAZEN_SYNC") return

      const rawItems = Array.isArray((msg as any).items) ? (msg as any).items : []
      const items: KazenItem[] = rawItems.map((item: any) => ({
        ...item,
        id: String(item?.id ?? item?.menu_id ?? item?.slug ?? item?.name ?? ""),
        name: String(item?.name ?? item?.menu_name ?? "Menu item"),
        description: String(item?.description ?? item?.short_description ?? item?.menu_description ?? ""),
        price: Number(item?.price ?? item?.menu_price ?? 0),
        category: String(item?.category ?? item?.category_name ?? "Menu"),
        image: item?.image ?? item?.image_url ?? item?.imageUrl ?? item?.image_path ?? item?.imagePath ?? item?.thumb ?? item?.thumbnail ?? item?.media_url ?? item?.mediaUrl ?? item?.photo_url ?? item?.photoUrl ?? item?.photo ?? item?.primary_image ?? item?.primaryImage ?? item?.images ?? item?.additional_images ?? item?.gallery ?? "",
        images: Array.isArray(item?.images) ? item.images : [],
      }))

      const categories = normalizeCategories(items, Array.isArray((msg as any).categories) ? (msg as any).categories : [])

      setState({
        restaurantName: String((msg as any).restaurantName || (msg as any).businessName || (msg as any).merchantName || (msg as any).restaurant?.name || (msg as any).merchant?.businessName || "Kazen"),
        logoUrl: resolveMediaUrl((msg as any).logoUrl || (msg as any).effectiveLogoUrl || (msg as any).restaurantLogoUrl || (msg as any).merchantLogoUrl || (msg as any).logo || (msg as any).logo_url || (msg as any).settings?.logoUrl || (msg as any).merchant?.logoUrl || "") || state.logoUrl || "",
        tableNumber: (msg as any).displayTableNumber ?? (msg as any).tableNumber ?? (msg as any).table_id ?? (msg as any).tableId ?? (msg as any).table?.number ?? null,
        categories,
        items,
        cart: {
          count: Number((msg as any).cart?.count || 0),
          total: Number((msg as any).cart?.total || 0),
          lastItemName: String((msg as any).cart?.lastItemName || ""),
          lastItemPrice: Number((msg as any).cart?.lastItemPrice || 0),
          lines: Array.isArray((msg as any).cart?.lines) ? (msg as any).cart.lines : [],
        },
      })

      if (
        openCategory &&
        !categories.some((category) => pmdKazenStableCategoryKey(category) === pmdKazenStableCategoryKey(openCategory))
      ) {
        setOpenCategory("")
      }
    }

    window.addEventListener("message", handleMessage)
    post("PMD_KAZEN_READY")

    const t1 = window.setTimeout(() => post("PMD_KAZEN_READY"), 250)
    const t2 = window.setTimeout(() => post("PMD_KAZEN_READY"), 900)

    return () => {
      window.removeEventListener("message", handleMessage)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [openCategory])

  const categories = useMemo(() => normalizeCategories(state.items, state.categories), [state.items, state.categories])

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, KazenItem[]>()
    categories.forEach((category) => map.set(pmdKazenStableCategoryKey(category), []))

    state.items.forEach((item) => {
      const key = pmdKazenStableCategoryKey(item.category || "Menu")
      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(item)
    })

    map.set(pmdKazenStableCategoryKey(ALL_CATEGORY), state.items)
    return map
  }, [categories, state.items])

  const tableLabel = state.tableNumber && /\d/.test(String(state.tableNumber)) ? `Table ${String(state.tableNumber).match(/\d+/)?.[0]}` : "Table"
  const cartLines = Array.isArray(state.cart.lines) ? state.cart.lines : []

  // PMD_FIX_KAZEN_CATEGORY_HEADER_VISIBILITY_WATCHDOG_20260613
  // DOM/style safety only: keep category HEADER rows visible after scroll/sync.
  // It does NOT force accordion content open.
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return

    let cancelled = false
    let raf = 0

    const keepHeadersVisible = () => {
      if (cancelled) return

      document.querySelectorAll<HTMLElement>(".kazen-category").forEach((category) => {
        const button = category.querySelector<HTMLElement>(".kazen-category-btn")
        const title = category.querySelector<HTMLElement>(".kazen-category-title")
        const icon = category.querySelector<HTMLElement>(".kazen-category-icon-shell")
        const accordion = category.querySelector<HTMLElement>(".kazen-accordion")

        category.style.setProperty("display", "block", "important")
        category.style.setProperty("visibility", "visible", "important")
        category.style.setProperty("opacity", "1", "important")
        category.style.setProperty("height", "auto", "important")
        category.style.setProperty("min-height", "4.55rem", "important")
        category.style.setProperty("max-height", "none", "important")
        category.style.setProperty("overflow", "visible", "important")
        category.style.setProperty("position", "relative", "important")
        category.style.setProperty("clip", "auto", "important")
        category.style.setProperty("clip-path", "none", "important")
        category.removeAttribute("hidden")
        category.removeAttribute("aria-hidden")

        if (button) {
          button.style.setProperty("display", "grid", "important")
          button.style.setProperty("grid-template-columns", "1fr auto", "important")
          button.style.setProperty("align-items", "center", "important")
          button.style.setProperty("visibility", "visible", "important")
          button.style.setProperty("opacity", "1", "important")
          button.style.setProperty("height", "auto", "important")
          button.style.setProperty("min-height", "4.55rem", "important")
          button.style.setProperty("max-height", "none", "important")
          button.style.setProperty("overflow", "visible", "important")
          button.style.setProperty("pointer-events", "auto", "important")
          button.style.setProperty("clip", "auto", "important")
          button.style.setProperty("clip-path", "none", "important")
          button.removeAttribute("hidden")
          button.removeAttribute("aria-hidden")
        }

        if (title) {
          title.style.setProperty("display", "inline", "important")
          title.style.setProperty("visibility", "visible", "important")
          title.style.setProperty("opacity", "1", "important")
          title.style.setProperty("overflow", "visible", "important")
          title.style.setProperty("clip", "auto", "important")
          title.style.setProperty("clip-path", "none", "important")
          title.style.setProperty("white-space", "normal", "important")
          title.removeAttribute("hidden")
          title.removeAttribute("aria-hidden")
        }

        if (icon) {
          icon.style.setProperty("display", "inline-flex", "important")
          icon.style.setProperty("visibility", "visible", "important")
          icon.style.setProperty("opacity", "1", "important")
        }

        // Keep accordion behavior controlled by React class only.
        if (accordion && !category.classList.contains("is-open")) {
          accordion.style.setProperty("max-height", "0", "important")
          accordion.style.setProperty("overflow", "hidden", "important")
          accordion.style.setProperty("opacity", "0", "important")
          accordion.style.setProperty("pointer-events", "none", "important")
        }

        if (accordion && category.classList.contains("is-open")) {
          accordion.style.setProperty("max-height", "none", "important")
          accordion.style.setProperty("height", "auto", "important")
          accordion.style.setProperty("overflow", "visible", "important")
          accordion.style.setProperty("opacity", "1", "important")
          accordion.style.setProperty("pointer-events", "auto", "important")
        }
      })
    }

    const schedule = () => {
      window.cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(keepHeadersVisible)
    }

    keepHeadersVisible()

    const timers = [0, 50, 150, 350, 700, 1200, 2000].map((ms) =>
      window.setTimeout(keepHeadersVisible, ms)
    )

    window.addEventListener("scroll", schedule, true)
    window.addEventListener("resize", schedule)

    const observer = new MutationObserver(schedule)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "aria-hidden", "aria-expanded"],
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      timers.forEach((timer) => window.clearTimeout(timer))
      window.removeEventListener("scroll", schedule, true)
      window.removeEventListener("resize", schedule)
      observer.disconnect()
    }
  }, [categories.length, openCategory])

  const openItem = (item: KazenItem) => {
    setSelectedItem(item)
    setItemQty(1)
  }

  const addItem = (item: KazenItem, quantity = 1) => {
    post("PMD_KAZEN_ADD_ITEM", { itemId: item.id, quantity })
  }

  const submitSelectedItem = () => {
    if (!selectedItem) return
    addItem(selectedItem, itemQty)
    setSelectedItem(null)
  }

  const submitWaiter = () => {
    post("PMD_KAZEN_CALL_WAITER")
    setWaiterOpen(false)
  }

  const submitNote = () => {
    const trimmed = note.trim()
    if (!trimmed) return
    post("PMD_KAZEN_ADD_NOTE", { note: trimmed })
    setNote("")
    setNoteOpen(false)
  }

  const submitValet = () => {
    post("PMD_KAZEN_GO_VALET", {
      values: {
        name: valetName.trim() || "Guest",
        licensePlate: valetPlate.trim() || "Not provided",
        carModel: valetCar.trim() || "Not provided",
      },
    })
    setValetOpen(false)
  }

  return (
    <main className="kazen-page">

      <div className="kazen-shell">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-end gap-3">
              {state.logoUrl ? (
                <img src={state.logoUrl} alt={state.restaurantName} className="kazen-logo" />
              ) : null}
              <span className="kazen-stamp">風然</span>
            </div>
            <div className="kazen-brand">{state.restaurantName || "KAZEN"}</div>
            <div className="kazen-subtitle">Japanese Cuisine</div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button className="kazen-icon-button h-11 w-11" aria-label="Menu" type="button">
              <Menu className="h-7 w-7" />
            </button>
            <div className="flex gap-2">
              <button className="kazen-pill" type="button">{tableLabel}</button>
              <button className="kazen-pill" type="button" aria-label="Language">
                <Languages className="mr-1 inline h-3.5 w-3.5" /> EN
              </button>
            </div>
            <button className="kazen-pill" type="button" onClick={() => setValetOpen(true)}>
              <Car className="mr-1 inline h-3.5 w-3.5" /> Valet
            </button>
          </div>
        </header>

        <section className="kazen-hero" aria-label="Kazen seasonal atmosphere">
          <div className="kazen-motto">
            <div>Purity.</div>
            <div>Season.</div>
            <div>Intention.</div>
            <div className="kazen-red-line" />
            <div style={{ letterSpacing: ".55em" }}>風　然</div>
          </div>
        </section>

        <button type="button" className="kazen-call" onClick={() => post("PMD_KAZEN_CHECKOUT")}>
          Call to order <span aria-hidden="true">→</span>
        </button>

        <section className="mt-9" aria-label="Menu categories">
          {categories.map((category, index) => {
            const categoryKey = pmdKazenStableCategoryKey(category)
            const open = pmdKazenStableCategoryKey(openCategory) === categoryKey
            const categoryItems = categoryKey === pmdKazenStableCategoryKey(ALL_CATEGORY) ? state.items : itemsByCategory.get(categoryKey) || []

            return (
              <article key={categoryKey || category} className={`kazen-category ${open ? "is-open" : "is-closed"}`}>
                <button type="button" className="kazen-category-btn" aria-expanded={open} onClick={() => setOpenCategory(open ? "" : categoryKey)}>
                  <span className="kazen-category-label">
                    <span className="kazen-category-icon-shell" aria-hidden="true">
                      <img src={kazenCategoryIcon(index)} alt="" className="kazen-category-icon" />
                    </span>
                    <span className="kazen-category-title">{category}</span>
                  </span>
                  {open ? (
                    <Minus className="h-7 w-7" style={{ color: "#242320", stroke: "#242320", fill: "none" }} />
                  ) : (
                    <Plus className="h-7 w-7" style={{ color: "#242320", stroke: "#242320", fill: "none" }} />
                  )}
                </button>

                <div
                  className={`kazen-accordion ${open ? "is-open" : "is-closed"}`}
                  aria-hidden={!open}
                  style={{ "--kazen-item-count": Math.min(categoryItems.length || 1, 8) } as React.CSSProperties}
                >
                  <div className="kazen-items">
                    {categoryItems.length ? categoryItems.map((item) => {
                      const image = itemImage(item)

                      return (
                        <div key={item.id} className="kazen-item">
                          <button type="button" className="min-w-0 text-left" onClick={() => openItem(item)} style={{ display: "contents" }}>
                            {image ? (
                              <img src={image} alt={item.name} className="kazen-item-image" />
                            ) : (
                              <span className="kazen-item-image-empty">No image</span>
                            )}

                            <span className="min-w-0">
                              <span className="kazen-item-name block truncate">{item.name}</span>
                              <span className="kazen-item-description block line-clamp-2">{item.description || "Prepared with seasonal intention."}</span>
                              <span className="kazen-item-price block">{money(item.price)}</span>
                            </span>
                          </button>

                          <button type="button" className="kazen-add" aria-label={`Add ${item.name}`} onClick={() => addItem(item, 1)}>
                            <Plus className="h-5 w-5" style={{ color: "#242320", stroke: "#242320", fill: "none" }} />
                          </button>
                        </div>
                      )
                    }) : (
                      <div className="py-5 text-center text-sm" style={{ color: "var(--kazen-muted)" }}>
                        No visible items in this category.
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </section>

        <footer className="pb-6 pt-14 text-center">
          <div style={{ color: "var(--kazen-red)", fontSize: "1.7rem" }}>✽</div>
          <div className="mt-3 text-[.64rem] uppercase tracking-[.34em]" style={{ color: "var(--kazen-muted)" }}>Thank you for dining with us</div>
          <div className="mt-2 text-sm tracking-[.28em]" style={{ color: "var(--kazen-ink)" }}>ありがとうございます</div>
                              {/* PMD_KAZEN_FOOTER_PAYMYDINE_LOGO_SUDO_20260611 */}
          <div className="kazen-paymydine-footer-logo">
            <img
              src="/assets/media/uploads/PMD.png?v=1780008763"
              alt="PayMyDine"
              className="kazen-paymydine-footer-logo-image"
            />
          </div>
        </footer>
      </div>

      <nav className="kazen-dock" aria-label="Menu actions">
        <button type="button" onClick={() => setWaiterOpen(true)}>
          <Bell className="h-5 w-5" />Waiter
        </button>
        <button type="button" onClick={() => setNoteOpen(true)}>
          <MessageSquare className="h-5 w-5" />Note
        </button>
        <button type="button" data-primary="true" onClick={() => post("PMD_KAZEN_CHECKOUT")}>
          <ShoppingBag className="h-5 w-5" />Checkout {state.cart.count ? `(${state.cart.count})` : ""}
        </button>
      </nav>

      {selectedItem && (
        <ModalCard title={selectedItem.name} eyebrow="Item detail" onClose={() => setSelectedItem(null)}>
          {itemImage(selectedItem) ? <img src={itemImage(selectedItem)} alt={selectedItem.name} className="kazen-modal-image" /> : null}
          <p className="mt-4 text-[.98rem] leading-7" style={{ color: "var(--kazen-muted)" }}>
            {selectedItem.description || "Prepared with seasonal intention."}
          </p>
          <div className="mt-4 flex items-center justify-between border-y py-3" style={{ borderColor: "var(--kazen-line)" }}>
            <span className="text-sm uppercase tracking-[.18em]" style={{ color: "var(--kazen-muted)" }}>Price</span>
            <strong style={{ color: "var(--kazen-ink)" }}>{money(selectedItem.price)}</strong>
          </div>

          <div className="kazen-qty">
            <button type="button" onClick={() => setItemQty((v) => Math.max(1, v - 1))}>
              <Minus className="h-5 w-5" />
            </button>
            <strong>{itemQty}</strong>
            <button type="button" onClick={() => setItemQty((v) => v + 1)}>
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" className="kazen-secondary" onClick={() => setSelectedItem(null)}>Close</button>
            <button type="button" className="kazen-primary" onClick={submitSelectedItem}>Add</button>
          </div>
        </ModalCard>
      )}

      {false && checkoutOpen && (
        <ModalCard title="Checkout" eyebrow="Review order" onClose={() => setCheckoutOpen(false)}>
          <div className="mt-3">
            {cartLines.length ? cartLines.map((line) => {
              const image = resolveMediaUrl(line.imageUrl)
              return (
                <div key={line.id} className="kazen-cart-line">
                  {image ? <img src={image} alt={line.name} className="kazen-cart-img" /> : <span className="kazen-cart-img" />}
                  <div>
                    <strong>{line.quantity}x {line.name}</strong>
                    <div className="text-sm" style={{ color: "var(--kazen-muted)" }}>{money(line.unitPrice)}</div>
                  </div>
                  <strong>{money(line.unitPrice * line.quantity)}</strong>
                </div>
              )
            }) : (
              <div className="py-8 text-center" style={{ color: "var(--kazen-muted)" }}>
                Your cart is empty. Add an item first.
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between border-y py-4" style={{ borderColor: "var(--kazen-line)" }}>
            <span className="uppercase tracking-[.18em]" style={{ color: "var(--kazen-muted)" }}>Total</span>
            <strong className="text-xl">{money(state.cart.total)}</strong>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" className="kazen-secondary" onClick={() => setCheckoutOpen(false)}>Continue</button>
            <button
              type="button"
              className="kazen-primary"
              onClick={() => {
                setCheckoutOpen(false)
                post("PMD_KAZEN_CHECKOUT")
              }}
            >
              Pay
            </button>
          </div>
        </ModalCard>
      )}

      {waiterOpen && (
        <ModalCard title="Call waiter" eyebrow={tableLabel} onClose={() => setWaiterOpen(false)}>
          <p className="mt-4 leading-7" style={{ color: "var(--kazen-muted)" }}>
            Send a quiet request to the team for this table.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" className="kazen-secondary" onClick={() => setWaiterOpen(false)}>Cancel</button>
            <button type="button" className="kazen-primary" onClick={submitWaiter}>Call</button>
          </div>
        </ModalCard>
      )}

      {noteOpen && (
        <ModalCard title="Guest note" eyebrow={tableLabel} onClose={() => setNoteOpen(false)}>
          <p className="mt-4 text-sm" style={{ color: "var(--kazen-muted)" }}>
            Allergy, special request, timing, or anything the team should know.
          </p>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="kazen-field mt-5 min-h-32 resize-none"
            placeholder="Write your note..."
          />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" className="kazen-secondary" onClick={() => setNoteOpen(false)}>Close</button>
            <button type="button" className="kazen-primary" onClick={submitNote}>Send</button>
          </div>
        </ModalCard>
      )}

      {valetOpen && (
        <ModalCard title="Valet" eyebrow={tableLabel} onClose={() => setValetOpen(false)}>
          <div className="mt-5 space-y-3">
            <input className="kazen-field" value={valetName} onChange={(e) => setValetName(e.target.value)} placeholder="Name" />
            <input className="kazen-field" value={valetPlate} onChange={(e) => setValetPlate(e.target.value)} placeholder="License plate" />
            <input className="kazen-field" value={valetCar} onChange={(e) => setValetCar(e.target.value)} placeholder="Car model / color" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" className="kazen-secondary" onClick={() => setValetOpen(false)}>Close</button>
            <button type="button" className="kazen-primary" onClick={submitValet}>Request</button>
          </div>
        </ModalCard>
      )}
    </main>
  )
}

// PMD_FIX_KAZEN_CATEGORY_NORMALIZED_KEYS_20260613

// PMD_FIX_KAZEN_CATEGORY_HEADER_VISIBILITY_WATCHDOG_20260613

// PMD_FIX_KAZEN_BACKEND_CATEGORIES_ONLY_20260613

// PMD_FIX_KAZEN_MOBILE_DOCK_SAFE_AREA_20260613
