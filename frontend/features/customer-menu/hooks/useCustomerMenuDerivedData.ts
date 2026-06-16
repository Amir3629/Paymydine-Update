import { useMemo } from "react"

type MenuOptionValue = {
  price: number
  [key: string]: any
}

type MenuOption = {
  values: MenuOptionValue[]
  [key: string]: any
}

type DerivedMenuItem = {
  price: number
  category?: string
  options?: MenuOption[]
  [key: string]: any
}

type TaxSettingsLike = {
  enabled?: boolean
  percentage?: number
  menuPrice?: number
}

type MenuHighlightSettingsLike = {
  chef_section_enabled?: boolean
  bestseller_section_enabled?: boolean
  section_placement?: string
  max_chef_items?: number
  max_bestseller_items?: number
  [key: string]: any
}

interface UseCustomerMenuDerivedDataProps {
  apiMenuItems: DerivedMenuItem[]
  menuItems: DerivedMenuItem[]
  menuData: DerivedMenuItem[]
  dynamicCategories: any[]
  selectedCategory?: string | null
  menuHighlightSettings: MenuHighlightSettingsLike
  taxSettings: TaxSettingsLike
}


export function useCustomerMenuDerivedData(props: UseCustomerMenuDerivedDataProps) {
  const {
    apiMenuItems,
    taxSettings,
    menuData,
    menuItems,
    dynamicCategories,
    selectedCategory,
    menuHighlightSettings,
  } = props

  const allCategories = useMemo(() => {
    const categoryList = dynamicCategories;
    return ["All", ...categoryList];
  }, [dynamicCategories]);

  // Adjust menu item prices if VAT is included in prices (vat_menu_price = 0)
  const adjustPriceForVAT = (price: number): number => {
    if (taxSettings.enabled && Number(taxSettings.percentage || 0) > 0 && Number(taxSettings.menuPrice || 0) === 0) {
      // VAT is included in prices - increase price by VAT percentage
      return price * (1 + Number(taxSettings.percentage || 0) / 100)
    }
    return price
  }

  // Update filteredItems logic with price adjustment
  const filteredItems = useMemo(() => {
    // Use API data if available, otherwise fallback to CMS store or static data
    const availableItems = apiMenuItems.length ? apiMenuItems : (menuItems.length ? menuItems : menuData);

    // Adjust prices if VAT is included in menu prices
    const itemsWithAdjustedPrices = availableItems.map((item: DerivedMenuItem) => ({
      ...item,
      price: adjustPriceForVAT(item.price),
      // Also adjust option prices if they exist
      options: item.options?.map((option: MenuOption) => ({
        ...option,
        values: option.values.map((value: MenuOptionValue) => ({
          ...value,
          price: adjustPriceForVAT(value.price)
        }))
      }))
    }))

    // Always default to showing all items if no category is selected
    const currentCategory = selectedCategory || "All";

    // If "All" is selected, show all items
    if (currentCategory === "All") {
      return itemsWithAdjustedPrices;
    }

    // Otherwise, filter by selected category
    return itemsWithAdjustedPrices.filter((item: DerivedMenuItem) => item.category === currentCategory);
  }, [apiMenuItems, menuItems, selectedCategory, taxSettings.enabled, taxSettings.percentage, taxSettings.menuPrice]);

  const highlightSourceItems = useMemo(() => {
    const availableItems = apiMenuItems.length ? apiMenuItems : (menuItems.length ? menuItems : menuData)
    return availableItems.map((item: DerivedMenuItem) => ({
      ...item,
      price: adjustPriceForVAT(item.price),
      options: item.options?.map((option: MenuOption) => ({
        ...option,
        values: option.values.map((value: MenuOptionValue) => ({ ...value, price: adjustPriceForVAT(value.price) }))
      }))
    }))
  }, [apiMenuItems, menuItems, taxSettings.enabled, taxSettings.percentage, taxSettings.menuPrice])

  const chefRecommendationItems = useMemo(() => {
    if (!menuHighlightSettings.chef_section_enabled || menuHighlightSettings.section_placement === 'hidden') return []
    return highlightSourceItems.filter((item: DerivedMenuItem) => Boolean((item as any).is_chef_recommended)).slice(0, menuHighlightSettings.max_chef_items)
  }, [highlightSourceItems, menuHighlightSettings])

  const bestsellerItems = useMemo(() => {
    if (!menuHighlightSettings.bestseller_section_enabled || menuHighlightSettings.section_placement === 'hidden') return []
    return highlightSourceItems.filter((item: DerivedMenuItem) => Boolean((item as any).is_bestseller)).slice(0, menuHighlightSettings.max_bestseller_items)
  }, [highlightSourceItems, menuHighlightSettings])

  const showVirtualHighlightSections = (selectedCategory || "All") === "All" && menuHighlightSettings.section_placement !== 'hidden'

  // Initialize with "All" category when data loads

  return {
    allCategories,
    filteredItems,
    highlightSourceItems,
    chefRecommendationItems,
    bestsellerItems,
    showVirtualHighlightSections,
  }
}
