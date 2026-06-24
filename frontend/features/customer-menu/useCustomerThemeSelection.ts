"use client"

import { useMemo } from "react"
import { normalizeThemeId } from "@/lib/theme-registry"

export function useCustomerThemeSelection(currentFrontendTheme: string | null, forceModernGreenTheme: boolean) {
  return useMemo(() => {
    const themeId = normalizeThemeId(currentFrontendTheme)

    return {
      isOrganicBotanicalTheme: themeId === "organic_botanical_paper",
      isModernGreenTheme: themeId === "modern_green" || forceModernGreenTheme,
      isKazenJapaneseTheme: themeId === "kazen_japanese",
      isVelvetTerracottaTheme: themeId === "velvet_terracotta",
    }
  }, [currentFrontendTheme, forceModernGreenTheme])
}
