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
  const [platformLogoPosition, setPlatformLogoPosition] = useState<'top-left' | 'bottom-center'>('top-left')
  const [isPlatformLogoMenuOpen, setIsPlatformLogoMenuOpen] = useState(false)

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

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('pmd_platform_logo_position')
      if (saved === 'top-left' || saved === 'bottom-center') {
        setPlatformLogoPosition(saved)
      }
    } catch (e) {
      console.warn('Logo: unable to read PMD platform logo position', e)
    }
  }, [])

  function updatePlatformLogoPosition(position: 'top-left' | 'bottom-center') {
    setPlatformLogoPosition(position)
    setIsPlatformLogoMenuOpen(false)

    try {
      window.localStorage.setItem('pmd_platform_logo_position', position)
      window.dispatchEvent(new CustomEvent('pmd-platform-logo-position-change', { detail: position }))
    } catch (e) {
      console.warn('Logo: unable to save PMD platform logo position', e)
    }
  }

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
      {(isMainHomePage || isTableHomePage) && platformLogoPosition === 'top-left' && (
        <div className="absolute left-2 top-16 z-10 flex h-16 items-center justify-center sm:left-4 sm:top-20 md:left-1/2 md:top-[2.75rem] md:-translate-x-[430px]">
          <PmdPlatformLogo imgClassName="max-h-16 max-w-[150px] sm:max-h-24 sm:max-w-[230px] md:max-w-[260px]" />
        </div>
      )}
      <div
        className={cn(
          "absolute z-20",
          (isMainHomePage || isTableHomePage)
            ? "right-2 top-16 flex h-16 items-center sm:right-4 sm:top-20 md:right-auto md:left-1/2 md:top-[2.75rem] md:h-auto md:translate-x-[430px]"
            : "top-4 right-2 md:right-4"
        )}
      >
        <LanguageSwitcher />
      </div>
      {(isMainHomePage || isTableHomePage) && (
        <div className="fixed bottom-3 right-3 z-30 sm:bottom-4 sm:right-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsPlatformLogoMenuOpen((value) => !value)}
              className="rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur"
              style={{
                background: 'color-mix(in srgb, var(--theme-surface) 92%, transparent)',
                borderColor: 'var(--theme-border)',
                color: 'var(--theme-text-primary)',
              }}
              aria-label="Logo placement"
              aria-expanded={isPlatformLogoMenuOpen}
            >
              Logo
            </button>
            {isPlatformLogoMenuOpen && (
              <div
                className="absolute bottom-full right-0 mb-2 w-36 overflow-hidden rounded-2xl border p-1 text-xs shadow-lg"
                style={{
                  background: 'var(--theme-surface)',
                  borderColor: 'var(--theme-border)',
                  color: 'var(--theme-text-primary)',
                }}
              >
                <button
                  type="button"
                  onClick={() => updatePlatformLogoPosition('top-left')}
                  className="block w-full rounded-xl px-3 py-2 text-left font-medium"
                  style={{ background: platformLogoPosition === 'top-left' ? 'var(--theme-secondary)' : 'transparent' }}
                >
                  Top left
                </button>
                <button
                  type="button"
                  onClick={() => updatePlatformLogoPosition('bottom-center')}
                  className="block w-full rounded-xl px-3 py-2 text-left font-medium"
                  style={{ background: platformLogoPosition === 'bottom-center' ? 'var(--theme-secondary)' : 'transparent' }}
                >
                  Bottom center
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="text-center">
        {(isMainHomePage || isTableHomePage) ? (
          // FIXED: Show full logo on both main homepage AND table home pages
          <div className="flex flex-col items-center -translate-y-2 sm:-translate-y-3">
            {/* Dynamic logo from admin settings */}
            {effectiveLogoUrl ? (
              <OptimizedImage
                src={effectiveLogoUrl}
                alt={apiRestaurantName || 'Restaurant logo'}
                width={190}
                height={55}
                priority
                className="-translate-y-2 h-auto max-w-[190px] object-contain sm:max-w-[220px] md:max-w-[260px]"/>
            ) : (
              <div aria-hidden="true" style={{ width: 220, height: 64 }} />
            )}
            <p className="mt-5 sm:mt-0 text-base tracking-[0.18em] uppercase font-medium inline-block px-5 py-0.5 rounded-full pmd-v2-pill">
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
