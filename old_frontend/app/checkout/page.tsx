"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Users, Wallet, Check, Plus, Minus, CreditCard, Lock, ArrowLeft } from "lucide-react"
import { useCartStore, type CartItem } from "@/store/cart-store"
import { useLanguageStore } from "@/store/language-store"
import { useCmsStore } from "@/store/cms-store"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import type { TranslationKey } from "@/lib/translations"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { ApiClient, type PaymentMethod } from "@/lib/api-client"
import { iconForPayment } from "@/lib/payment-icons"

// Add type declarations for PayPal and ApplePay
declare global {
  interface Window {
    paypal?: any;
    ApplePaySession?: any;
  }
}

type PaymentFormData = {
  cardNumber: string
  expiryDate: string
  cvv: string
  cardholderName: string
  email: string
  phone: string
}

type ItemInstance = {
  item: CartItem["item"];
  price: number;
}

type SelectedItem = {
  item: CartItem["item"];
  price: number;
  key: string;
}


// Payment processor configuration
const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID

export default function CheckoutPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguageStore()
  const { items: allItems, clearCart } = useCartStore()
  const { paymentOptions, tipSettings, merchantSettings } = useCmsStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isSplitting, setIsSplitting] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({})
  const [tipPercentage, setTipPercentage] = useState(tipSettings.defaultPercentage)
  const [customTip, setCustomTip] = useState("")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
    email: "",
    phone: "",
  })

  useEffect(() => {
    if (allItems.length === 0) {
      router.push('/')
    }
  }, [allItems.length, router])

  useEffect(() => {
    const api = new ApiClient();
    api.getPaymentMethods()
      .then(setPaymentMethods)
      .finally(() => setLoadingPayments(false));
  }, [])

  if (allItems.length === 0) {
    return null
  }

  // Flatten allItems into individual item instances for split bill
  const allItemInstances = allItems.flatMap((cartItem, cartIndex) =>
    Array.from({ length: cartItem.quantity }).map((_, i) => ({
      cartIndex,
      item: cartItem.item,
      price: cartItem.item.price,
      key: `${cartItem.item.id}-${cartIndex}-${i}`,
    }))
  )

  // For split bill, use selected individual items; otherwise, use all items
  const itemsToPay: ItemInstance[] = isSplitting
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
  const safeTip = Math.max(0, Number(customTip) || 0);
  const tipAmount = customTip ? safeTip : subtotal * (tipPercentage / 100);
  const finalTotal = subtotal + serviceCharge + tipAmount

  const processPayment = async (paymentData: any) => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/process-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethod: selectedPaymentMethod,
          amount: finalTotal,
          currency: 'USD',
          items: itemsToPay,
          customerInfo: paymentFormData,
          merchantAccount: merchantSettings.accountId,
          ...paymentData,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({ 
          title: t("paymentSuccessful"), 
          description: t("paymentSuccessfulDesc"),
          variant: "default"
        })
        
        // Clear cart and redirect after success
        setTimeout(() => {
          clearCart()
          router.push("/order-placed")
        }, 1500)
      } else {
        throw new Error(result.error || 'Payment failed')
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast({ 
        title: "Payment Failed", 
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!selectedPaymentMethod) return

    switch (selectedPaymentMethod) {
      case "visa":
      case "mastercard":
        await processPayment({
          card: {
            number: paymentFormData.cardNumber.replace(/\s/g, ''),
            expiry: paymentFormData.expiryDate.replace(/\s/g, ''),
            cvv: paymentFormData.cvv,
            name: paymentFormData.cardholderName,
          }
        })
        break
      
      case "paypal":
        // PayPal integration
        if (window.paypal) {
          window.paypal.Buttons({
            createOrder: (data: any, actions: any) => {
              return actions.order.create({
                purchase_units: [{
                  amount: {
                    value: finalTotal.toFixed(2)
                  }
                }]
              })
            },
            onApprove: async (data: any, actions: any) => {
              const details = await actions.order.capture()
              await processPayment({ paypalOrderId: details.id })
            }
          }).render('#paypal-button-container')
        }
        break
      
      case "applepay":
        // Apple Pay integration
        if (window.ApplePaySession) {
          const session = new window.ApplePaySession(3, {
            countryCode: 'US',
            currencyCode: 'USD',
            supportedNetworks: ['visa', 'masterCard', 'amex'],
            merchantCapabilities: ['supports3DS'],
            total: {
              label: merchantSettings.businessName || 'PayMyDine',
              amount: finalTotal.toFixed(2)
            }
          })
          session.begin()
        }
        break
      
      case "googlepay":
        // Google Pay integration
        await processPayment({ provider: 'googlepay' })
        break
      
      case "cash":
        await processPayment({ provider: 'cash' })
        break
      
      default:
        toast({ 
          title: "Error", 
          description: "Please select a payment method",
          variant: "destructive"
        })
    }
  }

  // Toggle selection for individual item instance
  const toggleItemSelection = (instance: { key: string; item: CartItem["item"]; price: number }) => {
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

  // Remove handleQuantityChange function since we don't need it anymore

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

  // Add this new handler for keypress
  const handleTipKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent minus sign and e (scientific notation)
    if (e.key === '-' || e.key === 'e') {
      e.preventDefault();
      return false;
    }
  };

  // Update the custom tip change handler
  const handleCustomTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove any non-numeric characters except decimal point
    let val = e.target.value.replace(/[^0-9.]/g, "");
    
    // Only allow one decimal point
    const parts = val.split(".");
    if (parts.length > 2) {
      val = parts[0] + "." + parts.slice(1).join("");
    }
    
    // No leading zeros unless it's a decimal (e.g., 0.5)
    if (val.length > 1 && val[0] === "0" && val[1] !== ".") {
      val = val.substring(1);
    }
    
    setCustomTip(val);
  };

  // Custom tip input component to ensure no negative numbers
  const CustomTipInput = () => {
    const handleTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Get the raw input value
      const rawValue = e.target.value;
      
      // Remove any non-numeric characters (except decimal point)
      let cleanValue = rawValue.replace(/[^0-9.]/g, '');
      
      // Ensure only one decimal point
      const decimalCount = (cleanValue.match(/\./g) || []).length;
      if (decimalCount > 1) {
        cleanValue = cleanValue.replace(/\./g, (match, index) => index === cleanValue.indexOf('.') ? '.' : '');
      }
      
      // Don't allow leading zeros unless it's a decimal
      if (cleanValue.length > 1 && cleanValue[0] === '0' && cleanValue[1] !== '.') {
        cleanValue = cleanValue.slice(1);
      }
      
      setCustomTip(cleanValue);
    };

    return (
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
    );
  };

  // Add this new component for the custom numeric input
  const NumericTipInput = () => {
    const [displayValue, setDisplayValue] = useState('0');

    const handleNumberClick = (num: string) => {
      if (displayValue === '0' && num !== '.') {
        setDisplayValue(num);
      } else {
        // Only allow one decimal point
        if (num === '.' && displayValue.includes('.')) {
          return;
        }
        setDisplayValue(prev => prev + num);
      }
      setCustomTip(displayValue + num);
    };

    const handleBackspace = () => {
      if (displayValue.length > 1) {
        const newValue = displayValue.slice(0, -1);
        setDisplayValue(newValue);
        setCustomTip(newValue);
      } else {
        setDisplayValue('0');
        setCustomTip('0');
      }
    };

    const handleClear = () => {
      setDisplayValue('0');
      setCustomTip('');
    };

    return (
      <div className="flex-grow">
        <div className="relative mb-2">
          <div className="w-full h-8 px-3 py-1 bg-white rounded-md border border-paydine-champagne/30 flex items-center">
            <span className="text-gray-400 mr-1">$</span>
            <span className="text-right flex-grow text-sm">{displayValue}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              className="p-2 text-sm bg-white hover:bg-paydine-champagne/10 rounded-md border border-paydine-champagne/30"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleNumberClick('.')}
            className="p-2 text-sm bg-white hover:bg-paydine-champagne/10 rounded-md border border-paydine-champagne/30"
          >
            .
          </button>
          <button
            onClick={() => handleNumberClick('0')}
            className="p-2 text-sm bg-white hover:bg-paydine-champagne/10 rounded-md border border-paydine-champagne/30"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="p-2 text-sm bg-white hover:bg-paydine-champagne/10 rounded-md border border-paydine-champagne/30 text-paydine-champagne"
          >
            ←
          </button>
        </div>
      </div>
    );
  };

  // Payment methods are now loaded from API
  const selectedMethod = paymentMethods.find(method => method.code === selectedPaymentMethod)

  const renderPaymentForm = () => {
    if (!selectedMethod) return null

    switch (selectedMethod.code) {
      case "stripe":
      case "authorizenetaim":
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
                <img
                  src={iconForPayment(selectedMethod.code)}
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
                <img
                  src={iconForPayment(selectedMethod.code)}
                  alt={selectedMethod.name}
                  width={32}
                  height={20}
                  className="object-contain"
                />
                <span className="font-semibold text-paydine-elegant-gray">{selectedMethod.name}</span>
              </div>
            </div>

            <div id="paypal-button-container"></div>
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
                <img
                  src={iconForPayment(selectedMethod.code)}
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
                    ? "Touch ID or Face ID to pay with Apple Pay"
                    : "Use your saved payment method with Google Pay"
                  }
                </p>
                <div className="text-lg font-bold text-paydine-elegant-gray">
                  Total: ${finalTotal.toFixed(2)}
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
                  Total: ${finalTotal.toFixed(2)}
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
          return true // PayPal handles its own validation
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
          return `Pay $${finalTotal.toFixed(2)}`
        case "paypal":
          return "Continue with PayPal"
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

  return (
      <div className="min-h-screen bg-theme-background pb-8">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6 text-paydine-elegant-gray hover:text-paydine-elegant-gray/80"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back")}
        </Button>

        <div className="space-y-8">
          <div className="surface rounded-3xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-4">{t("orderSummary")}</h2>
            
            {allItems.map(({ item, quantity }) => {
              const itemName = t(item.nameKey as TranslationKey) || item.name
              return (
                <div key={item.id} className="flex justify-between items-center py-2 divider last:border-0">
                  <div className="flex items-center space-x-4">
                    <span>{quantity}x</span>
                    <span>{itemName}</span>
                  </div>
                  <span className="font-semibold">${(item.price * quantity).toFixed(2)}</span>
                </div>
              )
            })}

            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span>{t("subtotal")}</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("service")} (10%)</span>
                <span className="font-semibold">${serviceCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("tip")}</span>
                <span className="font-semibold">${tipAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold pt-2 divider">
                <span>{t("total")}</span>
                <span style={{ color: 'var(--theme-secondary)' }}>${finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Split Bill Toggle */}
          <div className="flex items-center justify-between p-3 surface-sub rounded-xl">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" style={{ color: 'var(--theme-secondary)' }} />
              <span className="font-medium text-xs muted">{t("splitBill")}</span>
            </div>
            <Button
              variant={isSplitting ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSplitting(!isSplitting)}
              className={isSplitting ? "icon-btn--accent text-xs" : "icon-btn text-xs"}
            >
              {isSplitting ? "ON" : "OFF"}
            </Button>
          </div>

          {/* Items List */}
          {isSplitting ? (
            <div className="surface-sub rounded-2xl p-3 overflow-hidden">
              <h3 className="font-semibold mb-2 text-xs">{t("selectItemsToPay")}</h3>
              <div className="space-y-2 max-h-24 overflow-y-auto">
                {allItemInstances.map((instance) => (
                  <div
                    key={instance.key}
                    className="flex justify-between items-center text-xs p-2 rounded-lg cursor-pointer hover:opacity-90"
                    onClick={() => toggleItemSelection(instance)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all",
                          selectedItems[instance.key] ? "icon-btn--accent" : "icon-btn",
                        )}
                      >
                        {selectedItems[instance.key] && <Check className="w-3 h-3" />}
                      </div>
                      <span className="muted">
                        {t(instance.item.nameKey as TranslationKey)}
                      </span>
                    </div>
                    <span className="font-medium" style={{ color: 'var(--theme-secondary)' }}>
                      ${instance.price.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="surface-sub rounded-2xl p-3">
              <h3 className="font-semibold mb-2 text-xs">{t("orderSummary")}</h3>
              <div className="space-y-2">
                {allItems.map((cartItem) => (
                  <div key={cartItem.item.id} className="flex justify-between items-center text-xs p-2 rounded-lg">
                    <span className="muted min-w-[120px]">
                      {cartItem.quantity}x {t(cartItem.item.nameKey as TranslationKey)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium min-w-[48px] text-center" style={{ color: 'var(--theme-secondary)' }}>
                        ${(cartItem.item.price * cartItem.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tip Section */}
          {tipSettings.enabled && (
            <div className="surface-sub rounded-2xl p-3">
              <h3 className="font-semibold mb-2 text-xs">{t("addTip")}</h3>
              <div className="space-y-3">
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
                          ? "tip-pill--active text-xs"
                          : "tip-pill text-xs"
                      }
                    >
                      {p}%
                    </Button>
                  ))}
                </div>
                <NumericTipInput />
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="surface-sub rounded-2xl p-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span>{t("subtotal")}</span>
              <span className="font-semibold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>{t("service")}</span>
              <span className="font-semibold">${serviceCharge.toFixed(2)}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between text-xs">
                <span>{t("tip")}</span>
                <span className="font-semibold">${tipAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center divider pt-2 mt-2">
              <span className="font-serif text-base">{t("total")}</span>
              <span className="font-bold text-base" style={{ color: 'var(--theme-secondary)' }}>${finalTotal.toFixed(2)}</span>
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
                <h3 className="font-semibold text-center text-sm">{t("paymentMethods")}</h3>
                <div className="flex justify-center items-center gap-3 flex-wrap">
                  {loadingPayments ? (
                    <div className="text-sm muted">Loading payment methods...</div>
                  ) : paymentMethods.length === 0 ? (
                    <div className="text-sm muted">No payment methods available</div>
                  ) : (
                    paymentMethods.map((method) => (
                      <motion.div key={method.code} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="outline"
                          className="h-14 w-20 surface-sub hover:opacity-90 rounded-2xl shadow-sm flex items-center justify-center"
                          onClick={() => handlePaymentMethodSelect(method.code)}
                        >
                          <img
                            src={iconForPayment(method.code)}
                            alt={method.name}
                            width={40}
                            height={20}
                            className="object-contain"
                          />
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
              className="p-4 border-t border-paydine-champagne/20 bg-white/95"
            >
              {renderPaymentButton()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 