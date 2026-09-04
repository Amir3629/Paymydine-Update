import type { MenuItem } from '@/src/domain/model'

type TranslatedName = { name: string; translations?: Record<string, string> }

const groupBaseNames = new WeakMap<object, string>()
const valueBaseNames = new WeakMap<object, string>()

function translatedName(source: TranslatedName, locale: string, baseNames: WeakMap<object, string>): string {
  const object = source as unknown as object
  if (!baseNames.has(object)) baseNames.set(object, String(source.name || ''))
  const fallback = baseNames.get(object) || String(source.name || '')
  const exact = String(locale || '').trim().toLowerCase()
  const base = exact.split('-')[0] || 'en'
  const map = source.translations || {}
  return String(map[exact] || map[base] || fallback)
}

// PMD_MENU_OPTION_CONTENT_I18N_V1
// MenuItem localization already handles food/category text. Option objects are
// nested and shared by the localized MenuItem clones, so translating their names
// here keeps every existing option UI/cart authority intact without a parallel model.
export function localizeMenuOptionContentInPlace(items: MenuItem[], locale: string): void {
  items.forEach((item) => {
    item.options.forEach((group) => {
      const translatedGroup = group as typeof group & { translations?: Record<string, string> }
      translatedGroup.name = translatedName(translatedGroup, locale, groupBaseNames)
      translatedGroup.values.forEach((value) => {
        const translatedValue = value as typeof value & { translations?: Record<string, string> }
        translatedValue.name = translatedName(translatedValue, locale, valueBaseNames)
      })
    })
  })
}
