"use client"

import type React from "react"
import { motion, type Variants } from "framer-motion"
import { Plus } from "lucide-react"
import type { MenuItem } from "@/lib/data"
import { useCartStore } from "@/store/cart-store"
import { useLanguageStore } from "@/store/language-store"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/currency"
import type { TranslationKey } from "@/lib/translations"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { getMenuImageUrl } from "@/lib/api-client"
import { truncateText } from "@/lib/utils"
import { FoodAttributeTags } from "@/components/food-attribute-tags"
import { FoodNutritionSummary } from "@/components/food-nutrition-summary"
import { FoodItemColorDot } from "@/components/food-item-color-dot"
import { ActionTooltip } from "@/components/action-tooltip"
import { getTextAlignClass, getTextDirection } from "@/lib/text-direction"

interface MenuItemCardProps {
 item: MenuItem
 onSelect: (item: MenuItem) => void
}

const cardVariants: Variants = {
 hidden: { y: 20, opacity: 0 },
 visible: {
 y: 0,
 opacity: 1,
 transition: {
 type: "spring" as const,
 stiffness: 100,
 },
 },
}

// PMD_RTL_DO_NOT_ALIGN_FOOD_TITLES
// PMD_FORCE_CARD_FOOD_TITLE_NOT_RTL
// PMD_FOOD_CARD_TITLE_ALWAYS_CENTER
export function MenuItemCard({ item, onSelect }: MenuItemCardProps) {
 const addToCart = useCartStore((state) => state.addToCart)
 const { toast } = useToast()
 const { t } = useLanguageStore()

 const handleAddToCart = (e: React.MouseEvent) => {
 e.stopPropagation()
 addToCart(item)
 const itemName = t(item.nameKey as TranslationKey) || item.name
 toast({
 title: t("addedToCart"),
 description: `${itemName} ${t("addedToCartDesc")}`,
 })
 }

 const itemName = t(item.nameKey as TranslationKey) || item.name
 const itemDescription = t(item.descriptionKey as TranslationKey) || item.description
 const truncatedDescription = truncateText(itemDescription || '', 66)

 return (
 <motion.div
 variants={cardVariants}
 className="flex items-center space-x-4 group cursor-pointer"
 onClick={() => onSelect(item)}
 >
 <div className="relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0">
 <OptimizedImage
 src={getMenuImageUrl(item.image) || "/placeholder.svg"}
 alt={itemName}
 fill
 className="object-contain transition-transform duration-500 ease-in-out group-hover:scale-110"
 />
 </div>
 <div className="flex-grow">
 <h3 dir="auto" className="font-serif text-lg font-bold text-paydine-elegant-gray text-center">{itemName}</h3>
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
 <p className="text-lg font-semibold menu-item-price">{formatCurrency(item.price)}</p>
 <ActionTooltip label="Add item">
 <Button
 size="icon"
 variant="ghost"
 className="rounded-full bg-paydine-rose-beige/50 hover:bg-paydine-champagne w-10 h-10"
 style={{ color: 'var(--theme-background)' }}
 onClick={handleAddToCart}
 aria-label="Add item"
 >
 <Plus data-pmd-menu-plus-white="1" className="h-5 w-5" strokeWidth={3.5} style={{ color: "#FFFFFF", stroke: "#FFFFFF", WebkitTextFillColor: "#FFFFFF" }} />
 <span className="sr-only">Add to cart</span>
 </Button>
 </ActionTooltip>
 </div>
 </div>
 </motion.div>
 )
}
