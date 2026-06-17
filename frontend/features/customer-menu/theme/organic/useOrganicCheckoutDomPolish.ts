import { useLayoutEffect } from "react"

/**
 * PMD_ORGANIC_POLISH_REPLACED_20260617
 *
 * The previous Organic polish hook scanned checkout DOM nodes and applied
 * inline styles. Organic checkout visuals are now CSS-owned through the
 * document marker below plus existing checkout data attributes/classes.
 */
export function useOrganicCheckoutDomPolish(isOrganicBotanicalTheme: boolean) {
  useLayoutEffect(() => {
    if (typeof document === "undefined") return

    const marker = "data-pmd-organic-botanical-active"

    if (!isOrganicBotanicalTheme) {
      document.body.removeAttribute(marker)
      document.documentElement.removeAttribute(marker)
      return
    }

    document.body.setAttribute(marker, "1")
    document.documentElement.setAttribute(marker, "1")

    return () => {
      document.body.removeAttribute(marker)
      document.documentElement.removeAttribute(marker)
    }
  }, [isOrganicBotanicalTheme])
}
