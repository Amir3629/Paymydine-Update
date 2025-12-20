'use client';

import { useEffect, useState } from 'react';
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
import { OptimizedImage } from '@/components/ui/optimized-image';
import { EnvironmentConfig } from '@/lib/environment-config';
import { buildTablePath } from '@/lib/table-url';
import { stickySearch } from '@/lib/sticky-query';
import { getHomeHrefFallback } from '@/lib/table-home-util';

type SettingsResponse = { site_logo?: string | null; site_name?: string | null };

const toUploadsUrl = (rel?: string | null) => {
  if (!rel) return '';
  const BASE = EnvironmentConfig.getInstance().backendBaseUrl(); // e.g. http://127.0.0.1:8000
  const normalized = rel.startsWith('/') ? rel : `/${rel}`;
  return `${BASE.replace(/\/$/, '')}/assets/media/uploads${normalized}`;
};

// FIXED: Create a component that uses useSearchParams
function LogoContent({ className, tableNumber }: { className?: string, tableNumber?: string }) {
  const { t } = useLanguageStore()
  const { settings: cmsSettings } = useCmsStore()
  const { settings: themeSettings } = useThemeStore()
  const { tableInfo } = useCartStore()
  const pathname = usePathname()
  const searchParams = useSearchParams() // This hook requires Suspense
  
  // Dynamic logo state
  const [logoUrl, setLogoUrl] = useState<string>('')
  const [apiRestaurantName, setApiRestaurantName] = useState<string>('')
  
  // Fetch settings info on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `${EnvironmentConfig.getInstance().backendBaseUrl().replace(/\/$/, '')}/api/v1/settings`,
          { credentials: 'omit', cache: 'no-store' }
        );
        if (!res.ok) throw new Error(`settings ${res.status}`);
        const json: SettingsResponse = await res.json();
        setApiRestaurantName(json.site_name || 'Restaurant');
        if (json.site_logo) setLogoUrl(toUploadsUrl(json.site_logo));
      } catch (e) {
        console.warn('Logo: falling back to /images/logo.png', e);
      }
    })()
  }, [])
  
  // Check if we're on main homepage or table home page
  const isMainHomePage = pathname === "/"
  const isTableHomePage = pathname.match(/^\/table\/\d+$/) // Matches /table/28, /table/31, etc.
  const isHomePage = isMainHomePage || isTableHomePage
  
  // FIXED: Get table number from cart store first (API data), then URL path, then fallbacks
  const pathTableId = pathname.match(/^\/table\/(\d+)$/)?.[1]
  const urlTableId = searchParams.get('table')
  const isCashier = tableInfo?.is_cashier || false
  
  // FIXED: Determine display table number with proper fallback chain
  const displayTableNumber = (
    // 1. If cashier mode, show "Cashier"
    isCashier ? 'Cashier' :
    // 2. If we have table info from API, use that
    (tableInfo?.table_name) ||
    // 3. If we have table ID from URL path, use that
    (pathTableId ? `Table ${pathTableId}` : null) ||
    // 4. If we have table ID from URL params, use that
    (urlTableId ? `Table ${urlTableId}` : null) ||
    // 5. Fallback to CMS settings
    `Table ${cmsSettings.tableNumber}` || 
    "Table 7"
  )
  
  // Use theme settings from admin panel, fallback to CMS settings
  const restaurantName = (themeSettings as any).restaurant_name || cmsSettings.appName || 'PayMyDine'

  // FIXED: Determine home URL using saved home URL with fallback
  const homeUrl = getHomeHrefFallback({ pathParam: pathTableId, tableInfo })

  // Don't render anything until logo is loaded to prevent flash
  if (!logoUrl) return null;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="absolute left-2 md:left-4 top-4">
        {isHomePage ? (
          <Link href={homeUrl}>
            <Button variant="ghost" size="sm" className="text-paydine-elegant-gray hover:text-paydine-rose-beige">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        ) : (
          <Link href={homeUrl}>
            <Button variant="ghost" size="sm" className="text-paydine-elegant-gray hover:text-paydine-rose-beige">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        )}
      </div>
      <div className="absolute right-2 md:right-4 top-4">
        <LanguageSwitcher />
      </div>
      <div className="text-center">
        {(isMainHomePage || isTableHomePage) ? (
          // FIXED: Show full logo on both main homepage AND table home pages
          <div className="flex flex-col items-center">
            {/* Dynamic logo from admin settings */}
            <OptimizedImage
              src={logoUrl}
              alt={apiRestaurantName || 'Restaurant logo'}
              width={220}
              height={64}
              priority
            />
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

// Wrapper component with Suspense to handle useSearchParams
export function Logo({ className, tableNumber }: { className?: string, tableNumber?: string }) {
  return (
    <Suspense fallback={null}>
      <LogoContent className={className} tableNumber={tableNumber} />
    </Suspense>
  )
}