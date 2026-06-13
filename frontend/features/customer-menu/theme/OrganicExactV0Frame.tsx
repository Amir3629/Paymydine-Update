"use client"

import React from "react"

// PMD_REMOVE_CODEX_ORGANIC_THEME_20260607
// Organic Botanical Paper now uses the exact v0 standalone frontend.
// These local placeholders keep the old Codex organic UI out of the build path.
export const ORGANIC_BOTANICAL_THEME_KEY = "organic_botanical_paper"
export const organicBotanicalVars = (): React.CSSProperties => ({})
export const OrganicBotanicalHero = (_props: any) => <OrganicExactV0Frame />
export const OrganicBotanicalCategoryNav = (_props: any) => null
export const OrganicBotanicalMenuCard = (_props: any) => null

export const hasCheckoutThemeRoot = () =>
  typeof document !== "undefined" && Boolean(document.querySelector('[data-pmd-checkout-theme-root="1"]'))

// PMD_ORGANIC_EXACT_FRAME_COMPONENT_20260607
export function OrganicExactV0Frame() {
  const [frameSrc, setFrameSrc] = React.useState("/dev/botanical-v0-exact/")

  React.useEffect(() => {
    if (typeof window === "undefined") return

    const params = new URLSearchParams()
    params.set("embed", "1")
    params.set("parentPath", window.location.pathname)
    params.set("parentSearch", window.location.search || "")
    params.set("host", window.location.host)
    params.set("ts", String(Date.now()))
    params.set("hideDock", "1")

    setFrameSrc(`/dev/botanical-v0-exact/?${params.toString()}`)
  }, [])

  return (
    <div className="fixed inset-0 z-[1] bg-[#f6efe2]">
      <iframe
        title="Organic Botanical Paper Menu"
        src={frameSrc}
        className="h-screen w-full border-0"
        style={{ width: "100%", height: "100vh", border: 0, display: "block" }}
      />
    </div>
  )
}
