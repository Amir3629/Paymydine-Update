import { PMD_THEME_KEYS, normalizeCustomerThemeKey } from "./themeKeys"

export type PmdDockThemeId = "kazen" | "modernGreen" | "organic" | "gold"

export type CustomerMenuThemeDefinition = {
  key: string
  label: string
  dockTheme: PmdDockThemeId
  checkoutVisualTheme: string
  isEmbeddedBridgeTheme?: boolean
}

export const CUSTOMER_MENU_THEME_REGISTRY: Record<string, CustomerMenuThemeDefinition> = {
  [PMD_THEME_KEYS.KAZEN_JAPANESE]: {
    key: PMD_THEME_KEYS.KAZEN_JAPANESE,
    label: "Kazen Japanese",
    dockTheme: "kazen",
    checkoutVisualTheme: PMD_THEME_KEYS.KAZEN_JAPANESE,
    isEmbeddedBridgeTheme: true,
  },
  [PMD_THEME_KEYS.MODERN_GREEN]: {
    key: PMD_THEME_KEYS.MODERN_GREEN,
    label: "Modern Green",
    dockTheme: "modernGreen",
    checkoutVisualTheme: PMD_THEME_KEYS.MODERN_GREEN,
    isEmbeddedBridgeTheme: true,
  },
  [PMD_THEME_KEYS.ORGANIC_BOTANICAL]: {
    key: PMD_THEME_KEYS.ORGANIC_BOTANICAL,
    label: "Organic Botanical Paper",
    dockTheme: "organic",
    checkoutVisualTheme: PMD_THEME_KEYS.ORGANIC_BOTANICAL,
  },
  [PMD_THEME_KEYS.GOLD_LUXURY]: {
    key: PMD_THEME_KEYS.GOLD_LUXURY,
    label: "Gold Luxury",
    dockTheme: "gold",
    checkoutVisualTheme: PMD_THEME_KEYS.GOLD_LUXURY,
  },
  [PMD_THEME_KEYS.GOLD_LUXURY_ALT]: {
    key: PMD_THEME_KEYS.GOLD_LUXURY_ALT,
    label: "Gold Luxury",
    dockTheme: "gold",
    checkoutVisualTheme: PMD_THEME_KEYS.GOLD_LUXURY,
  },
}

export function getCustomerMenuThemeDefinition(value: unknown): CustomerMenuThemeDefinition {
  const key = normalizeCustomerThemeKey(value)
  return CUSTOMER_MENU_THEME_REGISTRY[key] || CUSTOMER_MENU_THEME_REGISTRY[PMD_THEME_KEYS.GOLD_LUXURY]
}
