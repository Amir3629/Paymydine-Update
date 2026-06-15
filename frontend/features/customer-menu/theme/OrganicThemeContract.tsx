"use client"

import React from "react"

export const ORGANIC_BOTANICAL_THEME_KEY = "organic_botanical_paper"
export const organicBotanicalVars = (): React.CSSProperties => ({})
export const OrganicBotanicalHero = (_props: any) => null
export const OrganicBotanicalCategoryNav = (_props: any) => null
export const OrganicBotanicalMenuCard = (_props: any) => null

export const hasCheckoutThemeRoot = () =>
  typeof document !== "undefined" && Boolean(document.querySelector('[data-pmd-checkout-theme-root="1"]'))
