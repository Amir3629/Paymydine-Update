import type { CSSProperties, ReactNode } from "react"
import { getCustomerTheme } from "./themeRegistry"
import type { CustomerPageType, CustomerThemeId } from "./themeTypes"

type CustomerThemeProviderProps = {
  children: ReactNode
  page: CustomerPageType
  themeId?: CustomerThemeId
  className?: string
}

export function CustomerThemeProvider({ children, page, themeId = "gold-v1", className = "" }: CustomerThemeProviderProps) {
  const theme = getCustomerTheme(themeId)
  const style = {
    "--pmd-customer-page": theme.page,
    "--pmd-customer-surface": theme.surface,
    "--pmd-customer-soft": theme.surfaceSoft,
    "--pmd-customer-text": theme.text,
    "--pmd-customer-muted": theme.muted,
    "--pmd-customer-primary": theme.primary,
    "--pmd-customer-primary-text": theme.primaryText,
    "--pmd-customer-border": theme.border,
    "--pmd-customer-accent": theme.accent,
    "--pmd-customer-font-sans": theme.fontSans,
    "--pmd-customer-font-serif": theme.fontSerif,
  } as CSSProperties

  return (
    <div data-pmd-customer-app={theme.id} data-pmd-customer-page={page} className={className} style={style}>
      {children}
    </div>
  )
}
