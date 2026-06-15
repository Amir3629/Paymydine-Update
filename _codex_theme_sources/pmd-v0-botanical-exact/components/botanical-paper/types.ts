import type React from "react"

export type MenuItemOptionValue = {
  id: string
  name: string
  price?: number
}

export type MenuItemOption = {
  id: string
  name: string
  required?: boolean
  /** when true, more than one value can be selected (e.g. add-ons) */
  multiple?: boolean
  values: MenuItemOptionValue[]
}

export type MenuItem = {
  id: string | number
  name: string
  description?: string
  price: number
  image?: string
  images?: string[]
  categoryName: string
  isNew?: boolean
  isChefRecommended?: boolean
  isBestSeller?: boolean
  isSoldOut?: boolean
  isVegetarian?: boolean
  isVegan?: boolean
  isGlutenFree?: boolean
  isHalal?: boolean
  allergens?: string[]
  /** set true to render this item's text right-to-left (e.g. Persian) */
  rtl?: boolean
  options?: MenuItemOption[]
}

export type Category = {
  id: string
  name: string
  icon?: React.ReactNode
}

export type MenuSectionData = {
  id: string
  /** uppercase title shown with botanical ornaments */
  title: string
  subtitle?: string
  /** category id this section maps to (for filtering) */
  categoryId: string
  items: MenuItem[]
}

export type SelectedOptions = Record<string, MenuItemOptionValue[]>
