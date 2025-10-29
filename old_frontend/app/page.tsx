"use client"

import React, { Suspense, useEffect } from "react"
import { useLanguageStore } from "@/store/language-store"
import { useCmsStore } from "@/store/cms-store"
import { Logo } from "@/components/logo"
import { Car, Utensils } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { applyTheme } from "@/lib/theme-system"

const MotionLink = motion(Link)

// FIXED: Create a component that uses client-side hooks
function HomePageContent() {
  const { t } = useLanguageStore()
  const { settings } = useCmsStore()

  const cardStyles = "relative flex flex-col items-center rounded-3xl p-8 sm:p-12 shadow-sm hover:shadow-xl transition duration-500 border w-72 h-56 justify-center surface-sub"
  const iconContainerStyles = "rounded-full p-6 mb-6"

  return (
        <div className="min-h-screen bg-theme-background flex flex-col items-center justify-center p-4">
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
              style={{ backgroundColor: 'var(--theme-cart-bg, var(--theme-input))' }}
              variants={{
                hover: { 
                  scale: 1.1,
                  backgroundColor: "var(--theme-cart-bg, var(--theme-input))",
                },
                initial: { 
                  scale: 1,
                  backgroundColor: "var(--theme-cart-bg, var(--theme-input))",
                }
              }}
            >
              <Utensils className="w-10 h-10" style={{ color: 'var(--theme-secondary)' }} />
            </motion.div>
            <h2 className="text-2xl font-medium" style={{ color: 'var(--theme-primary)' }}>
              {t("menuCard")}
              <span className="block text-sm font-normal mt-1" style={{ color: 'var(--theme-accent)' }}>
                {t("menuCardDescription") || "Browse our menu"}
              </span>
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
              style={{ backgroundColor: 'var(--theme-cart-bg, var(--theme-input))' }}
              variants={{
                hover: { 
                  scale: 1.1,
                  backgroundColor: "var(--theme-cart-bg, var(--theme-input))",
                },
                initial: { 
                  scale: 1,
                  backgroundColor: "var(--theme-cart-bg, var(--theme-input))",
                }
              }}
            >
              <Car className="w-10 h-10" style={{ color: 'var(--theme-secondary)' }} />
            </motion.div>
            <h2 className="text-2xl font-medium" style={{ color: 'var(--theme-primary)' }}>
              {t("valetParking")}
              <span className="block text-sm font-normal mt-1" style={{ color: 'var(--theme-accent)' }}>
                {t("valetParkingDescription") || "Valet service"}
              </span>
            </h2>
          </motion.div>
        </MotionLink>
      </div>
    </div>
  )
}

// FIXED: Main component with Suspense wrapper
export default function HomePage() {
  // Safety net: Force theme application on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentTheme = localStorage.getItem('paymydine-theme') || 'clean-light';
      applyTheme(currentTheme);
      
      // NUCLEAR OPTION: Directly set background colors
      const themeColors = {
        'clean-light': '#FAFAFA',
        'modern-dark': '#0A0E12',
        'gold-luxury': '#0F0B05',
        'vibrant-colors': '#e2ceb1',
        'minimal': '#CFEBF7'
      };
      
      const bgColor = themeColors[currentTheme as keyof typeof themeColors] || '#FAFAFA';
      
      // Force background on body and html
      document.body.style.background = bgColor;
      document.documentElement.style.background = bgColor;
      
      // Force background on page elements
      const pageElement = document.querySelector('.page--home .min-h-screen');
      if (pageElement) {
        (pageElement as HTMLElement).style.background = bgColor;
      }
      
      // Debug logging for verification
      console.info("HOMEPAGE THEME SAFETY NET APPLIED");
      console.log("Applied theme:", currentTheme);
      console.log("Forced background color:", bgColor);
      console.log("--theme-background:", getComputedStyle(document.documentElement).getPropertyValue('--theme-background'));
      console.log("body background:", getComputedStyle(document.body).background);
    }
  }, []);

  return (
    <div className="page--home">
      <Suspense fallback={
        <div className="min-h-screen bg-theme-background flex flex-col items-center justify-center p-4">
          <div className="text-center">
            <div className="text-lg" style={{ color: 'var(--theme-primary)' }}>Loading...</div>
          </div>
        </div>
      }>
        <HomePageContent />
      </Suspense>
    </div>
  )
}