"use client"

import { useState, useEffect } from "react"
import { Elements } from "@stripe/react-stripe-js"
import { PayPalScriptProvider } from "@paypal/react-paypal-js"
import { loadStripe } from "@stripe/stripe-js"
import { motion, AnimatePresence } from "framer-motion"
import { Users, Wallet, Check, CreditCard, Lock, ArrowLeft, Shield, AlertCircle } from "lucide-react"
import { useCartStore, type CartItem } from "@/store/cart-store"
import { useLanguageStore } from "@/store/language-store"
import { useCmsStore } from "@/store/cms-store"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "./ui/use-toast"
import type { TranslationKey } from "@/lib/translations"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"
import { PaymentData, PaymentResult, paymentService } from "@/lib/payment-service"
import { StripeCardForm } from "./secure-payment-form"
import { PayPalForm } from "./secure-payment-form"
import { ApplePayButton } from "./secure-payment-form"
import { GooglePayButton } from "./secure-payment-form"
import { CashPaymentForm } from "./secure-payment-form"
import { ApiClient, type PaymentMethod } from "@/lib/api-client"
import { iconForPayment } from "@/lib/payment-icons"

interface SecurePaymentFlowProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

// Helper type for individual item instance
type ItemInstance = {
  cartIndex: number
  item: CartItem["item"]
  price: number
}

export function SecurePaymentFlow({ isOpen, onOpenChange }: SecurePaymentFlowProps) {
  const { toast } = useToast()
  const { t } = useLanguageStore()
  const { items: allItems, clearCart } = useCartStore()
  const { paymentOptions, tipSettings, merchantSettings } = useCmsStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isSplitting, setIsSplitting] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Record<string, ItemInstance>>({})
  const [tipPercentage, setTipPercentage] = useState(tipSettings.defaultPercentage)
  const [customTip, setCustomTip] = useState("")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)

  // Initialize payment service
  useEffect(() => {
    const initializePayment = async () => {
      try {
        await paymentService.initialize({
          stripePublishableKey: merchantSettings.stripePublishableKey,
          paypalClientId: merchantSettings.paypalClientId,
          environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        })
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize payment service:', error)
        toast({
          title: "Payment Error",
          description: "Failed to initialize payment system. Please try again.",
          variant: "destructive",
        })
      }
    }

    if (isOpen && !isInitialized) {
      initializePayment()
    }
  }, [isOpen, isInitialized, merchantSettings, toast])

  // Flatten allItems into individual item instances
  const allItemInstances: ItemInstance[] = allItems.flatMap((cartItem, cartIndex) =>
    Array.from({ length: cartItem.quantity }).map((_, i) => ({
      cartIndex,
      item: cartItem.item,
      price: cartItem.item.price,
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

  const subtotal = itemsToPay.reduce((acc, inst) => acc + inst.price, 0)
  const serviceCharge = subtotal * 0.1
  const tipAmount = customTip ? Number.parseFloat(customTip) || 0 : subtotal * (tipPercentage / 100)
  const finalTotal = subtotal + serviceCharge + tipAmount

  // Create payment data
  const paymentData: PaymentData = {
    amount: finalTotal,
    currency: merchantSettings.currency || 'USD',
    items: itemsToPay.map(inst => ({
      id: inst.item.id,
      name: inst.item.name,
      price: inst.price,
      quantity: 1,
      restaurantId: 'default-restaurant', // This should come from your app state
    })),
    customerInfo: {
      email: '', // This should be collected from user
      name: '', // This should be collected from user
    },
    restaurantId: 'default-restaurant', // This should come from your app state
    tableNumber: 7, // This should come from your app state
  }

  const handlePaymentComplete = async (result: PaymentResult) => {
    if (result.success) {
      toast({
        title: "Payment Successful",
        description: `Your payment of ${formatCurrency(finalTotal)} has been processed successfully.`,
      })
      
      // Clear cart and close dialog
      setTimeout(() => {
        clearCart()
        onOpenChange(false)
        setSelectedPaymentMethod(null)
        setPaymentError(null)
      }, 1000)
    } else {
      setPaymentError(result.error || 'Payment failed')
      toast({
        title: "Payment Failed",
        description: result.error || 'Please try again.',
        variant: "destructive",
      })
    }
  }

  const handlePaymentError = (error: string) => {
    setPaymentError(error)
    toast({
      title: "Payment Error",
      description: error,
      variant: "destructive",
    })
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
    setPaymentError(null)
  }

  const handleBackToMethods = () => {
    setSelectedPaymentMethod(null)
    setPaymentError(null)
  }

  useEffect(() => {
    const api = new ApiClient();
    api.getPaymentMethods()
      .then(setPaymentMethods)
      .finally(() => setLoadingPayments(false));
  }, [])

  const selectedMethod = paymentMethods.find(method => method.code === selectedPaymentMethod)

  const renderPaymentForm = () => {
    if (!selectedMethod || !isInitialized) return null

    const commonProps = {
      paymentData,
      onPaymentComplete: handlePaymentComplete,
      onPaymentError: handlePaymentError,
    }

    switch (selectedMethod.code) {
      case "stripe":
      case "authorizenetaim":
        return (
          <Elements stripe={loadStripe(merchantSettings.stripePublishableKey)}>
            <StripeCardForm {...commonProps} />
          </Elements>
        )

      case "paypal":
        return (
          <PayPalScriptProvider options={{
            clientId: merchantSettings.paypalClientId,
            currency: merchantSettings.currency || 'USD',
            intent: 'capture',
          }}>
            <PayPalForm {...commonProps} />
          </PayPalScriptProvider>
        )

      case "apple_pay":
        return <ApplePayButton {...commonProps} />

      case "google_pay":
        return <GooglePayButton {...commonProps} />

      case "cod":
        return <CashPaymentForm {...commonProps} />

      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 max-w-md rounded-3xl overflow-hidden max-h-[85vh] flex flex-col surface"
      >
        <DialogHeader className="p-4 pb-2" style={{ background: 'linear-gradient(90deg, rgba(231,203,169,0.10), transparent)' }}>
          <DialogTitle className="font-serif text-lg text-center flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            {t("confirmPayment")}
            <Shield className="h-5 w-5 text-green-500" />
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Security Notice */}
          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-3">
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Shield className="h-4 w-4" />
              <span className="font-medium">Secure Payment</span>
            </div>
            <p className="text-green-300 text-xs mt-1">
              Your payment information is encrypted and processed securely. We never store your card details.
            </p>
          </div>

          {/* Split Bill Toggle */}
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

          {/* Split Bill Items Selection */}
          <AnimatePresence>
            {isSplitting && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-2xl p-3 overflow-hidden"
                style={{ backgroundColor: 'var(--theme-input, #121923)', border: '1px solid var(--theme-menu-item-border, #223042)' }}
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

          {/* Tip Settings */}
          {tipSettings.enabled && (
            <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--theme-input, #121923)', border: '1px solid var(--theme-menu-item-border, #223042)' }}>
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
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*\.?[0-9]*"
                    placeholder={t("custom")}
                    value={customTip}
                    onKeyDown={(e) => {
                      if (['-', '+', 'e', 'E'].includes(e.key)) {
                        e.preventDefault()
                        return false
                      }
                    }}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '')
                      const parts = value.split('.')
                      if (parts.length > 2) return
                      setCustomTip(value)
                      setTipPercentage(0)
                    }}
                    onBlur={(e) => {
                      const value = e.target.value
                      if (value && !isNaN(Number(value))) {
                        const positiveValue = Math.abs(Number(value)).toString()
                        setCustomTip(positiveValue)
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-md border border-paydine-champagne/30 bg-transparent text-white placeholder-gray-400"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                </div>
              </div>
            </div>
          )}

          {/* Order Summary */}
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

          {/* Payment Error */}
          {paymentError && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3">
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Payment Error</span>
              </div>
              <p className="text-red-300 text-xs mt-1">{paymentError}</p>
            </div>
          )}

          {/* Payment Methods or Form */}
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
                  {loadingPayments ? (
                    <div className="text-paydine-elegant-gray text-sm">Loading payment methods...</div>
                  ) : paymentMethods.length === 0 ? (
                    <div className="text-paydine-elegant-gray text-sm">No payment methods available</div>
                  ) : (
                    paymentMethods.map((method) => (
                      <motion.div key={method.code} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="outline"
                          className="h-14 w-20 rounded-2xl shadow-sm flex items-center justify-center relative"
                          style={{ backgroundColor: 'var(--theme-input, #121923)', borderColor: 'var(--theme-menu-item-border, #223042)' }}
                          onClick={() => handlePaymentMethodSelect(method.code)}
                        >
                          <img
                            src={iconForPayment(method.code)}
                            alt={method.name}
                            width={32}
                            height={20}
                            className="object-contain"
                          />
                          <div className="absolute -top-1 -right-1">
                            <Shield className="h-3 w-3 text-green-500" />
                          </div>
                        </Button>
                      </motion.div>
                    ))
                  )}
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
                    {typeof selectedMethod.icon === "string" ? (
                      <img
                        src={selectedMethod.icon}
                        alt={selectedMethod.name}
                        className="w-6 h-4 object-contain"
                      />
                    ) : (
                      <selectedMethod.icon className="h-6 w-6 text-paydine-elegant-gray" />
                    )}
                    <span className="font-semibold">{selectedMethod.name}</span>
                    {selectedMethod.secure && (
                      <Shield className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
                {renderPaymentForm()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}