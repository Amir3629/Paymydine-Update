export const goldTokens = {
  app: "gold-v1",
  pageBackground: "#fcfff8",
  surface: "#fcfff8",
  surfaceSoft: "#fcfff8",
  text: "#10201D",
  muted: "#6B7280",
  primary: "#062F2A",
  primaryText: "#FFFFFF",
  borderGold: "#E8E2D8",
  goldDeep: "#B88940",
} as const

export type GoldTokenName = keyof typeof goldTokens
