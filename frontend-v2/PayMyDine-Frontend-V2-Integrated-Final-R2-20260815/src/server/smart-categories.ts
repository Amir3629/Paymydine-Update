import type { CustomerBootstrap } from '@/src/domain/model'

type SmartKind = 'regular' | 'chef' | 'bestseller' | 'combos'
type MenuCategory = CustomerBootstrap['menu']['categories'][number]
type MenuItem = CustomerBootstrap['menu']['items'][number]
type SmartMenuCategory = MenuCategory & { pmdKind: SmartKind }
type SmartMenuItem = MenuItem & {
  pmdIsCombo: boolean
  pmdIsManualBestseller: boolean
  pmdBestsellerOverrideMode: 'auto' | 'force_on' | 'force_off'
}

const object = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : {}

const list = (value: unknown): Record<string, any>[] =>
  Array.isArray(value)
    ? value.filter((row) => row && typeof row === 'object') as Record<string, any>[]
    : []

const text = (value: unknown): string => String(value ?? '').trim()

const number = (value: unknown, fallback: number): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const yes = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  return ['1', 'true', 'yes', 'on', 'enabled', 'active'].includes(text(value).toLowerCase())
}

const smartKind = (value: unknown, name = ''): SmartKind => {
  const normalized = text(value).toLowerCase()
  if (normalized === 'chef' || normalized === 'bestseller' || normalized === 'combos') {
    return normalized
  }

  // PMD_MENU_SMART_CATEGORY_KIND_FALLBACK_V2
  // Rollout bridge only. The canonical menu payload now exposes pmd_kind, but
  // default names keep old cached payloads usable until every tenant is warm.
  const normalizedName = text(name)
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')

  if (
    normalizedName === "chef's recommendation"
    || normalizedName === "chef's recommendations"
    || normalizedName === 'chef recommendation'
    || normalizedName === 'chef recommendations'
  ) return 'chef'

  if (normalizedName === 'bestseller' || normalizedName === 'bestsellers') {
    return 'bestseller'
  }

  if (
    normalizedName === 'combination'
    || normalizedName === 'combinations'
    || normalizedName === 'combo'
    || normalizedName === 'combos'
  ) return 'combos'

  return 'regular'
}

function responseRows(payload: unknown): Record<string, any>[] {
  const root = object(payload)
  if (Array.isArray(root.data)) return list(root.data)
  const data = object(root.data)
  if (Array.isArray(data.categories)) return list(data.categories)
  if (Array.isArray(root.categories)) return list(root.categories)
  return []
}

function menuRows(payload: unknown): Record<string, any>[] {
  const root = object(payload)
  if (Array.isArray(root.data)) return list(root.data)
  const data = object(root.data)
  if (Array.isArray(data.items)) return list(data.items)
  if (Array.isArray(root.items)) return list(root.items)
  return []
}

function rowId(row: Record<string, any>): string {
  return text(row.id ?? row.category_id).toLowerCase()
}

function rowName(row: Record<string, any>): string {
  return text(row.name ?? row.category_name).toLowerCase()
}

function categoryKey(category: { id: unknown; name: unknown }): string {
  const id = text(category.id).toLowerCase()
  const name = text(category.name).toLowerCase()
  return id ? `id:${id}` : `name:${name}`
}

function mergeCategoryRows(
  menuPayload: unknown,
  categoriesPayload: unknown,
): Record<string, any>[] {
  const menuCategoryRows = responseRows(menuPayload)
  const apiCategoryRows = responseRows(categoriesPayload)

  const menuById = new Map<string, Record<string, any>>()
  const menuByName = new Map<string, Record<string, any>>()

  for (const row of menuCategoryRows) {
    const id = rowId(row)
    const name = rowName(row)
    if (id) menuById.set(id, row)
    if (name) menuByName.set(name, row)
  }

  const source = apiCategoryRows.length ? apiCategoryRows : menuCategoryRows
  const merged: Record<string, any>[] = source.map((row) => {
    const fallback = menuById.get(rowId(row)) || menuByName.get(rowName(row)) || {}
    // Canonical /api/v1/menu data is the fallback specifically so its pmd_kind
    // survives an older dedicated category endpoint that omits the field.
    return { ...fallback, ...row }
  })

  const seenIds = new Set(merged.map(rowId).filter(Boolean))
  const seenNames = new Set(merged.map(rowName).filter(Boolean))

  for (const row of menuCategoryRows) {
    const id = rowId(row)
    const name = rowName(row)
    if ((id && seenIds.has(id)) || (name && seenNames.has(name))) continue
    merged.push(row)
    if (id) seenIds.add(id)
    if (name) seenNames.add(name)
  }

  return merged
}

function sameCategory(item: MenuItem, category: MenuCategory): boolean {
  return String(item.categoryId || '').toLowerCase() === String(category.id || '').toLowerCase()
    || item.categoryName.trim().toLowerCase() === category.name.trim().toLowerCase()
}

function materializeSmartFoodMembership(
  items: SmartMenuItem[],
  category: SmartMenuCategory | null,
  predicate: (item: SmartMenuItem) => boolean,
): void {
  if (!category) return

  const alreadyInCategory = new Set(
    items
      .filter((item) => sameCategory(item, category))
      .map((item) => String(item.id)),
  )

  const sourceById = new Map<string, SmartMenuItem>()
  for (const item of items) {
    if (item.pmdIsCombo) continue
    const id = String(item.id)
    if (!sourceById.has(id)) sourceById.set(id, item)
  }

  for (const item of sourceById.values()) {
    if (!predicate(item)) continue
    const id = String(item.id)
    if (alreadyInCategory.has(id)) continue

    items.push({
      ...item,
      categoryId: category.id,
      categoryName: category.name,
    })
    alreadyInCategory.add(id)
  }
}

// PMD_MENU_SMART_CATEGORIES_V3_FRONTEND_V2
//
// Smart categories are real category rows. Product membership stays in the
// existing Chef/manual-Bestseller/Combo authorities. In addition to the runtime
// filter adapter, membership is materialized as category-specific item rows so
// themes that group bootstrap.menu.items directly (for example Kazen) receive
// the same smart-category semantics without theme-specific patches.
export function applySmartCategories(
  menu: CustomerBootstrap['menu'],
  menuPayload: unknown,
  categoriesPayload: unknown,
): CustomerBootstrap['menu'] {
  const categoryRows = mergeCategoryRows(menuPayload, categoriesPayload)
  const rawMenuRows = menuRows(menuPayload)

  const currentById = new Map(
    menu.categories.map((category) => [text(category.id).toLowerCase(), category]),
  )
  const currentByName = new Map(
    menu.categories.map((category) => [category.name.trim().toLowerCase(), category]),
  )

  const smartCategories: SmartMenuCategory[] = categoryRows.map((row, index) => {
    const id = text(row.id ?? row.category_id)
    const name = text(row.name ?? row.category_name) || `Category ${index + 1}`
    const existing = currentById.get(id.toLowerCase()) || currentByName.get(name.toLowerCase())
    const kindRaw = row.pmd_kind ?? row.pmdKind ?? row.kind ?? row.category_kind

    return {
      ...(existing || {
        id: id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name,
        description: '',
        translations: {},
        imageUrl: null,
        priority: index + 1,
      }),
      id: id || existing?.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name,
      description: text(row.description) || existing?.description || '',
      priority: number(row.priority, existing?.priority ?? index + 1),
      pmdKind: smartKind(kindRaw, name),
    }
  })

  const specialByKind = new Map<SmartKind, SmartMenuCategory>()
  smartCategories.forEach((category) => {
    if (category.pmdKind !== 'regular' && !specialByKind.has(category.pmdKind)) {
      specialByKind.set(category.pmdKind, category)
    }
  })

  const comboCategory = specialByKind.get('combos') || null
  const chefCategory = specialByKind.get('chef') || null
  const bestsellerCategory = specialByKind.get('bestseller') || null

  const categoryMap = new Map<string, SmartMenuCategory>()
  smartCategories.forEach((category) => categoryMap.set(categoryKey(category), category))

  menu.categories.forEach((category) => {
    const id = text(category.id).toLowerCase()
    const name = category.name.trim().toLowerCase()

    // A real editable Combination category replaces only the old synthetic
    // fixed "Combos" navigation item.
    if (comboCategory && id === 'combos' && name === 'combos') return

    const duplicate = smartCategories.some((candidate) =>
      text(candidate.id).toLowerCase() === id || candidate.name.trim().toLowerCase() === name,
    )
    if (duplicate) return

    const regular = { ...category, pmdKind: 'regular' as SmartKind }
    categoryMap.set(categoryKey(regular), regular)
  })

  const categories = Array.from(categoryMap.values())
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name))

  // Raw menu data can contain the same food once per normal category. Resolve
  // flags by product identity instead of array position.
  const rawByKey = new Map<string, Record<string, any>>()
  for (const raw of rawMenuRows) {
    const isCombo = yes(raw.isCombo ?? raw.is_combo)
    const id = text(raw.id ?? raw.menu_id ?? raw.combo_id)
    if (!id) continue
    const key = `${isCombo ? 'combo' : 'food'}:${id}`
    if (!rawByKey.has(key)) rawByKey.set(key, raw)
  }

  const items: SmartMenuItem[] = menu.items.map((item) => {
    const possibleFood = rawByKey.get(`food:${item.id}`)
    const possibleCombo = rawByKey.get(`combo:${item.id}`)
    const raw = possibleCombo || possibleFood || {}
    const isCombo = Boolean(possibleCombo) || yes(raw.isCombo ?? raw.is_combo)
    const overrideRaw = text(raw.bestseller_override_mode).toLowerCase()
    const override: SmartMenuItem['pmdBestsellerOverrideMode'] =
      overrideRaw === 'force_on' || overrideRaw === 'force_off'
        ? overrideRaw
        : 'auto'
    const manualBestseller = yes(raw.is_manual_bestseller) || override === 'force_on'

    return {
      ...item,
      categoryId: isCombo && comboCategory ? comboCategory.id : item.categoryId,
      categoryName: isCombo && comboCategory ? comboCategory.name : item.categoryName,
      pmdIsCombo: isCombo,
      pmdIsManualBestseller: manualBestseller,
      pmdBestsellerOverrideMode: override,
    }
  })

  // Make smart membership visible to every theme, including themes that group
  // bootstrap.menu.items directly instead of asking visibleItems from runtime.
  materializeSmartFoodMembership(items, chefCategory, (item) => item.isChefRecommended)
  materializeSmartFoodMembership(items, bestsellerCategory, (item) => item.pmdIsManualBestseller)

  return {
    ...menu,
    categories,
    items,
    highlights: {
      ...menu.highlights,
      showChefRecommendations: chefCategory ? false : menu.highlights.showChefRecommendations,
      showBestsellers: bestsellerCategory ? false : menu.highlights.showBestsellers,
      chefTitle: chefCategory?.name || menu.highlights.chefTitle,
      bestsellerTitle: bestsellerCategory?.name || menu.highlights.bestsellerTitle,
    },
  }
}
