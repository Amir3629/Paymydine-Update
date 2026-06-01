export const goldTokens = {
  app: "gold-v1",
  pageBackground: "#FAF7F0",
  surface: "#FFFFFF",
  surfaceSoft: "#FFF9EF",
  text: "#10201D",
  muted: "#6B7280",
  primary: "#062F2A",
  primaryText: "#FFFFFF",
  borderGold: "#E8E2D8",
  goldDeep: "#B88940",
} as const

export type GoldTokenName = keyof typeof goldTokens
