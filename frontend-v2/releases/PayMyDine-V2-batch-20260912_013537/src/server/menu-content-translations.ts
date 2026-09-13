import type { CustomerBootstrap, MenuItem } from '@/src/domain/model'

type StringTranslations = Record<string, string>
type OptionWithTranslations = MenuItem['options'][number] & { translations?: StringTranslations }
type ValueWithTranslations = MenuItem['options'][number]['values'][number] & { translations?: StringTranslations }

type TranslationPayload = {
  menus?: Record<string, {
    translations?: Record<string, { name?: string; description?: string }>
    options?: Record<string, {
      translations?: StringTranslations
      values?: Record<string, { translations?: StringTranslations }>
    }>
  }>
  categories?: Record<string, { translations?: StringTranslations }>
}

function rootPayload(input: unknown): TranslationPayload {
  if (!input || typeof input !== 'object') return {}
  const row = input as Record<string, unknown>
  const nested = row.data
  if (nested && typeof nested === 'object') return nested as TranslationPayload
  return row as TranslationPayload
}

function cleanStringMap(input: unknown): StringTranslations {
  if (!input || typeof input !== 'object') return {}
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>)
      .map(([locale, value]) => [String(locale || '').trim().toLowerCase(), String(value || '').trim()] as const)
      .filter(([locale, value]) => Boolean(locale && value)),
  )
}

export function applyMenuContentTranslations(
  menu: CustomerBootstrap['menu'],
  input: unknown,
): CustomerBootstrap['menu'] {
  const root = rootPayload(input)
  const menus = root.menus || {}
  const categories = root.categories || {}

  return {
    ...menu,
    categories: menu.categories.map((category) => {
      const row = categories[String(category.id)]
      if (!row) return category
      return {
        ...category,
        translations: {
          ...(category.translations || {}),
          ...cleanStringMap(row.translations),
        },
      }
    }),
    items: menu.items.map((item) => {
      const row = menus[String(item.id)]
      if (!row) return item

      const optionRows = row.options || {}
      const options = item.options.map((group, groupIndex) => {
        const optionRow = optionRows[String(groupIndex)] || {}
        const translatedGroup: OptionWithTranslations = {
          ...group,
          translations: cleanStringMap(optionRow.translations),
          values: group.values.map((value, valueIndex) => {
            const valueRow = optionRow.values?.[String(valueIndex)] || {}
            const translatedValue: ValueWithTranslations = {
              ...value,
              translations: cleanStringMap(valueRow.translations),
            }
            return translatedValue
          }),
        }
        return translatedGroup
      })

      return {
        ...item,
        translations: {
          ...(item.translations || {}),
          ...(row.translations || {}),
        },
        options,
      }
    }),
  }
}
