"use client"

import { useMemo } from "react"
import {
  isKazenJapaneseCustomerTheme,
  isModernGreenCustomerTheme,
  isOrganicCustomerTheme,
} from "@/features/customer-menu/theme-engine/themeKeys"

export function useMenuThemeFlags(currentFrontendTheme: string | null, forceModernGreenTheme: boolean) {
  return useMemo(
    () => ({
      isOrganicBotanicalTheme: isOrganicCustomerTheme(currentFrontendTheme),
      isModernGreenTheme: isModernGreenCustomerTheme(currentFrontendTheme) || forceModernGreenTheme,
      isKazenJapaneseTheme: isKazenJapaneseCustomerTheme(currentFrontendTheme),
    }),
    [currentFrontendTheme, forceModernGreenTheme]
  )
}
