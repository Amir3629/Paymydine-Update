export type ThemeCanonicalId = "gold-luxury" | "organic_botanical_paper" | "modern_green" | "kazen_japanese"

export type ThemeAliasId =
  | ThemeCanonicalId
  | "gold_luxury"
  | "gold"
  | "modern-green"
  | "kazen-japanese"

export type ThemeValetMode = "standalone-page" | "inline-card" | "hidden"
export type ThemeMenuEntryMode = "dropdown" | "valet-button" | "none"
export type ThemeCheckoutLayoutId = "gold-luxury" | "organic-botanical-paper" | "modern-green" | "kazen-japanese"

export interface ThemeConfig {
  canonicalId: ThemeCanonicalId
  aliases: readonly ThemeAliasId[]
  backendAdminIds: readonly string[]
  displayName: string
  valetMode: ThemeValetMode
  menuEntryMode: ThemeMenuEntryMode
  checkoutLayoutId: ThemeCheckoutLayoutId
  usesIframePrototype: boolean
  usesNativeMainFrontendUi: boolean
  cssScopeRoot: string
}

const goldLuxuryThemeConfig = {
  canonicalId: "gold-luxury",
  aliases: ["gold-luxury", "gold_luxury", "gold"],
  backendAdminIds: ["gold_luxury", "gold", "gold-luxury"],
  displayName: "Gold Luxury",
  valetMode: "standalone-page",
  menuEntryMode: "dropdown",
  checkoutLayoutId: "gold-luxury",
  usesIframePrototype: false,
  usesNativeMainFrontendUi: true,
  cssScopeRoot: 'html[data-theme="gold-luxury"]',
} as const satisfies ThemeConfig

const organicBotanicalPaperThemeConfig = {
  canonicalId: "organic_botanical_paper",
  aliases: ["organic_botanical_paper"],
  backendAdminIds: ["organic_botanical_paper"],
  displayName: "Organic Botanical Paper",
  valetMode: "inline-card",
  menuEntryMode: "valet-button",
  checkoutLayoutId: "organic-botanical-paper",
  usesIframePrototype: true,
  usesNativeMainFrontendUi: false,
  cssScopeRoot: 'html[data-theme="organic_botanical_paper"]',
} as const satisfies ThemeConfig

const modernGreenThemeConfig = {
  canonicalId: "modern_green",
  aliases: ["modern_green", "modern-green"],
  backendAdminIds: ["modern_green", "modern-green"],
  displayName: "Modern Green",
  valetMode: "inline-card",
  menuEntryMode: "valet-button",
  checkoutLayoutId: "modern-green",
  usesIframePrototype: true,
  usesNativeMainFrontendUi: false,
  cssScopeRoot: 'html[data-theme="modern_green"]',
} as const satisfies ThemeConfig

const kazenJapaneseThemeConfig = {
  canonicalId: "kazen_japanese",
  aliases: ["kazen_japanese", "kazen-japanese"],
  backendAdminIds: ["kazen_japanese", "kazen-japanese", "kazen"],
  displayName: "Kazen Japanese Minimal",
  valetMode: "inline-card",
  menuEntryMode: "valet-button",
  checkoutLayoutId: "kazen-japanese",
  usesIframePrototype: true,
  usesNativeMainFrontendUi: false,
  cssScopeRoot: 'html[data-theme="kazen_japanese"]',
} as const satisfies ThemeConfig

export const themeRegistry = {
  gold_luxury: goldLuxuryThemeConfig,
  "gold-luxury": goldLuxuryThemeConfig,
  organic_botanical_paper: organicBotanicalPaperThemeConfig,
  modern_green: modernGreenThemeConfig,
  "modern-green": modernGreenThemeConfig,
  kazen_japanese: kazenJapaneseThemeConfig,
  "kazen-japanese": kazenJapaneseThemeConfig,
} as const satisfies Record<"gold_luxury" | "gold-luxury" | "organic_botanical_paper" | "modern_green" | "modern-green" | "kazen_japanese" | "kazen-japanese", ThemeConfig>

const themeAliasMap = new Map<string, ThemeConfig>()

Object.values(themeRegistry).forEach((themeConfig) => {
  themeAliasMap.set(themeConfig.canonicalId, themeConfig)
  themeConfig.aliases.forEach((alias) => themeAliasMap.set(alias, themeConfig))
  themeConfig.backendAdminIds.forEach((alias) => themeAliasMap.set(alias, themeConfig))
})

export function normalizeThemeId(input: string | null | undefined): ThemeCanonicalId {
  return getThemeConfig(input).canonicalId
}

export function getThemeConfig(input: string | null | undefined): ThemeConfig {
  const normalizedInput = String(input || "").trim()
  return themeAliasMap.get(normalizedInput) || goldLuxuryThemeConfig
}

export function isOrganicTheme(input: string | null | undefined): boolean {
  return getThemeConfig(input).canonicalId === "organic_botanical_paper"
}

export function isGoldLuxuryTheme(input: string | null | undefined): boolean {
  return getThemeConfig(input).canonicalId === "gold-luxury"
}

export function isModernGreenTheme(input: string | null | undefined): boolean {
  return getThemeConfig(input).canonicalId === "modern_green"
}


export function isKazenJapaneseTheme(input: string | null | undefined): boolean {
  return getThemeConfig(input).canonicalId === "kazen_japanese"
}
