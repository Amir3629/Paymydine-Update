import React from "react"

const lightLogo = "/assets/media/uploads/PMD.png?v=1780008763"
const darkLogo = "/assets/media/uploads/PMDD.png?v=1780008763"

type MenuPayMyDineFooterLogoProps = {
  visible: boolean
}

export function MenuPayMyDineFooterLogo({ visible }: MenuPayMyDineFooterLogoProps) {
  if (!visible) return null

  return (
    <div className="pmd-menu-theme-footer-logo" data-pmd-menu-footer-logo="1" aria-label="PayMyDine">
      <picture>
        <source srcSet={darkLogo} media="(prefers-color-scheme: dark)" />
        <img src={lightLogo} alt="PayMyDine" loading="lazy" decoding="async" />
      </picture>
      <img
        src={darkLogo}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="pmd-menu-theme-footer-logo-dark"
      />
    </div>
  )
}
