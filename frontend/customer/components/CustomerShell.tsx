import type { ReactNode } from "react"
import { CustomerThemeProvider } from "../theme/CustomerThemeProvider"
import type { CustomerPageType, CustomerThemeId } from "../theme/themeTypes"

export function CustomerShell({ children, page, themeId = "gold-v1", className = "" }: { children: ReactNode; page: CustomerPageType; themeId?: CustomerThemeId; className?: string }) {
  return (
    <CustomerThemeProvider page={page} themeId={themeId} className={["pmd-customer-shell", className].filter(Boolean).join(" ")}>
      {children}
    </CustomerThemeProvider>
  )
}
