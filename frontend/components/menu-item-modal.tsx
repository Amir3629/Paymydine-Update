"use client"

import { OptimizedImage } from "@/components/ui/optimized-image"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import type { MenuItem } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { useLanguageStore } from "@/store/language-store"
import type { TranslationKey } from "@/lib/translations"

interface MenuItemModalProps {
  item: MenuItem | null
  onClose: () => void
}

export function MenuItemModal({ item, onClose }: MenuItemModalProps) {
  const { t } = useLanguageStore()

  const itemName = item ? t(item.nameKey as TranslationKey) || item.name : ""
  const itemDescription = item ? t(item.descriptionKey as TranslationKey) || item.description : ""

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
            className="relative surface rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
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

            <div className="p-6">
              {/* Small image */}
              <div className="relative w-28 h-28 mx-auto mb-6">
                <OptimizedImage
                  src={item.image || "/placeholder.svg"}
                  alt={itemName}
                  fill
                  className="object-cover rounded-2xl"
                  style={{ objectPosition: "center" }}
                />
              </div>

              {/* Content */}
              <h2 className="font-serif text-3xl font-bold text-paydine-elegant-gray mb-3 text-center">{itemName}</h2>
              <p className="text-gray-600 text-lg leading-relaxed text-center">{itemDescription}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}