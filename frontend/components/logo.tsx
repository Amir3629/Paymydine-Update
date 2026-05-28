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
import { PmdPlatformLogo } from '@/components/pmd-platform-logo';

type SettingsResponse = {
  success?: boolean;
  site_logo?: string | null;
  site_logo_url?: string | null;
  logo_url?: string | null;
  site_name?: string | null;
  favicon_logo?: string | null;
  favicon_logo_url?: string | null;
  data?: {
    site_logo?: string | null;
    site_logo_url?: string | null;
    logo_url?: string | null;
    site_name?: string | null;
    favicon_logo?: string | null;
    favicon_logo_url?: string | null;
  } | null;
};

const toBackendAssetUrl = (rel?: string | null) => {
  if (!rel) return '';
  if (/^https?:\/\//i.test(rel)) return rel;

  const normalized = rel.startsWith('/') ? rel : `/${rel}`;
  const base = window.location.origin.replace(/\/$/, '');

  if (normalized.startsWith('/assets/media/uploads/')) {
    return `${base}${normalized}`;
  }

  if (normalized.startsWith('/storage/')) {
    return `${base}${normalized}`;
  }

  return `${base}/assets/media/uploads${normalized}`;
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
  const [logoLoadedFromSettings, setLogoLoadedFromSettings] = useState<boolean>(false)
  const [apiRestaurantName, setApiRestaurantName] = useState<string>('')
  
  // Fetch settings info on mount
  useEffect(() => {
    (async () => {
      try {
        // PMD fix: use the local Next.js /settings route.
        // That route already proxies /api/v1/settings and normalizes media URLs.
        const res = await fetch(`/settings?ts=${Date.now()}`, {
          credentials: 'omit',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) throw new Error(`settings ${res.status}`);

        const json: SettingsResponse = await res.json();

        const siteName =
          json?.site_name ||
          json?.data?.site_name ||
          'Restaurant';

        const siteLogo =
          json?.site_logo_url ||
          json?.logo_url ||
          json?.site_logo ||
          json?.data?.site_logo_url ||
          json?.data?.logo_url ||
          json?.data?.site_logo ||
          '';

        setApiRestaurantName(siteName);

        if (siteLogo) {
          setLogoUrl(toBackendAssetUrl(siteLogo));
        } else {
          console.warn('Logo: settings response has no logo field', json);
          setLogoUrl('/images/logo.png');
        }

        setLogoLoadedFromSettings(true);
      } catch (e) {
        console.warn('Logo: falling back to /images/logo.png', e);
        setLogoUrl('/images/logo.png');
        setLogoLoadedFromSettings(true);
      }
    })()
  }, [])
  
  // Check if we're on main homepage or table home page
  const isRoot = pathname === "/"
  const isMainHomePage = isRoot
  const isTableHomePage = pathname.match(/^\/table\/\d+$/) // Matches /table/28, /table/31, etc.
  const isHomePage = isMainHomePage || isTableHomePage
  
  // Delivery detection: no table context and not on a table route
  const isTableRoute = pathname.startsWith("/table/")
  const isCashier = tableInfo?.is_cashier || false
  const isDeliveryMode = !tableInfo && !isTableRoute && !isCashier
  
  // FIXED: Get table number from cart store first (API data), then URL path, then fallbacks
  const pathTableId = pathname.match(/^\/table\/(\d+)$/)?.[1]
  const urlTableId = searchParams.get('table')
  const urlTableNo = searchParams.get('table_no')
  
  // Display: Cashier → Delivery (when no table + not table route) → table logic
  const explicitTableNumber =
    tableNumber != null && String(tableNumber).trim() !== '' && String(tableNumber).trim() !== 'undefined' && String(tableNumber).trim() !== 'null'
      ? String(tableNumber).trim()
      : null

  const storeTableNo =
    tableInfo?.table_no != null && String(tableInfo.table_no).trim() !== ''
      ? String(tableInfo.table_no).trim()
      : null

  const searchTableNo =
    urlTableNo != null && String(urlTableNo).trim() !== '' && urlTableNo !== 'undefined' && urlTableNo !== 'null'
      ? String(urlTableNo).trim()
      : null

  const searchTableId =
    urlTableId != null && String(urlTableId).trim() !== '' && urlTableId !== 'undefined' && urlTableId !== 'null'
      ? String(urlTableId).trim()
      : null

  const pathTableDisplay =
    pathTableId != null && String(pathTableId).trim() !== ''
      ? String(pathTableId).trim()
      : null

  const fallbackCmsTable =
    cmsSettings?.tableNumber != null && String(cmsSettings.tableNumber).trim() !== ''
      ? String(cmsSettings.tableNumber).trim()
      : null

  const resolvedDisplayTable =
    explicitTableNumber ||
    storeTableNo ||
    searchTableNo ||
    pathTableDisplay ||
    searchTableId ||
    fallbackCmsTable

  const displayTableNumber = isCashier
    ? 'Cashier'
    : isDeliveryMode
      ? 'Delivery'
      : (resolvedDisplayTable ? `Table ${resolvedDisplayTable}` : 'Table')
  
  // Use theme settings from admin panel, fallback to CMS settings
  const restaurantName = (themeSettings as any).restaurant_name || cmsSettings.appName || 'PayMyDine'

  // FIXED: Determine home URL using saved home URL with fallback
  const homeUrl = getHomeHrefFallback({ pathParam: pathTableId, tableInfo })

  useEffect(() => {
    console.info('PMD_FRONTEND_LOGO_COMPONENT_ACTIVE', {
      pathname,
      logoUrl,
      effectiveLogoUrl: logoLoadedFromSettings ? (logoUrl || '/images/logo.png') : '',
      displayTableNumber,
    });
  }, [pathname, logoUrl, logoLoadedFromSettings, displayTableNumber])

  // PMD fix: do not render null forever. Use safe fallback until settings logo loads.
  const effectiveLogoUrl = logoLoadedFromSettings ? (logoUrl || '/images/logo.png') : '';

  return (
    <div className={cn("relative w-full", className)}>
      <div className="absolute left-2 md:left-4 top-4">
        {isHomePage ? null : (
          <Link href={homeUrl}>
            <Button variant="ghost" size="sm" className="pmd-v2-action-circle hover:opacity-90">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        )}
      </div>
      {(isMainHomePage || isTableHomePage) && (
        <div className="absolute top-[4.35rem] md:top-[4.55rem] left-1/2 -translate-x-[225px] md:-translate-x-[245px] flex h-14 items-center justify-center">
          <PmdPlatformLogo imgClassName="max-h-14 max-w-[120px] sm:max-h-16 sm:max-w-[176px]" />
        </div>
      )}
      <div
        className={cn(
          "absolute",
          (isMainHomePage || isTableHomePage)
            ? "top-[4.35rem] md:top-[4.55rem] left-1/2 translate-x-[225px] md:translate-x-[245px]"
            : "top-4 right-2 md:right-4"
        )}
      >
        <LanguageSwitcher />
      </div>
      <div className="text-center">
        {(isMainHomePage || isTableHomePage) ? (
          // FIXED: Show full logo on both main homepage AND table home pages
          <div className="flex flex-col items-center -translate-y-3">
            {/* Dynamic logo from admin settings */}
            {effectiveLogoUrl ? (
              <OptimizedImage
                src={effectiveLogoUrl}
                alt={apiRestaurantName || 'Restaurant logo'}
                width={220}
                height={64}
                priority
              
                className="-translate-y-4"/>
            ) : (
              <div aria-hidden="true" style={{ width: 220, height: 64 }} />
            )}
            <p className="text-base tracking-[0.18em] uppercase font-medium inline-block px-5 py-0.5 rounded-full pmd-v2-pill">
              {displayTableNumber}
            </p>
          </div>
        ) : (
          // Other pages (menu, valet, etc.): Just show the table number
          <div className="flex flex-col items-center">
            <p className="text-base tracking-[0.18em] uppercase font-medium inline-block px-5 py-0.5 rounded-full pmd-v2-pill">
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
