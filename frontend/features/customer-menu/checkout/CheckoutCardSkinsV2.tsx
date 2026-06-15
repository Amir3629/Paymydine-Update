"use client"

import { OrganicCheckoutCardsV2 } from "./OrganicCheckoutCardsV2"

type Props = {
  visualTheme: string
  isDarkTheme?: boolean
}

export function CheckoutCardSkinsV2({ visualTheme }: Props) {
  if (visualTheme === "organic_botanical_paper") {
    return <OrganicCheckoutCardsV2 />
  }

  return null
}
