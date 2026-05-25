"use client"

import { useEffect } from "react"

const GUARD_ATTR = "data-pmd-clean-light-guard"

const CLEANED_STYLE_PROPS = [
  "background","background-color","border","border-color","border-radius","box-shadow","color",
  "-webkit-text-fill-color","-webkit-text-stroke","filter","font-size","gap","height","line-height",
  "margin","min-height","min-width","padding","stroke","text-shadow","width",
]

function cleanupGuardedStyles() {
  if (typeof document === "undefined") return
  document.querySelectorAll<HTMLElement | SVGElement>(`[${GUARD_ATTR}="1"]`).forEach((el) => {
    CLEANED_STYLE_PROPS.forEach((prop) => el.style.removeProperty(prop))
    el.removeAttribute(GUARD_ATTR)
  })
}

export default function CleanLightCustomerGuard() {
  useEffect(() => {
    cleanupGuardedStyles()
    return () => cleanupGuardedStyles()
  }, [])

  return null
}
