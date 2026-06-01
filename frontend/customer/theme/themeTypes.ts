export type CustomerThemeId = "gold-v1"

export type CustomerThemeTokens = {
  id: CustomerThemeId
  label: string
  page: string
  surface: string
  surfaceSoft: string
  text: string
  muted: string
  primary: string
  primaryText: string
  border: string
  accent: string
  fontSans: string
  fontSerif: string
}

export type CustomerPageType = "home" | "menu" | "table" | "valet"
