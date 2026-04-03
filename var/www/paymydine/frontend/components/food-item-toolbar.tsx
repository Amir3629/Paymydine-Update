"use client"

import { motion } from "framer-motion"
import { HandPlatter, NotebookPen, ShoppingCart } from "lucide-react"
import { useCartStore } from "@/store/cart-store"
import { useLanguageStore } from "@/store/language-store"

interface FoodItemToolbarProps {
  itemCount: number
  onWaiterCall: () => void
  onNote: () => void
  onCart: () => void
}

export function FoodItemToolbar({ itemCount, onWaiterCall, onNote, onCart }: FoodItemToolbarProps) {
  const { t } = useLanguageStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex items-center justify-between rounded-full shadow-lg px-8 py-3 mx-auto w-full max-w-[280px] dark-surface"
    >
      <motion.button
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.08 }}
        className="flex items-center justify-center focus:outline-none"
        onClick={onWaiterCall}
        aria-label={t("callWaiter")}
      >
        <HandPlatter className="h-6 w-6" style={{ color: 'var(--theme-text-primary, #F3F4F6)' }} />
      </motion.button>
      
      <motion.button
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.08 }}
        className="flex items-center justify-center focus:outline-none"
        onClick={onNote}
        aria-label={t("leaveNote")}
      >
        <NotebookPen className="h-6 w-6" style={{ color: 'var(--theme-text-primary, #F3F4F6)' }} />
      </motion.button>
      
      <motion.button
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.08 }}
        className="flex items-center justify-center relative focus:outline-none"
        onClick={onCart}
        aria-label={t("viewCart")}
      >
        <ShoppingCart className="h-6 w-6" style={{ color: 'var(--theme-text-primary, #F3F4F6)' }} />
        {itemCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
            style={{ backgroundColor: 'var(--theme-button, #E7CBA9)', color: '#1B1F27' }}
          >
            {itemCount}
          </span>
        )}
      </motion.button>
    </motion.div>
  )
} 