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
  Array.isArray(value) ? value.filter((row) => row && typeof row === 'object') as Record<string, any>[] : []

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

const smartKind = (value: unknown): SmartKind => {
  const normalized = text(value).toLowerCase()
  return normalized === 'chef' || normalized === 'bestseller' || normalized === 'combos'
    ? normalized
    : 'regular'
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

function categoryKey(category: { id: unknown; name: unknown }): string {
  const id = text(category.id).toLowerCase()
  const name = text(category.name).toLowerCase()
  return id ? `id:${id}` : `name:${name}`
}

// PMD_MENU_SMART_CATEGORIES_V1_FRONTEND_V2
// Frontend V2 is the live tenant runtime on port 3002. Smart categories keep
// their editable name/priority as real category rows, while item membership is
// resolved from the existing Chef/Bestseller/Combo product authorities.
export function applySmartCategories(
  menu: CustomerBootstrap['menu'],
  menuPayload: unknown,
  categoriesPayload: unknown,
): CustomerBootstrap['menu'] {
  const categoryRows = responseRows(categoriesPayload)
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
      pmdKind: smartKind(row.pmd_kind),
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

    // The legacy /api/v1/menu response may still synthesize a fixed "Combos"
    // category. Once a real editable combos smart category exists, that old
    // synthetic navigation entry must disappear.
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

  const items: SmartMenuItem[] = menu.items.map((item, index) => {
    const raw = rawMenuRows[index] || {}
    const isCombo = yes(raw.isCombo ?? raw.is_combo)
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
