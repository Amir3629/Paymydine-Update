"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Users, Wallet, Check, Plus, Minus, CreditCard, Lock, ArrowLeft, DollarSign } from "lucide-react"
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
  const { items: allItems, clearCart, tableInfo } = useCartStore()
  const isCashier = (tableInfo as any)?.is_codier || false
  const { paymentOptions, tipSettings, taxSettings, merchantSettings, loadTaxSettings, appliedCoupon, validateCoupon, removeCoupon } = useCmsStore()
  const [isLoading, setIsLoading] = useState(false)
  
  // Helper function to adjust price if tax is included in menu prices
  const adjustPriceForTax = (price: number): number => {
    if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
      // Tax is included in prices - increase price by tax percentage
      return price * (1 + taxSettings.percentage / 100)
    }
    return price
  }
  const [isSplitting, setIsSplitting] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({})
  const [tipPercentage, setTipPercentage] = useState(0)
  const [customTip, setCustomTip] = useState("")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [couponCode, setCouponCode] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
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

  useEffect(() => {
    // Load tax settings from backend on mount
    loadTaxSettings()
  }, [loadTaxSettings])

  if (allItems.length === 0) {
    return null
  }

  // Flatten allItems into individual item instances for split bill
  const allItemInstances = allItems.flatMap((cartItem, cartIndex) =>
    Array.from({ length: cartItem.quantity }).map((_, i) => ({
      cartIndex,
      item: cartItem.item,
      price: adjustPriceForTax(cartItem.item.price),
      key: `${cartItem.item.id}-${cartIndex}-${i}`,
    }))
  )

  // For split bill, use selected individual items; otherwise, use all items
  const itemsToPay: ItemInstance[] = isSplitting
    ? Object.values(selectedItems)
    : allItems.flatMap((cartItem) =>
        Array.from({ length: cartItem.quantity }).map(() => ({
          item: cartItem.item,
          price: adjustPriceForTax(cartItem.item.price),
        }))
      )

  const subtotal = useMemo(
    () => itemsToPay.reduce((acc, inst) => acc + inst.price, 0),
    [itemsToPay, taxSettings],
  )
  // Calculate tax if enabled AND tax should be applied on checkout (not already included in prices)
  // tax_menu_price: 0 = tax included in menu price, 1 = apply tax on checkout
  const taxAmount = useMemo(() => {
    if (!taxSettings.enabled || taxSettings.percentage === 0 || taxSettings.menuPrice === 0) {
      return 0 // If tax is included in menu price (menuPrice = 0), don't add tax
    }
    return subtotal * (taxSettings.percentage / 100)
  }, [subtotal, taxSettings.enabled, taxSettings.percentage, taxSettings.menuPrice])
  const safeTip = Math.max(0, Number(customTip) || 0);
  const tipAmount = customTip ? safeTip : subtotal * (tipPercentage / 100);
  
  // Calculate coupon discount
  const couponDiscount = useMemo(() => {
    if (!appliedCoupon) return 0
    // Recalculate discount based on current subtotal (in case items changed)
    const subtotalForCoupon = subtotal
    if (appliedCoupon.type === 'F') {
      // Fixed amount - don't exceed subtotal
      return Math.min(appliedCoupon.discount, subtotalForCoupon)
    } else {
      // Percentage
      return subtotalForCoupon * (appliedCoupon.discount_value / 100)
    }
  }, [appliedCoupon, subtotal])
  
  const finalTotal = Math.max(0, subtotal + taxAmount + tipAmount - couponDiscount)

  const processPayment = async (paymentData: any) => {
    try {
      setIsLoading(true)
      
      // First, process payment with payment provider
      const paymentResponse = await fetch('/api/process-payment', {
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
          coupon_code: appliedCoupon?.code || null,
          coupon_discount: couponDiscount,
          ...paymentData,
        }),
      })

      const paymentResult = await paymentResponse.json()

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed')
      }

      // After payment succeeds, submit order to backend
      const api = new ApiClient()
      const orderData = {
        table_id: isCashier ? "cashier" : (tableInfo?.table_id ?? null),
        table_name: isCashier ? "Cashier" : (tableInfo?.table_name ?? null),
        location_id: tableInfo?.location_id || 1,
        is_codier: isCashier,
        items: itemsToPay.map(item => ({
          menu_id: item.item.id,
          name: item.item.name,
          quantity: 1, // itemsToPay already has individual items
          price: item.price,
          special_instructions: '',
          options: {}
        })),
        customer_name: paymentFormData.cardholderName || (isCashier ? "Cashier Customer" : `${tableInfo?.table_name || `Table ${tableInfo?.table_id || 'Unknown'}`} Customer`),
        customer_phone: paymentFormData.phone || '',
        customer_email: paymentFormData.email || '',
        payment_method: (selectedPaymentMethod === 'paypal' ? 'paypal' : 
                        selectedPaymentMethod === 'cash' ? 'cod' : 'card') as 'cod' | 'card' | 'paypal',
        total_amount: finalTotal,
        tip_amount: tipAmount,
        coupon_code: appliedCoupon?.code || null,
        coupon_discount: couponDiscount,
        special_instructions: ''
      }

      const orderResponse = await api.submitOrder(orderData)
      
      if (orderResponse.success) {
        // Save order ID for status tracking
        if (orderResponse.order_id) {
          localStorage.setItem('lastOrderId', orderResponse.order_id.toString())
        }
        
        toast({ 
          title: t("paymentSuccessful"), 
          description: `Order #${orderResponse.order_id || 'submitted'} placed successfully!`,
          variant: "default"
        })
        
        // Clear cart and redirect after success
        setTimeout(() => {
          clearCart()
          const currentUrl =
            typeof window !== "undefined"
              ? window.location.pathname + window.location.search
              : ""
          const returnUrl = encodeURIComponent(currentUrl)
          router.push(
            `/order-placed?order_id=${orderResponse.order_id || 'unknown'}&return_url=${returnUrl}`
          )
        }, 1500)
      } else {
        throw new Error('Order submission failed')
      }
    } catch (error) {
      console.error('Payment/Order error:', error)
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
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">€</span>
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
                  {selectedMethod.code === "applepay" 
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
      switch (selectedMethod.code) {
        case "visa":
        case "mastercard":
        case "stripe":
        case "authorizenetaim":
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
      switch (selectedMethod.code) {
        case "visa":
        case "mastercard":
        case "stripe":
        case "authorizenetaim":
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
          {t("backToHome") || "Back"}
        </Button>

        <div className="space-y-8">
          <div className="surface rounded-3xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-4">{t("orderSummary")}</h2>
            
            {allItems.flatMap(({ item, quantity }) => {
              const itemName = t(item.nameKey as TranslationKey) || item.name
              const adjustedPrice = adjustPriceForTax(item.price)
              const hasOptions = item.options && item.options.length > 0
              
              // If item has sides/options, always show each instance separately (1x, 1x, 1x)
              // This ensures each item can have different sides selected
              if (hasOptions) {
                return Array.from({ length: quantity }).map((_, index) => (
                  <div key={`${item.id}-${index}`} className="flex justify-between items-center py-2 divider last:border-0">
                    <div className="flex items-center space-x-4">
                      <span>1x</span>
                      <span>{itemName}</span>
                    </div>
                    <span className="font-semibold">${adjustedPrice.toFixed(2)}</span>
                  </div>
                ))
              }
              
              // If no options, show grouped (but still as 1x entries for consistency)
              return Array.from({ length: quantity }).map((_, index) => (
                <div key={`${item.id}-${index}`} className="flex justify-between items-center py-2 divider last:border-0">
                  <div className="flex items-center space-x-4">
                    <span>1x</span>
                    <span>{itemName}</span>
                  </div>
                  <span className="font-semibold">${adjustedPrice.toFixed(2)}</span>
                </div>
              ))
            })}

            {/* Coupon Code Input */}
            <div className="surface-sub rounded-2xl p-3 space-y-2 mt-4">
              {!appliedCoupon ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase())
                      setCouponError(null)
                    }}
                    placeholder={t("couponCode") || "Coupon Code"}
                    className="flex-1 px-3 py-2 border rounded-lg text-xs"
                    style={{ borderColor: 'var(--theme-border)' }}
                    disabled={couponLoading}
                  />
                  <Button
                    onClick={async () => {
                      if (!couponCode.trim()) {
                        setCouponError("Please enter a coupon code")
                        return
                      }
                      setCouponLoading(true)
                      setCouponError(null)
                      const result = await validateCoupon(couponCode.trim(), subtotal)
                      if (!result.success) {
                        setCouponError(result.message || "Invalid coupon code")
                      } else {
                        setCouponCode("")
                        // Wait a bit for state to update, then show toast
                        setTimeout(() => {
                          const { appliedCoupon: currentCoupon } = useCmsStore.getState()
                          toast({
                            title: "Coupon Applied",
                            description: `${currentCoupon?.name || 'Coupon'} applied successfully!`,
                          })
                        }, 100)
                      }
                      setCouponLoading(false)
                    }}
                    disabled={couponLoading || !couponCode.trim()}
                    size="sm"
                    className="icon-btn--accent text-xs"
                  >
                    {couponLoading ? "..." : t("apply") || "Apply"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">
                      {appliedCoupon.name} ({appliedCoupon.code})
                    </span>
                    <span className="text-xs text-green-600 dark:text-green-500">
                      -${couponDiscount.toFixed(2)}
                    </span>
                  </div>
                  <Button
                    onClick={() => {
                      removeCoupon()
                      setCouponCode("")
                      setCouponError(null)
                    }}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-base font-bold"
                  >
                    ✕
                  </Button>
                </div>
              )}
              {couponError && (
                <p className="text-xs text-red-600 dark:text-red-400">{couponError}</p>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex justify-between">
                <span>{t("subtotal")}</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              {taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 1 && (
              <div className="flex justify-between">
                  <span>{t("tax")} {taxSettings.percentage}%</span>
                  <span className="font-semibold">${taxAmount.toFixed(2)}</span>
              </div>
              )}
              <div className="flex justify-between">
                <span>{t("tip")}</span>
                <span className="font-semibold">${tipAmount.toFixed(2)}</span>
              </div>
              {appliedCoupon && couponDiscount > 0 && (
                <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                  <span>{t("coupon") || "Coupon"} ({appliedCoupon.code})</span>
                  <span className="font-semibold">-${couponDiscount.toFixed(2)}</span>
                </div>
              )}
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
                {allItems.flatMap((cartItem) => {
                  const itemName = t(cartItem.item.nameKey as TranslationKey) || cartItem.item.name
                  const adjustedPrice = adjustPriceForTax(cartItem.item.price)
                  const hasOptions = cartItem.item.options && cartItem.item.options.length > 0
                  
                  // If item has sides/options, always show each instance separately (1x, 1x, 1x)
                  // This ensures each item can have different sides selected
                  if (hasOptions) {
                    return Array.from({ length: cartItem.quantity }).map((_, index) => (
                      <div key={`${cartItem.item.id}-${index}`} className="flex justify-between items-center text-xs p-2 rounded-2xl">
                        <span className="muted min-w-[120px]">
                          1x {itemName}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium min-w-[48px] text-center" style={{ color: 'var(--theme-secondary)' }}>
                            ${adjustedPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))
                  }
                  
                  // If no options, show grouped (but still as 1x entries for consistency)
                  return Array.from({ length: cartItem.quantity }).map((_, index) => (
                    <div key={`${cartItem.item.id}-${index}`} className="flex justify-between items-center text-xs p-2 rounded-2xl">
                      <span className="muted min-w-[120px]">
                        1x {itemName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium min-w-[48px] text-center" style={{ color: 'var(--theme-secondary)' }}>
                          ${adjustedPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                })}
              </div>
            </div>
          )}

          {/* Tip Section */}
          {tipSettings.enabled && (
            <div className="surface-sub rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="relative h-4 w-4 flex items-center justify-center">
                  <svg 
                    className="absolute h-4 w-4" 
                    style={{ color: 'var(--theme-secondary)' }}
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  <DollarSign className="h-2.5 w-2.5 absolute" style={{ color: 'var(--theme-background)' }} strokeWidth="3" />
                </div>
                <h3 className="font-semibold text-xs">{t("addTip")}</h3>
              </div>
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
            {taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 1 && (
            <div className="flex justify-between text-xs">
                <span>{t("tax")} {taxSettings.percentage}%</span>
                <span className="font-semibold">${taxAmount.toFixed(2)}</span>
            </div>
            )}
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