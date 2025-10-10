"use client"

import { cn } from "@/lib/utils"
import { useLanguageStore } from "@/store/language-store"
import { LanguageSwitcher } from "./language-switcher"
import { useCmsStore } from "@/store/cms-store"
import { useThemeStore } from "@/store/theme-store"
import { useCartStore } from "@/store/cart-store"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { usePathname, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Suspense } from "react"

// FIXED: Create a component that uses useSearchParams
function LogoContent({ className, tableNumber }: { className?: string, tableNumber?: string }) {
  const { t } = useLanguageStore()
  const { settings: cmsSettings } = useCmsStore()
  const { settings: themeSettings } = useThemeStore()
  const { tableInfo } = useCartStore()
  const pathname = usePathname()
  const searchParams = useSearchParams() // This hook requires Suspense
  
  // Check if we're on main homepage or table home page
  const isMainHomePage = pathname === "/"
  const isTableHomePage = pathname.match(/^\/table\/\d+$/) // Matches /table/28, /table/31, etc.
  const isHomePage = isMainHomePage || isTableHomePage
  
  // FIXED: Get table number from cart store first (API data), then URL path, then fallbacks
  const pathTableId = pathname.match(/^\/table\/(\d+)/)?.[1] // Extract table_id from /table/34
  const urlTableId = searchParams.get("table_id")
  const displayTableNumber = tableNumber || 
    (tableInfo?.table_name) || // Use API table_name first (e.g., "table 11")
    (pathTableId ? `Table ${pathTableId}` : null) || // Then use path table_id as fallback
    (urlTableId ? `Table ${urlTableId}` : null) ||
    `Table ${themeSettings.table_number}` || 
    `Table ${cmsSettings.tableNumber}` || 
    "Table 7"
  
  // Use theme settings from admin panel, fallback to CMS settings
  const restaurantName = themeSettings.restaurant_name || cmsSettings.appName || 'PayMyDine'

  // FIXED: Determine home URL - use path table_id first, then cart store, then URL params
  const homeUrl = pathTableId || tableInfo?.table_id || urlTableId ? `/table/${pathTableId || tableInfo?.table_id || urlTableId}` : "/"

  return (
    <div className={cn("relative w-full max-w-[1200px] mx-auto px-4", className)}>
      {/* FIXED: Only show Home button when NOT on any home page */}
      {!isHomePage && (
        <div className="absolute left-2 md:left-4 top-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-[5.5rem] h-10 rounded-full text-paydine-elegant-gray hover:bg-paydine-champagne/20 px-3"
            asChild
          >
            <Link href={homeUrl} className="flex items-center justify-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-semibold">Home</span>
            </Link>
          </Button>
        </div>
      )}
      <div className="absolute right-2 md:right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="text-center">
        {(isMainHomePage || isTableHomePage) ? (
          // FIXED: Show full logo on both main homepage AND table home pages
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-4">
              <Image
                src="/images/logo.png"
                alt="PayMyDine Logo"
                fill
                className="object-contain"
                style={{ filter: 'brightness(0) saturate(100%) invert(23%) sepia(8%) saturate(1037%) hue-rotate(315deg) brightness(94%) contrast(86%)' }}
              />
            </div>
            <p className="text-lg text-paydine-elegant-gray tracking-[0.2em] uppercase font-medium bg-paydine-champagne/10 inline-block px-6 py-1 rounded-full">
              {displayTableNumber}
            </p>
          </div>
        ) : (
          // Other pages (menu, valet, etc.): Just show the table number
          <div className="flex flex-col items-center">
            <p className="text-lg text-paydine-elegant-gray tracking-[0.2em] uppercase font-medium bg-paydine-champagne/10 inline-block px-6 py-1 rounded-full">
              {displayTableNumber}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// FIXED: Main component with Suspense wrapper
export function Logo({ className, tableNumber }: { className?: string, tableNumber?: string }) {
  return (
    <Suspense fallback={
      <div className={cn("relative w-full max-w-[1200px] mx-auto px-4", className)}>
        <div className="text-center">
          <div className="flex flex-col items-center">
            <p className="text-lg text-paydine-elegant-gray tracking-[0.2em] uppercase font-medium bg-paydine-champagne/10 inline-block px-6 py-1 rounded-full">
              Loading...
            </p>
          </div>
        </div>
      </div>
    }>
      <LogoContent className={className} tableNumber={tableNumber} />
    </Suspense>
  )
}