"use client"

import React from "react"
import { useMenuActionCircleColorRepair } from "@/features/customer-menu/legacy-dom-repairs/useMenuActionCircleColorRepair"
import { __pmdRemoteConsoleInstallOnce, __pmdWalletDebugInstallOnce } from "@/features/customer-menu/legacy-dom-repairs/debugInstallers"
import { normalizeThemeId } from "@/lib/theme-registry"
import { pmdForceKazenFrontendThemePayload } from "@/features/customer-menu/theme/kazenThemePayload"

export function useCustomerMenuThemeBootstrap(setForceModernGreenTheme: (enabled: boolean) => void) {
  React.useEffect(() => {
    __pmdWalletDebugInstallOnce()
    __pmdRemoteConsoleInstallOnce()
  }, [])

  useMenuActionCircleColorRepair()

  React.useEffect(() => {
    if (typeof window === "undefined") return

    let cancelled = false

    async function checkModernGreenTheme() {
      try {
        const res = await fetch(`/simple-theme?forceModernGreen=${Date.now()}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        })

        const data = await res.json()
        const normalizedThemePayload = pmdForceKazenFrontendThemePayload(data)
        const themeId = normalizeThemeId(
          normalizedThemePayload?.data?.theme_id ||
          normalizedThemePayload?.theme_id ||
          normalizedThemePayload?.frontend_theme ||
          normalizedThemePayload?.admin_theme ||
          ""
        )

        if (!cancelled) setForceModernGreenTheme(themeId === "modern_green")
      } catch {
        if (!cancelled) setForceModernGreenTheme(false)
      }
    }

    checkModernGreenTheme()

    return () => {
      cancelled = true
    }
  }, [setForceModernGreenTheme])
}
