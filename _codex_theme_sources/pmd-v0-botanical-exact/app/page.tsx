"use client"

import { useEffect, useMemo, useState } from "react"
import { BotanicalMenuPage } from "@/components/botanical-paper"
import type { Category, MenuItem, MenuSectionData, SelectedOptions } from "@/components/botanical-paper/types"
import { LeafGlyph, BowlGlyph, SproutGlyph, CakeGlyph, Grid2Glyph } from "@/components/botanical-paper/botanical-icons"

type ApiItem = any

function money(value: any): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function hasRtlText(value: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value || "")
}

function pickImage(item: ApiItem): string | undefined {
  const fromImages = Array.isArray(item?.images)
    ? item.images.map((x: any) => typeof x === "string" ? x : (x?.url || x?.image || x?.src || x?.path)).filter(Boolean)
    : []

  const fromMedia = Array.isArray(item?.media)
    ? item.media.map((x: any) => x?.url || x?.image || x?.src || x?.path).filter(Boolean)
    : []

  const candidates = [
    item?.image,
    item?.image_url,
    item?.imageUrl,
    item?.thumb,
    item?.thumbnail,
    item?.photo,
    ...fromImages,
    ...fromMedia,
  ]

  const found = candidates.find((x) => typeof x === "string" && x.trim().length > 0)
  return found ? String(found) : undefined
}

function categoryNameOf(item: ApiItem): string {
  return String(
    item?.category ||
    item?.category_name ||
    item?.categoryName ||
    item?.menu_category ||
    item?.menu_category_name ||
    "Menu"
  )
}

function categoryId(name: string): string {
  return String(name || "menu")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "menu"
}

function iconForCategory(name: string) {
  const lower = name.toLowerCase()
  if (lower.includes("all")) return <Grid2Glyph />
  if (lower.includes("drink") || lower.includes("beverage")) return <BowlGlyph />
  if (lower.includes("dessert") || lower.includes("cake") || lower.includes("sweet")) return <CakeGlyph />
  if (lower.includes("appetizer") || lower.includes("starter")) return <BowlGlyph />
  if (lower.includes("main") || lower.includes("kebab") || lower.includes("grill")) return <SproutGlyph />
  return <LeafGlyph />
}

function normalizeOptions(item: ApiItem) {
  const rawOptions = Array.isArray(item?.options) ? item.options : []

  return rawOptions.map((option: any, optionIndex: number) => {
    const rawValues =
      option?.values ||
      option?.option_values ||
      option?.items ||
      option?.menu_option_values ||
      []

    return {
      id: String(option?.id || option?.option_id || optionIndex),
      name: String(option?.name || option?.option_name || option?.label || "Option"),
      required: Boolean(option?.required || option?.is_required),
      multiple: Boolean(option?.multiple || option?.is_multiple || option?.multi_select),
      values: Array.isArray(rawValues) ? rawValues.map((value: any, valueIndex: number) => ({
        id: String(value?.id || value?.option_value_id || valueIndex),
        name: String(value?.name || value?.value || value?.label || "Option"),
        price: money(value?.price || value?.price_delta || value?.amount || 0),
      })) : [],
    }
  }).filter((option: any) => option.values.length > 0)
}

function normalizeItem(item: ApiItem): MenuItem {
  const id = String(item?.id ?? item?.menu_id ?? item?.menuId ?? "")
  const name = String(item?.name || item?.menu_name || item?.title || "Menu item")
  const description = String(item?.description || item?.menu_description || item?.desc || "")

  const searchable = JSON.stringify(item).toLowerCase()
  const categoryName = categoryNameOf(item)

  return {
    id,
    name,
    description,
    price: money(item?.price || item?.menu_price || item?.sale_price || 0),
    image: pickImage(item),
    categoryName,
    isNew: Boolean(item?.is_new || item?.new),
    isChefRecommended: Boolean(item?.is_chef_recommended || item?.chef_recommended),
    isBestSeller: Boolean(item?.is_bestseller || item?.is_best_seller || item?.bestseller),
    isSoldOut: Boolean(item?.is_sold_out || item?.sold_out || item?.stock_status === "sold_out" || item?.available === false || item?.is_available === false),
    isVegetarian: Boolean(item?.is_vegetarian || item?.vegetarian || searchable.includes("vegetarian")),
    isVegan: Boolean(item?.is_vegan || item?.vegan || searchable.includes("vegan")),
    isGlutenFree: Boolean(item?.is_gluten_free || item?.gluten_free || searchable.includes("gluten free")),
    isHalal: Boolean(item?.is_halal || item?.halal || searchable.includes("halal")),
    allergens: Array.isArray(item?.allergens) ? item.allergens.map(String) : [],
    rtl: hasRtlText(name + " " + description),
    options: normalizeOptions(item),
  }
}

function buildSections(items: MenuItem[]): { categories: Category[]; sections: MenuSectionData[] } {
  const map = new Map<string, MenuItem[]>()

  for (const item of items) {
    const cid = categoryId(item.categoryName)
    if (!map.has(cid)) map.set(cid, [])
    map.get(cid)!.push(item)
  }

  const realCategories = Array.from(map.entries()).map(([id, list]) => {
    const name = list[0]?.categoryName || id
    return { id, name, icon: iconForCategory(name) }
  })

  const categories: Category[] = [
    { id: "all", name: "All", icon: <Grid2Glyph /> },
    ...realCategories,
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

  for (const [id, list] of map.entries()) {
    const title = list[0]?.categoryName || "Menu"
    sections.push({
      id,
      title,
      subtitle: "Freshly prepared from our kitchen.",
      categoryId: id,
      items: list,
    })
  }

  return { categories, sections }
}

function postToParent(type: string, payload: Record<string, any> = {}) {
  if (typeof window === "undefined") return
  window.parent?.postMessage({ type, ...payload }, window.location.origin)
}

export default function Page() {
  // PMD_EXACT_V0_HIDE_DIRECT_DEV_URL_20260607
  useEffect(() => {
    if (typeof window === "undefined") return

    const params = new URLSearchParams(window.location.search)
    const isEmbedded = params.get("embed") === "1"
    setHideBottomDock(params.get("hideDock") === "1")

    if (!isEmbedded && window.self === window.top) {
      window.location.replace("/menu")
    }
  }, [])

  const [items, setItems] = useState<MenuItem[]>([])
  const [restaurantName, setRestaurantName] = useState("Mimoza Restaurant")
  const [loading, setLoading] = useState(true)
  const [hideBottomDock, setHideBottomDock] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)

        const params = new URLSearchParams(window.location.search)
        const parentSearch = params.get("parentSearch") || ""
        const apiQuery = parentSearch.startsWith("?") ? parentSearch : ""
        const url = `/api/v1/menu${apiQuery}${apiQuery ? "&" : "?"}botanical_ts=${Date.now()}`

        const res = await fetch(url, {
          headers: { accept: "application/json" },
          cache: "no-store",
        })

        const json = await res.json()
        const payload = json?.data ?? json

        const rawItems =
          Array.isArray(payload?.items) ? payload.items :
          Array.isArray(payload?.menu_items) ? payload.menu_items :
          Array.isArray(payload?.menus) ? payload.menus :
          []

        const normalized = rawItems.map(normalizeItem).filter((item: MenuItem) => item.id)

        if (!cancelled) {
          setItems(normalized)
          setRestaurantName(
            String(
              payload?.restaurant?.name ||
              payload?.merchant?.name ||
              payload?.settings?.businessName ||
              payload?.business_name ||
              "Mimoza Restaurant"
            )
          )
        }
      } catch (error) {
        console.error("[botanical-v0] failed to load real menu", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  const { categories, sections } = useMemo(() => buildSections(items), [items])
    const heroImageUrl = "/dev/botanical-v0-exact/themes/botanical-paper/BGPMD.png"

  if (loading) {
    return (
      <div className="pmd-paper-grain min-h-screen flex items-center justify-center text-[var(--pmd-ink)]">
        <div className="text-center">
          <div className="font-serif text-3xl tracking-[0.18em] uppercase">Loading Menu</div>
          <p className="mt-2 text-sm text-[var(--pmd-muted)]">Preparing your table menu…</p>
        </div>
      </div>
    )
  }

  return (
    <BotanicalMenuPage
      restaurantName={restaurantName}
      tagline="Farm to Table"
      heroImageUrl={heroImageUrl}
      categories={categories}
      sections={sections}
      showTableOrder={true}
      hideBottomDock={hideBottomDock}
      initialCartCount={0}
      onAddItem={(item, quantity, selectedOptions) =>
        postToParent("pmd:add-item", { item, quantity, selectedOptions })
      }
      onCallWaiter={() => postToParent("pmd:call-waiter")}
      onAddNote={() => postToParent("pmd:add-note")}
      onCheckout={() => postToParent("pmd:checkout")}
      onOpenTableOrder={() => postToParent("pmd:table-order")}
      onCallToOrder={() => postToParent("pmd:call-waiter")}
      onMenu={() => postToParent("pmd:open-menu")}
      onLanguage={() => postToParent("pmd:language")}
    />
  )
}
