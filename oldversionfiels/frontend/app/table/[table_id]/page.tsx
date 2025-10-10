"use client"

import React, { useEffect, useState, use } from "react"
import { useLanguageStore } from "@/store/language-store"
import { useCmsStore } from "@/store/cms-store"
import { useCartStore } from "@/store/cart-store"
import { Logo } from "@/components/logo"
import { Car, Utensils } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useSearchParams } from "next/navigation"
import { EnvironmentConfig } from "@/lib/environment-config"

const MotionLink = motion(Link)

export default function TableHomePage({ params }: { params: Promise<{ table_id: string }> }) {
  const { t } = useLanguageStore()
  const { settings } = useCmsStore()
  const { setTableInfo } = useCartStore()
  const searchParams = useSearchParams()
  
  // FIXED: Unwrap params Promise with React.use()
  const { table_id } = use(params)
  
  const qr = searchParams.get("qr")
  const [table, setTable] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch table info with better error handling
    const envConfig = EnvironmentConfig.getInstance();
    const endpoint = envConfig.getApiEndpoint(`/table-info?table_id=${table_id}${qr ? `&qr=${qr}` : ""}`);
    
    fetch(endpoint)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setTable(res.data)
          // FIXED: Set table info in cart store so Logo component can access it
          setTableInfo({
            table_id: res.data.table_id.toString(), // Convert to string to match type
            table_name: res.data.table_name, // Use the actual table_name from API (e.g., "table 11")
            location_id: res.data.location_id,
            qr_code: res.data.qr_code
          })
        } else {
          // FIXED: Fallback table info if API fails
          const fallbackTable = {
            table_id: table_id,
            table_name: `Table ${table_id}`,
            location_id: 1,
            qr_code: qr || `qr_${table_id}`
          }
          setTable(fallbackTable)
          setTableInfo(fallbackTable)
        }
        setLoading(false)
      })
              .catch((error) => {
        console.error('Failed to fetch table info:', error)
        // FIXED: Fallback table info if API fails - use same logic as success case
        const fallbackTable = {
          table_id: table_id,
          table_name: `Table ${table_id}`,
          location_id: 1,
          qr_code: qr || `qr_${table_id}`
        }
        setTable(fallbackTable)
        setTableInfo(fallbackTable)
        setLoading(false)
      })
  }, [table_id, qr, setTableInfo])

  const cardStyles = "relative flex flex-col items-center bg-white/80 backdrop-blur-sm rounded-3xl p-8 sm:p-12 shadow-sm hover:shadow-xl transition duration-500 border border-paydine-rose-beige/20 w-72 h-56 justify-center"
  const iconContainerStyles = "rounded-full bg-gradient-to-br from-paydine-rose-beige/20 to-paydine-champagne/10 p-6 mb-6"

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-paydine-soft-white to-paydine-rose-beige/20 flex flex-col items-center justify-center p-4">
        <div className="text-paydine-elegant-gray">Loading table information...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-paydine-soft-white to-paydine-rose-beige/20 flex flex-col items-center justify-center p-4">
      {/* FIXED: Use Logo without tableNumber prop - it will get it from cart store */}
      <Logo className="mb-8" />
      
      <div className="flex flex-row flex-wrap gap-6 justify-center">
        <MotionLink 
          href={`/table/${table_id}/menu?qr=${qr || ''}`}
          className="relative group"
          whileHover="hover"
          initial="initial"
          animate="animate"
        >
          <motion.div
            className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-paydine-champagne/30 to-paydine-rose-beige/30 opacity-0 group-hover:opacity-100 blur transition duration-500"
            variants={{
              hover: { scale: 1.1 },
              initial: { scale: 0.9 }
            }}
          />
          <motion.div
            className={cardStyles}
            variants={{
              hover: { y: -8 },
              initial: { y: 0 }
            }}
          >
            <motion.div
              className={iconContainerStyles}
              variants={{
                hover: { 
                  scale: 1.1,
                  backgroundColor: "rgb(242 231 229 / 0.3)",
                },
                initial: { 
                  scale: 1,
                  backgroundColor: "rgb(242 231 229 / 0.2)",
                }
              }}
            >
              <Utensils className="w-10 h-10 text-paydine-elegant-gray" />
            </motion.div>
            <h2 className="text-2xl font-medium text-paydine-elegant-gray">{t("menuCard")}</h2>
          </motion.div>
        </MotionLink>

        <MotionLink 
          href={`/table/${table_id}/valet?qr=${qr || ''}`}
          className="relative group"
          whileHover="hover"
          initial="initial"
          animate="animate"
        >
          <motion.div
            className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-paydine-champagne/30 to-paydine-rose-beige/30 opacity-0 group-hover:opacity-100 blur transition duration-500"
            variants={{
              hover: { scale: 1.1 },
              initial: { scale: 0.9 }
            }}
          />
          <motion.div
            className={cardStyles}
            variants={{
              hover: { y: -8 },
              initial: { y: 0 }
            }}
          >
            <motion.div
              className={iconContainerStyles}
              variants={{
                hover: { 
                  scale: 1.1,
                  backgroundColor: "rgb(242 231 229 / 0.3)",
                },
                initial: { 
                  scale: 1,
                  backgroundColor: "rgb(242 231 229 / 0.2)",
                }
              }}
            >
              <Car className="w-10 h-10 text-paydine-elegant-gray" />
            </motion.div>
            <h2 className="text-2xl font-medium text-paydine-elegant-gray">{t("valetParking")}</h2>
          </motion.div>
        </MotionLink>
      </div>
    </div>
  )
} 