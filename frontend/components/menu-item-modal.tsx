"use client"

import { OptimizedImage } from "@/components/ui/optimized-image"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft } from "lucide-react"
import type { MenuItem } from "@/lib/data"
import { getMenuImageUrl } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { useLanguageStore } from "@/store/language-store"
import type { TranslationKey } from "@/lib/translations"
import { FoodAttributeTags } from "@/components/food-attribute-tags"
import { FoodNutritionSummary } from "@/components/food-nutrition-summary"
import { FoodItemColorDot } from "@/components/food-item-color-dot"
import { createPortal } from "react-dom"
import { getTextAlignClass, getTextDirection } from "@/lib/text-direction"

interface MenuItemModalProps {
 item: MenuItem | null
 onClose: () => void
}

// PMD_RTL_DO_NOT_ALIGN_MODAL_TITLE
// PMD_FORCE_MODAL_FOOD_TITLE_NOT_RTL
// PMD_FOOD_MODAL_TITLE_ALWAYS_CENTER
export function MenuItemModal({ item, onClose }: MenuItemModalProps) {
 const { t } = useLanguageStore()
 const [activeImageIndex, setActiveImageIndex] = useState(0)
 const [renderedItem, setRenderedItem] = useState<MenuItem | null>(item)
 const [isLocallyClosed, setIsLocallyClosed] = useState(false)
 const [isPortalMounted, setIsPortalMounted] = useState(false)

 // PMD_MODAL_PORTAL_MOUNT_START
 useEffect(() => {
 setIsPortalMounted(true)
 }, [])
 // PMD_MODAL_PORTAL_MOUNT_END

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
 const timer = // PMD_SLOW_GALLERY_ROTATION_FIX_START
 window.setInterval(() => {
 setActiveImageIndex((prev) => (prev + 1) % itemImages.length)
 }, 5000)
 // PMD_SLOW_GALLERY_ROTATION_FIX_END
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


 // PMD_FOOD_MODAL_BODY_SCROLL_LOCK_START
 useEffect(() => {
 if (!isModalOpen) return

 const previousOverflow = document.body.style.overflow
 const previousOverscroll = document.body.style.overscrollBehavior

 document.body.style.overflow = "hidden"
 document.body.style.overscrollBehavior = "none"

 return () => {
 document.body.style.overflow = previousOverflow
 document.body.style.overscrollBehavior = previousOverscroll
 }
 }, [isModalOpen])
 // PMD_FOOD_MODAL_BODY_SCROLL_LOCK_END

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

 if (!isPortalMounted) return null

 return createPortal(
 <AnimatePresence>
 {isModalOpen && (
 <motion.div data-pmd-food-modal-overlay="true" data-pmd-overlay-fix="no-scale-fullscreen"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed -inset-8 z-[999999] flex h-[calc(100dvh+4rem)] min-h-[calc(100vh+4rem)] w-[calc(100vw+4rem)] max-w-none items-center justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-lg overscroll-contain"
 onClick={handleModalClose}
 style={{ position: "fixed", inset: "-32px", width: "calc(100vw + 64px)", height: "calc(100dvh + 64px)", minHeight: "calc(100vh + 64px)", maxWidth: "none", transformOrigin: "center center" }} transition={{ duration: 0.35, ease: "easeOut" }}>
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: isVisible ? 1 : 0.97, y: isVisible ? 0 : 8, opacity: isVisible ? 1 : 0 }}
 exit={{ scale: 0.97, y: 8, opacity: 0 }}
 transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
	 className="relative surface pmd-v2-card rounded-3xl shadow-2xl w-full max-w-xl max-h-[90dvh] overflow-hidden"
 onClick={(e) => e.stopPropagation()}
 >
 {/* Close button */}
 <Button
   variant="ghost"
   size="sm"
   onClick={handleModalClose}
   className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 pmd-v2-action-circle hover:opacity-90 absolute top-4 left-4 z-10"
   style={{
     background: "#062F2A",
     backgroundColor: "#062F2A",
     color: "#FFFFFF",
     WebkitTextFillColor: "#FFFFFF",
     borderColor: "#062F2A",
     outlineColor: "#062F2A",
     textDecoration: "none",
   }}
 >
   <ArrowLeft
     className="h-4 w-4 mr-1"
     style={{
       color: "#FFFFFF",
       stroke: "#FFFFFF",
       WebkitTextFillColor: "#FFFFFF",
     }}
   />
   Back
 </Button>

 <div className="p-6 overflow-y-auto overscroll-contain max-h-[90dvh]">
 <div className="relative w-full h-[180px] md:h-[230px] mb-6 rounded-2xl overflow-hidden flex items-center justify-center">
 <AnimatePresence mode="wait">
 <motion.div
 key={`${renderedItem?.id}-${activeImageIndex}`}
 initial={{ opacity: 0, scale: 0.985 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 1.015 }}
 transition={{ duration: 1.15, ease: "easeInOut" }}
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
	 <h2 dir="auto" className="font-serif text-3xl font-bold pmd-v2-text mb-3 text-center">{itemName}</h2>
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
	 <p dir={getTextDirection(itemDescription)} className={`pmd-v2-text-muted text-lg leading-relaxed mb-4 ${getTextAlignClass(itemDescription)}`}>{itemDescription}</p>
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
 </AnimatePresence>,
 document.body
 )
}
