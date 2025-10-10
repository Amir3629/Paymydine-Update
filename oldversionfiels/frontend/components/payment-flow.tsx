"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Users, Wallet, Check, CreditCard, Lock, ArrowLeft } from "lucide-react"
import { useCartStore, type CartItem } from "@/store/cart-store"
import { useLanguageStore } from "@/store/language-store"
import { useCmsStore } from "@/store/cms-store"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "./ui/use-toast"
import type { TranslationKey } from "@/lib/translations"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"

interface PaymentFlowProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

// Helper type for individual item instance
type ItemInstance = {
  cartIndex: number
  item: CartItem["item"]
  price: number
}

type PaymentFormData = {
  cardNumber: string
  expiryDate: string
  cvv: string
  cardholderName: string
  email: string
  phone: string
}

export function PaymentFlow({ isOpen, onOpenChange }: PaymentFlowProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguageStore()
  const { items: allItems, clearCart } = useCartStore()
  const { paymentOptions, tipSettings } = useCmsStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isSplitting, setIsSplitting] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Record<string, ItemInstance>>({})
  const [tipPercentage, setTipPercentage] = useState(tipSettings.defaultPercentage)
  const [customTip, setCustomTip] = useState("")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
    email: "",
    phone: "",
  })

  // Flatten allItems into individual item instances
  const allItemInstances: ItemInstance[] = allItems.flatMap((cartItem, cartIndex) =>
    Array.from({ length: cartItem.quantity }).map((_, i) => ({
      cartIndex,
      item: cartItem.item,
      price: cartItem.item.price,
      // Unique key: itemId-cartIndex-instanceIndex
      key: `${cartItem.item.id}-${cartIndex}-${i}`,
    }))
  )

  // For split bill, use selected individual items; otherwise, use all items
  const itemsToPay = isSplitting
    ? Object.values(selectedItems)
    : allItems.flatMap((cartItem) =>
        Array.from({ length: cartItem.quantity }).map(() => ({
          item: cartItem.item,
          price: cartItem.item.price,
        }))
      )

  const subtotal = useMemo(
    () => itemsToPay.reduce((acc, inst) => acc + inst.price, 0),
    [itemsToPay],
  )
  const serviceCharge = subtotal * 0.1
  const tipAmount = customTip ? Number.parseFloat(customTip) || 0 : subtotal * (tipPercentage / 100)
  const finalTotal = subtotal + serviceCharge + tipAmount

  const handlePayment = async () => {
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    toast({ title: t("paymentSuccessful"), description: t("paymentSuccessfulDesc") })
    onOpenChange(false)
    router.push("/order-placed")
    setTimeout(() => {
      clearCart()
    }, 500)
    setIsLoading(false)
  }

  // Toggle selection for individual item instance
  const toggleItemSelection = (instance: ItemInstance & { key: string }) => {
    setSelectedItems((prev) => {
      const newSelection = { ...prev }
      if (newSelection[instance.key]) {
        delete newSelection[instance.key]
      } else {
        newSelection[instance.key] = instance
      }
      return newSelection
    })
  }

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId)
  }

  const handleBackToMethods = () => {
    setSelectedPaymentMethod(null)
  }

  const handleFormChange = (field: keyof PaymentFormData, value: string) => {
    setPaymentFormData(prev => ({ ...prev, [field]: value }))
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + ' / ' + v.substring(2, 4)
    }
    return v
  }

  const allPaymentMethods = [
    { id: "visa", icon: "/images/visa.png", name: "Visa" },
    { id: "mastercard", icon: "/images/mastercard.png", name: "Mastercard" },
    { id: "paypal", icon: "/images/paypal.png", name: "PayPal" },
    { id: "applepay", icon: "/images/Apple pay.png", name: "Apple Pay" },
    { id: "googlepay", icon: "/images/google pay.png", name: "Google Pay" },
    { id: "cash", icon: Wallet, name: "Cash" },
  ]

  const enabledPaymentMethods = allPaymentMethods.filter((method) =>
    paymentOptions.find((opt) => opt.id === method.id && opt.enabled),
  )

  const selectedMethod = enabledPaymentMethods.find(method => method.id === selectedPaymentMethod)

  const renderPaymentForm = () => {
    if (!selectedMethod) return null

    switch (selectedMethod.id) {
      case "visa":
      case "mastercard":
        return (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToMethods}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Image
                  src={selectedMethod.icon}
                  alt={selectedMethod.name}
                  width={32}
                  height={20}
                  className="object-contain"
                />
                <span className="font-semibold" style={{ color: 'var(--theme-text-primary, #F3F4F6)' }}>{selectedMethod.name}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="cardNumber" className="text-sm font-medium" style={{ color: 'var(--theme-text-primary, #F3F4F6)' }}>
                  Card Number
                </Label>
                <Input
                  id="cardNumber"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={paymentFormData.cardNumber}
                  onChange={(e) => handleFormChange("cardNumber", formatCardNumber(e.target.value))}
                  maxLength={19}
                  className=""
                  style={{ backgroundColor: 'var(--theme-input, #121923)', borderColor: 'var(--theme-border, #223042)', color: 'var(--theme-text-primary, #F3F4F6)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="expiryDate" className="text-sm font-medium" style={{ color: 'var(--theme-text-primary, #F3F4F6)' }}>
                    Expiry Date
                  </Label>
                  <Input
                    id="expiryDate"
                    type="text"
                    placeholder="MM / YY"
                    value={paymentFormData.expiryDate}
                    onChange={(e) => handleFormChange("expiryDate", formatExpiryDate(e.target.value))}
                    maxLength={7}
                    className=""
                    style={{ backgroundColor: 'var(--theme-input, #121923)', borderColor: 'var(--theme-border, #223042)', color: 'var(--theme-text-primary, #F3F4F6)' }}
                  />
                </div>
                <div>
                  <Label htmlFor="cvv" className="text-sm font-medium" style={{ color: 'var(--theme-text-primary, #F3F4F6)' }}>
                    CVV
                  </Label>
                  <Input
                    id="cvv"
                    type="text"
                    placeholder="123"
                    value={paymentFormData.cvv}
                    onChange={(e) => handleFormChange("cvv", e.target.value.replace(/\D/g, ''))}
                    maxLength={4}
                    className=""
                    style={{ backgroundColor: 'var(--theme-input, #121923)', borderColor: 'var(--theme-border, #223042)', color: 'var(--theme-text-primary, #F3F4F6)' }}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cardholderName" className="text-sm font-medium" style={{ color: 'var(--theme-text-primary, #F3F4F6)' }}>
                  Cardholder Name
                </Label>
                <Input
                  id="cardholderName"
                  type="text"
                  placeholder="John Doe"
                  value={paymentFormData.cardholderName}
                  onChange={(e) => handleFormChange("cardholderName", e.target.value)}
                  className=""
                  style={{ backgroundColor: 'var(--theme-input, #121923)', borderColor: 'var(--theme-border, #223042)', color: 'var(--theme-text-primary, #F3F4F6)' }}
                />
              </div>
            </div>
          </motion.div>
        )

      case "paypal":
        return (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToMethods}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Image
                  src={selectedMethod.icon}
                  alt={selectedMethod.name}
                  width={32}
                  height={20}
                  className="object-contain"
                />
                <span className="font-semibold text-paydine-elegant-gray">{selectedMethod.name}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium" style={{ color: 'var(--theme-text-primary, #F3F4F6)' }}>
                PayPal Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={paymentFormData.email}
                onChange={(e) => handleFormChange("email", e.target.value)}
                className=""
                style={{ backgroundColor: 'var(--theme-input, #121923)', borderColor: 'var(--theme-border, #223042)', color: 'var(--theme-text-primary, #F3F4F6)' }}
              />
            </div>
          </motion.div>
        )

      case "applepay":
      case "googlepay":
        return (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToMethods}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Image
                  src={selectedMethod.icon}
                  alt={selectedMethod.name}
                  width={32}
                  height={20}
                  className="object-contain"
                />
                <span className="font-semibold text-paydine-elegant-gray">{selectedMethod.name}</span>
              </div>
            </div>

              <div className="text-center space-y-4">
                <div className="rounded-xl p-6" style={{ backgroundColor: '#222529', border: '1px solid var(--theme-menu-item-border, #223042)' }}>
                <Image
                  src={selectedMethod.icon}
                  alt={selectedMethod.name}
                  width={48}
                  height={24}
                  className="mx-auto mb-3"
                />
                  <p className="text-sm mb-4" style={{ color: 'var(--theme-text-secondary, #C7CDD4)' }}>
                  You will be redirected to {selectedMethod.name} to complete your payment.
                </p>
                  <div className="text-lg font-bold" style={{ color: 'var(--theme-text-primary, #F3F4F6)' }}>
        Total: {formatCurrency(finalTotal)}
                </div>
              </div>
            </div>
          </motion.div>
        )

      case "cash":
        return (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToMethods}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <Wallet className="h-6 w-6 text-paydine-champagne" />
                <span className="font-semibold text-paydine-elegant-gray">Cash Payment</span>
              </div>
            </div>

              <div className="text-center space-y-4">
                <div className="rounded-xl p-6" style={{ backgroundColor: '#222529', border: '1px solid var(--theme-menu-item-border, #223042)' }}>
                <Wallet className="h-12 w-12 text-paydine-champagne mx-auto mb-3" />
                  <p className="text-sm mb-4" style={{ color: 'var(--theme-text-secondary, #C7CDD4)' }}>
                  A waiter will come to collect payment.
                </p>
                  <div className="text-lg font-bold" style={{ color: 'var(--theme-text-primary, #F3F4F6)' }}>
        Total: {formatCurrency(finalTotal)}
                </div>
              </div>
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  const renderPaymentButton = () => {
    if (!selectedMethod) return null

    const isFormValid = () => {
      switch (selectedMethod.id) {
        case "visa":
        case "mastercard":
          return paymentFormData.cardNumber && paymentFormData.expiryDate && paymentFormData.cvv && paymentFormData.cardholderName
        case "paypal":
          return paymentFormData.email
        case "applepay":
        case "googlepay":
        case "cash":
          return true
        default:
          return false
      }
    }

    const getButtonText = () => {
      switch (selectedMethod.id) {
        case "visa":
        case "mastercard":
  return `Pay ${formatCurrency(finalTotal)}`
        case "paypal":
          return "Pay with PayPal"
        case "applepay":
        case "googlepay":
          return `Pay with ${selectedMethod.name}`
        case "cash":
          return "Confirm Cash Payment"
        default:
          return "Pay"
      }
    }

    return (
      <Button
        onClick={handlePayment}
        disabled={isLoading || !isFormValid()}
        className="w-full font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
        style={{ backgroundColor: 'var(--theme-button, #E7CBA9)', color: '#1B1F27' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--theme-button-hover, #D6B890)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--theme-button, #E7CBA9)' }}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {getButtonText()}
          </div>
        )}
      </Button>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 max-w-md rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
        style={{
          backgroundColor: '#222529',
          borderColor: 'var(--theme-menu-item-border, #223042)',
          color: 'var(--theme-text-primary, #F3F4F6)'
        }}
      >
        <DialogHeader className="p-4 pb-2" style={{ background: 'linear-gradient(90deg, rgba(231,203,169,0.10), transparent)' }}>
          <DialogTitle className="font-serif text-lg text-center">{t("confirmPayment")}</DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: 'rgba(231,203,169,0.08)' }}>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" style={{ color: 'var(--theme-button, #E7CBA9)' }} />
              <span className="font-medium text-xs" style={{ color: 'var(--theme-text-primary, #F3F4F6)' }}>{t("splitBill")}</span>
            </div>
            <Button
              variant={isSplitting ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSplitting(!isSplitting)}
              className="text-xs"
              style={isSplitting ? { backgroundColor: 'var(--theme-button, #E7CBA9)', color: '#1B1F27' } : { borderColor: 'var(--theme-menu-item-border, #223042)' }}
            >
              {isSplitting ? "ON" : "OFF"}
            </Button>
          </div>

          <AnimatePresence>
            {isSplitting && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl p-3 overflow-hidden"
                style={{ backgroundColor: '#222529', border: '1px solid var(--theme-menu-item-border, #223042)' }}
              >
                <h3 className="font-semibold text-paydine-elegant-gray mb-2 text-xs">{t("selectItemsToPay")}</h3>
                <div className="space-y-2 max-h-24 overflow-y-auto">
                  {allItemInstances.map((instance, idx) => (
                    <div
                      key={instance.key}
                      className="flex justify-between items-center text-xs p-2 rounded-lg cursor-pointer hover:bg-paydine-champagne/10"
                      onClick={() => toggleItemSelection(instance)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all",
                            selectedItems[instance.key] ? "bg-paydine-champagne border-paydine-champagne" : "border-gray-300",
                          )}
                        >
                          {selectedItems[instance.key] && <Check className="w-3 h-3 text-paydine-elegant-gray" />}
                        </div>
                        <span className="text-gray-600">
                          {t(instance.item.nameKey as TranslationKey)}
                        </span>
                      </div>
                      <span className="text-paydine-champagne font-medium">
            {formatCurrency(instance.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {tipSettings.enabled && (
            <div className="rounded-2xl p-3" style={{ backgroundColor: '#222529', border: '1px solid var(--theme-menu-item-border, #223042)' }}>
              <h3 className="font-semibold text-paydine-elegant-gray mb-2 text-xs">{t("addTip")}</h3>
              <div className="flex gap-2">
                {tipSettings.percentages.map((p) => (
                  <Button
                    key={p}
                    variant={tipPercentage === p && !customTip ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setTipPercentage(p)
                      setCustomTip("")
                    }}
                    className={
                      tipPercentage === p && !customTip
                        ? "bg-paydine-champagne text-paydine-elegant-gray text-xs"
                        : "border-paydine-champagne/30 text-xs"
                    }
                  >
                    {p}%
                  </Button>
                ))}
                <div className="relative flex-grow">
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    placeholder={t("custom")}
                    value={customTip}
                    onKeyDown={(e) => {
                      // Prevent minus, plus, and e (scientific notation)
                      if (['-', '+', 'e', 'E'].includes(e.key)) {
                        e.preventDefault();
                        return false;
                      }
                    }}
                    onChange={(e) => {
                      // Only allow numbers and decimal point
                      const value = e.target.value.replace(/[^0-9.]/g, '');
                      
                      // Only allow one decimal point
                      const parts = value.split('.');
                      if (parts.length > 2) return;
                      
                      setCustomTip(value);
                      setTipPercentage(0);
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value && !isNaN(Number(value))) {
                        // Ensure positive value
                        const positiveValue = Math.abs(Number(value)).toString();
                        setCustomTip(positiveValue);
                      }
                    }}
                    className="pl-6 border-paydine-champagne/30 text-xs h-8"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-paydine-rose-beige/20 rounded-2xl p-3 space-y-1 border border-paydine-champagne/20">
            <div className="flex justify-between text-xs text-gray-600">
              <span>{t("subtotal")}</span>
          <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>{t("service")}</span>
          <span>{formatCurrency(serviceCharge)}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between text-xs text-gray-600">
                <span>{t("tip")}</span>
          <span>{formatCurrency(tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-paydine-champagne/30 pt-2 mt-2">
              <span className="font-serif text-base text-paydine-elegant-gray">{t("total")}</span>
          <span className="font-bold text-base text-paydine-champagne">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!selectedPaymentMethod ? (
              <motion.div
                key="payment-methods"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-2"
              >
                <h3 className="font-semibold text-paydine-elegant-gray text-center text-sm">{t("paymentMethods")}</h3>
                <div className="flex justify-center items-center gap-3 flex-wrap">
                  {enabledPaymentMethods.map((method) => (
                    <motion.div key={method.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        className="h-14 w-20 rounded-2xl shadow-sm flex items-center justify-center"
                        style={{ backgroundColor: '#222529', borderColor: 'var(--theme-menu-item-border, #223042)' }}
                        onClick={() => handlePaymentMethodSelect(method.id)}
                      >
                        {typeof method.icon === "string" ? (
                          <Image
                            src={method.icon || "/placeholder.svg"}
                            alt={method.id}
                            width={40}
                            height={20}
                            className="object-contain"
                          />
                        ) : (
                          <method.icon 
                            className={`text-paydine-elegant-gray ${method.id === "cash" ? "h-20 w-20" : "h-12 w-12"}`}
                          />
                        )}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="payment-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-2"
              >
                {renderPaymentForm()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Fixed Payment Button at Bottom */}
        <AnimatePresence>
          {selectedPaymentMethod && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-4"
              style={{ backgroundColor: 'var(--theme-menu-item-bg, #121923)', borderTop: '1px solid var(--theme-menu-item-border, #223042)' }}
            >
              {renderPaymentButton()}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}