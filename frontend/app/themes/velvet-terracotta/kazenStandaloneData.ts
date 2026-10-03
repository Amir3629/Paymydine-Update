export type KazenItem = {
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
  gallery?: any[]
  additional_images?: any[]
  additionalImages?: any[]
  media?: any[]
  is_bestseller?: boolean
  is_recommended?: boolean
}

export type CartLine = {
  id: string
  name: string
  unitPrice: number
  quantity: number
  imageUrl?: string
}

export type KazenState = {
  restaurantName: string
  logoUrl?: string
  tableNumber?: string | number | null
  menuLayout?: "accordion" | "tabs"
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
export const KAZEN_CATEGORY_ICONS = [
  "/themes/kazen-japanese/category-icons/kazen-category-01.png",
  "/themes/kazen-japanese/category-icons/kazen-category-02.png",
  "/themes/kazen-japanese/category-icons/kazen-category-03.png",
  "/themes/kazen-japanese/category-icons/kazen-category-04.png",
  "/themes/kazen-japanese/category-icons/kazen-category-05.png",
  "/themes/kazen-japanese/category-icons/kazen-category-06.png",
  "/themes/kazen-japanese/category-icons/kazen-category-07.png",
  "/themes/kazen-japanese/category-icons/kazen-category-08.png",
]

export function kazenCategoryIcon(index: number) {
  return KAZEN_CATEGORY_ICONS[index % KAZEN_CATEGORY_ICONS.length]
}

export const ALL_CATEGORY = "ALL"


export const defaultState: KazenState = {
  restaurantName: "Kazen",
  tableNumber: null,
  menuLayout: "accordion",
  categories: [ALL_CATEGORY],
  items: [],
  cart: { count: 0, total: 0, lines: [] },
}

export function money(value: number) {
  try {
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(Number(value || 0))
  } catch {
    return `€${Number(value || 0).toFixed(2)}`
  }
}

export function post(type: string, payload: Record<string, unknown> = {}) {
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

export function pmdKazenStableCategoryKey(value: unknown) {
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


export function normalizeCategories(...args: Parameters<typeof pmdKazenNormalizeCategoriesBase>) {
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


export function resolveMediaUrl(raw: any): string {
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

export function itemImage(item?: KazenItem | null) {
  if (!item) return ""
  return resolveMediaUrl(item.image || item.image_url || item.thumb || item.thumbnail || item.images)
}
