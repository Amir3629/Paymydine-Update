"use client"

import React from "react"
import { OrganicNativeMenu } from "@/components/themes/organic-botanical-paper/menu/OrganicNativeMenu"

export const ORGANIC_BOTANICAL_THEME_KEY = "organic_botanical_paper"
export const organicBotanicalVars = (): React.CSSProperties => ({})
export const OrganicBotanicalHero = (_props: any) => null
export const OrganicBotanicalCategoryNav = (_props: any) => null
export const OrganicBotanicalMenuCard = (_props: any) => null

export const hasCheckoutThemeRoot = () =>
  typeof document !== "undefined" && Boolean(document.querySelector('[data-pmd-checkout-theme-root="1"]'))

export function OrganicExactV0Frame(props: any) {
  return <OrganicNativeMenu {...props} />
}
