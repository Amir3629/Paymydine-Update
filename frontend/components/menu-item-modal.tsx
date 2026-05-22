"use client"

import { OptimizedImage } from "@/components/ui/optimized-image"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
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
  const [renderedItem, setRenderedItem] = useState<MenuItem | null>(item)
  const [isLocallyClosed, setIsLocallyClosed] = useState(false)

  // PMD_MODAL_OPEN_SYNC_FIX_START
  // The modal component can mount with item=null and later receive the clicked item.
  // Keep renderedItem in sync so clicking a food item always opens the detail card.
  useEffect(() => {
    if (item) {
      setIsLocallyClosed(false)
      setRenderedItem(item)
      setActiveImageIndex(0)
    }
  }, [item])
  // PMD_MODAL_OPEN_SYNC_FIX_END
  const [isVisible, setIsVisible] = useState(Boolean(item))
  const closeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (item && !isLocallyClosed) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      setRenderedItem(item)
      setIsVisible(true)
      return
    }

    setIsVisible(false)
    closeTimerRef.current = window.setTimeout(() => {
      setRenderedItem(null)
      setActiveImageIndex(0)
      closeTimerRef.current = null
    }, 320)

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
  }, [item, isLocallyClosed])

  const itemName = renderedItem ? t(renderedItem.nameKey as TranslationKey) || renderedItem.name : ""
  const itemDescription = renderedItem ? t(renderedItem.descriptionKey as TranslationKey) || renderedItem.description : ""
  const itemImages = useMemo(() => {
    if (!renderedItem) return []
    const fromArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0) : []
    const mediaUrls = Array.isArray((renderedItem as any).media)
      ? (renderedItem as any).media.map((m: any) => m?.url || m?.image || m?.src).filter(Boolean)
      : []
    const merged = [
      renderedItem.image,
      ...fromArray((renderedItem as any).images),
      ...fromArray((renderedItem as any).gallery),
      ...fromArray(mediaUrls),
    ].filter(Boolean) as string[]
    return Array.from(new Set(merged))
  }, [renderedItem])

  useEffect(() => {
    setActiveImageIndex(0)
  }, [renderedItem?.id])

  useEffect(() => {
    if (!renderedItem) return
    console.info("PMD_MODAL_GALLERY_IMAGES", {
      id: (renderedItem as any)?.id || (renderedItem as any)?.menu_id,
      name: renderedItem?.name,
      count: itemImages.length,
      images: itemImages,
    })
  }, [renderedItem, itemImages])

  useEffect(() => {
    if (!isVisible || !renderedItem || itemImages.length <= 1) return
    const timer = window.setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % itemImages.length)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [isVisible, renderedItem, itemImages])

  
  // PMD_MODAL_CLOSE_TIMER_CLEANUP_START
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
      }
    }
  }, [])
  // PMD_MODAL_CLOSE_TIMER_CLEANUP_END

// PMD_MODAL_CLOSE_LOCAL_STATE_FIX_START
  const isModalOpen = Boolean(item && renderedItem && !isLocallyClosed)

  const handleModalClose = (event?: any) => {
    event?.stopPropagation?.()

    if (isLocallyClosed) return

    setIsLocallyClosed(true)

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
    }

    // Delay parent teardown so the exit animation can actually be seen.
    closeTimerRef.current = setTimeout(() => {
      onClose()
    }, 320)
  }
  // PMD_MODAL_CLOSE_LOCAL_STATE_FIX_END

  return (
    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleModalClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: isVisible ? 1 : 0.97, y: isVisible ? 0 : 8, opacity: isVisible ? 1 : 0 }}
            exit={{ scale: 0.97, y: 8, opacity: 0 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="relative surface rounded-3xl shadow-2xl w-full max-w-xl max-h-[88vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleModalClose}
              className="absolute top-4 right-4 z-10 bg-white/80 hover:bg-white/90 rounded-full shadow-lg border border-white/20"
            >
              <X className="h-5 w-5 text-gray-600" />
            </Button>

            <div className="p-6 overflow-y-auto max-h-[88vh]">
              <div className="relative w-full h-[180px] md:h-[230px] mb-6 rounded-2xl overflow-hidden flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${renderedItem?.id}-${activeImageIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: "easeInOut" }}
                    className="absolute inset-0 p-2 md:p-3 flex items-center justify-center"
                  >
                    <OptimizedImage
                      src={getMenuImageUrl(itemImages[activeImageIndex] || renderedItem.image) || "/placeholder.svg"}
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
                <FoodItemColorDot color={renderedItem?.color} label={`${itemName} color`} />
                <FoodAttributeTags
                  halal={renderedItem?.halal}
                  vegetarian={renderedItem?.vegetarian}
                  vegan={renderedItem?.vegan}
                  allergens={renderedItem?.allergens}
                  allergyTags={renderedItem?.allergy_tags}
                  className="justify-center"
                />
              </div>
              <p className="text-gray-600 text-lg leading-relaxed text-center mb-4">{itemDescription}</p>
              <FoodNutritionSummary
                calories={renderedItem?.calories}
                protein={renderedItem?.protein}
                carbs={renderedItem?.carbs}
                fat={renderedItem?.fat}
                sugar={renderedItem?.sugar}
                servingSize={renderedItem?.serving_size}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
