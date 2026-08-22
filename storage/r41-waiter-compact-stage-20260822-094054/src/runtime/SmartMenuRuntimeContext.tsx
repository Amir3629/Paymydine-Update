'use client'

import { useMemo, type ReactNode } from 'react'
import type { CustomerBootstrap, MenuItem } from '@/src/domain/model'
import { localizeMenuItem } from '@/src/lib/i18n'
import {
  MenuRuntimeProvider as BaseMenuRuntimeProvider,
  useMenuRuntime as useBaseMenuRuntime,
} from './MenuRuntimeContext'

type SmartKind = 'regular' | 'chef' | 'bestseller' | 'combos'
type SmartCategory = CustomerBootstrap['menu']['categories'][number] & { pmdKind?: SmartKind }
type SmartItem = MenuItem & {
  pmdIsCombo?: boolean
  pmdIsManualBestseller?: boolean
  pmdBestsellerOverrideMode?: 'auto' | 'force_on' | 'force_off'
}

function uniqueMenuItems(items: MenuItem[]): MenuItem[] {
  const seen = new Set<string>()

  return items.filter((item) => {
    const smart = item as SmartItem
    const key = `${smart.pmdIsCombo ? 'combo' : 'food'}:${item.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function matchesSearch(item: MenuItem, search: string): boolean {
  const needle = search.trim().toLowerCase()
  if (!needle) return true

  return [
    item.name,
    item.description,
    item.categoryName,
    item.allergens.join(' '),
  ]
    .join(' ')
    .toLowerCase()
    .includes(needle)
}

// PMD_MENU_SMART_CATEGORIES_V1_FRONTEND_V2_RUNTIME
// Keep the proven MenuRuntimeContext as the single runtime owner. This adapter
// changes only category-filter semantics for smart categories and deduplicates
// multi-category API rows. All cart/order/service/payment behavior remains in
// the existing runtime unchanged.
export function MenuRuntimeProvider({
  bootstrap,
  children,
}: {
  bootstrap: CustomerBootstrap
  children: ReactNode
}) {
  return (
    <BaseMenuRuntimeProvider bootstrap={bootstrap}>
      {children}
    </BaseMenuRuntimeProvider>
  )
}

export function useMenuRuntime(): ReturnType<typeof useBaseMenuRuntime> {
  const base = useBaseMenuRuntime()

  const activeCategory = useMemo(() => {
    if (base.selectedCategory === 'all') return null

    const selected = String(base.selectedCategory).trim().toLowerCase()
    return (base.categories as SmartCategory[]).find((category) =>
      String(category.id).trim().toLowerCase() === selected
      || category.name.trim().toLowerCase() === selected
    ) || null
  }, [base.categories, base.selectedCategory])

  const localizedItems = useMemo(
    () => base.bootstrap.menu.items.map((item) => localizeMenuItem(item, base.locale)),
    [base.bootstrap.menu.items, base.locale],
  )

  const visibleItems = useMemo(() => {
    if (base.selectedCategory === 'all' || !activeCategory) {
      return uniqueMenuItems(base.visibleItems)
    }

    const kind = activeCategory.pmdKind || 'regular'

    if (kind === 'regular') {
      return uniqueMenuItems(base.visibleItems)
    }

    const filtered = localizedItems.filter((item) => {
      if (!item.available || !matchesSearch(item, base.search)) return false

      const smart = item as SmartItem

      if (kind === 'chef') {
        return item.isChefRecommended
      }

      if (kind === 'bestseller') {
        // Smart Bestseller membership is intentionally manual-only. Automatic
        // popularity may still render the existing Bestseller badge elsewhere.
        return Boolean(smart.pmdIsManualBestseller)
      }

      if (kind === 'combos') {
        return Boolean(smart.pmdIsCombo)
      }

      return false
    })

    return uniqueMenuItems(filtered)
  }, [activeCategory, base.search, base.selectedCategory, base.visibleItems, localizedItems])

  const featuredItems = useMemo(
    () => uniqueMenuItems(base.featuredItems),
    [base.featuredItems],
  )

  const bestsellerItems = useMemo(
    () => uniqueMenuItems(base.bestsellerItems),
    [base.bestsellerItems],
  )

  return useMemo(
    () => ({
      ...base,
      visibleItems,
      featuredItems,
      bestsellerItems,
    }),
    [base, bestsellerItems, featuredItems, visibleItems],
  )
}
