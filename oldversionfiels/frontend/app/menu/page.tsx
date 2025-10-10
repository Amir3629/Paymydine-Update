"use client"

import React, { useState, useEffect, useMemo, Suspense } from "react"
import { formatCurrency } from "@/lib/currency"
import { categories, menuData, type MenuItem, getMenuData, getCategories } from "@/lib/data"
import { useLanguageStore } from "@/store/language-store"
import { type TranslationKey } from "@/lib/translations"
import { useCmsStore } from "@/store/cms-store"
import { useCartStore, type CartItem } from "@/store/cart-store"
import { useThemeStore } from "@/store/theme-store"
import { Logo } from "@/components/logo"
import { CartSheet } from "@/components/cart-sheet"
import { CategoryNav } from "@/components/category-nav"
import { MenuItemModal } from "@/components/menu-item-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { HandPlatter, NotebookPen, ShoppingCart, ChevronUp, ChevronDown, Plus, Wallet, Lock, Users, Check, Minus, CreditCard, ArrowLeft, CheckCircle } from "lucide-react"
import { OptimizedImage } from "@/components/ui/optimized-image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useRouter, useSearchParams } from "next/navigation"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { clsx } from "clsx"
import { apiClient } from '@/lib/api-client'
import { wsClient } from '@/lib/websocket-client'

type ToolbarState = "collapsed" | "preview" | "expanded"

type PaymentFormData = {
  cardNumber: string
  expiryDate: string
  cvv: string
  cardholderName: string
  email: string
  phone: string
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  tableInfo?: any;
}

interface ExpandingBottomToolbarProps {
  toolbarState: ToolbarState;
  setToolbarState: (state: ToolbarState) => void;
  showBillArrow: boolean;
  items: CartItem[];
  totalPrice: number;
  t: (key: TranslationKey) => string;
  onCartClick: () => void;
  onWaiterClick: () => void;
  onNoteClick: () => void;
  totalItems: number;
}

interface MenuItemModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

type PaymentMethod = {
  id: string;
  icon: string | typeof Wallet;
  name: string;
}

type SplitBillItem = {
  cartIndex: number;
  item: MenuItem;
  price: number;
  key: string;
  quantity: number;
}

function PaymentModal({ isOpen, onClose, items: allItems, tableInfo }: PaymentModalProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguageStore()
  const { paymentOptions, tipSettings } = useCmsStore()
  const { clearCart, addToCart } = useCartStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isSplitting, setIsSplitting] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Record<string, SplitBillItem>>({})
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

  // Flatten allItems into individual item instances for split bill
  const allItemInstances = allItems.flatMap((cartItem, cartIndex) =>
    Array.from({ length: cartItem.quantity }).map((_, i) => ({
      cartIndex,
      item: cartItem.item,
      price: cartItem.item.price || 0,
      key: `${cartItem.item.id}-${cartIndex}-${i}`,
      quantity: 1
    }))
  )

  // For split bill, use selected individual items; otherwise, use all items
  const itemsToPay = isSplitting
    ? Object.values(selectedItems)
    : allItems.map(cartItem => ({
        item: cartItem.item,
        price: cartItem.item.price || 0,
        quantity: cartItem.quantity
      }))

  const subtotal = useMemo(
    () => itemsToPay.reduce((acc, inst) => acc + inst.price * (inst.quantity || 1), 0),
    [itemsToPay],
  )
  const serviceCharge = subtotal * 0.1
  const tipAmount = customTip ? Number.parseFloat(customTip) || 0 : subtotal * (tipPercentage / 100)
  const finalTotal = subtotal + serviceCharge + tipAmount

  const handlePayment = async () => {
    setIsLoading(true)
    
    try {
      // Prepare order data for API
      const orderData = {
        table_id: tableInfo?.table_id || "7",
        table_name: tableInfo?.table_name || "Table 7",
        location_id: tableInfo?.location_id || 1,
        items: itemsToPay.map(item => ({
          menu_id: item.item.id,
          name: item.item.name, // Add the item name!
          quantity: item.quantity || 1,
          price: item.price,
          special_instructions: ''
        })),
        customer_name: paymentFormData.cardholderName || `${tableInfo?.table_name || `Table ${tableInfo?.table_id || 'Unknown'}`} Customer`,
        customer_phone: paymentFormData.phone || '',
        customer_email: paymentFormData.email || '',
        payment_method: (selectedPaymentMethod === 'cash' ? 'cash' : 
                      selectedPaymentMethod === 'paypal' ? 'paypal' : 'card') as 'cash' | 'card' | 'paypal',
        total_amount: finalTotal,
        tip_amount: tipAmount,
        special_instructions: ''
      }

      // Submit order to backend
      const response = await apiClient.submitOrder(orderData)
      
      if (response.success) {
        setIsLoading(false)
        toast({ 
          title: t("paymentSuccessful"), 
          description: `Order #${response.order_id} submitted successfully!`
        })
        
        // Save order ID for status tracking
        if (response.order_id) {
          localStorage.setItem('lastOrderId', response.order_id.toString())
        }
        
    setTimeout(() => {
      clearCart()
          router.push(`/order-placed?order_id=${response.order_id || 'unknown'}`)
    }, 500)
      } else {
        throw new Error(response.error || 'Order submission failed')
      }
    } catch (error) {
    setIsLoading(false)
      console.error('Order submission error:', error)
      toast({ 
        title: "Order Failed", 
        description: error instanceof Error ? error.message : "Failed to submit order. Please try again.",
        variant: "destructive"
      })
    }
  }

  // Toggle selection for individual item instance
  const toggleItemSelection = (instance: SplitBillItem) => {
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
                <OptimizedImage
                  src={selectedMethod.icon}
                  alt={selectedMethod.name}
                  width={32}
                  height={20}
                  className="object-contain"
                />
                <span className="font-semibold text-paydine-elegant-gray">{selectedMethod.name}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="cardNumber" className="text-sm font-medium text-paydine-elegant-gray">
                  Card Number
                </Label>
                <Input
                  id="cardNumber"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={paymentFormData.cardNumber}
                  onChange={(e) => handleFormChange("cardNumber", formatCardNumber(e.target.value))}
                  maxLength={19}
                  className="border-paydine-champagne/30 focus:border-paydine-champagne"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="expiryDate" className="text-sm font-medium text-paydine-elegant-gray">
                    Expiry Date
                  </Label>
                  <Input
                    id="expiryDate"
                    type="text"
                    placeholder="MM / YY"
                    value={paymentFormData.expiryDate}
                    onChange={(e) => handleFormChange("expiryDate", formatExpiryDate(e.target.value))}
                    maxLength={7}
                    className="border-paydine-champagne/30 focus:border-paydine-champagne"
                  />
                </div>
                <div>
                  <Label htmlFor="cvv" className="text-sm font-medium text-paydine-elegant-gray">
                    CVV
                  </Label>
                  <Input
                    id="cvv"
                    type="text"
                    placeholder="123"
                    value={paymentFormData.cvv}
                    onChange={(e) => handleFormChange("cvv", e.target.value.replace(/\D/g, ''))}
                    maxLength={4}
                    className="border-paydine-champagne/30 focus:border-paydine-champagne"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cardholderName" className="text-sm font-medium text-paydine-elegant-gray">
                  Cardholder Name
                </Label>
                <Input
                  id="cardholderName"
                  type="text"
                  placeholder="John Doe"
                  value={paymentFormData.cardholderName}
                  onChange={(e) => handleFormChange("cardholderName", e.target.value)}
                  className="border-paydine-champagne/30 focus:border-paydine-champagne"
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
                <OptimizedImage
                  src={selectedMethod.icon}
                  alt={selectedMethod.name}
                  width={32}
                  height={20}
                  className="object-contain"
                />
                <span className="font-semibold text-paydine-elegant-gray">{selectedMethod.name}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="paypalEmail" className="text-sm font-medium text-paydine-elegant-gray">
                  PayPal Email
                </Label>
                <Input
                  id="paypalEmail"
                  type="email"
                  placeholder="your.email@example.com"
                  value={paymentFormData.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  className="border-paydine-champagne/30 focus:border-paydine-champagne"
                />
              </div>
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
                <OptimizedImage
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
              <div className="bg-gray-50 rounded-xl p-6">
                <CreditCard className="h-12 w-12 text-paydine-champagne mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-4">
                  {selectedMethod.id === "applepay" 
                    ? "Apple Pay will use your default payment method and shipping address."
                    : "Google Pay will use your default payment method and shipping address."
                  }
                </p>
                <div className="text-lg font-bold text-paydine-elegant-gray">
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
              <div className="bg-gray-50 rounded-xl p-6">
                <Wallet className="h-12 w-12 text-paydine-champagne mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-4">
                  Please have the exact amount ready when the waiter comes to collect payment.
                </p>
                <div className="text-lg font-bold text-paydine-elegant-gray">
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
        className="w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-paydine-champagne/30 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header with close button */}
        <div className="p-4 pb-2 bg-gradient-to-r from-paydine-champagne/10 to-paydine-rose-beige/10 flex justify-between items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg text-paydine-elegant-gray">{t("yourOrder")}</h2>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        {/* Order Summary & Payment - Scrollable Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Split Bill Toggle */}
          <div className="flex items-center justify-between p-3 bg-paydine-rose-beige/10 rounded-xl">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-paydine-champagne" />
              <span className="text-paydine-elegant-gray text-xs">{t("splitBill")}</span>
            </div>
            <Button
              variant={isSplitting ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSplitting(!isSplitting)}
              className={clsx(
                "text-xs",
                isSplitting 
                  ? "bg-paydine-champagne text-paydine-elegant-gray hover:bg-paydine-champagne hover:text-paydine-elegant-gray" 
                  : "border-paydine-champagne/30"
              )}
            >
              {isSplitting ? "ON" : "OFF"}
            </Button>
          </div>

          {/* Items List */}
          {isSplitting ? (
            <div className="bg-white rounded-2xl p-3 border border-paydine-champagne/20 overflow-hidden">
              <h3 className="text-paydine-elegant-gray mb-2 text-xs">{t("selectItemsToPay")}</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allItemInstances.map((instance) => (
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
                      <span className="text-paydine-elegant-gray">
                        {instance.item.nameKey ? t(instance.item.nameKey as TranslationKey) : instance.item.name}
                      </span>
                    </div>
                    <span className="text-paydine-elegant-gray font-semibold">
            {formatCurrency(instance.price ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-3 border border-paydine-champagne/20">
              <h3 className="text-paydine-elegant-gray mb-2 text-xs">{t("orderSummary")}</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allItems.map((cartItem) => (
                  <div key={cartItem.item.id} className="flex justify-between items-center text-xs p-2 rounded-lg">
                    <span className="text-paydine-elegant-gray min-w-[120px]">
                      {cartItem.quantity}x {cartItem.item.nameKey ? t(cartItem.item.nameKey as TranslationKey) : cartItem.item.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(cartItem.item, -1); // Pass -1 to decrease quantity
                        }}
                        className="w-5 h-5 rounded-full bg-paydine-rose-beige flex items-center justify-center hover:bg-paydine-champagne transition-colors"
                      >
                        <Minus className="w-3 h-3 text-paydine-elegant-gray" />
                      </button>
                      <span className="text-paydine-elegant-gray font-semibold min-w-[48px] text-center">
            {formatCurrency((cartItem.item.price || 0) * cartItem.quantity)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(cartItem.item, 1); // Pass 1 to increase quantity
                        }}
                        className="w-5 h-5 rounded-full bg-paydine-rose-beige flex items-center justify-center hover:bg-paydine-champagne transition-colors"
                      >
                        <Plus className="w-3 h-3 text-paydine-elegant-gray" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tip Section */}
          {tipSettings.enabled && (
            <div className="bg-white rounded-2xl p-3 border border-paydine-champagne/20">
              <h3 className="text-paydine-elegant-gray mb-2 text-xs">{t("addTip")}</h3>
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
                    className={clsx(
                      "text-xs",
                      tipPercentage === p && !customTip
                        ? "bg-paydine-champagne text-paydine-elegant-gray hover:bg-paydine-champagne hover:text-paydine-elegant-gray"
                        : "border-paydine-champagne/30"
                    )}
                  >
                    {p}%
                  </Button>
                ))}
                <div className="relative flex-grow">
                  <Input
                    type="number"
                    placeholder={t("custom")}
                    value={customTip}
                    onChange={(e) => {
                      setCustomTip(e.target.value)
                      setTipPercentage(0)
                    }}
                    className="pl-6 border-paydine-champagne/30 text-xs h-8"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">$</span>
                </div>
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="bg-white rounded-2xl p-3 space-y-1 border border-paydine-champagne/20">
            <div className="flex justify-between text-xs text-paydine-elegant-gray">
              <span>{t("subtotal")}</span>
          <span className="font-semibold text-paydine-elegant-gray">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-paydine-elegant-gray">
              <span>{t("service")}</span>
          <span className="font-semibold text-paydine-elegant-gray">{formatCurrency(serviceCharge)}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between text-xs text-paydine-elegant-gray">
                <span>{t("tip")}</span>
          <span className="font-semibold text-paydine-elegant-gray">{formatCurrency(tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-paydine-champagne/30 pt-2 mt-2">
              <span className="text-base text-paydine-elegant-gray">{t("total")}</span>
          <span className="text-base font-bold text-paydine-elegant-gray">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <AnimatePresence mode="wait">
            {!selectedPaymentMethod ? (
              <motion.div
                key="payment-methods"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-2"
              >
                <h3 className="text-paydine-elegant-gray text-center text-sm">{t("paymentMethods")}</h3>
                <div className="flex justify-center items-center gap-3 flex-wrap">
                  {enabledPaymentMethods.map((method) => (
                    <motion.div key={method.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        className="h-14 w-20 bg-white hover:bg-gray-50 border-gray-200 rounded-2xl shadow-sm flex items-center justify-center"
                        onClick={() => handlePaymentMethodSelect(method.id)}
                      >
                        {typeof method.icon === "string" ? (
                          <OptimizedImage
                            src={method.icon}
                            alt={method.id}
                            width={40}
                            height={20}
                            className="object-contain"
                          />
                        ) : (
                          <method.icon className="h-12 w-12 text-paydine-elegant-gray" />
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
                className="pt-2 max-h-[300px] overflow-y-auto"
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
              className="p-4 border-t border-paydine-champagne/20 bg-white"
            >
              {renderPaymentButton()}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function ExpandingToolbarMenuItemCard({ item, onSelect, onFirstAdd }: { item: MenuItem; onSelect: (item: MenuItem) => void; onFirstAdd: () => void }) {
  const addToCart = useCartStore((state) => state.addToCart)
  const { items } = useCartStore()
  const { t } = useLanguageStore()

  // Get current quantity for this item
  const currentItem = items.find(cartItem => cartItem.item.id === item.id)
  const quantity = currentItem?.quantity || 0

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    addToCart(item)
    if (quantity === 0) {
      onFirstAdd()
    }
  }

  const itemName = item.nameKey && t(item.nameKey as TranslationKey) ? t(item.nameKey as TranslationKey) : item.name
  const itemDescription = item.descriptionKey && t(item.descriptionKey as TranslationKey) ? t(item.descriptionKey as TranslationKey) : item.description

  return (
    <div
      className="flex items-center space-x-4 group cursor-pointer"
      onClick={() => onSelect(item)}
    >
      <div className="relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0">
        <OptimizedImage
          src={item.image || "/placeholder.svg"}
          alt={itemName}
          fill
          className="object-contain transition-transform duration-700 ease-in-out group-hover:scale-110"
        />
      </div>
      <div className="flex-grow">
        <h3 className="text-lg font-bold text-paydine-elegant-gray">{itemName}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{itemDescription}</p>
        <div className="flex justify-between items-center mt-2">
        <p className="text-lg font-semibold text-paydine-rose-beige">{formatCurrency(item.price || 0)}</p>
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full bg-paydine-rose-beige text-paydine-elegant-gray hover:text-paydine-elegant-gray hover:bg-paydine-rose-beige w-12 h-12 font-bold text-lg"
              onClick={handleAdd}
            >
              {quantity > 0 ? (
                <span className="text-lg font-bold text-paydine-elegant-gray">{quantity}</span>
              ) : (
                <Plus className="h-5 w-5 text-paydine-elegant-gray" />
              )}
              <span className="sr-only">Add to cart</span>
            </Button>
            {quantity > 0 && (
              <span className="absolute -top-2 -right-2 text-paydine-rose-beige text-base font-bold">
                +
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ExpandingBottomToolbar({
  toolbarState,
  setToolbarState,
  showBillArrow,
  items,
  totalPrice,
  t,
  onCartClick,
  onWaiterClick,
  onNoteClick,
  totalItems,
}: ExpandingBottomToolbarProps) {
  // Heights for each state
  const collapsedHeight = 76
  const previewHeight = 180
  const expandedHeight = 420

  let height = collapsedHeight
  if (toolbarState === "preview") height = previewHeight
  if (toolbarState === "expanded") height = expandedHeight

  return (
    <motion.div
      className="fixed bottom-[1.35rem] left-1/2 -translate-x-1/2 w-full max-w-[23.04rem] z-40 px-2"
      animate={
        toolbarState === "expanded"
          ? { height: "auto" }
          : { height }
      }
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="
          relative flex flex-col w-full h-full
          bg-white/70 backdrop-blur-lg
          rounded-[2.5rem] shadow-2xl border border-white/30 ring-1 ring-paydine-champagne/10
        "
        style={{ minHeight: 76, height: "100%" }}
      >
        {/* Arrow for expanding/collapsing bill */}
        {showBillArrow && (
          <button
            className="absolute left-1/2 -top-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 shadow border border-paydine-champagne/30 transition-all"
            style={{ transform: "translateX(-50%)" }}
            onClick={() =>
              setToolbarState(toolbarState === "expanded" ? "preview" : "expanded")
            }
            aria-label={toolbarState === "expanded" ? "Hide bill" : "Show bill"}
          >
            {toolbarState === "expanded" ? (
              <ChevronDown className="w-5 h-5 text-paydine-champagne" />
            ) : (
              <ChevronUp className="w-5 h-5 text-paydine-champagne" />
            )}
          </button>
        )}

        {/* Bill preview/expanded */}
        <AnimatePresence mode="popLayout">
          {(toolbarState === "preview" || toolbarState === "expanded") && (
            <motion.div
              key="bill"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="w-full px-6 pt-8 pb-2 scrollbar-hide"
              style={{
                maxHeight: toolbarState === "expanded" ? 320 : 90,
                overflowY: toolbarState === "expanded" ? "auto" : "visible",
                height: toolbarState === "expanded" ? "auto" : undefined,
                msOverflowStyle: "none",
                scrollbarWidth: "none",
              }}
            >
              <div className="flex flex-col">
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {items.slice(toolbarState === "preview" ? -1 : 0).map((item: CartItem) => (
                      <motion.div
                        key={item.item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          transition: { duration: 0.25 }
                        }}
                        exit={{
                          opacity: 0,
                          scale: 0.95,
                          transition: { duration: 0.18 }
                        }}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center space-x-3">
                          <motion.div
                            className="relative w-12 h-12"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                          >
                <OptimizedImage
                              src={item.item.image || "/placeholder.svg"}
                              alt={item.item.name}
                              fill
                              className="rounded-xl object-cover"
                            />
                          </motion.div>
                          <div>
                            <motion.div
                              className="font-medium text-paydine-elegant-gray text-base"
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                            >
                              {item.item.name}
                            </motion.div>
                            <motion.div
                              className="text-sm text-gray-500"
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                            >
          {formatCurrency(item.item.price || 0)} × {item.quantity}
                            </motion.div>
                          </div>
                        </div>
                        <motion.div
                          className="font-semibold text-paydine-rose-beige text-lg"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                        >
          {formatCurrency((item.item.price || 0) * item.quantity)}
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {/* Show total only in expanded */}
                {toolbarState === "expanded" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mt-4 pt-4 border-t border-paydine-champagne/30 bg-paydine-rose-beige/10 rounded-xl p-4"
                  >
                    <div className="flex justify-between items-center">
                      <motion.span
                        className="font-bold text-paydine-elegant-gray text-lg"
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                      >
                        Total
                      </motion.span>
                      <motion.span
                        className="font-bold text-2xl text-paydine-champagne"
                        initial={{ x: 10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                      >
        {formatCurrency(totalPrice)}
                      </motion.span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar buttons (always visible at the bottom) */}
        <div
          className="flex items-center justify-between gap-8 px-8 py-4"
          style={{
            minHeight: 76,
            borderBottomLeftRadius: "2.5rem",
            borderBottomRightRadius: "2.5rem",
            background: "transparent",
            marginTop: "auto",
          }}
        >
          <motion.button
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.12 }}
            className="flex items-center justify-center focus:outline-none transition-all"
            style={{ background: "none", border: "none", padding: 0, margin: 0 }}
            onClick={onWaiterClick}
            aria-label={t("callWaiter")}
          >
            <HandPlatter className="h-8 w-8 text-paydine-elegant-gray" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.12 }}
            className="flex items-center justify-center focus:outline-none transition-all"
            style={{ background: "none", border: "none", padding: 0, margin: 0 }}
            onClick={onNoteClick}
            aria-label={t("leaveNote")}
          >
            <NotebookPen className="h-8 w-8 text-paydine-elegant-gray" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.12 }}
            className="flex items-center justify-center relative focus:outline-none transition-all"
            style={{ background: "none", border: "none", padding: 0, margin: 0 }}
            onClick={onCartClick}
            aria-label={t("viewCart")}
          >
            <ShoppingCart className="h-8 w-8 text-paydine-elegant-gray" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-paydine-rose-beige text-paydine-elegant-gray text-xs font-bold rounded-full h-7 w-7 flex items-center justify-center shadow-md">
                {totalItems}
              </span>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-paydine-champagne border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
}

// Enhanced Waiter Dialog Component
const EnhancedWaiterDialog = ({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}) => {
  const { t } = useLanguageStore()
  const [dialogState, setDialogState] = useState<"confirming" | "confirmed" | "closing">("confirming")
  const [showSuccess, setShowSuccess] = useState(false)

  const handleConfirm = async () => {
    setDialogState("confirmed")
    setShowSuccess(true)
    
    await new Promise(resolve => setTimeout(resolve, 800))
    await new Promise(resolve => setTimeout(resolve, 2000))
    setShowSuccess(false)
    await new Promise(resolve => setTimeout(resolve, 300))
    onOpenChange(false)
    setDialogState("confirming")
  }

  const handleClose = async () => {
    setDialogState("closing")
    await new Promise(resolve => setTimeout(resolve, 300))
    onOpenChange(false)
    setDialogState("confirming")
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ 
              scale: dialogState === "closing" ? 0.95 : 1,
              opacity: dialogState === "closing" ? 0 : 1,
              y: dialogState === "closing" ? 20 : 0
            }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
          >
            {/* Success State */}
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="p-8 text-center"
                >
                  <div className="mx-auto w-16 h-16 bg-paydine-rose-beige/50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-paydine-elegant-gray" />
                  </div>
                  <h3 className="text-2xl font-semibold text-paydine-elegant-gray mb-2">
                    {t("waiterComing")}
                  </h3>
                </motion.div>
              ) : (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8"
                >
                  <div className="text-center mb-6">
                    <div className="mx-auto w-16 h-16 bg-paydine-rose-beige/50 hover:bg-paydine-champagne rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                      <HandPlatter className="w-8 h-8 text-paydine-elegant-gray" />
                    </div>
                    <h3 className="text-2xl font-semibold text-paydine-elegant-gray mb-2">
                      {t("callWaiter")}
                    </h3>
                    <p className="text-paydine-elegant-gray/80">
                      {t("callWaiterConfirm")}
                    </p>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleClose}
                      className="flex-1 py-3 px-6 rounded-xl bg-gray-100 text-paydine-elegant-gray font-medium hover:bg-gray-200 transition-colors"
                    >
                      {t("no")}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConfirm}
                      className="flex-1 py-3 px-6 rounded-xl bg-paydine-rose-beige/50 hover:bg-paydine-champagne text-paydine-elegant-gray font-medium transition-all duration-300"
                    >
                      {t("yes")}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Enhanced Note Dialog Component
const EnhancedNoteDialog = ({
  isOpen,
  onOpenChange,
  note,
  setNote,
  onSend,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  note: string
  setNote: (note: string) => void
  onSend: () => void
}) => {
  const { t } = useLanguageStore()
  const [dialogState, setDialogState] = useState<"editing" | "confirmed" | "closing">("editing")
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSend = async () => {
    if (!note.trim()) return
    
    setDialogState("confirmed")
    setShowSuccess(true)
    
    // Show success state
    await new Promise(resolve => setTimeout(resolve, 800))
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    setShowSuccess(false)
    await new Promise(resolve => setTimeout(resolve, 300))
    
    onSend()
    onOpenChange(false)
    setDialogState("editing")
  }

  const handleClose = async () => {
    setDialogState("closing")
    await new Promise(resolve => setTimeout(resolve, 300))
    onOpenChange(false)
    setDialogState("editing")
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ 
              scale: dialogState === "closing" ? 0.95 : 1,
              opacity: dialogState === "closing" ? 0 : 1,
              y: dialogState === "closing" ? 20 : 0
            }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="p-8 text-center"
                >
                  <div className="mx-auto w-16 h-16 bg-paydine-rose-beige/50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-paydine-elegant-gray" />
                  </div>
                  <h3 className="text-2xl font-semibold text-paydine-elegant-gray mb-2">
                    {t("messageReceived")}
                  </h3>
                </motion.div>
              ) : (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8"
                >
                  <div className="text-center mb-6">
                    <div className="mx-auto w-16 h-16 bg-paydine-rose-beige/50 hover:bg-paydine-champagne rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                      <NotebookPen className="w-8 h-8 text-paydine-elegant-gray" />
                    </div>
                    <h3 className="text-2xl font-semibold text-paydine-elegant-gray mb-2">
                      {t("leaveNoteTitle")}
                    </h3>
                    <p className="text-paydine-elegant-gray/80">
                      {t("leaveNoteDesc")}
                    </p>
                  </div>

                  <Textarea
                    placeholder={t("notePlaceholder")}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="bg-white border-paydine-champagne/30 rounded-xl min-h-[100px] w-full mb-4"
                  />

                  <div className="flex gap-3 justify-center">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleClose}
                      className="flex-1 py-3 px-6 rounded-xl bg-gray-100 text-paydine-elegant-gray font-medium hover:bg-gray-200 transition-colors"
                    >
                      {t("cancel")}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSend}
                      className="flex-1 py-3 px-6 rounded-xl bg-paydine-rose-beige/50 hover:bg-paydine-champagne text-paydine-elegant-gray font-medium transition-all duration-300"
                    >
                      {t("sendNote")}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Create a component that uses useSearchParams
function MenuContent() {
  const [isClient, setIsClient] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>("All") // Initialize with "All"
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [toolbarState, setToolbarState] = useState<ToolbarState>("collapsed")
  const [lastInteractedItem, setLastInteractedItem] = useState<CartItem | null>(null)
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [apiMenuItems, setApiMenuItems] = useState<MenuItem[]>([])
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([])
  const { menuItems } = useCmsStore()
  const { items, toggleCart, addToCart, setTableInfo } = useCartStore()
  const { t } = useLanguageStore()
  const [isNoteModalOpen, setNoteModalOpen] = useState(false)
  const [isWaiterConfirmOpen, setWaiterConfirmOpen] = useState(false)
  const [note, setNote] = useState("")
  const [tableInfo, setTableInfoState] = useState<any>(null)
  const searchParams = useSearchParams()

  // Force "All" category selection on mount
  useEffect(() => {
    // Always set "All" as default when component mounts
    setSelectedCategory("All");
  }, []); // Empty dependency array - runs only once on mount

  // Also force it when data loads
  useEffect(() => {
    if (apiMenuItems.length > 0) {
      setSelectedCategory("All");
    }
  }, [apiMenuItems]);

  // Load menu data from API on component mount
  useEffect(() => {
    async function loadMenuData() {
      try {
        setIsLoading(true)
        
        // Check if we have table parameters
        const table_id = searchParams.get("table_id")
        const qr = searchParams.get("qr")
        
        if (table_id) {
          // Fetch table information
          try {
            const tableResult = await apiClient.getTableInfo(table_id, qr || undefined)
            if (tableResult.success) {
              setTableInfoState(tableResult.data)
              setTableInfo({
                table_id: tableResult.data.table_id,
                table_name: tableResult.data.table_name,
                location_id: tableResult.data.location_id,
                qr_code: tableResult.data.qr_code
              })
            }
          } catch (error) {
            console.error('Failed to fetch table info:', error)
          }
        }
        
        // Load menu data
        const menuResult = await getMenuData()
        
        setApiMenuItems(menuResult.menuItems)
        setDynamicCategories(menuResult.categoryNames)
        
      } catch (error) {
        console.error('Failed to load menu data:', error)
        setApiMenuItems(menuData)
        setDynamicCategories(categories)
        setSelectedCategory("All") // Even on error, set "All"
      } finally {
        setIsLoading(false)
      }
    }
    
    loadMenuData()
  }, [searchParams, setTableInfo])

  // Add "All" to categories - FIXED VERSION
  const allCategories = useMemo(() => {
    const categoryList = dynamicCategories.length > 0 ? dynamicCategories : ['Appetizer', 'Mains', 'Desserts', 'Drinks'];
    return ["All", ...categoryList];
  }, [dynamicCategories]);

  // Update filteredItems logic
  const filteredItems = useMemo(() => {
    // Use API data if available, otherwise fallback to CMS store or static data
    const availableItems = apiMenuItems.length ? apiMenuItems : (menuItems.length ? menuItems : menuData);
    
    // Always default to showing all items if no category is selected
    const currentCategory = selectedCategory || "All";
    
    // If "All" is selected, show all items
    if (currentCategory === "All") {
      return availableItems;
    }
    
    // Otherwise, filter by selected category
    return availableItems.filter((item) => item.category === currentCategory);
  }, [apiMenuItems, menuItems, selectedCategory]);

  // Initialize with "All" category when data loads
  useEffect(() => {
    if (apiMenuItems.length > 0 && !selectedCategory) {
      setSelectedCategory("All");
    }
  }, [apiMenuItems, selectedCategory]);

  // Calculate total items and price
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)
  const totalPrice = items.reduce((acc, item) => acc + (item.item.price || 0) * item.quantity, 0)

  // Show arrow if at least one item and not collapsed
  const showBillArrow = totalItems > 0 && toolbarState !== "collapsed"

  // Get display items for the toolbar
  const getDisplayItems = () => {
    if (toolbarState === "preview" && lastInteractedItem) {
      return [lastInteractedItem]
    }
    return items
  }

  // Update last interacted item whenever an item is added or selected
  const handleItemInteraction = (item: MenuItem) => {
    const cartItem = items.find(i => i.item.id === item.id)
    if (cartItem) {
      setLastInteractedItem(cartItem)
    }
  }

  // On first add, if toolbar is collapsed, go to preview
  const handleFirstAdd = (item: MenuItem) => {
    if (toolbarState === "collapsed") setToolbarState("preview")
    // Always set lastInteractedItem to the just-added item
    const cartItem = items.find(i => i.item.id === item.id)
    if (cartItem) setLastInteractedItem(cartItem)
  }

  const handleItemSelect = (item: MenuItem) => {
    setSelectedItem(item)
    const cartItem = items.find(i => i.item.id === item.id)
    if (cartItem) setLastInteractedItem(cartItem)
  }

  // Handlers for assistant buttons
  const handleWaiterClick = () => setWaiterConfirmOpen(true)
  const handleNoteClick = () => setNoteModalOpen(true)
  const handleCartClick = () => {
    if (items.length > 0) {
      setPaymentModalOpen(true)
    }
  }
  const handleSendNote = async () => {
    if (note.trim()) {
      try {
        await apiClient.callWaiter(tableInfo?.table_id || "7", note, tableInfo?.table_name)
      setNote("")
      setNoteModalOpen(false)
        toast({
          title: "Message Sent",
          description: "Your message has been sent to the waiter!"
        })
      } catch (error) {
        console.error('Failed to send note:', error)
        toast({
          title: "Message Failed",
          description: "Failed to send message. Please try again.",
          variant: "destructive"
        })
      }
    }
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return <LoadingSpinner />
  }

  return (
    <div className="relative min-h-screen w-full bg-theme pb-32">
      <header className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Logo tableNumber={tableInfo?.table_name} />
        </div>
      </header>
      <Suspense fallback={<LoadingSpinner />}>
        <main className="max-w-4xl mx-auto">
          <CategoryNav
            categories={allCategories}
            selectedCategory={selectedCategory || "All"} // Force "All" if no selection
            onSelectCategory={(category) => {
              setSelectedCategory(category);
              // Auto-select "All" if no category is passed
              if (!category) {
                setSelectedCategory("All");
              }
            }}
          />
          <section className="w-full mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-8 px-4">
              {filteredItems.map((item: MenuItem) => (
                <ExpandingToolbarMenuItemCard
                  key={item.id}
                  item={item}
                  onSelect={handleItemSelect}
                  onFirstAdd={() => handleFirstAdd(item)}
                />
              ))}
            </div>
          </section>
        </main>
      </Suspense>

      {/* Button Animation Styles */}
      <style jsx global>{`
        @keyframes btn-bounce {
          0% { transform: scale(1); }
          40% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        
        .btn-animate {
          animation: btn-bounce 0.7s cubic-bezier(0.4, 2, 0.6, 1);
        }
        
        .btn-glow {
          box-shadow: 0 0 0 8px rgba(255, 228, 181, 0.5), 0 0 16px 4px rgba(200, 155, 108, 0.3);
        }
      `}</style>

      {/* Rest of the components */}
      <ExpandingBottomToolbar
        toolbarState={toolbarState}
        setToolbarState={setToolbarState}
        showBillArrow={showBillArrow}
        items={getDisplayItems()}
        totalPrice={totalPrice}
        t={t}
        onCartClick={handleCartClick}
        onWaiterClick={handleWaiterClick}
        onNoteClick={handleNoteClick}
        totalItems={totalItems}
      />
      <CartSheet />
      <MenuItemModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        items={items}
        tableInfo={tableInfo}
      />
      <EnhancedWaiterDialog
        isOpen={isWaiterConfirmOpen}
        onOpenChange={setWaiterConfirmOpen}
      />
      <EnhancedNoteDialog
        isOpen={isNoteModalOpen}
        onOpenChange={setNoteModalOpen}
        note={note}
        setNote={setNote}
        onSend={handleSendNote}
      />
    </div>
  )
}

// Main component with Suspense wrapper
export default function ExpandingBottomToolbarMenu() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MenuContent />
    </Suspense>
  )
} 