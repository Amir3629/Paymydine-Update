"use client"


import { OptimizedImage } from "@/components/ui/optimized-image"
import { AnimatePresence, motion } from "framer-motion"
import { Minus, Plus, Trash2 } from "lucide-react"
import { useCartStore } from "@/store/cart-store"
import { useLanguageStore } from "@/store/language-store"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/currency"
import type { TranslationKey } from "@/lib/translations"

export function CartSheet() {
  const { toast } = useToast()
  const { t } = useLanguageStore()
  const router = useRouter()
  const { items, isCartOpen, toggleCart, updateQuantity, removeFromCart } = useCartStore()

  const total = items.reduce((acc, cartItem) => acc + cartItem.item.price * cartItem.quantity, 0)

  const handlePlaceOrder = () => {
    if (items.length === 0) {
      toast({
        title: t("cartEmpty"),
        description: t("addItemsFromMenu"),
        variant: "destructive",
      })
      return
    }
    toggleCart()
    router.push('/checkout')
  }

  return (
    <>
      <Sheet open={isCartOpen} onOpenChange={toggleCart}>
        <SheetContent className="w-full max-w-md flex flex-col bg-gradient-to-br from-paydine-soft-white to-paydine-soft-white/95 p-0 border-l-paydine-champagne/30">
          <SheetHeader className="p-4 pb-2 bg-gradient-to-r from-paydine-champagne/10 to-paydine-rose-beige/10 border-b border-paydine-champagne/20">
            <SheetTitle className="font-serif text-3xl text-paydine-elegant-gray">{t("yourOrder")}</SheetTitle>
          </SheetHeader>
          <motion.div 
            className="flex-grow overflow-y-auto p-4 space-y-2"
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {items.length === 0 ? (
              <div className="text-center text-gray-500 pt-8 space-y-2">
                <p className="text-lg">{t("cartEmpty")}</p>
                <p className="text-sm">{t("addItemsFromMenu")}</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {items.map(({ item, quantity }) => {
                  const itemName = t(item.nameKey as TranslationKey) || item.name
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50, transition: { duration: 0.2 } }}
                      className="flex items-center space-x-3 p-3 bg-white/50 rounded-2xl border border-paydine-champagne/20"
                    >
                      <div className="relative w-14 h-14 flex-shrink-0">
                        <OptimizedImage
                          src={item.image || "/placeholder.svg"}
                          alt={itemName}
                          fill
                          className="object-contain rounded-xl"
                        />
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-semibold text-paydine-elegant-gray">{itemName}</h4>
      <p className="text-sm text-paydine-champagne font-medium">{formatCurrency(item.price)}</p>
                        <div className="inline-flex items-center mt-1 bg-paydine-rose-beige/20 rounded-full p-1 gap-2 w-auto">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-full hover:bg-paydine-champagne/30"
                            onClick={() => updateQuantity(item.id, quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center font-semibold text-sm">{quantity}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-full hover:bg-paydine-champagne/30"
                            onClick={() => updateQuantity(item.id, quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full h-7 w-7"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            )}
          </motion.div>
          {items.length > 0 && (
            <SheetFooter className="p-4 bg-gradient-to-r from-paydine-champagne/10 to-paydine-rose-beige/10 border-t border-paydine-champagne/20 mt-auto">
              <div className="w-full space-y-3">
                <div className="flex justify-between font-bold text-2xl text-paydine-elegant-gray">
                  <span>{t("total")}</span>
        <span>{formatCurrency(total)}</span>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold text-lg py-4 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl"
                  onClick={handlePlaceOrder}
                >
                  {t("proceedToPayment")}
                </Button>
              </div>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}