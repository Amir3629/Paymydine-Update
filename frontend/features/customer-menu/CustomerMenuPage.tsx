"use client"

import { Suspense, useEffect } from "react"
import { pmdInstallMenuPayMyDineFooterLogo } from "@/features/customer-menu/legacy-dom-repairs/footerLogoInstaller"
import { MenuContent } from "@/features/customer-menu/CustomerMenuContent"

export default function PayMyDineMenuPage() {
  // PMD_MENU_FOOTER_LOGO_RUNTIME_CALL_FINAL_20260611
  useEffect(() => {
    return pmdInstallMenuPayMyDineFooterLogo()
  }, [])

  return (
    <div className="pmd-customer-page page--menu" data-pmd-customer-page="menu">
      <Suspense fallback={<div>Loading...</div>}>
        <MenuContent />
      </Suspense>
    </div>
  )
}
