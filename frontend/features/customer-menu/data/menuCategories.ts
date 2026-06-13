let pmdKazenParentStableCategories: string[] = []

function pmdKazenParentCategoryKey(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase()
}

// PMD_FIX_KAZEN_CATEGORY_ORDER_HARD_20260613

function pmdKazenKnownCategoryRank(value: unknown) {
  const order = [
    "all",
    "appetizer",
    "breakfast & brunch",
    "test",
    "appetizers",
    "specials",
    "desserts",
    "main course",
    "drinks",
  ]

  const key = String(value || "").trim().replace(/\s+/g, " ").toLowerCase()
  const index = order.indexOf(key)
  return index >= 0 ? index : 1000
}

// PMD_FIX_KAZEN_FORCE_EXPECTED_CATEGORIES_20260613
function pmdKazenExpectedCategoryLabels() {
  // PMD_FIX_KAZEN_BACKEND_CATEGORIES_ONLY_20260613
  // No hardcoded Kazen categories. Categories must come from backend/admin only.
  return [] as string[]
}

function pmdKazenSortKnownCategories(categories: string[]) {
  // PMD_FIX_KAZEN_BACKEND_CATEGORIES_ONLY_20260613
  // Preserve backend/admin order. Do not force Japanese demo categories.
  const incoming = Array.isArray(categories)
    ? categories.map((cat) => String(cat || "").trim()).filter(Boolean)
    : []

  const demoFallbackKeys = new Set(["omakase", "sushi", "grill"])
  const hasRealBackendCategories = incoming.some((cat) => {
    const key = pmdKazenParentCategoryKey(cat)
    return key && key !== "all" && !demoFallbackKeys.has(key)
  })

  const seen = new Set<string>()
  const next: string[] = []

  incoming.forEach((cat) => {
    const label = String(cat || "").trim()
    const key = pmdKazenParentCategoryKey(label)
    if (!key || seen.has(key)) return

    // When real backend categories exist, never keep demo fallback labels.
    if (hasRealBackendCategories && demoFallbackKeys.has(key)) return

    seen.add(key)
    next.push(label)
  })

  return next
}


// PMD_FIX_KAZEN_PARENT_DEEP_CATEGORY_EXTRACT_20260613
function pmdKazenCategoryLabelFromAny(value: any): string {
  if (value == null) return ""

  if (typeof value === "string" || typeof value === "number") {
    return String(value || "").trim()
  }

  if (typeof value === "object") {
    const direct =
      value.name ??
      value.title ??
      value.label ??
      value.category ??
      value.category_name ??
      value.categoryName ??
      value.menu_category ??
      value.menuCategory ??
      value.group ??
      value.group_name ??
      value.display_name ??
      ""

    if (direct && typeof direct !== "object") return String(direct).trim()

    if (direct && typeof direct === "object") {
      return pmdKazenCategoryLabelFromAny(direct)
    }
  }

  return ""
}

function pmdKazenPushUniqueCategory(target: string[], value: any) {
  const label = pmdKazenCategoryLabelFromAny(value)
  if (!label || label === "[object Object]") return

  const key = pmdKazenParentCategoryKey(label)
  if (!key) return
  if (target.some((existing) => pmdKazenParentCategoryKey(existing) === key)) return

  target.push(label)
}

function pmdKazenExtractCategoryList(value: any): string[] {
  const found: string[] = []

  if (Array.isArray(value)) {
    value.forEach((entry) => pmdKazenPushUniqueCategory(found, entry))
  } else {
    pmdKazenPushUniqueCategory(found, value)
  }

  return found
}

function pmdKazenExtractCategoriesFromItem(item: any): string[] {
  const found: string[] = []
  if (!item || typeof item !== "object") return found

  const candidates = [
    item.category,
    item.category_name,
    item.categoryName,
    item.menu_category,
    item.menuCategory,
    item.category_title,
    item.categoryTitle,
    item.group,
    item.group_name,
    item.department,
    item.section,
    item.menu?.category,
    item.menu?.category_name,
    item.meta?.category,
    item.metadata?.category,
  ]

  candidates.forEach((value) => {
    pmdKazenExtractCategoryList(value).forEach((cat) => pmdKazenPushUniqueCategory(found, cat))
  })

  if (Array.isArray(item.categories)) {
    item.categories.forEach((value: any) => {
      pmdKazenExtractCategoryList(value).forEach((cat) => pmdKazenPushUniqueCategory(found, cat))
    })
  }

  return found
}

function pmdKazenExtractCategoriesFromItems(items: unknown[]): string[] {
  const found: string[] = []

  if (!Array.isArray(items)) return found

  items.forEach((item: any) => {
    pmdKazenExtractCategoriesFromItem(item).forEach((cat) => pmdKazenPushUniqueCategory(found, cat))
  })

  return found
}


function pmdReadKazenCachedCategoriesFromStorage() {
  if (typeof window === "undefined") return [] as string[]

  const found: string[] = []

  const scanStorage = (storage: Storage) => {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i) || ""
      if (!/pmd-menu-cache|menu-cache|categories|paymydine|cms/i.test(key)) continue

      const raw = storage.getItem(key)
      if (!raw) continue

      try {
        const parsed = JSON.parse(raw)

        const categoryCandidates = [
          parsed?.categories,
          parsed?.categoryNames,
          parsed?.data?.categories,
          parsed?.data?.categoryNames,
          parsed?.state?.categories,
          parsed?.state?.categoryNames,
          parsed?.settings?.categories,
          parsed?.state?.settings?.categories,
        ]

        categoryCandidates.forEach((value) => {
          pmdKazenExtractCategoryList(value).forEach((cat) => pmdKazenPushUniqueCategory(found, cat))
        })

        const itemCandidates = [
          parsed?.items,
          parsed?.menuItems,
          parsed?.products,
          parsed?.data?.items,
          parsed?.data?.menuItems,
          parsed?.data?.products,
          parsed?.state?.items,
          parsed?.state?.menuItems,
          parsed?.state?.products,
          parsed?.menu?.items,
          parsed?.menu?.menuItems,
        ]

        itemCandidates.forEach((value) => {
          if (!Array.isArray(value)) return
          pmdKazenExtractCategoriesFromItems(value).forEach((cat) => pmdKazenPushUniqueCategory(found, cat))
        })
      } catch {}
    }
  }

  try { scanStorage(window.localStorage) } catch {}
  try { scanStorage(window.sessionStorage) } catch {}

  return found
}

export function pmdBuildKazenParentCategories(baseCategories: unknown, items: unknown[]) {
  const base = pmdKazenExtractCategoryList(baseCategories)

  const fromItems = pmdKazenExtractCategoriesFromItems(Array.isArray(items) ? items : [])

  const fromStorage = pmdReadKazenCachedCategoriesFromStorage()

  // PMD_FIX_KAZEN_PARENT_CATEGORY_ORDER_20260613
  // Preserve the live/admin category order first.
  // Use previous/storage/items only to append missing categories, never to reorder the list.
  const preferredOrder = base.length ? base : fromItems
  const appendOnly = [
    ...preferredOrder,
    ...pmdKazenParentStableCategories,
    ...fromStorage,
    ...fromItems,
  ]

  const seen = new Set<string>()
  const next: string[] = []

  appendOnly.forEach((cat) => {
    const label = String(cat || "").trim()
    const key = pmdKazenParentCategoryKey(label)
    if (!key || seen.has(key)) return
    seen.add(key)
    next.push(label)
  })

  // Never shrink. If incoming list is shorter, keep old list order.
  // But if incoming base has same/more categories, it becomes the new preferred order.
  if (
    next.length > pmdKazenParentStableCategories.length ||
    (base.length && next.length === pmdKazenParentStableCategories.length)
  ) {
    pmdKazenParentStableCategories = pmdKazenSortKnownCategories(next)
  }

  return pmdKazenSortKnownCategories(pmdKazenParentStableCategories.length ? pmdKazenParentStableCategories : next)
}
