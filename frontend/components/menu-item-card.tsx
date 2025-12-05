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
import { truncateText } from "@/lib/utils"

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
      type: "spring" as const,
      stiffness: 100,
    },
  },
}

export function MenuItemCard({ item, onSelect }: MenuItemCardProps) {
  const addToCart = useCartStore((state) => state.addToCart)
  const { toast } = useToast()
  const { t } = useLanguageStore()

  const isStockOut = item.is_stock_out || false
  const isAvailable = item.available !== false && !isStockOut

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Prevent adding stock-out items to cart
    if (isStockOut || !isAvailable) {
      toast({
        title: "Item Unavailable",
        description: "This item is currently out of stock.",
        variant: "destructive",
      })
      return
    }
    
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
      className={`flex items-center space-x-4 group ${
        isStockOut ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
      }`}
      onClick={() => !isStockOut && onSelect(item)}
    >
      <div className="relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0">
        <OptimizedImage
          src={item.image || "/placeholder.svg"}
          alt={itemName}
          fill
          className={`object-contain transition-transform duration-500 ease-in-out ${
            isStockOut ? '' : 'group-hover:scale-110'
          }`}
        />
        {isStockOut && (
          <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold bg-red-500 px-2 py-1 rounded">OUT OF STOCK</span>
          </div>
        )}
      </div>
      <div className="flex-grow">
        <h3 className={`font-serif text-lg font-bold ${
          isStockOut ? 'text-gray-400' : 'text-paydine-elegant-gray'
        }`}>{itemName}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{truncatedDescription}</p>
        <div className="flex justify-between items-center mt-2">
          <p className={`text-lg font-semibold menu-item-price ${
            isStockOut ? 'text-gray-400' : ''
          }`}>{formatCurrency(item.price)}</p>
          <Button
            size="icon"
            variant="ghost"
            className={`rounded-full w-10 h-10 ${
              isStockOut 
                ? 'bg-gray-200 cursor-not-allowed opacity-50' 
                : 'bg-paydine-rose-beige/50 hover:bg-paydine-champagne'
            }`}
            style={{ color: isStockOut ? '#999' : 'var(--theme-background)' }}
            onClick={handleAddToCart}
            disabled={isStockOut || !isAvailable}
          >
            <Plus className="h-5 w-5" style={{ color: isStockOut ? '#999' : 'var(--theme-background)', fill: isStockOut ? '#999' : 'var(--theme-background)' }} />
            <span className="sr-only">{isStockOut ? 'Out of stock' : 'Add to cart'}</span>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}