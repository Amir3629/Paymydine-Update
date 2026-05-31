import { goldTheme } from "./goldTheme"
import type { CustomerThemeId, CustomerThemeTokens } from "./themeTypes"

export const defaultCustomerThemeId: CustomerThemeId = "gold-v1"

export const customerThemes: Record<CustomerThemeId, CustomerThemeTokens> = {
  "gold-v1": goldTheme,
}

export function getCustomerTheme(themeId: string | null | undefined): CustomerThemeTokens {
  if (themeId && themeId in customerThemes) return customerThemes[themeId as CustomerThemeId]
  return customerThemes[defaultCustomerThemeId]
}
