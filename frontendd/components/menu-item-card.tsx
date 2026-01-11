"use client"

import type React from "react"
import { motion } from "framer-motion"
import { Plus } from "lucide-react"
import type { MenuItem } from "@/lib/data"
import { useCartStore } from "@/store/cart-store"
import { useLanguageStore } from "@/store/language-store"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/lib/currency"
import type { TranslationKey } from "@/lib/translations"
import { OptimizedImage } from "@/components/ui/optimized-image"

interface MenuItemCardProps {
  item: MenuItem
  onSelect: (item: MenuItem) => void
}

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
    },
  },
}

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

  return (
    <motion.div
      variants={cardVariants}
      className="flex items-center space-x-4 group cursor-pointer"
      onClick={() => onSelect(item)}
    >
      <div className="relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0">
        <OptimizedImage
          src={item.image || "/placeholder.svg"}
          alt={itemName}
          fill
          className="object-contain transition-transform duration-500 ease-in-out group-hover:scale-110"
        />
      </div>
      <div className="flex-grow">
        <h3 className="font-serif text-lg font-bold text-paydine-elegant-gray">{itemName}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{itemDescription}</p>
        <div className="flex justify-between items-center mt-2">
          <p className="text-lg font-semibold text-paydine-rose-beige">{formatCurrency(item.price)}</p>
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full bg-paydine-rose-beige/50 hover:bg-paydine-champagne w-10 h-10"
            style={{ color: 'var(--theme-background)' }}
            onClick={handleAddToCart}
          >
            <Plus className="h-5 w-5" style={{ color: 'var(--theme-background)', fill: 'var(--theme-background)' }} />
            <span className="sr-only">Add to cart</span>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}