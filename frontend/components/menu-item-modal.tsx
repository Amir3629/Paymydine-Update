"use client"

import { OptimizedImage } from "@/components/ui/optimized-image"
import { useEffect, useMemo, useState } from "react"
import type { MenuItem } from "@/lib/data"
import { getMenuImageUrl } from "@/lib/api-client"
import { useLanguageStore } from "@/store/language-store"
import type { TranslationKey } from "@/lib/translations"
import { FoodAttributeTags } from "@/components/food-attribute-tags"
import { FoodNutritionSummary } from "@/components/food-nutrition-summary"
import { FoodItemColorDot } from "@/components/food-item-color-dot"
import { createPortal } from "react-dom"
import { getTextAlignClass, getTextDirection } from "@/lib/text-direction"
import { CustomerModal } from "@/customer/components/CustomerModal"

interface MenuItemModalProps {
  item: MenuItem | null
  onClose: () => void
}

export function MenuItemModal({ item, onClose }: MenuItemModalProps) {
  const { t } = useLanguageStore()
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [isPortalMounted, setIsPortalMounted] = useState(false)

  useEffect(() => setIsPortalMounted(true), [])

  const itemName = item ? t(item.nameKey as TranslationKey) || item.name : ""
  const itemDescription = item ? t(item.descriptionKey as TranslationKey) || item.description : ""
  const itemImages = useMemo(() => {
    if (!item) return []
    const fromArray = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0) : []
    const mediaUrls = Array.isArray((item as any).media)
      ? (item as any).media.map((m: any) => m?.url || m?.image || m?.src).filter(Boolean)
      : []
    const merged = [item.image, ...fromArray((item as any).images), ...fromArray((item as any).gallery), ...fromArray(mediaUrls)].filter(Boolean) as string[]
    return Array.from(new Set(merged))
  }, [item])

  useEffect(() => setActiveImageIndex(0), [item?.id])

  useEffect(() => {
    if (!item || itemImages.length <= 1) return
    const timer = window.setInterval(() => setActiveImageIndex((prev) => (prev + 1) % itemImages.length), 5000)
    return () => window.clearInterval(timer)
  }, [item, itemImages])

  useEffect(() => {
    if (!item) return
    const previousOverflow = document.body.style.overflow
    const previousOverscroll = document.body.style.overscrollBehavior
    document.body.style.overflow = "hidden"
    document.body.style.overscrollBehavior = "none"
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscroll
    }
  }, [item])

  if (!isPortalMounted || !item) return null

  return createPortal(
    <div data-pmd-customer-app="gold-v1" data-pmd-customer-page="menu">
      <CustomerModal title={itemName} onBack={onClose}>
        <div className="pmd-checkout-gold">
          <div className="pmd-customer-menu-detail__media" style={{ minHeight: "16rem", position: "relative" }}>
            <OptimizedImage
              src={getMenuImageUrl(itemImages[activeImageIndex] || item.image) || "/placeholder.svg"}
              alt={itemName}
              fill
              className="object-contain"
            />
          </div>
          <div className="pmd-checkout-gold__card pmd-checkout-gold__stack">
            <div className="mb-2 flex flex-wrap items-center justify-center gap-1.5">
              <FoodItemColorDot color={item.color} label={`${itemName} color`} />
              <FoodAttributeTags halal={item.halal} vegetarian={item.vegetarian} vegan={item.vegan} allergens={item.allergens} allergyTags={item.allergy_tags} className="justify-center" />
            </div>
            <p dir={getTextDirection(itemDescription)} className={`pmd-customer-muted text-lg leading-relaxed ${getTextAlignClass(itemDescription)}`}>{itemDescription}</p>
            <FoodNutritionSummary calories={item.calories} protein={item.protein} carbs={item.carbs} fat={item.fat} sugar={item.sugar} servingSize={item.serving_size} />
          </div>
        </div>
      </CustomerModal>
    </div>,
    document.body,
  )
}
