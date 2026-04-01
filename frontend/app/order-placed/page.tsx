"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { CheckCircle, ChefHat, CookingPot } from "lucide-react"
import { Logo } from "@/components/logo"
import { useLanguageStore } from "@/store/language-store"
import { useCmsStore } from "@/store/cms-store"
import { useCartStore } from "@/store/cart-store"
import { apiClient } from "@/lib/api-client"
import { buildTablePath } from "@/lib/table-url"
import { stickySearch } from "@/lib/sticky-query"
import { getHomeHrefFallback } from "@/lib/table-home-util"

// FIXED: Create a component that uses useSearchParams
function OrderPlacedContent() {
  const router = useRouter()
  const searchParams = useSearchParams() // This hook requires Suspense
  const { t } = useLanguageStore()
  const { settings } = useCmsStore()
  const { tableInfo } = useCartStore()
  const [currentStatus, setCurrentStatus] = useState(0)
  const [orderId, setOrderId] = useState<number | null>(null)

  const statuses = [
    { text: t("orderSentToKitchen"), icon: CheckCircle },
    { text: t("chefPreparing"), icon: ChefHat },
    { text: t("onWayToTable"), icon: CookingPot },
  ]

  // Get order ID from URL params or localStorage
  useEffect(() => {
    const orderIdFromUrl = searchParams.get('order_id')
    const orderIdFromStorage = localStorage.getItem('lastOrderId')
    
    if (orderIdFromUrl) {
      setOrderId(parseInt(orderIdFromUrl))
    } else if (orderIdFromStorage) {
      setOrderId(parseInt(orderIdFromStorage))
    }
  }, [searchParams])

  // Poll for order status updates
  useEffect(() => {
    if (!orderId) return

    let pollInterval: NodeJS.Timeout

    const pollOrderStatus = async () => {
      try {
        const response = await apiClient.getOrderStatus(orderId)
        if (response.success) {
          const newStatus = response.data.customer_status
          setCurrentStatus(newStatus)
        }
      } catch (error) {
        console.error('Failed to fetch order status:', error)
      }
    }

    // Initial status check
    pollOrderStatus()

    // Poll every 3 seconds for status updates
    pollInterval = setInterval(pollOrderStatus, 3000)

    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [orderId])

  // Use saved home URL if present, otherwise fall back to URL params and store data
  const menuUrl = searchParams.get("return_url") || getHomeHrefFallback({ tableInfo })

  return (
    <div className="flex flex-col items-center justify-center min-h-screen order-placed-page p-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Logo className="mb-8" tableNumber={tableInfo?.table_name} />
        <h1 className="font-serif text-5xl font-bold order-placed-title mb-4">{t("thankYou")}</h1>
        <p className="text-lg order-placed-subtitle mb-12">{t("orderPlacedSuccess")}</p>

        <div className="w-full space-y-6 text-left order-placed-card rounded-3xl p-8 backdrop-blur-sm">
          {statuses.map((status, index) => (
            <motion.div
              key={status.text}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: currentStatus >= index ? 1 : 0.3, x: currentStatus >= index ? 0 : -20 }}
              transition={{ duration: 0.5 }}
              className="flex items-center space-x-4"
            >
              <div
                className={`p-4 rounded-2xl transition-all duration-500 order-placed-status-icon ${currentStatus >= index ? "order-placed-status-active" : "order-placed-status-inactive"}`}
              >
                <status.icon className={`h-6 w-6 ${currentStatus >= index ? "order-placed-icon-active" : "order-placed-icon-inactive"}`} />
              </div>
              <span className={`text-lg font-medium ${currentStatus >= index ? "order-placed-text-active" : "order-placed-text-inactive"}`}>
                {status.text}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 space-y-4">
          {/* FIXED: Menu button - goes to table home page */}
          <button
            onClick={() => router.push(menuUrl)}
            className="text-lg font-medium hover:underline cursor-pointer order-placed-menu-button"
          >
            Menu
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// FIXED: Main component with Suspense wrapper
export default function OrderPlacedPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderPlacedContent />
    </Suspense>
  )
}
