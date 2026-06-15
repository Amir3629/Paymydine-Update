export const PMD_THEME_KEYS = {
  ORGANIC_BOTANICAL: "organic_botanical_paper",
  MODERN_GREEN: "modern_green",
  KAZEN_JAPANESE: "kazen_japanese",
  GOLD_LUXURY: "gold-luxury",
  GOLD_LUXURY_ALT: "gold_luxury",
} as const

export type PmdCustomerThemeKey =
  | typeof PMD_THEME_KEYS.ORGANIC_BOTANICAL
  | typeof PMD_THEME_KEYS.MODERN_GREEN
  | typeof PMD_THEME_KEYS.KAZEN_JAPANESE
  | typeof PMD_THEME_KEYS.GOLD_LUXURY
  | typeof PMD_THEME_KEYS.GOLD_LUXURY_ALT
  | string

export function normalizeCustomerThemeKey(value: unknown): string {
  const raw = String(value || "").trim().toLowerCase()
  if (!raw) return ""

  if (raw === "organic" || raw === "botanical" || raw === "organic-botanical") {
    return PMD_THEME_KEYS.ORGANIC_BOTANICAL
  }

  if (raw === "modern" || raw === "modern-green") {
    return PMD_THEME_KEYS.MODERN_GREEN
  }

  if (raw === "kazen" || raw === "japanese" || raw === "kazen-japanese") {
    return PMD_THEME_KEYS.KAZEN_JAPANESE
  }

  if (raw === "gold" || raw === "gold_luxury" || raw === "gold-luxury") {
    return PMD_THEME_KEYS.GOLD_LUXURY
  }

  return raw
}

export function isOrganicCustomerTheme(value: unknown) {
  return normalizeCustomerThemeKey(value) === PMD_THEME_KEYS.ORGANIC_BOTANICAL
}

export function isModernGreenCustomerTheme(value: unknown) {
  return normalizeCustomerThemeKey(value) === PMD_THEME_KEYS.MODERN_GREEN
}

export function isKazenJapaneseCustomerTheme(value: unknown) {
  return normalizeCustomerThemeKey(value) === PMD_THEME_KEYS.KAZEN_JAPANESE
}

export function isGoldLuxuryCustomerTheme(value: unknown) {
  const normalized = normalizeCustomerThemeKey(value)
  return normalized === PMD_THEME_KEYS.GOLD_LUXURY || normalized === PMD_THEME_KEYS.GOLD_LUXURY_ALT
}
