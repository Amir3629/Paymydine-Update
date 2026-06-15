"use client"

import React, { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import {
  ModernGreenItemDetailCard,
  ModernGreenMenuSections,
} from "./ModernGreenMenuSections"
import { ModernGreenMenuShell } from "./ModernGreenMenuShell"
import { ThemeModal } from "./primitives"
import type {
  MenuCategory,
  MenuItem,
  MenuSection,
  ThemeMode,
} from "./types"
import type { ThemeMenuActions } from "@/components/themes/shared/ThemeActionContract"

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
  photo?: string
  images?: any[]
  media?: any[]
  is_bestseller?: boolean
  is_best_seller?: boolean
  bestseller?: boolean
  is_recommended?: boolean
  is_chef_recommended?: boolean
  chef_recommended?: boolean
}

export type ModernGreenNativeMenuProps = {
  src?: string
  sourceItems?: LiveItem[]
  cartItems?: any[]
  totalItems?: number
  totalPrice?: number
  lastInteractedItem?: any
  categories?: string[]
  restaurantName?: string
  logoUrl?: string
  tableNumber?: string | number | null
  actions?: ThemeMenuActions
  onAddItem?: (item: any, quantity?: number) => void
  onOpenItem?: (item: any) => void
  onCheckout?: () => void
  onCallWaiter?: () => void
  onOpenNote?: (note?: string) => void
  onOpenValet?: (values?: any) => void
  onTableOrder?: () => void
  showTableOrder?: boolean
  tableOrderCount?: number
  children?: ReactNode
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
  const fromImages = Array.isArray(item.images) ? item.images : []
  const fromMedia = Array.isArray(item.media) ? item.media : []
  const first = [...fromImages, ...fromMedia][0] || null
  const raw =
    item.image ||
    item.image_url ||
    item.thumb ||
    item.thumbnail ||
    item.photo ||
    (first ? String(first?.url || first?.path || first?.image_path || first?.thumb || first?.thumbnail || first) : "")

  if (!raw) return "/pmd-modern-green/images/hero-dish-dark.png"

  const value = String(raw)
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return value
  return `/${value.replace(/^\/+/, "")}`
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

function toThemeItem(item: LiveItem): MenuItem {
  const bestseller = Boolean(item.is_bestseller || item.is_best_seller || item.bestseller)
  const recommended = Boolean(item.is_recommended || item.is_chef_recommended || item.chef_recommended)

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

function normalizeTableLabel(value: ModernGreenNativeMenuProps["tableNumber"]) {
  const raw = String(value ?? "").trim()
  if (!raw || raw === "0" || raw.toLowerCase() === "delivery" || raw.toLowerCase() === "null") return "Delivery"
  return raw.toLowerCase().startsWith("table") ? raw.replace(/^table\s*/i, "") : raw
}

export function ModernGreenNativeMenu({
  sourceItems = [],
  totalItems = 0,
  totalPrice = 0,
  categories = [],
  restaurantName = "PayMyDine",
  logoUrl = "",
  tableNumber = null,
  actions,
  onAddItem,
  onOpenItem,
  onOpenValet,
  onTableOrder,
  showTableOrder = false,
  children,
}: ModernGreenNativeMenuProps) {
  const [activeCategory, setActiveCategory] = useState("all")
  const [search, setSearch] = useState("")
  const [mode, setMode] = useState<ThemeMode>("dark")
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [backendLogoUrl, setBackendLogoUrl] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadLogoFromBackend() {
      try {
        const res = await fetch(`/api/v1/settings-wrapped?modernGreenNativeLogo=${Date.now()}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        })
        const json = await res.json()
        const data = json?.data || json || {}
        const logo = normalizeLogoUrl(data.site_logo || data.logoUrl || data.logo_url || data.logo || data.restaurant_logo || "")
        if (!cancelled && logo) setBackendLogoUrl(logo)
      } catch {}
    }

    loadLogoFromBackend()
    return () => { cancelled = true }
  }, [])

  const sourceById = useMemo(() => {
    const map = new Map<string, LiveItem>()
    sourceItems.forEach((item) => map.set(safeId(item.id), item))
    return map
  }, [sourceItems])

  const tableLabel = normalizeTableLabel(tableNumber)

  const categoryOptions: MenuCategory[] = useMemo(() => {
    const fromItems = Array.from(new Set(sourceItems.map(itemCategory).filter(Boolean)))
    const clean = (categories.length ? categories : fromItems)
      .map(String)
      .filter(Boolean)
      .filter((name) => name !== "All")
    return [
      { id: "all", label: "All" },
      ...Array.from(new Set(clean)).map((name) => ({ id: name, label: name })),
    ]
  }, [categories, sourceItems])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sourceItems.filter((item) => {
      const categoryOk = activeCategory === "all" || itemCategory(item) === activeCategory
      const queryOk = !q || `${itemName(item)} ${itemDescription(item)}`.toLowerCase().includes(q)
      return categoryOk && queryOk
    })
  }, [sourceItems, activeCategory, search])

  const sections: MenuSection[] = useMemo(() => {
    const result: MenuSection[] = []

    if (activeCategory === "all") {
      const featured = filteredItems
        .filter((item) => item.is_bestseller || item.is_best_seller || item.bestseller || item.is_recommended || item.is_chef_recommended)
        .slice(0, 4)

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

  const heroImage = mode === "light" ? "/pmd-modern-green/images/hero-dish-light.png" : "/pmd-modern-green/images/hero-dish-dark.png"

  const addByThemeId = (themeItemId: string) => {
    const raw = sourceById.get(String(themeItemId))
    if (!raw) return
    onAddItem?.(raw, 1)
  }

  return (
    <div className="modern-green-theme min-h-screen bg-[var(--mg-page-bg)] pb-28" data-mode={mode} data-pmd-native-modern-green="1">
      <ModernGreenMenuShell
        mode={mode}
        brandName={restaurantName || "PayMyDine"}
        logoUrl={normalizeLogoUrl(logoUrl) || backendLogoUrl}
        tableLabel={tableLabel}
        languageLabel="Language"
        heroTitle={<>Ready to order?</>}
        heroSubtitle="Browse, choose, and send your order from the table."
        heroImageUrl={heroImage}
        categories={categoryOptions}
        activeCategory={activeCategory}
        searchValue={search}
        onSelectCategory={setActiveCategory}
        onSearchChange={setSearch}
        onOpenValet={() => {
          onOpenValet?.({})
          actions?.onOpenValet?.()
        }}
        onOpenLanguage={() => {}}
        onSelectTable={() => {
          if (showTableOrder) {
            onTableOrder?.()
            actions?.onOpenTableOrder?.()
          }
        }}
        onToggleMode={setMode}
      >
        {sourceItems.length ? (
          <ModernGreenMenuSections
            sections={sections}
            formatPrice={formatEuro}
            onAddItem={addByThemeId}
            onSelectItem={(item) => {
              setSelectedItem(item)
              const raw = sourceById.get(String(item.id))
              if (raw) onOpenItem?.(raw)
            }}
          />
        ) : (
          <div className="mg-glass rounded-3xl p-5 text-center text-sm text-[var(--mg-text-soft)]">
            Loading PayMyDine menu…
          </div>
        )}
      </ModernGreenMenuShell>

      {children}

      <ThemeModal open={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem?.name} mode={mode}>
        {selectedItem && (
          <ModernGreenItemDetailCard
            item={selectedItem}
            formatPrice={formatEuro}
            onAddItem={(itemId) => {
              addByThemeId(String(itemId))
              setSelectedItem(null)
            }}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </ThemeModal>
    </div>
  )
}
