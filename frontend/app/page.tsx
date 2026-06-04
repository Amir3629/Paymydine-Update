"use client"

import React, { Suspense, useEffect, useState } from "react"
import { useLanguageStore } from "@/store/language-store"
import { useCmsStore } from "@/store/cms-store"
import { Logo } from "@/components/logo"
import { Car, Utensils, Instagram, MapPin, Star, MessageCircle, Globe2 } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useCartStore } from "@/store/cart-store"
import { PmdPlatformLogo } from "@/components/pmd-platform-logo"

const MotionLink = motion.create(Link)

// FIXED: Create a component that uses client-side hooks
function HomePageContent() {
  const { t } = useLanguageStore()
  const { settings } = useCmsStore()
  const [platformLogoPosition, setPlatformLogoPosition] = useState<'top-left' | 'bottom-center'>('top-left')

  useEffect(() => {
    const readSavedPosition = () => {
      try {
        const saved = window.localStorage.getItem('pmd_platform_logo_position')
        if (saved === 'top-left' || saved === 'bottom-center') {
          setPlatformLogoPosition(saved)
        } else {
          setPlatformLogoPosition('top-left')
        }
      } catch {
        setPlatformLogoPosition('top-left')
      }
    }

    readSavedPosition()

    const handlePositionChange = (event: Event) => {
      const nextPosition = (event as CustomEvent<'top-left' | 'bottom-center'>).detail
      if (nextPosition === 'top-left' || nextPosition === 'bottom-center') {
        setPlatformLogoPosition(nextPosition)
      }
    }

    window.addEventListener('pmd-platform-logo-position-change', handlePositionChange as EventListener)
    return () => window.removeEventListener('pmd-platform-logo-position-change', handlePositionChange as EventListener)
  }, [])

  const cardStyles = "relative flex flex-col items-center pmd-v2-card backdrop-blur-sm rounded-3xl p-8 sm:p-12 shadow-sm hover:shadow-xl transition duration-500 w-72 h-56 justify-center home-action-card"
  const iconContainerStyles = "mb-6 pmd-home-action-icon-direct"
  const iconCircleStyle = {
    width: "7.25rem",
    height: "7.25rem",
    minWidth: "7.25rem",
    minHeight: "7.25rem",
    maxWidth: "7.25rem",
    maxHeight: "7.25rem",
    padding: 0,
    borderRadius: "9999px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#062F2A",
    backgroundColor: "#062F2A",
    backgroundImage: "none",
    color: "#FFFFFF",
    WebkitTextFillColor: "#FFFFFF",
    border: "1px solid #062F2A",
    boxShadow: "0 14px 32px rgba(6, 47, 42, 0.18)",
    overflow: "hidden",
  }
  const iconSvgStyle = {
    color: "#FFFFFF",
    stroke: "#FFFFFF",
    WebkitTextFillColor: "#FFFFFF",
  }

  return (
    <div className="min-h-screen bg-theme-background pmd-v2-page pmd-customer-page page--home flex flex-col items-center justify-start p-4 pt-8 pb-16 sm:justify-center sm:pt-4 sm:pb-8" data-pmd-customer-page="home">
      <Logo className="mb-8" />
      
      <div className="mt-10 flex flex-row flex-wrap gap-6 justify-center sm:mt-0">
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
              background: "transparent" 
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
              style={iconCircleStyle}
              style={{ backgroundColor: "var(--theme-primary)" }}
              variants={{
                hover: { 
                  scale: 1.1,
                  backgroundColor: "var(--theme-primary)",
                },
                initial: { 
                  scale: 1,
                  backgroundColor: "var(--theme-primary)",
                }
              }}
            >
              <Utensils className="w-12 h-12" strokeWidth={2.35} style={iconSvgStyle} />
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
              background: "transparent" 
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
              style={iconCircleStyle}
              style={{ backgroundColor: "var(--theme-primary)" }}
              variants={{
                hover: { 
                  scale: 1.1,
                  backgroundColor: "var(--theme-primary)",
                },
                initial: { 
                  scale: 1,
                  backgroundColor: "var(--theme-primary)",
                }
              }}
            >
              <Car className="w-12 h-12" strokeWidth={2.35} style={iconSvgStyle} />
            </motion.div>
            <h2 className="text-2xl font-medium" style={{ color: "var(--theme-text-primary)" }}>
              {t("valetParking")}
            </h2>
          </motion.div>
        </MotionLink>
      </div>

      <div
        data-pmd-home-social-icons="1"
        className="PMD_HOME_SOCIAL_ICONS_20260601 fixed bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center justify-center gap-3"
        aria-label="Restaurant social and review links"
      >
        {[
          { label: "Instagram", icon: Instagram },
          { label: "Google Maps", icon: MapPin },
          { label: "Trustpilot", icon: Star },
          { label: "Reviews", icon: MessageCircle },
          { label: "Website", icon: Globe2 },
        ].map(({ label, icon: Icon }) => (
          <motion.a
            key={label}
            href="#"
            aria-label={label}
            title={label}
            onClick={(event) => event.preventDefault()}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur-md"
            style={{
              background: "rgba(255, 255, 255, 0.72)",
              borderColor: "rgba(6, 47, 42, 0.22)",
              color: "#062F2A",
              boxShadow: "0 10px 26px rgba(6, 47, 42, 0.10)",
            }}
          >
            <Icon className="h-4.5 w-4.5" strokeWidth={2.3} />
          </motion.a>
        ))}
      </div>

      {platformLogoPosition === 'bottom-center' && (
        <div className="mt-8 flex w-full justify-center pb-2 sm:mt-10">
          <PmdPlatformLogo imgClassName="max-h-16 max-w-[150px] sm:max-h-20 sm:max-w-[220px]" />
        </div>
      )}
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
