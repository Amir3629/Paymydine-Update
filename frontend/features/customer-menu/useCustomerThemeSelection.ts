"use client"

import { useMemo } from "react"

const ORGANIC_BOTANICAL_THEME_KEY = "organic_botanical_paper"
const MODERN_GREEN_THEME_KEY = "modern_green"
const KAZEN_JAPANESE_THEME_KEY = "kazen_japanese"

export function useCustomerThemeSelection(currentFrontendTheme: string | null, forceModernGreenTheme: boolean) {
  return useMemo(
    () => ({
      isOrganicBotanicalTheme: currentFrontendTheme === ORGANIC_BOTANICAL_THEME_KEY,
      isModernGreenTheme: currentFrontendTheme === MODERN_GREEN_THEME_KEY || forceModernGreenTheme,
      isKazenJapaneseTheme: currentFrontendTheme === KAZEN_JAPANESE_THEME_KEY,
    }),
    [currentFrontendTheme, forceModernGreenTheme]
  )
}
