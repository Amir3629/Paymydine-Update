"use client"

import React, { Suspense } from "react"
import { useLanguageStore } from "@/store/language-store"
import { useCmsStore } from "@/store/cms-store"
import { Logo } from "@/components/logo"
import { Car, Utensils } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

const MotionLink = motion(Link)

// FIXED: Create a component that uses client-side hooks
function HomePageContent() {
  const { t } = useLanguageStore()
  const { settings } = useCmsStore()

  const cardStyles = "relative flex flex-col items-center rounded-3xl p-8 sm:p-12 shadow-sm hover:shadow-xl transition duration-500 border w-72 h-56 justify-center"
  const iconContainerStyles = "rounded-full p-6 mb-6"

  return (
    <div className="min-h-screen bg-theme flex flex-col items-center justify-center p-4">
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
            className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-paydine-champagne/30 to-paydine-rose-beige/30 opacity-0 group-hover:opacity-100 blur transition duration-500"
            variants={{
              hover: { scale: 1.1 },
              initial: { scale: 0.9 }
            }}
          />
          <motion.div
            className={cardStyles}
            style={{ backgroundColor: 'var(--theme-start-card, rgba(255,255,255,0.8))', borderColor: 'rgba(239,199,177,0.20)' }}
            variants={{
              hover: { y: -8 },
              initial: { y: 0 }
            }}
          >
            <motion.div
              className={iconContainerStyles}
              style={{ backgroundColor: 'rgba(231,203,169,0.10)' }}
              variants={{
                hover: { 
                  scale: 1.1,
                  backgroundColor: "rgba(231,203,169,0.20)",
                },
                initial: { 
                  scale: 1,
                  backgroundColor: "rgba(231,203,169,0.10)",
                }
              }}
            >
              <Utensils className="w-10 h-10 text-paydine-elegant-gray" />
            </motion.div>
            <h2 className="text-2xl font-medium text-paydine-elegant-gray">{t("menuCard")}</h2>
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
            className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-paydine-champagne/30 to-paydine-rose-beige/30 opacity-0 group-hover:opacity-100 blur transition duration-500"
            variants={{
              hover: { scale: 1.1 },
              initial: { scale: 0.9 }
            }}
          />
          <motion.div
            className={cardStyles}
            style={{ backgroundColor: 'var(--theme-start-card, rgba(255,255,255,0.8))', borderColor: 'rgba(239,199,177,0.20)' }}
            variants={{
              hover: { y: -8 },
              initial: { y: 0 }
            }}
          >
            <motion.div
              className={iconContainerStyles}
              style={{ backgroundColor: 'rgba(231,203,169,0.10)' }}
              variants={{
                hover: { 
                  scale: 1.1,
                  backgroundColor: "rgba(231,203,169,0.20)",
                },
                initial: { 
                  scale: 1,
                  backgroundColor: "rgba(231,203,169,0.10)",
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

// FIXED: Main component with Suspense wrapper
export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-theme flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="text-lg text-paydine-elegant-gray">Loading...</div>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}