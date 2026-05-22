"use client"

import { OptimizedImage } from "@/components/ui/optimized-image"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useState } from "react"
import { X } from "lucide-react"
import type { MenuItem } from "@/lib/data"
import { getMenuImageUrl } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { useLanguageStore } from "@/store/language-store"
import type { TranslationKey } from "@/lib/translations"
import { FoodAttributeTags } from "@/components/food-attribute-tags"
import { FoodNutritionSummary } from "@/components/food-nutrition-summary"
import { FoodItemColorDot } from "@/components/food-item-color-dot"

interface MenuItemModalProps {
  item: MenuItem | null
  onClose: () => void
}

export function MenuItemModal({ item, onClose }: MenuItemModalProps) {
  const { t } = useLanguageStore()
  const [activeImageIndex, setActiveImageIndex] = useState(0)

  const itemName = item ? t(item.nameKey as TranslationKey) || item.name : ""
  const itemDescription = item ? t(item.descriptionKey as TranslationKey) || item.description : ""
  const itemImages = useMemo(() => {
    if (!item) return []
    const fromArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0) : []
    const mediaUrls = Array.isArray((item as any).media)
      ? (item as any).media.map((m: any) => m?.url || m?.image || m?.src).filter(Boolean)
      : []
    const merged = [
      ...fromArray((item as any).images),
      ...fromArray((item as any).gallery),
      ...fromArray(mediaUrls),
      item.image,
    ].filter(Boolean) as string[]
    return Array.from(new Set(merged))
  }, [item])

  useEffect(() => {
    setActiveImageIndex(0)
  }, [item?.id])

  useEffect(() => {
    if (!item || itemImages.length <= 1) return
    const timer = window.setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % itemImages.length)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [item, itemImages])

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative surface rounded-3xl shadow-2xl w-full max-w-xl max-h-[88vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white/90 rounded-full shadow-lg border border-white/20"
            >
              <X className="h-5 w-5 text-gray-600" />
            </Button>

            <div className="p-6 overflow-y-auto max-h-[88vh]">
              <div className="relative w-full h-[180px] md:h-[230px] mb-6 rounded-2xl overflow-hidden flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${item?.id}-${activeImageIndex}`}
                    initial={{ opacity: 0.25 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0.25 }}
                    transition={{ duration: 0.45 }}
                    className="absolute inset-0 p-2 md:p-3 flex items-center justify-center"
                  >
                    <OptimizedImage
                      src={getMenuImageUrl(itemImages[activeImageIndex] || item.image) || "/placeholder.svg"}
                      alt={itemName}
                      fill
                      className="object-contain max-h-full max-w-full w-auto h-auto rounded-2xl"
                      style={{ objectPosition: "center" }}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Content */}
              <h2 className="font-serif text-3xl font-bold text-paydine-elegant-gray mb-3 text-center">{itemName}</h2>
              <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5">
                <FoodItemColorDot color={item.color} label={`${itemName} color`} />
                <FoodAttributeTags
                  halal={item.halal}
                  vegetarian={item.vegetarian}
                  vegan={item.vegan}
                  allergens={item.allergens}
                  allergyTags={item.allergy_tags}
                  className="justify-center"
                />
              </div>
              <p className="text-gray-600 text-lg leading-relaxed text-center mb-4">{itemDescription}</p>
              <FoodNutritionSummary
                calories={item.calories}
                protein={item.protein}
                carbs={item.carbs}
                fat={item.fat}
                sugar={item.sugar}
                servingSize={item.serving_size}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
