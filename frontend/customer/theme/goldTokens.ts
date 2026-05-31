export const goldTokens = {
  app: "gold-v1",
  pageBackground: "#0F0B05",
  surface: "#FFFCF5",
  surfaceSoft: "#FFF9EF",
  text: "#10201D",
  muted: "#6B7280",
  primary: "#062F2A",
  primaryText: "#FFFFFF",
  borderGold: "#D8B982",
  goldDeep: "#B88940",
} as const

export type GoldTokenName = keyof typeof goldTokens
