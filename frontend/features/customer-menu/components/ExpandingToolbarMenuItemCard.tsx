"use client"

import React from "react"
import { Minus } from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import type { MenuItem, MenuHighlightSettings } from "@/lib/data"
import { defaultMenuHighlightSettings } from "@/lib/data"
import { useLanguageStore } from "@/store/language-store"
import { useCartStore } from "@/store/cart-store"
import { useCmsStore } from "@/store/cms-store"
import type { TranslationKey } from "@/lib/translations"
import { truncateText } from "@/lib/utils"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { FoodAttributeTags } from "@/components/food-attribute-tags"
import { FoodItemColorDot } from "@/components/food-item-color-dot"
import { FoodNutritionSummary } from "@/components/food-nutrition-summary"
import { getTextAlignClass, getTextDirection } from "@/lib/text-direction"
import { MenuRecommendationBadges } from "../theme/MenuHighlights"

export function ExpandingToolbarMenuItemCard({ item, onSelect, onFirstAdd, prioritizeImage = false, highlightSettings = defaultMenuHighlightSettings }: { item: MenuItem; onSelect: (item: MenuItem) => void; onFirstAdd: () => void; prioritizeImage?: boolean; highlightSettings?: MenuHighlightSettings }) {
  const addToCart = useCartStore((state) => state.addToCart)
  const { items } = useCartStore()
  const { t } = useLanguageStore()

  // NOTE: item.price from filteredItems is already adjusted, so we don't adjust again

  // Get current quantity for this item
  const currentItem = items.find(cartItem => cartItem.item.id === item.id)
  const quantity = currentItem?.quantity || 0

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    // IMPORTANT: item from filteredItems has adjusted price, but cart needs ORIGINAL price
    // So we need to revert the price adjustment before adding to cart
    const { taxSettings } = useCmsStore.getState()
    let itemToAdd = { ...item }

    if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
      // Revert the adjustment: divide by (1 + VAT%)
      itemToAdd.price = item.price / (1 + taxSettings.percentage / 100)
      // Also revert option prices
      if (itemToAdd.options) {
        itemToAdd.options = itemToAdd.options.map(option => ({
          ...option,
          values: option.values.map(value => ({
            ...value,
            price: value.price / (1 + taxSettings.percentage / 100)
          }))
        }))
      }
    }

    addToCart(itemToAdd)
    if (quantity === 0) {
      onFirstAdd()
    }
  }

  const itemName = item.nameKey && t(item.nameKey as TranslationKey) ? t(item.nameKey as TranslationKey) : item.name
  const itemDescription = item.descriptionKey && t(item.descriptionKey as TranslationKey) ? t(item.descriptionKey as TranslationKey) : item.description
  const truncatedDescription = truncateText(itemDescription || '', 66)

  return (
    <div
      className="flex items-center space-x-4 group cursor-pointer"
      onClick={() => onSelect(item)}
    >
      <div className="relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0">
        {highlightSettings.badge_position !== 'title_inline' && highlightSettings.badge_position !== 'hidden' && (
          <div className={`absolute top-1 z-10 ${highlightSettings.badge_position === 'image_top_right' ? 'right-1' : 'left-1'}`}>
            <MenuRecommendationBadges item={item} compact settings={highlightSettings} placement="card" />
          </div>
        )}
        <OptimizedImage
          src={item.image || (Array.isArray((item as any).images) ? (item as any).images[0] : "") || "/placeholder.svg"}
          alt={itemName}
          fill
          priority={prioritizeImage}
          className="object-contain transition-transform duration-700 ease-in-out group-hover:scale-110"
        />
      </div>
      <div className="flex-grow">
        <div className="flex flex-wrap items-center gap-2">
          <h3 dir={getTextDirection(itemName)} className={`text-lg font-bold text-paydine-elegant-gray ${getTextAlignClass(itemName)}`}>{itemName}</h3>
          {highlightSettings.badge_position === 'title_inline' && (
            <MenuRecommendationBadges item={item} compact settings={highlightSettings} placement="card" />
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <FoodAttributeTags
            halal={item.halal}
            vegetarian={item.vegetarian}
            vegan={item.vegan}
            allergens={item.allergens}
            allergyTags={item.allergy_tags}
            compact
          />
          <FoodItemColorDot color={item.color} label={`${itemName} color`} />
          <FoodNutritionSummary
            calories={item.calories}
            protein={item.protein}
            carbs={item.carbs}
            fat={item.fat}
            sugar={item.sugar}
            servingSize={item.serving_size}
            compact
          />
        </div>
        <p dir={getTextDirection(truncatedDescription)} className={`text-sm text-gray-500 mt-1 line-clamp-2 ${getTextAlignClass(truncatedDescription)}`}>{truncatedDescription}</p>
        <div className="flex justify-between items-center mt-2">
        <p className="text-lg font-semibold menu-item-price">{formatCurrency(item.price || 0)}</p>
          {/* PMD_MENU_ITEM_MINUS_AFTER_ADD_20260605 */}
          <div className="relative flex items-center gap-2">
            {quantity > 0 && (
              <button
                type="button"
                className="quantity-btn pmd-v2-action-circle w-10 h-10 font-bold text-lg"
                onClick={(e) => {
                  e.stopPropagation()
                  addToCart(currentItem?.item || item, -1)
                }}
                aria-label="Remove one item"
              >
                <Minus className="h-5 w-5" style={{ color: "#FFFFFF", stroke: "#FFFFFF", WebkitTextFillColor: "#FFFFFF" }} />
              </button>
            )}
            <button
              className="quantity-btn pmd-v2-action-circle w-12 h-12 font-bold text-lg"
              onClick={handleAdd}
              aria-label="Add to cart"
            >
              {quantity > 0 ? (
                <span className="text-lg font-bold">{quantity}</span>
              ) : (
                <span data-pmd-menu-plus-text="1" aria-hidden="true" style={{ color: "#FFFFFF", WebkitTextFillColor: "#FFFFFF", fontWeight: 900, fontSize: "28px", lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", transform: "translateY(-1px)" }}>+</span>
              )}
              <span className="sr-only">Add to cart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
