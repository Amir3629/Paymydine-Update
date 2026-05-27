"use client"

import React, { Suspense, useEffect } from "react"
import { useLanguageStore } from "@/store/language-store"
import { useCmsStore } from "@/store/cms-store"
import { Logo } from "@/components/logo"
import { Car, Utensils } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useCartStore } from "@/store/cart-store"

const MotionLink = motion.create(Link)

// FIXED: Create a component that uses client-side hooks
function HomePageContent() {
  const { t } = useLanguageStore()
  const { settings } = useCmsStore()

  const cardStyles = "relative flex flex-col items-center pmd-v2-card backdrop-blur-sm rounded-3xl p-8 sm:p-12 shadow-sm hover:shadow-xl transition duration-500 w-72 h-56 justify-center home-action-card"
  const iconContainerStyles = "rounded-full pmd-v2-action-circle p-6 mb-6 home-action-icon-wrap"

  return (
    <div className="min-h-screen bg-theme-background pmd-v2-page pmd-customer-page page--home flex flex-col items-center justify-center p-4" data-pmd-customer-page="home">
      <Logo className="mb-8" />
      
      <div className="flex flex-row flex-wrap gap-6 justify-center">
        <MotionLink 
          href="/menu"
          className="relative group"
          whileHover="hover"
          initial="initial"
          animate="animate"
        >
          <motion.div
            className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 blur transition duration-500"
            style={{ 
              background: `linear-gradient(to right, var(--theme-primary)/30, var(--theme-secondary)/30)` 
            }}
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
              style={{ backgroundColor: "var(--theme-secondary)" }}
              variants={{
                hover: { 
                  scale: 1.1,
                  backgroundColor: "var(--theme-secondary)",
                },
                initial: { 
                  scale: 1,
                  backgroundColor: "var(--theme-secondary)",
                }
              }}
            >
              <Utensils className="w-10 h-10" style={{ color: "var(--theme-text-primary)" }} />
            </motion.div>
            <h2 className="text-2xl font-medium" style={{ color: "var(--theme-text-primary)" }}>
              {t("menuCard")}
            </h2>
          </motion.div>
        </MotionLink>

        <MotionLink 
          href="/valet"
          className="relative group"
          whileHover="hover"
          initial="initial"
          animate="animate"
        >
          <motion.div
            className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 blur transition duration-500"
            style={{ 
              background: `linear-gradient(to right, var(--theme-primary)/30, var(--theme-secondary)/30)` 
            }}
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
              style={{ backgroundColor: "var(--theme-secondary)" }}
              variants={{
                hover: { 
                  scale: 1.1,
                  backgroundColor: "var(--theme-secondary)",
                },
                initial: { 
                  scale: 1,
                  backgroundColor: "var(--theme-secondary)",
                }
              }}
            >
              <Car className="w-10 h-10" style={{ color: "var(--theme-text-primary)" }} />
            </motion.div>
            <h2 className="text-2xl font-medium" style={{ color: "var(--theme-text-primary)" }}>
              {t("valetParking")}
            </h2>
          </motion.div>
        </MotionLink>
      </div>
    </div>
  )
}

// FIXED: Main component with Suspense wrapper
export default function HomePage() {
  const clearTableContext = useCartStore((s) => s.clearTableContext)

  useEffect(() => {
    clearTableContext()
  }, [clearTableContext])

  return (
    <div className="pmd-customer-page page--home" data-pmd-customer-page="home-shell">
      <Suspense fallback={
        <div className="min-h-screen bg-theme-background flex flex-col items-center justify-center p-4">
          <div className="text-center">
            <div className="text-lg" style={{ color: "var(--theme-text-primary)" }}>Loading...</div>
          </div>
        </div>
      }>
        <HomePageContent />
      </Suspense>
    </div>
  )
}
