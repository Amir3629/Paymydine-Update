"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Bell, Car, Languages, Menu, MessageSquare, Minus, Plus, ShoppingBag, X } from "lucide-react"


type KazenItem = {
  id: string
  name: string
  description?: string
  price: number
  category: string
  image?: string
  image_url?: string
  thumb?: string
  thumbnail?: string
  images?: any[]
  is_bestseller?: boolean
  is_recommended?: boolean
}

type CartLine = {
  id: string
  name: string
  unitPrice: number
  quantity: number
  imageUrl?: string
}

type KazenState = {
  restaurantName: string
  logoUrl?: string
  tableNumber?: string | number | null
  categories: string[]
  items: KazenItem[]
  cart: {
    count: number
    total: number
    lastItemName?: string
    lastItemPrice?: number
    lines: CartLine[]
  }
}


// PMD_KAZEN_CATEGORY_ICONS_20260611
const KAZEN_CATEGORY_ICONS = [
  "/themes/kazen-japanese/category-icons/kazen-category-01.png",
  "/themes/kazen-japanese/category-icons/kazen-category-02.png",
  "/themes/kazen-japanese/category-icons/kazen-category-03.png",
  "/themes/kazen-japanese/category-icons/kazen-category-04.png",
  "/themes/kazen-japanese/category-icons/kazen-category-05.png",
  "/themes/kazen-japanese/category-icons/kazen-category-06.png",
  "/themes/kazen-japanese/category-icons/kazen-category-07.png",
  "/themes/kazen-japanese/category-icons/kazen-category-08.png",
]

function kazenCategoryIcon(index: number) {
  return KAZEN_CATEGORY_ICONS[index % KAZEN_CATEGORY_ICONS.length]
}

const ALL_CATEGORY = "ALL"


const defaultState: KazenState = {
  restaurantName: "Kazen",
  tableNumber: null,
  categories: [ALL_CATEGORY],
  items: [],
  cart: { count: 0, total: 0, lines: [] },
}

function money(value: number) {
  try {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(Number(value || 0))
  } catch {
    return `€${Number(value || 0).toFixed(2)}`
  }
}

function post(type: string, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return
  window.parent?.postMessage({ type, ...payload }, window.location.origin)
}

function pmdKazenNormalizeCategoriesBase(items: KazenItem[], rawCategories: string[]) {
  const fromItems = items.map((item) => item.category).filter(Boolean)
  const seen = new Set<string>()
  const result: string[] = []

  ;[ALL_CATEGORY, ...(rawCategories || []), ...fromItems].forEach((raw) => {
    const value = String(raw || "").trim()
    if (!value) return

    const key = value.toLowerCase()
    if (key === "all" && !seen.has("all")) {
      seen.add("all")
      result.push(ALL_CATEGORY)
      return
    }

    if (!seen.has(key)) {
      seen.add(key)
      result.push(value)
    }
  })

  return result.length ? result : defaultState.categories
}

// PMD_FIX_KAZEN_NORMALIZE_CATEGORIES_STABLE_WRAP_20260613
// Later iframe sync/scroll refreshes must never shrink the Kazen category list.
// The first full real restaurant category list wins; later updates may add categories only.
let pmdKazenStableCategoryCache: string[] = []

function pmdKazenStableCategoryKey(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase()
}

function pmdKazenSortKnownCategories(categories: string[]) {
  // PMD_FIX_KAZEN_BACKEND_CATEGORIES_ONLY_20260613
  // Preserve backend/admin order. Do not force Japanese demo categories.
  const incoming = Array.isArray(categories)
    ? categories.map((cat) => String(cat || "").trim()).filter(Boolean)
    : []

  const demoFallbackKeys = new Set(["omakase", "sushi", "grill"])
  const hasRealBackendCategories = incoming.some((cat) => {
    const key = pmdKazenStableCategoryKey(cat)
    return key && key !== "all" && !demoFallbackKeys.has(key)
  })

  const seen = new Set<string>()
  const next: string[] = []

  incoming.forEach((cat) => {
    const label = String(cat || "").trim()
    const key = pmdKazenStableCategoryKey(label)
    if (!key || seen.has(key)) return

    // When real backend categories exist, never keep demo fallback labels.
    if (hasRealBackendCategories && demoFallbackKeys.has(key)) return

    seen.add(key)
    next.push(label)
  })

  return next
}


function normalizeCategories(...args: Parameters<typeof pmdKazenNormalizeCategoriesBase>) {
  const baseCategories = pmdKazenNormalizeCategoriesBase(...args)
  const items = Array.isArray(args[0]) ? args[0] : []
  const rawCategories = Array.isArray(args[1]) ? args[1] : []

  const itemCategories = items
    .map((item: any) => String(item?.category || item?.category_name || item?.menu_category || "").trim())
    .filter(Boolean)

  const incoming = [
    ...baseCategories,
    ...rawCategories.map((value: any) => String(value || "").trim()).filter(Boolean),
    ...itemCategories,
  ]

  const demoOnly = new Set(["omakase", "sushi", "grill"])
  const hasRealCategories = incoming.some((cat) => {
    const key = pmdKazenStableCategoryKey(cat)
    return key && key !== "all" && !demoOnly.has(key)
  })

  const previous = hasRealCategories
    ? pmdKazenStableCategoryCache.filter((cat) => {
        const key = pmdKazenStableCategoryKey(cat)
        return key === "all" || !demoOnly.has(key)
      })
    : pmdKazenStableCategoryCache

  const merged = [...previous, ...incoming]
  const seen = new Set<string>()
  const next: string[] = []

  merged.forEach((cat) => {
    const label = String(cat || "").trim()
    const key = pmdKazenStableCategoryKey(label)
    if (!key || seen.has(key)) return
    seen.add(key)
    next.push(label)
  })

  if (next.length >= pmdKazenStableCategoryCache.length) {
    pmdKazenStableCategoryCache = pmdKazenSortKnownCategories(next)
  }

  return pmdKazenSortKnownCategories(pmdKazenStableCategoryCache.length ? pmdKazenStableCategoryCache : next)
}


function resolveMediaUrl(raw: any): string {
  let value = raw

  if (Array.isArray(value)) {
    value = value[0]
  }

  if (value && typeof value === "object") {
    value =
      value.url ??
      value.path ??
      value.image_path ??
      value.image ??
      value.thumb ??
      value.thumbnail ??
      value.src ??
      ""
  }

  const str = String(value || "").trim()
  if (!str || str === "undefined" || str === "null") return ""

  if (/^https?:\/\//i.test(str)) return str
  if (str.startsWith("/")) return str

  const clean = str.replace(/^\/+/, "")
  const fileName = clean.split("/").filter(Boolean).pop() || clean

  if (clean.startsWith("assets/media/uploads/")) return `/${clean}`
  if (clean.startsWith("assets/media/attachments/")) return `/${clean}`
  if (clean.startsWith("uploads/")) return `/assets/media/${clean}`
  if (clean.startsWith("attachments/public/")) return `/assets/media/${clean}`
  if (clean.startsWith("storage/")) return `/${clean}`
  if (!clean.includes("/")) return `/assets/media/uploads/${fileName}`

  return `/${clean}`
}

function itemImage(item?: KazenItem | null) {
  if (!item) return ""
  return resolveMediaUrl(item.image || item.image_url || item.thumb || item.thumbnail || item.images)
}

function ModalCard({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string
  eyebrow?: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="kazen-solid-modal-overlay" role="dialog" aria-modal="true">
      <div
        className="kazen-solid-modal-panel"
        data-kazen-solid-panel="1"
        style={{
          background: "#fbf8f2",
          backgroundColor: "#fbf8f2",
          opacity: 1,
          filter: "none",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
          mixBlendMode: "normal",
        }}
      >
        <div className="kazen-solid-modal-sheet" aria-hidden="true" />
        <div className="kazen-solid-modal-content">
          <div className="kazen-solid-modal-head">
            <div>
              {eyebrow ? <div className="kazen-solid-eyebrow">{eyebrow}</div> : null}
              <h2>{title}</h2>
            </div>
            <button type="button" className="kazen-solid-close" onClick={onClose} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}



// PMD_KAZEN_DARK_MODE_FINAL_CLEAN_20260611
function pmdInstallKazenFinalDarkMode() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {}

  const storageKey = "pmd-kazen-japanese-mode"
  const styleId = "pmd-kazen-final-dark-style"

  const installStyle = () => {
    if (document.getElementById(styleId)) return

    const style = document.createElement("style")
    style.id = styleId
    style.textContent = `
      html[data-pmd-kazen-mode="dark"],
      html[data-pmd-kazen-mode="dark"] body {
        background:
          radial-gradient(circle at 80% 0%, rgba(111, 34, 26, .28), transparent 26%),
          linear-gradient(180deg, #0c0907 0%, #050403 52%, #020202 100%) !important;
        color: #f6e8c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page {
        --kazen-paper: #080705;
        --kazen-paper-soft: #0f0c09;
        --kazen-paper-deep: #15110d;
        --kazen-ink: #f6e8c8;
        --kazen-muted: #d7c298;
        --kazen-line: rgba(198, 164, 93, .26);
        --kazen-line-strong: rgba(198, 164, 93, .46);
        --kazen-red: #df685d;
        background:
          radial-gradient(circle at 82% 1%, rgba(118, 38, 29, .20), transparent 28%),
          linear-gradient(180deg, #090806 0%, #050403 100%) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: initial !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-brand,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-brand * {
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        opacity: 1 !important;
        filter: none !important;
        text-shadow: 0 2px 18px rgba(0,0,0,.78) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-subtitle,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-subtitle * {
        color: #d7c298 !important;
        -webkit-text-fill-color: #d7c298 !important;
        opacity: 1 !important;
        filter: none !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-hero {
        background-image:
          linear-gradient(90deg, rgba(5, 5, 6, .60), rgba(5, 5, 6, .07)),
          url("/themes/kazen-japanese/TokyoNight.png") !important;
        background-size: cover !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        border-top: 1px solid rgba(198, 164, 93, .28) !important;
        border-bottom: 1px solid rgba(198, 164, 93, .28) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-motto,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-motto * {
        color: #fff0cc !important;
        -webkit-text-fill-color: #fff0cc !important;
        opacity: 1 !important;
        background: transparent !important;
        text-shadow: 0 2px 18px rgba(0,0,0,.96) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-call {
        color: #df685d !important;
        -webkit-text-fill-color: #df685d !important;
        background: rgba(7, 6, 5, .52) !important;
        border-color: rgba(223, 104, 93, .58) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category:last-child {
        border-color: rgba(198, 164, 93, .25) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-btn,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-btn * {
        color: #e9d8ae !important;
        -webkit-text-fill-color: #e9d8ae !important;
        opacity: 1 !important;
        filter: none !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-title,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-title * {
        color: #e9d8ae !important;
        -webkit-text-fill-color: #e9d8ae !important;
        opacity: 1 !important;
        filter: none !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-btn svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-btn path,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-btn line {
        color: #e9d8ae !important;
        stroke: #e9d8ae !important;
        -webkit-text-fill-color: #e9d8ae !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item {
        background: rgba(15, 12, 9, .82) !important;
        border-color: rgba(198, 164, 93, .31) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-name,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-name * {
        color: #f5e7c5 !important;
        -webkit-text-fill-color: #f5e7c5 !important;
        opacity: 1 !important;
        filter: none !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-description,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-description * {
        color: #d9c79d !important;
        -webkit-text-fill-color: #d9c79d !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-price,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-price * {
        color: #df685d !important;
        -webkit-text-fill-color: #df685d !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-add {
        background: rgba(246, 232, 200, .95) !important;
        color: #080705 !important;
        -webkit-text-fill-color: #080705 !important;
        border-color: rgba(198, 164, 93, .48) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-add svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-add path,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-add line {
        color: #080705 !important;
        stroke: #080705 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-icon-button,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-pill {
        background: rgba(8, 7, 5, .76) !important;
        border-color: rgba(198, 164, 93, .39) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-icon-button svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-icon-button path,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-icon-button line,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-pill svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-pill path,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-pill line {
        color: #f6e8c8 !important;
        stroke: #f6e8c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock {
        background: rgba(7, 6, 5, .94) !important;
        border-color: rgba(198, 164, 93, .32) !important;
        box-shadow: 0 18px 48px rgba(0,0,0,.52) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button * {
        background: rgba(11, 9, 7, .84) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        border-color: rgba(198, 164, 93, .36) !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button[data-primary="true"],
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button[data-primary="true"] * {
        color: #df685d !important;
        -webkit-text-fill-color: #df685d !important;
        border-color: rgba(223, 104, 93, .58) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-paymydine-footer-logo-text {
        display: none !important;
      }



      /* PMD_FIX_KAZEN_WAITER_NOTE_CHECKOUT_DARK_CARDS_20260612
         Force waiter, note and checkout action cards/modals to follow Kazen dark mode. */

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock {
        background:
          linear-gradient(180deg, rgba(13, 10, 7, .98), rgba(4, 3, 2, .98)) !important;
        border-color: rgba(198, 164, 93, .42) !important;
        box-shadow:
          0 -18px 54px rgba(0, 0, 0, .72),
          inset 0 1px 0 rgba(255, 240, 204, .08) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button {
        background:
          linear-gradient(180deg, rgba(22, 17, 11, .96), rgba(8, 6, 4, .96)) !important;
        border: 1px solid rgba(198, 164, 93, .38) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 240, 204, .08),
          0 10px 26px rgba(0,0,0,.34) !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button *,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button path,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button line,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button rect,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button circle {
        color: #f6e8c8 !important;
        stroke: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button[data-primary="true"],
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button[data-primary="true"] * {
        background:
          linear-gradient(180deg, rgba(223, 104, 93, .16), rgba(72, 23, 18, .24)) !important;
        border-color: rgba(223, 104, 93, .64) !important;
        color: #df685d !important;
        stroke: #df685d !important;
        -webkit-text-fill-color: #df685d !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-overlay {
        background: rgba(2, 2, 2, .76) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-panel,
      html[data-pmd-kazen-mode="dark"] body [data-kazen-solid-panel="1"] {
        background:
          radial-gradient(circle at 85% 0%, rgba(111, 34, 26, .20), transparent 28%),
          linear-gradient(180deg, #14100b 0%, #090705 100%) !important;
        background-color: #090705 !important;
        border: 1px solid rgba(198, 164, 93, .42) !important;
        color: #f6e8c8 !important;
        box-shadow:
          0 32px 90px rgba(0,0,0,.78),
          inset 0 1px 0 rgba(255, 240, 204, .08) !important;
        opacity: 1 !important;
        filter: none !important;
        mix-blend-mode: normal !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-sheet {
        background:
          linear-gradient(180deg, rgba(255, 240, 204, .05), rgba(198, 164, 93, .03)) !important;
        border-color: rgba(198, 164, 93, .24) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-head {
        color: #f6e8c8 !important;
        -webkit-text-fill-color: initial !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-head h2,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-head h3,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content label,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content p,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content span {
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-eyebrow {
        color: #df685d !important;
        -webkit-text-fill-color: #df685d !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-close,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content button,
      html[data-pmd-kazen-mode="dark"] body .kazen-primary,
      html[data-pmd-kazen-mode="dark"] body .kazen-secondary {
        background: rgba(12, 9, 6, .92) !important;
        border: 1px solid rgba(198, 164, 93, .40) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-close svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-close path,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-close line,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content button svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content button path,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content button line {
        color: #f6e8c8 !important;
        stroke: #f6e8c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content input,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content textarea,
      html[data-pmd-kazen-mode="dark"] body .kazen-field {
        background: rgba(5, 4, 3, .88) !important;
        border: 1px solid rgba(198, 164, 93, .34) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        caret-color: #df685d !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content input::placeholder,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content textarea::placeholder {
        color: rgba(246, 232, 200, .56) !important;
        -webkit-text-fill-color: rgba(246, 232, 200, .56) !important;
      }

      [data-pmd-kazen-dark-toggle] {
        position: fixed !important;
        top: 24px !important;
        right: max(18px, calc(50vw - 315px)) !important;
        z-index: 999999 !important;
        border: 1px solid rgba(198, 164, 93, .68) !important;
        background: rgba(8, 7, 5, .92) !important;
        color: #f4d58d !important;
        -webkit-text-fill-color: #f4d58d !important;
        padding: 10px 14px !important;
        font-size: 11px !important;
        letter-spacing: .18em !important;
        font-family: Georgia, "Times New Roman", serif !important;
        cursor: pointer !important;
      }
    `

    // Append after the React-rendered <style> block, otherwise original Kazen !important rules can win.
    document.body.appendChild(style)
  }

  const setMode = (mode: "light" | "dark") => {
    document.documentElement.setAttribute("data-pmd-kazen-mode", mode)
    document.body?.setAttribute("data-pmd-kazen-mode", mode)
    try { window.localStorage.setItem(storageKey, mode) } catch {}

    const button = document.querySelector("[data-pmd-kazen-dark-toggle]") as HTMLButtonElement | null
    if (button) {
      button.textContent = mode === "dark" ? "☀ LIGHT" : "☾ DARK"
    }
  }

  const ensureToggle = () => {
    let button = document.querySelector("[data-pmd-kazen-dark-toggle]") as HTMLButtonElement | null
    if (!button) {
      button = document.createElement("button")
      button.type = "button"
      button.setAttribute("data-pmd-kazen-dark-toggle", "1")
      button.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-pmd-kazen-mode") === "dark" ? "dark" : "light"
        setMode(current === "dark" ? "light" : "dark")
      })
      document.body.appendChild(button)
    }
  }

  installStyle()
  ensureToggle()

  let saved = "light"
  try { saved = window.localStorage.getItem(storageKey) || "light" } catch {}

  const urlMode = new URLSearchParams(window.location.search).get("mode")
  setMode(urlMode === "dark" || saved === "dark" ? "dark" : "light")

  return () => {}
}



// PMD_KAZEN_CLEAN_HEADER_BUTTONS_20260611
function pmdInstallKazenCleanHeaderButtons() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {}

  const storageKey = "pmd-kazen-japanese-mode"
  const styleId = "pmd-kazen-clean-header-buttons-style"

  if (!document.getElementById(styleId)) {
    const style = document.createElement("style")
    style.id = styleId
    style.textContent = `
      .kazen-shell {
        position: relative !important;
      }

      [data-pmd-kazen-old-header-control="1"],
      [data-pmd-kazen-dark-toggle]:not([data-pmd-kazen-clean-mode-proxy="1"]) {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }

      [data-pmd-kazen-clean-header-actions="1"] {
        position: absolute !important;
        top: 2.05rem !important;
        right: 1.35rem !important;
        z-index: 80 !important;
        display: grid !important;
        grid-template-columns: repeat(3, 2.62rem) !important;
        gap: .48rem !important;
        align-items: center !important;
        justify-content: end !important;
      }

      .kazen-clean-header-button {
        width: 2.62rem !important;
        height: 2.62rem !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 1px solid rgba(35,34,31,.22) !important;
        background: rgba(255,255,255,.26) !important;
        color: var(--kazen-ink, #242320) !important;
        padding: 0 !important;
        margin: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        cursor: pointer !important;
        font-family: Georgia, "Times New Roman", serif !important;
        font-size: .82rem !important;
        line-height: 1 !important;
      }

      .kazen-clean-header-button svg,
      .kazen-clean-header-button path,
      .kazen-clean-header-button line,
      .kazen-clean-header-button circle,
      .kazen-clean-header-button polyline {
        stroke: currentColor !important;
        color: currentColor !important;
        fill: none !important;
      }

      .kazen-clean-header-button:hover {
        border-color: rgba(184,93,89,.48) !important;
        color: var(--kazen-red, #b85d59) !important;
      }

      html[data-pmd-kazen-mode="dark"] .kazen-clean-header-button {
        background: rgba(8,7,5,.62) !important;
        border-color: rgba(198,164,93,.52) !important;
        color: #f4e7c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] .kazen-clean-header-button:hover {
        border-color: rgba(223,104,93,.65) !important;
        color: #df685d !important;
      }

      @media (max-width: 520px) {
        [data-pmd-kazen-clean-header-actions="1"] {
          top: 1.55rem !important;
          right: 1rem !important;
          grid-template-columns: repeat(3, 2.42rem) !important;
          gap: .38rem !important;
        }

        .kazen-clean-header-button {
          width: 2.42rem !important;
          height: 2.42rem !important;
        }
      }
    `
    document.head.appendChild(style)
  }

  const normalize = (value: string) => value.replace(/\s+/g, " ").trim().toUpperCase()

  const findOldButton = (pattern: RegExp) => {
    const buttons = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[]
    return buttons.find((button) => {
      if (button.closest('[data-pmd-kazen-clean-header-actions="1"]')) return false
      const text = normalize(button.textContent || "")
      return pattern.test(text)
    }) || null
  }

  const markOldHeaderControls = () => {
    const buttons = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[]

    buttons.forEach((button) => {
      if (button.closest('[data-pmd-kazen-clean-header-actions="1"]')) return
      if (button.hasAttribute("data-pmd-kazen-dark-toggle")) return

      const rect = button.getBoundingClientRect()
      const text = normalize(button.textContent || "")
      const cls = String(button.className || "")

      const isTopHeader =
        rect.top >= -20 &&
        rect.top < 290 &&
        (
          /TABLE|VALET|EN|DE|FA|AR|LANG/.test(text) ||
          cls.includes("kazen-icon-button") ||
          cls.includes("kazen-pill")
        )

      if (isTopHeader) {
        button.setAttribute("data-pmd-kazen-old-header-control", "1")
      }
    })
  }

  const currentMode = () =>
    document.documentElement.getAttribute("data-pmd-kazen-mode") === "dark" ? "dark" : "light"

  const setMode = (mode: "light" | "dark") => {
    document.documentElement.setAttribute("data-pmd-kazen-mode", mode)
    document.body?.setAttribute("data-pmd-kazen-mode", mode)
    try { window.localStorage.setItem(storageKey, mode) } catch {}

    const originalToggle = document.querySelector("[data-pmd-kazen-dark-toggle]") as HTMLButtonElement | null
    if (originalToggle) {
      originalToggle.textContent = mode === "dark" ? "☀ LIGHT" : "☾ DARK"
    }

    const proxy = document.querySelector('[data-pmd-kazen-clean-action="mode"]') as HTMLButtonElement | null
    if (proxy) {
      proxy.innerHTML = mode === "dark"
        ? `<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z"/></svg>`
    }
  }

  const createButton = (action: string, title: string, html: string, onClick: () => void) => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "kazen-clean-header-button"
    button.setAttribute("data-pmd-kazen-clean-action", action)
    button.setAttribute("aria-label", title)
    button.title = title
    button.innerHTML = html
    button.addEventListener("click", onClick)
    return button
  }

  const ensureActions = () => {
    const shell = document.querySelector(".kazen-shell") as HTMLElement | null
    const mount = shell || document.body

    let box = document.querySelector('[data-pmd-kazen-clean-header-actions="1"]') as HTMLElement | null
    if (!box) {
      box = document.createElement("div")
      box.setAttribute("data-pmd-kazen-clean-header-actions", "1")

      const languageButton = createButton(
        "language",
        "Language",
        `<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h9M9 3v2M6 9c1.1 2.4 3.1 4.5 6 6M12 9c-.9 2.3-2.8 4.5-6 6"/><path d="M14 20l4-9 4 9M15.3 17h5.4"/></svg>`,
        () => {
          const old = findOldButton(/EN|DE|FA|AR|LANG/)
          if (old) old.click()
        }
      )

      const modeButton = createButton(
        "mode",
        "Mode",
        "",
        () => setMode(currentMode() === "dark" ? "light" : "dark")
      )

      const valetButton = createButton(
        "valet",
        "Valet",
        `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h14l-1.4-5.1A3 3 0 0 0 14.7 9H9.3a3 3 0 0 0-2.9 1.9L5 16Z"/><path d="M7 16v2M17 16v2M8 13h.01M16 13h.01"/></svg>`,
        () => {
          const old = findOldButton(/VALET/)
          if (old) old.click()
        }
      )

      box.appendChild(languageButton)
      box.appendChild(modeButton)
      box.appendChild(valetButton)
      mount.appendChild(box)
    }

    setMode(currentMode())
  }

  markOldHeaderControls()
  ensureActions()

  const interval = window.setInterval(() => {
    markOldHeaderControls()
    ensureActions()
  }, 500)

  return () => window.clearInterval(interval)
}



// PMD_KAZEN_PREMIUM_MOTION_20260611
function pmdInstallKazenPremiumMotion() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {}

  const styleId = "pmd-kazen-premium-motion-style"
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style")
    style.id = styleId
    style.textContent = `
      :root {
        --pmd-kazen-ease-out: cubic-bezier(.16, 1, .3, 1);
        --pmd-kazen-ease-soft: cubic-bezier(.22, .68, 0, 1);
        --pmd-kazen-ease-inout: cubic-bezier(.65, 0, .35, 1);
      }

      @keyframes pmdKazenFadeUp {
        from { opacity: 0; transform: translate3d(0, 14px, 0) scale(.985); }
        to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
      }

      @keyframes pmdKazenModalIn {
        from { opacity: 0; transform: translate3d(0, 18px, 0) scale(.965); }
        to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
      }

      @keyframes pmdKazenOverlayIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes pmdKazenCartPulse {
        0% { transform: translateX(-50%) scale(1); }
        35% { transform: translateX(-50%) scale(1.025); }
        100% { transform: translateX(-50%) scale(1); }
      }

      @keyframes pmdKazenAddPop {
        0% { transform: scale(1); }
        42% { transform: scale(.88); }
        72% { transform: scale(1.08); }
        100% { transform: scale(1); }
      }

      .kazen-page {
        scroll-behavior: smooth;
      }

      .kazen-page * {
        -webkit-tap-highlight-color: transparent;
      }

      .kazen-shell,
      .kazen-hero,
      .kazen-call,
      .kazen-category,
      .kazen-category-btn,
      .kazen-category-label,
      .kazen-category-icon,
      .kazen-category-icon-shell,
      .kazen-category-title,
      .kazen-item,
      .kazen-item-image,
      .kazen-item-image-empty,
      .kazen-item-name,
      .kazen-item-description,
      .kazen-item-price,
      .kazen-add,
      .kazen-dock,
      .kazen-dock button,
      .kazen-clean-header-button,
      .kazen-primary,
      .kazen-secondary,
      .kazen-field,
      .kazen-qty button,
      .kazen-solid-close {
        transition-property: transform, opacity, color, background-color, border-color, box-shadow, filter, max-height, padding, margin;
        transition-duration: 260ms;
        transition-timing-function: var(--pmd-kazen-ease-out);
      }

      .kazen-shell {
        animation: pmdKazenFadeUp 520ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-hero {
        transition-duration: 420ms;
      }

      .kazen-hero:hover {
        filter: brightness(1.035) saturate(1.03);
      }

      .kazen-call,
      .kazen-category-btn,
      .kazen-add,
      .kazen-dock button,
      .kazen-clean-header-button,
      .kazen-primary,
      .kazen-secondary,
      .kazen-qty button,
      .kazen-solid-close {
        will-change: transform;
      }

      .kazen-call:hover,
      .kazen-category-btn:hover,
      .kazen-dock button:hover,
      .kazen-clean-header-button:hover,
      .kazen-primary:hover,
      .kazen-secondary:hover,
      .kazen-solid-close:hover {
        transform: translate3d(0, -2px, 0);
        box-shadow: 0 14px 34px rgba(0,0,0,.10);
      }

      .kazen-call:active,
      .kazen-category-btn:active,
      .kazen-add:active,
      .kazen-dock button:active,
      .kazen-clean-header-button:active,
      .kazen-primary:active,
      .kazen-secondary:active,
      .kazen-qty button:active,
      .kazen-solid-close:active,
      .pmd-kazen-tap-active {
        transform: scale(.965) !important;
      }

      .kazen-category {
        overflow: visible;
      }

      .kazen-category.is-open {
        background: linear-gradient(180deg, rgba(255,255,255,.025), transparent);
      }

      .kazen-category.is-open .kazen-category-icon-shell,
      .kazen-category-btn:hover .kazen-category-icon-shell {
        transform: translate3d(2px, 0, 0) scale(1.06);
      }

      .kazen-category.is-open .kazen-category-title {
        letter-spacing: .50em;
      }

      .kazen-category.is-open .kazen-category-btn svg {
        transform: rotate(180deg) scale(.92);
      }

      .kazen-category-btn svg {
        transition: transform 300ms var(--pmd-kazen-ease-out), color 260ms var(--pmd-kazen-ease-out), stroke 260ms var(--pmd-kazen-ease-out);
        transform-origin: 50% 50%;
      }

      .kazen-accordion {
        overflow: hidden;
        max-height: 0;
        opacity: 0;
        transform: translate3d(0, -8px, 0);
        transition:
          max-height 520ms var(--pmd-kazen-ease-soft),
          opacity 280ms ease,
          transform 420ms var(--pmd-kazen-ease-out),
          padding 420ms var(--pmd-kazen-ease-out);
        will-change: max-height, opacity, transform;
        pointer-events: none;
      }

      .kazen-accordion.is-open {
        /* PMD_FIX_KAZEN_IFRAME_ACCORDION_ALL_ITEMS_20260612 */
        max-height: none !important;
        height: auto !important;
        overflow: visible !important;
        opacity: 1;
        transform: translate3d(0, 0, 0);
        pointer-events: auto;
      }

      .kazen-accordion.is-closed .kazen-items {
        transform: translate3d(0, -10px, 0);
      }

      .kazen-accordion.is-open .kazen-items {
        animation: pmdKazenFadeUp 380ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-accordion.is-open .kazen-item {
        animation: pmdKazenFadeUp 420ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-accordion.is-open .kazen-item:nth-child(1) { animation-delay: 25ms; }
      .kazen-accordion.is-open .kazen-item:nth-child(2) { animation-delay: 55ms; }
      .kazen-accordion.is-open .kazen-item:nth-child(3) { animation-delay: 85ms; }
      .kazen-accordion.is-open .kazen-item:nth-child(4) { animation-delay: 115ms; }
      .kazen-accordion.is-open .kazen-item:nth-child(5) { animation-delay: 145ms; }
      .kazen-accordion.is-open .kazen-item:nth-child(n+6) { animation-delay: 175ms; }

      .kazen-item:hover {
        transform: translate3d(0, -3px, 0);
        box-shadow: 0 18px 42px rgba(0,0,0,.16) !important;
      }

      .kazen-item:hover .kazen-item-image,
      .kazen-item:hover .kazen-item-image-empty {
        transform: scale(1.035);
      }

      .kazen-add:hover {
        transform: scale(1.06) rotate(3deg);
        box-shadow: 0 12px 26px rgba(0,0,0,.14) !important;
      }

      .kazen-add.pmd-kazen-added {
        animation: pmdKazenAddPop 420ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-dock {
        transition-duration: 320ms;
      }

      .kazen-dock:hover {
        transform: translateX(-50%) translateY(-2px);
        box-shadow: 0 24px 58px rgba(0,0,0,.22) !important;
      }

      .kazen-dock.pmd-kazen-cart-pulse {
        animation: pmdKazenCartPulse 450ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-solid-modal-overlay {
        animation: pmdKazenOverlayIn 220ms ease both;
      }

      html body .kazen-solid-modal-panel {
        animation: pmdKazenModalIn 380ms var(--pmd-kazen-ease-out) both;
        transform-origin: 50% 54% !important;
      }

      html body .kazen-solid-modal-panel .kazen-modal-image {
        animation: pmdKazenFadeUp 420ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-field:focus {
        border-color: rgba(184,93,89,.58) !important;
        box-shadow: 0 0 0 3px rgba(184,93,89,.10) !important;
      }

      html[data-pmd-kazen-mode="dark"] .kazen-call:hover,
      html[data-pmd-kazen-mode="dark"] .kazen-category-btn:hover,
      html[data-pmd-kazen-mode="dark"] .kazen-dock button:hover,
      html[data-pmd-kazen-mode="dark"] .kazen-clean-header-button:hover,
      html[data-pmd-kazen-mode="dark"] .kazen-primary:hover,
      html[data-pmd-kazen-mode="dark"] .kazen-secondary:hover {
        box-shadow: 0 14px 34px rgba(0,0,0,.32) !important;
      }

      @media (prefers-reduced-motion: reduce) {
        .kazen-page *,
        .kazen-page *::before,
        .kazen-page *::after {
          animation: none !important;
          transition-duration: 1ms !important;
          scroll-behavior: auto !important;
        }
      }
    `
    document.body.appendChild(style)
  }

  const pulse = (el: Element | null, className: string, ms = 430) => {
    if (!(el instanceof HTMLElement)) return
    el.classList.remove(className)
    void el.offsetWidth
    el.classList.add(className)
    window.setTimeout(() => el.classList.remove(className), ms)
  }

  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as HTMLElement | null
    const button = target?.closest?.("button, .kazen-item, .kazen-clean-header-button") as HTMLElement | null
    if (!button) return
    button.classList.add("pmd-kazen-tap-active")
    window.setTimeout(() => button.classList.remove("pmd-kazen-tap-active"), 180)
  }

  const onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    const addButton = target?.closest?.(".kazen-add") as HTMLElement | null
    if (addButton) {
      pulse(addButton, "pmd-kazen-added", 440)
      pulse(document.querySelector(".kazen-dock"), "pmd-kazen-cart-pulse", 470)
    }
  }

  document.addEventListener("pointerdown", onPointerDown, true)
  document.addEventListener("click", onClick, true)

  return () => {
    document.removeEventListener("pointerdown", onPointerDown, true)
    document.removeEventListener("click", onClick, true)
  }
}



// PMD_KAZEN_DISABLE_DIRECT_CHECKOUT_20260612: checkout buttons post to parent shared PaymentModal; local Kazen bill card disabled.
export default function KazenJapaneseThemePage() {
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
      <style>{`
        /* PMD_KAZEN_FULL_THEME_PAGE_20260611 */
        :root {
          --kazen-paper: #f7f3ec;
          --kazen-paper-soft: #fbf8f2;
          --kazen-paper-deep: #f1ebe2;
          --kazen-ink: #242320;
          --kazen-muted: #77716a;
          --kazen-line: rgba(35, 34, 31, .15);
          --kazen-line-strong: rgba(35, 34, 31, .24);
          --kazen-red: #b85d59;
        }

        html[data-pmd-kazen-active="1"],
        body[data-pmd-kazen-active="1"] {
          background: var(--kazen-paper) !important;
          color: var(--kazen-ink) !important;
        }

        .kazen-page {
          min-height: 100dvh;
          color: var(--kazen-ink);
          background:
            radial-gradient(circle at 84% 0%, rgba(184,93,89,.07), transparent 24%),
            linear-gradient(180deg, #fbf8f2 0%, var(--kazen-paper) 48%, #f6f0e8 100%);
          font-family: Georgia, "Times New Roman", serif;
          padding-bottom: 7.25rem;
        }

        .kazen-page *,
        .kazen-page svg,
        .kazen-page path,
        .kazen-page line {
          text-shadow: none !important;
        }

        .kazen-shell {
          width: min(100%, 460px);
          margin: 0 auto;
          padding: 2rem 1.35rem 1.5rem;
        }

        .kazen-enso {
          width: 5.6rem;
          height: 5.6rem;
          border-radius: 9999px;
          position: relative;
          background: conic-gradient(from 34deg, transparent 0 10%, rgba(36,35,32,.92) 16% 38%, rgba(36,35,32,.18) 46%, rgba(36,35,32,.85) 63% 82%, transparent 88% 100%);
          filter: blur(.15px);
        }

        .kazen-enso::after {
          content: "";
          position: absolute;
          inset: .72rem;
          border-radius: inherit;
          background: #fbf8f2;
        }

        .kazen-logo {
          width: 5.6rem;
          height: 5.6rem;
          object-fit: contain;
          display: block;
        }

        .kazen-stamp {
          writing-mode: vertical-rl;
          color: var(--kazen-red);
          border: 1px solid rgba(184,93,89,.46);
          font-size: .48rem;
          line-height: 1;
          padding: .2rem .12rem;
          letter-spacing: .08em;
        }

        .kazen-brand {
          letter-spacing: .48em;
          font-size: 1.52rem;
          margin-top: .9rem;
          color: var(--kazen-ink);
        }

        .kazen-subtitle {
          letter-spacing: .42em;
          font-size: .58rem;
          color: var(--kazen-muted);
          margin-top: .42rem;
          text-transform: uppercase;
        }

        .kazen-icon-button {
          border: 1px solid transparent;
          background: transparent;
          color: var(--kazen-ink);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .kazen-icon-button svg,
        .kazen-icon-button path,
        .kazen-icon-button line {
          color: var(--kazen-ink) !important;
          stroke: var(--kazen-ink) !important;
        }

        .kazen-pill {
          border: 1px solid var(--kazen-line);
          background: rgba(255,255,255,.36);
          padding: .48rem .72rem;
          font-size: .64rem;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: var(--kazen-muted);
        }

        .kazen-pill svg,
        .kazen-pill path,
        .kazen-pill line {
          color: var(--kazen-ink) !important;
          stroke: var(--kazen-ink) !important;
        }

        .kazen-hero {
          position: relative;
          height: 14.6rem;
          margin: 2.2rem -1.35rem 2rem;
          overflow: hidden;
          border-top: 1px solid rgba(35,34,31,.08);
          border-bottom: 1px solid rgba(35,34,31,.10);
          background-image:
            linear-gradient(90deg, rgba(247,243,236,.78), rgba(247,243,236,.18)),
            url("/themes/kazen-japanese/BGJ.png");
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }

        .kazen-motto {
          position: absolute;
          left: 2.1rem;
          top: 3.25rem;
          color: var(--kazen-ink);
          font-size: 1rem;
          line-height: 2.2;
          letter-spacing: .12em;
        }

        .kazen-red-line {
          width: 2.05rem;
          height: 1px;
          background: var(--kazen-red);
          margin: 1.35rem 0 1.1rem;
        }

        .kazen-call {
          width: 100%;
          border: 1px solid rgba(184,93,89,.38);
          color: var(--kazen-red);
          background: rgba(255,255,255,.20);
          min-height: 4rem;
          letter-spacing: .34em;
          font-weight: 700;
          text-transform: uppercase;
        }

        .kazen-category {
          border-top: 1px solid rgba(35,34,31,.10);
        }

        .kazen-category:last-child {
          border-bottom: 1px solid rgba(35,34,31,.10);
        }

        .kazen-category-btn {
          width: 100%;
          min-height: 4.55rem;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          text-align: left;
          background: transparent;
          color: var(--kazen-ink);
        }

        .kazen-category-title {
          letter-spacing: .46em;
          font-size: 1.22rem;
          text-transform: uppercase;
          color: var(--kazen-ink);
        }


        /* PMD_KAZEN_CATEGORY_ICONS_CSS_20260611 */
        .kazen-category-label {
          display: inline-flex;
          align-items: center;
          gap: .9rem;
          min-width: 0;
        }

        .kazen-category-icon-shell {
          width: 2.15rem;
          height: 2.15rem;
          flex: 0 0 2.15rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(35,34,31,.16);
          background: rgba(255,255,255,.34);
          border-radius: 999px;
        }

        .kazen-category-icon {
          width: 1.35rem;
          height: 1.35rem;
          display: block;
          object-fit: contain;
        }

        .kazen-dotline {
          padding-left: 0 !important;
        }

        .kazen-dotline::before,
        .kazen-dotline::after {
          display: none !important;
          content: none !important;
        }

        html[data-pmd-kazen-mode="dark"] .kazen-category-icon-shell {
          background: rgba(244,231,200,.92) !important;
          border-color: rgba(198,164,93,.50) !important;
          box-shadow: 0 8px 22px rgba(0,0,0,.28);
        }

        html[data-pmd-kazen-mode="dark"] .kazen-category-icon {
          opacity: 1 !important;
          filter: none !important;
        }


        /* PMD_KAZEN_CATEGORY_ICON_NO_FRAME_20260611 */
        .kazen-category-icon-shell {
          width: 2.35rem !important;
          height: 2.35rem !important;
          flex: 0 0 2.35rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: none !important;
          background: transparent !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
        }

        .kazen-category-icon {
          width: 2.05rem !important;
          height: 2.05rem !important;
          display: block !important;
          object-fit: contain !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html[data-pmd-kazen-mode="dark"] .kazen-category-icon-shell {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        html[data-pmd-kazen-mode="dark"] .kazen-category-icon {
          opacity: 1 !important;
          filter: none !important;
        }

        .kazen-dotline {
          position: relative;
          padding-left: 1.3rem;
        }

        .kazen-dotline::before {
          content: "";
          position: absolute;
          left: 0;
          top: .45rem;
          width: .42rem;
          height: .42rem;
          border-radius: 999px;
          background: var(--kazen-red);
        }

        .kazen-dotline::after {
          content: "";
          position: absolute;
          left: .19rem;
          top: .9rem;
          bottom: .15rem;
          width: 1px;
          background: rgba(35,34,31,.12);
        }

        .kazen-category-btn svg,
        .kazen-category-btn path,
        .kazen-category-btn line,
        .kazen-add svg,
        .kazen-add path,
        .kazen-add line {
          color: #242320 !important;
          stroke: #242320 !important;
          fill: none !important;
          opacity: 1 !important;
        }

        .kazen-items {
          display: grid;
          gap: .85rem;
          padding-bottom: 1.35rem;
        }

        .kazen-item {
          border: 1px solid rgba(35,34,31,.14);
          background: rgba(255,255,255,.28);
          padding: .78rem;
          display: grid;
          grid-template-columns: 4.65rem 1fr auto;
          gap: .85rem;
          align-items: center;
        }

        .kazen-item-image {
          width: 4.65rem;
          height: 4.65rem;
          border: 1px solid rgba(35,34,31,.12);
          background: rgba(241,235,226,.68);
          object-fit: cover;
          display: block;
        }

        .kazen-item-image-empty {
          width: 4.65rem;
          height: 4.65rem;
          border: 1px solid rgba(35,34,31,.12);
          background:
            radial-gradient(circle at 50% 42%, rgba(36,35,32,.08), transparent 42%),
            rgba(241,235,226,.68);
          display: grid;
          place-items: center;
          color: rgba(36,35,32,.36);
          font-size: .62rem;
          letter-spacing: .18em;
          text-transform: uppercase;
        }

        .kazen-item-name {
          color: var(--kazen-ink);
          font-weight: 700;
          font-size: 1rem;
          letter-spacing: .025em;
        }

        .kazen-item-description {
          margin-top: .35rem;
          color: var(--kazen-muted);
          font-size: .88rem;
          line-height: 1.42;
        }

        .kazen-item-price {
          margin-top: .52rem;
          color: var(--kazen-ink);
          font-size: .92rem;
          font-weight: 700;
        }

        .kazen-add {
          width: 2.5rem;
          height: 2.5rem;
          border: 1px solid rgba(35,34,31,.24);
          background: rgba(255,255,255,.22);
          color: var(--kazen-ink);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .kazen-dock {
          position: fixed;
          left: 50%;
          bottom: 1rem;
          transform: translateX(-50%);
          z-index: 30;
          width: min(calc(100% - 2rem), 420px);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: .7rem;
          border: 1px solid rgba(35,34,31,.12);
          background: rgba(247,243,236,.90);
          backdrop-filter: none;
          padding: .65rem;
          box-shadow: 0 18px 48px rgba(36,30,24,.13);
        }

        .kazen-dock button {
          min-height: 3.1rem;
          border: 1px solid rgba(35,34,31,.13);
          background: rgba(255,255,255,.28);
          color: var(--kazen-ink);
          font-size: .66rem;
          letter-spacing: .16em;
          text-transform: uppercase;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: .22rem;
        }

        .kazen-dock button[data-primary="true"] {
          border-color: rgba(184,93,89,.38);
          color: var(--kazen-red);
        }

        .kazen-dock svg,
        .kazen-dock path,
        .kazen-dock line {
          stroke: currentColor !important;
        }

        .kazen-modal {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: grid;
          place-items: center;
          background: rgba(35,31,27,.26);
          backdrop-filter: none;
          padding: 1rem;
        }

        .kazen-modal-card {
          width: min(100%, 420px);
          max-height: min(88dvh, 720px);
          overflow: auto;
          background:
            radial-gradient(circle at 88% 0%, rgba(184,93,89,.055), transparent 28%),
            var(--kazen-paper);
          border: 1px solid rgba(35,34,31,.18);
          box-shadow: 0 24px 70px rgba(36,30,24,.20);
          padding: 1.15rem;
        }

        .kazen-modal-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(35,34,31,.10);
        }

        .kazen-modal-head h2 {
          font-size: 1.32rem;
          letter-spacing: .18em;
          text-transform: uppercase;
          color: var(--kazen-ink);
        }

        .kazen-eyebrow {
          color: var(--kazen-red);
          font-size: .62rem;
          letter-spacing: .22em;
          text-transform: uppercase;
          margin-bottom: .4rem;
        }

        .kazen-close {
          width: 2.5rem;
          height: 2.5rem;
          border: 1px solid rgba(35,34,31,.14);
          background: rgba(255,255,255,.24);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .kazen-modal-image {
          width: 100%;
          height: 13rem;
          object-fit: cover;
          border: 1px solid rgba(35,34,31,.12);
          margin-top: 1rem;
          background: rgba(241,235,226,.70);
        }

        .kazen-field {
          width: 100%;
          border: 1px solid rgba(35,34,31,.16);
          background: rgba(255,255,255,.30);
          padding: .82rem .9rem;
          color: var(--kazen-ink);
          outline: none;
        }

        .kazen-field::placeholder {
          color: rgba(36,35,32,.42);
        }

        .kazen-primary {
          width: 100%;
          min-height: 3.45rem;
          border: 1px solid rgba(184,93,89,.42);
          background: rgba(184,93,89,.08);
          color: var(--kazen-red);
          text-transform: uppercase;
          letter-spacing: .22em;
          font-weight: 700;
        }

        .kazen-secondary {
          width: 100%;
          min-height: 3.45rem;
          border: 1px solid rgba(35,34,31,.16);
          background: rgba(255,255,255,.24);
          color: var(--kazen-ink);
          text-transform: uppercase;
          letter-spacing: .18em;
        }

        .kazen-qty {
          display: grid;
          grid-template-columns: 2.8rem 1fr 2.8rem;
          align-items: center;
          border: 1px solid rgba(35,34,31,.14);
          margin-top: 1rem;
        }

        .kazen-qty button {
          height: 2.8rem;
          display: grid;
          place-items: center;
          color: var(--kazen-ink);
        }

        .kazen-qty strong {
          text-align: center;
          color: var(--kazen-ink);
        }

        .kazen-cart-line {
          display: grid;
          grid-template-columns: 3.4rem 1fr auto;
          align-items: center;
          gap: .75rem;
          border-bottom: 1px solid rgba(35,34,31,.10);
          padding: .75rem 0;
        }

        .kazen-cart-img {
          width: 3.4rem;
          height: 3.4rem;
          object-fit: cover;
          border: 1px solid rgba(35,34,31,.12);
          background: rgba(241,235,226,.72);
        }

        /* PMD_KAZEN_SOLID_CARDS_LOGO_TABLE_FINAL_20260611 */
        .kazen-page {
          color: #242320 !important;
          isolation: isolate !important;
        }

        .kazen-page *,
        .kazen-page button,
        .kazen-page span,
        .kazen-page div,
        .kazen-page p,
        .kazen-page h1,
        .kazen-page h2,
        .kazen-page h3,
        .kazen-page label,
        .kazen-page strong {
          opacity: 1 !important;
          text-shadow: none !important;
        }

        .kazen-brand,
        .kazen-category-title,
        .kazen-item-name,
        .kazen-item-price,
        .kazen-modal-card,
        .kazen-modal-card *,
        .kazen-pill,
        .kazen-icon-button {
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        .kazen-subtitle,
        .kazen-item-description,
        .kazen-eyebrow,
        .kazen-modal-card p {
          opacity: 1 !important;
        }

        .kazen-category-title {
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
        }

        .kazen-category-btn svg,
        .kazen-category-btn svg *,
        .kazen-category-btn path,
        .kazen-category-btn line,
        .kazen-add svg,
        .kazen-add svg *,
        .kazen-add path,
        .kazen-add line {
          color: #242320 !important;
          stroke: #242320 !important;
          fill: none !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
        }

        .kazen-item {
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          border: 1px solid rgba(35,34,31,.16) !important;
          box-shadow: 0 10px 24px rgba(36,30,24,.055) !important;
          opacity: 1 !important;
        }

        .kazen-item-image,
        .kazen-cart-img,
        .kazen-modal-image {
          background: #f1ebe2 !important;
          border: 1px solid rgba(35,34,31,.14) !important;
          opacity: 1 !important;
        }

        .kazen-item-image-empty {
          background: #f1ebe2 !important;
          border: 1px solid rgba(35,34,31,.14) !important;
          color: rgba(36,35,32,.48) !important;
          -webkit-text-fill-color: rgba(36,35,32,.48) !important;
          opacity: 1 !important;
        }

        .kazen-add {
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          border: 1px solid rgba(35,34,31,.28) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
          box-shadow: 0 8px 18px rgba(36,30,24,.055) !important;
        }

        .kazen-modal {
          z-index: 999999 !important;
          background: rgba(35,31,27,.54) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          opacity: 1 !important;
        }

        .kazen-modal-card {
          position: relative !important;
          z-index: 2 !important;
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          background-image:
            radial-gradient(circle at 88% 0%, rgba(184,93,89,.04), transparent 28%),
            linear-gradient(180deg, #fbf8f2 0%, #f7f3ec 100%) !important;
          border: 1px solid rgba(35,34,31,.22) !important;
          box-shadow: 0 28px 84px rgba(36,30,24,.32) !important;
          opacity: 1 !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .kazen-modal-card::before,
        .kazen-modal-card::after {
          display: none !important;
        }

        .kazen-modal-head {
          background: transparent !important;
          border-bottom: 1px solid rgba(35,34,31,.12) !important;
          opacity: 1 !important;
        }

        .kazen-modal-head h2 {
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
        }

        .kazen-close {
          background: #f7f3ec !important;
          background-color: #f7f3ec !important;
          border: 1px solid rgba(35,34,31,.20) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
        }

        .kazen-close svg,
        .kazen-close path,
        .kazen-close line {
          color: #242320 !important;
          stroke: #242320 !important;
          opacity: 1 !important;
        }

        .kazen-primary {
          background: rgba(184,93,89,.10) !important;
          border-color: rgba(184,93,89,.50) !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          opacity: 1 !important;
        }

        .kazen-secondary {
          background: #fbf8f2 !important;
          border-color: rgba(35,34,31,.18) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
        }

        .kazen-dock {
          background: rgba(247,243,236,.96) !important;
          border-color: rgba(35,34,31,.16) !important;
          opacity: 1 !important;
        }

        .kazen-dock button {
          background: #fbf8f2 !important;
          border-color: rgba(35,34,31,.16) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
        }

        .kazen-dock button[data-primary="true"] {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          border-color: rgba(184,93,89,.46) !important;
        }

        .kazen-field {
          background: #fbf8f2 !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          border-color: rgba(35,34,31,.18) !important;
          opacity: 1 !important;
        }

        .kazen-logo {
          opacity: 1 !important;
          filter: none !important;
        }


        /* PMD_KAZEN_NO_FREEZE_SOLID_UI_20260611 */

        .kazen-page,
        .kazen-page * {
          opacity: 1 !important;
          text-shadow: none !important;
        }

        .kazen-page {
          background:
            radial-gradient(circle at 84% 0%, rgba(184,93,89,.06), transparent 24%),
            linear-gradient(180deg, #fbf8f2 0%, #f7f3ec 56%, #f4eee6 100%) !important;
          color: #242320 !important;
        }

        .kazen-brand,
        .kazen-category-title,
        .kazen-item-name,
        .kazen-item-price,
        .kazen-modal-head h2,
        .kazen-pill,
        .kazen-icon-button,
        .kazen-close,
        .kazen-secondary {
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        .kazen-category-title {
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
        }

        .kazen-category-btn svg,
        .kazen-category-btn svg *,
        .kazen-category-btn path,
        .kazen-category-btn line,
        .kazen-add svg,
        .kazen-add svg *,
        .kazen-add path,
        .kazen-add line,
        .kazen-qty svg,
        .kazen-qty path,
        .kazen-qty line {
          color: #242320 !important;
          stroke: #242320 !important;
          fill: none !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
        }

        .kazen-item {
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          border: 1px solid rgba(35,34,31,.16) !important;
          box-shadow: 0 12px 28px rgba(36,30,24,.07) !important;
          opacity: 1 !important;
        }

        .kazen-item-image,
        .kazen-item-image-empty,
        .kazen-cart-img,
        .kazen-modal-image {
          background: #f1ebe2 !important;
          background-color: #f1ebe2 !important;
          border: 1px solid rgba(35,34,31,.14) !important;
          opacity: 1 !important;
        }

        .kazen-add {
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          border: 1px solid rgba(35,34,31,.30) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
          box-shadow: 0 8px 18px rgba(36,30,24,.06) !important;
        }

        .kazen-modal {
          z-index: 999999 !important;
          background: rgba(35,31,27,.58) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          opacity: 1 !important;
        }

        .kazen-modal-card {
          position: relative !important;
          z-index: 2 !important;
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          background-image:
            radial-gradient(circle at 88% 0%, rgba(184,93,89,.04), transparent 28%),
            linear-gradient(180deg, #fbf8f2 0%, #f7f3ec 100%) !important;
          border: 1px solid rgba(35,34,31,.24) !important;
          box-shadow: 0 32px 92px rgba(36,30,24,.36) !important;
          opacity: 1 !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .kazen-modal-card,
        .kazen-modal-card * {
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
        }

        .kazen-eyebrow,
        .kazen-primary,
        .kazen-call,
        .kazen-dock button[data-primary="true"] {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        .kazen-primary {
          background: rgba(184,93,89,.10) !important;
          border-color: rgba(184,93,89,.50) !important;
        }

        .kazen-secondary,
        .kazen-close,
        .kazen-field,
        .kazen-qty {
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          border-color: rgba(35,34,31,.18) !important;
        }

        .kazen-dock {
          background: rgba(247,243,236,.98) !important;
          border-color: rgba(35,34,31,.16) !important;
          box-shadow: 0 18px 48px rgba(36,30,24,.16) !important;
        }

        .kazen-dock button {
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          border-color: rgba(35,34,31,.16) !important;
        }

        .kazen-logo {
          opacity: 1 !important;
          filter: none !important;
          max-width: 5.6rem !important;
          max-height: 5.6rem !important;
        }



        /* PMD_KAZEN_MODAL_CRISP_LOGO_FINAL_20260611 */

        .kazen-modal {
          background: rgba(36, 32, 28, .52) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          filter: none !important;
          opacity: 1 !important;
        }

        .kazen-modal-card {
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          background-image:
            radial-gradient(circle at 90% 0%, rgba(184,93,89,.035), transparent 30%),
            linear-gradient(180deg, #fbf8f2 0%, #f7f3ec 100%) !important;
          border: 1px solid rgba(35,34,31,.24) !important;
          box-shadow: 0 26px 68px rgba(36,30,24,.34) !important;
          opacity: 1 !important;
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          transform: translateZ(0) !important;
          mix-blend-mode: normal !important;
          -webkit-font-smoothing: antialiased !important;
        }

        .kazen-modal-card,
        .kazen-modal-card * {
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          opacity: 1 !important;
          mix-blend-mode: normal !important;
        }

        .kazen-modal-image,
        .kazen-item-image,
        .kazen-cart-img {
          filter: none !important;
          opacity: 1 !important;
          mix-blend-mode: normal !important;
        }

        .kazen-close {
          background: #f7f3ec !important;
          background-color: #f7f3ec !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          border-color: rgba(35,34,31,.24) !important;
          filter: none !important;
          opacity: 1 !important;
        }

        .kazen-close svg,
        .kazen-close path,
        .kazen-close line {
          color: #242320 !important;
          stroke: #242320 !important;
          opacity: 1 !important;
        }

        .kazen-enso {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }

        .kazen-logo {
          width: auto !important;
          max-width: 7.25rem !important;
          height: 5.6rem !important;
          max-height: 5.6rem !important;
          object-fit: contain !important;
          display: block !important;
          filter: none !important;
          opacity: 1 !important;
        }

        .kazen-logo-fallback {
          display: grid !important;
          place-items: center !important;
          width: 5.6rem !important;
          height: 5.6rem !important;
          border: 1px solid rgba(35,34,31,.16) !important;
          background: #fbf8f2 !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          font-size: .62rem !important;
          letter-spacing: .18em !important;
          text-transform: uppercase !important;
        }


        /* PMD_KAZEN_SAFE_LOGO_TABLE_CSS_20260611 */
        .kazen-modal {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          filter: none !important;
          background: rgba(36, 32, 28, .42) !important;
        }

        .kazen-modal-card {
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          border: 1px solid rgba(35,34,31,.22) !important;
          box-shadow: 0 24px 64px rgba(36,30,24,.26) !important;
          opacity: 1 !important;
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          mix-blend-mode: normal !important;
        }

        .kazen-modal-card,
        .kazen-modal-card * {
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          opacity: 1 !important;
          mix-blend-mode: normal !important;
        }

        .kazen-enso {
          display: none !important;
        }

        .kazen-logo {
          width: auto !important;
          max-width: 7.25rem !important;
          height: 5.6rem !important;
          object-fit: contain !important;
          display: block !important;
          filter: none !important;
          opacity: 1 !important;
        }

        .kazen-logo-fallback {
          width: 5.6rem !important;
          height: 5.6rem !important;
          display: grid !important;
          place-items: center !important;
          border: 1px solid rgba(35,34,31,.16) !important;
          background: #fbf8f2 !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          font-size: .62rem !important;
          letter-spacing: .18em !important;
          text-transform: uppercase !important;
        }


        /* PMD_KAZEN_CRISP_NO_BLUR_SAFE_LOGO_20260611 */
        .kazen-modal {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          filter: none !important;
          background: rgba(36,32,28,.42) !important;
        }

        .kazen-modal-card {
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          border: 1px solid rgba(35,34,31,.22) !important;
          box-shadow: 0 24px 64px rgba(36,30,24,.26) !important;
          opacity: 1 !important;
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          mix-blend-mode: normal !important;
        }

        .kazen-modal-card,
        .kazen-modal-card * {
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          opacity: 1 !important;
          mix-blend-mode: normal !important;
        }

        .kazen-enso {
          display: none !important;
        }

        .kazen-logo {
          width: auto !important;
          max-width: 7.25rem !important;
          height: 5.6rem !important;
          object-fit: contain !important;
          display: block !important;
          filter: none !important;
          opacity: 1 !important;
        }


        /* PMD_KAZEN_REAL_SOLID_MODAL_CARD_20260611 */

        html body .kazen-solid-modal-overlay {
          position: fixed !important;
          inset: 0 !important;
          z-index: 9999999 !important;
          display: grid !important;
          place-items: center !important;
          padding: 1rem !important;
          background: rgba(36, 32, 28, .42) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          filter: none !important;
          opacity: 1 !important;
          isolation: isolate !important;
        }

        html body .kazen-solid-modal-panel {
          position: relative !important;
          z-index: 1 !important;
          width: min(100%, 430px) !important;
          max-height: min(88dvh, 740px) !important;
          overflow: auto !important;
          padding: 1.15rem !important;
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          background-image: none !important;
          border: 1px solid rgba(35, 34, 31, .24) !important;
          box-shadow: 0 28px 78px rgba(36, 30, 24, .34) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          mix-blend-mode: normal !important;
          isolation: isolate !important;
          transform: translateZ(0) !important;
        }

        html body .kazen-solid-modal-sheet {
          position: absolute !important;
          inset: 0 !important;
          z-index: 0 !important;
          display: block !important;
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          background-image:
            radial-gradient(circle at 92% 0%, rgba(184,93,89,.035), transparent 30%),
            linear-gradient(180deg, #fbf8f2 0%, #f7f3ec 100%) !important;
          opacity: 1 !important;
          pointer-events: none !important;
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          mix-blend-mode: normal !important;
        }

        html body .kazen-solid-modal-content {
          position: relative !important;
          z-index: 2 !important;
          background: transparent !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          mix-blend-mode: normal !important;
        }

        html body .kazen-solid-modal-content *,
        html body .kazen-solid-modal-panel * {
          opacity: 1 !important;
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          mix-blend-mode: normal !important;
          text-shadow: none !important;
        }

        html body .kazen-solid-modal-head {
          position: relative !important;
          z-index: 3 !important;
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 1rem !important;
          padding-bottom: 1rem !important;
          margin-bottom: 1rem !important;
          border-bottom: 1px solid rgba(35,34,31,.14) !important;
          background: transparent !important;
        }

        html body .kazen-solid-modal-head h2 {
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          font-size: 1.32rem !important;
          letter-spacing: .18em !important;
          text-transform: uppercase !important;
          opacity: 1 !important;
        }

        html body .kazen-solid-eyebrow {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          font-size: .62rem !important;
          letter-spacing: .22em !important;
          text-transform: uppercase !important;
          margin-bottom: .4rem !important;
          opacity: 1 !important;
        }

        html body .kazen-solid-close {
          width: 2.5rem !important;
          height: 2.5rem !important;
          min-width: 2.5rem !important;
          min-height: 2.5rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: #f7f3ec !important;
          background-color: #f7f3ec !important;
          border: 1px solid rgba(35,34,31,.24) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
          filter: none !important;
          box-shadow: none !important;
        }

        html body .kazen-solid-close svg,
        html body .kazen-solid-close path,
        html body .kazen-solid-close line {
          color: #242320 !important;
          stroke: #242320 !important;
          fill: none !important;
          opacity: 1 !important;
        }

        html body .kazen-solid-modal-panel .kazen-modal-image,
        html body .kazen-solid-modal-panel img {
          opacity: 1 !important;
          filter: none !important;
          mix-blend-mode: normal !important;
        }

        html body .kazen-solid-modal-panel .kazen-qty,
        html body .kazen-solid-modal-panel .kazen-field,
        html body .kazen-solid-modal-panel .kazen-secondary {
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          opacity: 1 !important;
        }


        /* PMD_KAZEN_PLUS_BLACK_CATEGORIES_CLOSED_20260611 */

        html[data-pmd-kazen-active="1"] body .kazen-page button.kazen-add,
        html[data-pmd-kazen-active="1"] body .kazen-page .kazen-add {
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          border-color: rgba(35,34,31,.30) !important;
          opacity: 1 !important;
          filter: none !important;
          mix-blend-mode: normal !important;
        }

        html[data-pmd-kazen-active="1"] body .kazen-page button.kazen-add svg,
        html[data-pmd-kazen-active="1"] body .kazen-page button.kazen-add svg *,
        html[data-pmd-kazen-active="1"] body .kazen-page button.kazen-add path,
        html[data-pmd-kazen-active="1"] body .kazen-page button.kazen-add line,
        html[data-pmd-kazen-active="1"] body .kazen-page .kazen-add svg,
        html[data-pmd-kazen-active="1"] body .kazen-page .kazen-add svg *,
        html[data-pmd-kazen-active="1"] body .kazen-page .kazen-add path,
        html[data-pmd-kazen-active="1"] body .kazen-page .kazen-add line {
          color: #242320 !important;
          stroke: #242320 !important;
          fill: none !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #242320 !important;
          filter: none !important;
          mix-blend-mode: normal !important;
        }

        html[data-pmd-kazen-active="1"] body .kazen-page .kazen-category-btn svg,
        html[data-pmd-kazen-active="1"] body .kazen-page .kazen-category-btn svg *,
        html[data-pmd-kazen-active="1"] body .kazen-page .kazen-category-btn path,
        html[data-pmd-kazen-active="1"] body .kazen-page .kazen-category-btn line {
          color: #242320 !important;
          stroke: #242320 !important;
          fill: none !important;
          opacity: 1 !important;
        }


        /* PMD_KAZEN_FOOTER_PAYMYDINE_LOGO_CSS_SUDO_20260611 */
                .kazen-paymydine-footer-logo {
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          align-items: center !important;
          width: 100% !important;
          margin: 22px auto 54px !important;
          opacity: 1 !important;
          filter: none !important;
          gap: 8px !important;
        }

                .kazen-paymydine-footer-logo-image {
          display: block !important;
          width: 58px !important;
          max-width: 58px !important;
          min-width: 58px !important;
          height: auto !important;
          object-fit: contain !important;
          opacity: 1 !important;
          filter: none !important;
          mix-blend-mode: normal !important;
        }

        .kazen-paymydine-footer-logo-text {
          display: block !important;
          color: #242320 !important;
          font-size: 12px !important;
          line-height: 1.2 !important;
          letter-spacing: .22em !important;
          text-transform: uppercase !important;
          text-align: center !important;
          font-family: "Cormorant Garamond", "Times New Roman", serif !important;
          font-weight: 600 !important;
          opacity: .9 !important;
        }


        /* PMD_KAZEN_HIDE_LOGO_FALLBACK_FRAME_20260611 */
        .kazen-logo-fallback {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
          border: 0 !important;
          background: transparent !important;
          color: transparent !important;
          opacity: 0 !important;
          overflow: hidden !important;
        }

        .kazen-logo {
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          width: auto !important;
          max-width: 7rem !important;
          height: 5.6rem !important;
          object-fit: contain !important;
        }


        /* PMD_FOOTER_LOGO_LIGHT_DARK_FINAL_20260611 */
        .kazen-paymydine-footer-logo {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          width: 100% !important;
          margin: 22px auto 54px !important;
          padding: 0 16px !important;
          opacity: 1 !important;
          filter: none !important;
          pointer-events: none !important;
        }

        .kazen-paymydine-footer-logo picture,
        .kazen-paymydine-footer-logo-image {
          display: block !important;
        }

        .kazen-paymydine-footer-logo-image {
          width: 82px !important;
          max-width: 82px !important;
          min-width: 82px !important;
          height: auto !important;
          object-fit: contain !important;
          opacity: 1 !important;
          filter: none !important;
          mix-blend-mode: normal !important;
        }

        .kazen-paymydine-footer-logo-text {
          display: none !important;
        }



        /* PMD_FIX_KAZEN_IFRAME_ACCORDION_ALL_ITEMS_20260612_FINAL_OVERRIDE */
        .kazen-category.is-open,
        .kazen-category.is-open .kazen-accordion,
        .kazen-category.is-open .kazen-items {
          max-height: none !important;
          height: auto !important;
          overflow: visible !important;
          contain: none !important;
        }

        .kazen-category.is-open .kazen-items {
          padding-bottom: 0 !important;
          margin-bottom: 1.35rem !important;
        }


        /* PMD_FIX_KAZEN_MOBILE_DOCK_SAFE_AREA_20260613
           iPhone/Safari fix: keep bottom action bar above home indicator and clickable. */

        .kazen-page {
          padding-bottom: calc(7.8rem + env(safe-area-inset-bottom, 0px)) !important;
        }

        .kazen-page .kazen-dock,
        .kazen-page .kazen-bottom,
        .kazen-page .kazen-actions,
        .kazen-page footer {
          bottom: calc(.85rem + env(safe-area-inset-bottom, 0px)) !important;
          z-index: 9999 !important;
          pointer-events: auto !important;
          transform: translateZ(0) !important;
          -webkit-transform: translateZ(0) !important;
        }

        .kazen-page .kazen-dock button,
        .kazen-page .kazen-bottom button,
        .kazen-page .kazen-actions button,
        .kazen-page footer button {
          pointer-events: auto !important;
          touch-action: manipulation !important;
          -webkit-tap-highlight-color: rgba(198, 93, 87, .16) !important;
        }

        @supports (padding: max(0px)) {
          .kazen-page {
            padding-bottom: max(7.8rem, calc(7.8rem + env(safe-area-inset-bottom))) !important;
          }

          .kazen-page .kazen-dock,
          .kazen-page .kazen-bottom,
          .kazen-page .kazen-actions,
          .kazen-page footer {
            bottom: max(.85rem, calc(.85rem + env(safe-area-inset-bottom))) !important;
          }
        }

        @media (max-width: 520px) {
          .kazen-page {
            padding-bottom: calc(8.6rem + env(safe-area-inset-bottom, 0px)) !important;
          }

          .kazen-page .kazen-dock,
          .kazen-page .kazen-bottom,
          .kazen-page .kazen-actions,
          .kazen-page footer {
            bottom: calc(1.05rem + env(safe-area-inset-bottom, 0px)) !important;
            left: .55rem !important;
            right: .55rem !important;
          }
        }

      `}</style>

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
