"use client"

import React, { useMemo } from "react"
import { BotanicalMenuPage } from "./native-v0/botanical-menu-page"
import type { Category, MenuItem, MenuSectionData, SelectedOptions } from "./native-v0/types"
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
  options?: any[]
  is_new?: boolean
  is_bestseller?: boolean
  is_best_seller?: boolean
  bestseller?: boolean
  is_chef_recommended?: boolean
  chef_recommended?: boolean
  is_vegetarian?: boolean
  is_vegan?: boolean
  is_gluten_free?: boolean
  is_halal?: boolean
  allergens?: any[]
}

export type OrganicNativeMenuProps = {
  sourceItems?: LiveItem[]
  categories?: string[]
  restaurantName?: string
  tableNumber?: string | number | null
  actions?: ThemeMenuActions
  onAddItem?: (item: any, quantity?: number, selectedOptions?: SelectedOptions) => void
  onOpenItem?: (item: any) => void
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

  if (!raw) return undefined
  const value = String(raw)
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return value
  return `/${value.replace(/^\/+/, "")}`
}

function categoryId(name: string) {
  return String(name || "menu")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "menu"
}

function normalizeOptions(item: LiveItem) {
  const rawOptions = Array.isArray(item.options) ? item.options : []

  return rawOptions.map((option: any, optionIndex: number) => {
    const rawValues = option?.values || option?.option_values || option?.items || option?.menu_option_values || []
    return {
      id: String(option?.id || option?.option_id || optionIndex),
      name: String(option?.name || option?.option_name || option?.label || "Option"),
      required: Boolean(option?.required || option?.is_required),
      multiple: Boolean(option?.multiple || option?.is_multiple || option?.multi_select),
      values: Array.isArray(rawValues)
        ? rawValues.map((value: any, valueIndex: number) => ({
            id: String(value?.id || value?.option_value_id || valueIndex),
            name: String(value?.name || value?.value || value?.label || "Option"),
            price: Number(value?.price || value?.price_delta || value?.amount || 0),
          }))
        : [],
    }
  }).filter((option: any) => option.values.length > 0)
}

function toBotanicalItem(item: LiveItem): MenuItem {
  const searchable = JSON.stringify(item).toLowerCase()
  return {
    id: safeId(item.id),
    name: itemName(item),
    description: itemDescription(item),
    price: itemPrice(item),
    image: imageOf(item),
    categoryName: itemCategory(item),
    isNew: Boolean(item.is_new),
    isChefRecommended: Boolean(item.is_chef_recommended || item.chef_recommended),
    isBestSeller: Boolean(item.is_bestseller || item.is_best_seller || item.bestseller),
    isVegetarian: Boolean(item.is_vegetarian || searchable.includes("vegetarian")),
    isVegan: Boolean(item.is_vegan || searchable.includes("vegan")),
    isGlutenFree: Boolean(item.is_gluten_free || searchable.includes("gluten free")),
    isHalal: Boolean(item.is_halal || searchable.includes("halal")),
    allergens: Array.isArray(item.allergens) ? item.allergens.map(String) : [],
    rtl: /[\u0600-\u06FF]/.test(itemName(item) + " " + itemDescription(item)),
    options: normalizeOptions(item),
  }
}

function buildBotanicalData(sourceItems: LiveItem[]) {
  const items = sourceItems.map(toBotanicalItem)
  const grouped = new Map<string, MenuItem[]>()

  for (const item of items) {
    const cid = categoryId(item.categoryName)
    if (!grouped.has(cid)) grouped.set(cid, [])
    grouped.get(cid)!.push(item)
  }

  const categories: Category[] = [
    { id: "all", name: "All" },
    ...Array.from(grouped.entries()).map(([id, list]) => ({
      id,
      name: list[0]?.categoryName || id,
    })),
  ]

  const sections: MenuSectionData[] = []

  const chefItems = items.filter((item) => item.isChefRecommended).slice(0, 8)
  if (chefItems.length) {
    sections.push({
      id: "chef",
      title: "Chef’s Recommendations",
      subtitle: "Hand-picked favorites from the kitchen.",
      categoryId: "all",
      items: chefItems,
    })
  }

  const bestItems = items.filter((item) => item.isBestSeller).slice(0, 8)
  if (bestItems.length) {
    sections.push({
      id: "best",
      title: "Best Sellers",
      subtitle: "Popular picks from recent orders.",
      categoryId: "all",
      items: bestItems,
    })
  }

  for (const [id, list] of grouped.entries()) {
    sections.push({
      id,
      title: list[0]?.categoryName || "Menu",
      subtitle: "Freshly prepared from our kitchen.",
      categoryId: id,
      items: list,
    })
  }

  return { categories, sections }
}

export function OrganicNativeMenu({
  sourceItems = [],
  restaurantName = "Mimoza Restaurant",
  tableNumber = null,
  actions,
  onAddItem,
}: OrganicNativeMenuProps) {
  const { categories, sections } = useMemo(() => buildBotanicalData(sourceItems), [sourceItems])

  const sourceById = useMemo(() => {
    const map = new Map<string, LiveItem>()
    sourceItems.forEach((item) => map.set(safeId(item.id), item))
    return map
  }, [sourceItems])

  return (
    <div data-pmd-native-organic="1" className="pmd-native-organic-shell">
      <BotanicalMenuPage
        restaurantName={restaurantName}
        tagline={tableNumber ? `Table ${tableNumber}` : "Farm to Table"}
        categories={categories}
        sections={sections}
        hideBottomDock
        showTableOrder={Boolean(actions?.showTableOrder)}
        initialCartCount={Number(actions?.cartCount || 0)}
        onAddItem={(item, quantity, selectedOptions) => {
          const raw = sourceById.get(String(item.id))
          if (raw) {
            onAddItem?.(raw, quantity, selectedOptions)
            actions?.onAddItem?.(raw as any, quantity)
          }
        }}
        onCallWaiter={() => actions?.onCallWaiter?.()}
        onAddNote={() => actions?.onOpenNote?.()}
        onCheckout={() => actions?.onOpenCheckout?.()}
        onOpenTableOrder={() => actions?.onOpenTableOrder?.()}
        onCallToOrder={() => actions?.onOpenCheckout?.()}
        onLanguage={() => {}}
      />
    </div>
  )
}
