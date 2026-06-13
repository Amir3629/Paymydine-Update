"use client"

import { ModernGreenBridgeTheme } from "@/components/themes/modern-green/ModernGreenBridgeTheme"
import { ModernGreenCheckoutShell } from "@/components/themes/modern-green/ModernGreenCheckoutShell"
import { KazenJapaneseBridgeTheme, KazenJapaneseCheckoutShell } from "@/components/themes/kazen-japanese"

import { PayPalScriptProvider } from "@paypal/react-paypal-js"
import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, Suspense } from "react";
import { formatCurrency } from "@/lib/currency";
import { categories, menuData, type MenuItem, type MenuHighlightSettings, defaultMenuHighlightSettings, getMenuData, getCategories } from "@/lib/data";
import { useLanguageStore } from "@/store/language-store";
import { type TranslationKey } from "@/lib/translations";
import { type PmdSocialPlatformId, useCmsStore } from "@/store/cms-store";
import { useCartStore, type CartItem } from "@/store/cart-store";
import { Logo } from "@/components/logo";
import { CartSheet } from "@/components/cart-sheet";
import { CategoryNav } from "@/components/category-nav";
import { FoodAttributeTags } from "@/components/food-attribute-tags";
import { FoodNutritionSummary } from "@/components/food-nutrition-summary";
import { FoodItemColorDot } from "@/components/food-item-color-dot";
import { MenuItemModal } from "@/components/menu-item-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { HandPlatter, NotebookPen, ShoppingCart, ChevronUp, ChevronDown, Plus, Wallet, Lock, Users, Check, Minus, CreditCard, ArrowLeft, CheckCircle, DollarSign, ReceiptText, ArrowRight, Star, Link2, QrCode, MessageSquare, ChefHat, Trophy } from "lucide-react";
import { OptimizedImage } from "@/components/ui/optimized-image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Elements, useStripe, useElements, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import { loadStripe } from "@stripe/stripe-js";
import { cn, truncateText } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { ApiClient, type PaymentMethod, type TableOrderDraftResponse } from "@/lib/api-client";
import { iconForPayment } from "@/lib/payment-icons";
import { PayPalForm, WorldlineInlineCardForm } from "@/components/payment/secure-payment-form";
import { StripeCardPaymentSection } from "@/features/checkout/payment/StripeCardPaymentSection";
import SumUpHostedCheckout from "@/components/payment/sumup-hosted-checkout";
import { buildTablePath } from "@/lib/table-url";
import { stickySearch } from "@/lib/sticky-query";
import { GoldCheckoutButton, GoldNoteButton, GoldTableOrderButton, GoldWaiterButton } from "@/components/themes/gold-luxury/GoldThemeActions";
import {
  OrganicCheckoutScopedStyles,
  organicCheckoutBodyStyle,
  organicCheckoutHeaderStyle,
  organicCheckoutModalStyle,
  organicCheckoutPrimaryButtonStyle,
} from "@/components/themes/organic-botanical-paper/OrganicCheckoutShell";
import { ThemeActionBoundary, useThemeMenuActions } from "@/components/themes/shared/ThemeActionBoundary";
import { KazenBottomDock } from "@/components/themes/kazen-japanese/KazenBottomDock";
import { ModernGreenBottomDock } from "@/components/themes/modern-green/ModernGreenBottomDock";
import { OrganicBottomDock } from "@/components/themes/organic-botanical-paper/OrganicBottomDock";
import { GoldBottomDock } from "@/components/themes/gold-luxury/GoldBottomDock";
import { CheckoutIconFrame, CheckoutStepCard, CheckoutSummaryCard, OrderStatusCard, PaymentCardFrame, PaymentMethodTile, SplitBillPanel, SplitMethodButton, ThemedButton, ThemedInput, TipCouponPanel } from "@/components/theme-ui";
import { useTableOrderDraft } from "@/features/table-order/use-table-order-draft";
import { useTableOrderActions } from "@/features/table-order/use-table-order-actions";
import { createThemeMenuActions } from "@/features/menu/theme-menu-actions";
import { buildTableOrderDraftContext, createSubmittedTableOrderSnapshot, isVisibleTableOrderDraft, tableOrderItemCount } from "@/features/table-order/table-order-utils";
import {
  buildEvenSharePercents,
  calculateCartPricingSummary,
  calculateCheckoutTax,
  calculateSplitSubtotal,
  getOrderItemUnitAmount,
  groupOrderDisplayItems,
  tableOrderTotalByCode,
  tableOrderVatPercentage,
  toPositiveAmount,
} from "@/features/checkout/checkout-utils";
import {
  getCheckoutStepAfterBack,
  getCheckoutStepAfterDraftSubmit,
  getCheckoutStepAfterOrderSubmit,
  getCheckoutStepAfterPaymentSuccess,
  getCheckoutStepForSplitMethod,
  getCheckoutStepOnOpen,
  getInitialCheckoutStep,
  isSplitCheckoutStep,
  shouldForcePersonalReview,
} from "@/features/checkout/checkout-state-utils";
import {
  calculateCouponDiscount,
  calculateFinalTotal,
  calculateOrderStatusTotal,
  calculatePaidSnapshotTotals,
  calculatePayableTotal,
  calculatePaymentSummary,
  calculateSubmittedBaseTotal,
  calculateTipAmount,
} from "@/features/checkout/payment-summary-utils";
import {
  buildEqualSplitPeople,
  buildItemSplitPeople,
  buildShareSplitPeople,
  buildSplitGuestProfiles,
  calculateSplitConfirmationState,
  getActiveSplitPeople,
  getSelectedSplitPerson,
  getSplitGuestAvatar as getSplitGuestAvatarFromProfiles,
  normalizeSharePercentsForGuestCount,
  pruneItemAssignmentsForGuestCount,
} from "@/features/checkout/split-bill-utils";
import {
  canRenderPaymentMethodDetail,
  findPaymentMethod,
  getPaymentMethodProviderCode,
  getVisiblePaymentMethods,
  isPaymentMethodAvailable,
  isStripePaymentMethodForConfig,
  mapPaymentMethodsByCode,
} from "@/features/checkout/payment-method-utils";
import type {
  CheckoutStep,
  PmdToolbarPricingSnapshot,
  SplitBillItem,
  SplitMethod,
  SplitPerson,
  SplitSourceItem,
} from "@/features/checkout/types";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"


// PMD_REMOVE_CODEX_ORGANIC_THEME_20260607
// Organic Botanical Paper now uses the exact v0 standalone frontend.
// These local placeholders keep the old Codex organic UI out of the build path.
const ORGANIC_BOTANICAL_THEME_KEY = "organic_botanical_paper"
const organicBotanicalVars = (): React.CSSProperties => ({})
const OrganicBotanicalHero = (_props: any) => <OrganicExactV0Frame />
const OrganicBotanicalCategoryNav = (_props: any) => null
const OrganicBotanicalMenuCard = (_props: any) => null

const hasCheckoutThemeRoot = () =>
  typeof document !== "undefined" && Boolean(document.querySelector('[data-pmd-checkout-theme-root="1"]'))

// PMD_ORGANIC_EXACT_FRAME_COMPONENT_20260607
function OrganicExactV0Frame() {
  const [frameSrc, setFrameSrc] = React.useState("/dev/botanical-v0-exact/")

  React.useEffect(() => {
    if (typeof window === "undefined") return

    const params = new URLSearchParams()
    params.set("embed", "1")
    params.set("parentPath", window.location.pathname)
    params.set("parentSearch", window.location.search || "")
    params.set("host", window.location.host)
    params.set("ts", String(Date.now()))
    params.set("hideDock", "1")

    setFrameSrc(`/dev/botanical-v0-exact/?${params.toString()}`)
  }, [])

  return (
    <div className="fixed inset-0 z-[1] bg-[#f6efe2]">
      <iframe
        title="Organic Botanical Paper Menu"
        src={frameSrc}
        className="h-screen w-full border-0"
        style={{ width: "100%", height: "100vh", border: 0, display: "block" }}
      />
    </div>
  )
}

// Hook to get current theme background color
/* PMD_REMOTE_CONSOLE_INJECTED */

/* PMD_DEEP_WALLET_INVESTIGATION */
function __pmdWalletDebugInstallOnce() {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.__PMD_WALLET_DEBUG_INSTALLED) return;
  w.__PMD_WALLET_DEBUG_INSTALLED = true;

  const post = async (payload: any) => {
    try {
      await fetch("/api/debug/client-log", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          level: payload.level || "info",
          message: payload.message || "wallet-debug",
          data: payload.data || null,
          href: window.location.href,
          ts: new Date().toISOString(),
        }),
      });
    } catch {}
  };

  w.__PMD_WALLET_POST = post;

  window.addEventListener("error", (ev) => {
    post({
      level: "error",
      message: "WINDOW_ERROR",
      data: {
        message: ev.message,
        filename: ev.filename,
        lineno: ev.lineno,
        colno: ev.colno,
        error: ev.error ? {
          name: ev.error.name,
          message: ev.error.message,
          stack: ev.error.stack,
        } : null,
      }
    });
  });

  window.addEventListener("unhandledrejection", (ev: any) => {
    const reason = ev?.reason;
    post({
      level: "error",
      message: "UNHANDLED_REJECTION",
      data: {
        reasonType: typeof reason,
        reason: reason && typeof reason === "object"
          ? {
              name: reason.name,
              message: reason.message,
              stack: reason.stack,
            }
          : String(reason),
      }
    });
  });

  post({
    level: "info",
    message: "WALLET_DEBUG_INSTALLED",
    data: {
      ua: navigator.userAgent,
      href: window.location.href,
    }
  });
}

function __pmdRemoteConsoleInstallOnce() {

  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.__PMD_REMOTE_CONSOLE_INSTALLED) return;
  w.__PMD_REMOTE_CONSOLE_INSTALLED = true;

  try {
    const url = new URL(window.location.href);
    const enabled = url.searchParams.get("debug") === "1";
    if (!enabled) return;

    const endpoint = "/api/debug/client-log";

    const send = async (level: string, args: any[]) => {
      try {
        const message = args
          .map(a => {
            try { return typeof a === "string" ? a : JSON.stringify(a); }
            catch { return String(a); }
          })
          .join(" ");
        await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            level,
            message,
            data: args,
            href: window.location.href,
            ts: new Date().toISOString(),
          }),
        });
      } catch {}
    };

    const origLog = console.log.bind(console);
    const origWarn = console.warn.bind(console);
    const origErr = console.error.bind(console);

    console.log = (...args: any[]) => { origLog(...args); void send("log", args); };
    console.warn = (...args: any[]) => { origWarn(...args); void send("warn", args); };
    console.error = (...args: any[]) => { origErr(...args); void send("error", args); };

    window.addEventListener("error", (ev: any) => {
      void send("error", ["window.error", ev?.message, ev?.filename, ev?.lineno, ev?.colno]);
    });

    window.addEventListener("unhandledrejection", (ev: any) => {
      void send("error", ["unhandledrejection", String(ev?.reason || "")]);
    });

    origLog("[PMD] Remote console enabled (?debug=1)");
  } catch {}
}

type CurrentFrontendThemeState = {
  themeId: string | null
  isResolved: boolean
}

function useCurrentFrontendTheme(): CurrentFrontendThemeState {
  const [themeState, setThemeState] = useState<CurrentFrontendThemeState>({
    themeId: null,
    isResolved: false,
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    const readTheme = () => {
      const nextTheme = document.documentElement.getAttribute('data-theme')
      const resolved = document.documentElement.getAttribute('data-pmd-theme-resolved') === '1'

      setThemeState({
        themeId: nextTheme || null,
        // A cached Organic value is safe to use immediately because it prevents
        // the legacy Gold fallback from rendering before the admin theme call completes.
        isResolved: resolved || nextTheme === ORGANIC_BOTANICAL_THEME_KEY,
      })
    }
    readTheme()
    const observer = new MutationObserver(readTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-pmd-theme-resolved'] })
    return () => observer.disconnect()
  }, [])

  return themeState
}

function useThemeBackgroundColor() {
  const [color, setColor] = useState('#fdf7f4');
  const [themeId, setThemeId] = useState('clean-light');

  // __PMD_CALL_LMS__
  const callLoadMerchantSettings = () => {
    try {
      // Prefer destructured function (reactive)
      if (typeof loadMerchantSettings === "function") return loadMerchantSettings()
      // Fallback: zustand getState (should always exist client-side)
      const st: any = (useCmsStore as any)?.getState?.()
      if (typeof st?.loadMerchantSettings === "function") return st.loadMerchantSettings()
      console.warn("[PMD] loadMerchantSettings is missing from store")
    } catch (e) {
      console.error("[PMD] callLoadMerchantSettings failed:", e)
    }
  }



  useEffect(() => {
    // Load merchant settings (includes PayPal Client ID) from backend
    callLoadMerchantSettings()
  }, [])

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const updateColor = () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'clean-light';
      const themeBg = getComputedStyle(document.documentElement).getPropertyValue('--theme-background').trim();

      // Special case: Clean Light theme uses black text
      if (currentTheme === 'clean-light') {
        setColor('#000000');
      } else if (currentTheme === 'minimal') {
        setColor('#CFEBF7'); // Light Blue
      } else {
        setColor(themeBg || '#fdf7f4');
      }
      setThemeId(currentTheme);
    };

    updateColor();

    // Watch for theme changes
    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => observer.disconnect();
  }, []);

  return color;
}
import { clsx } from "clsx";
import { apiClient } from '@/lib/api-client'
import { wsClient } from '@/lib/websocket-client'
import { ActionTooltip } from "@/components/action-tooltip"
import { getTextAlignClass, getTextDirection } from "@/lib/text-direction"
import { TenantSetupSplash } from "@/components/tenant-setup-splash"


// PMD_MENU_FOOTER_LOGO_RUNTIME_FINAL_20260611
function pmdInstallMenuPayMyDineFooterLogo() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {}

  const lightLogo = "/assets/media/uploads/PMD.png?v=1780008763"
  const darkLogo = "/assets/media/uploads/PMDD.png?v=1780008763"
  const footerSelector = '[data-pmd-menu-footer-logo="1"], .pmd-menu-theme-footer-logo, .pmd-shared-paymydine-footer-logo, [data-pmd-shared-footer-logo="1"]'

  const readThemeText = () => {
    const chunks: string[] = []

    try {
      chunks.push(document.documentElement.getAttribute("data-theme") || "")
      chunks.push(document.body.getAttribute("data-theme") || "")
      chunks.push(document.documentElement.className || "")
      chunks.push(document.body.className || "")

      for (const storage of [window.localStorage, window.sessionStorage]) {
        for (let i = 0; i < storage.length; i += 1) {
          const key = storage.key(i) || ""
          if (!/theme|paymydine/i.test(key)) continue
          chunks.push(key)
          chunks.push(storage.getItem(key) || "")
        }
      }
    } catch {}

    return chunks.join(" ").toLowerCase()
  }

  const isKazen = () => {
    const text = readThemeText()
    return (
      text.includes("kazen") ||
      Boolean(document.querySelector("#pmd-kazen-japanese-frame, .kazen-page"))
    )
  }

  const isModernOrOrganic = () => {
    const text = readThemeText()

    if (
      text.includes("modern_green") ||
      text.includes("modern-green") ||
      text.includes("organic_botanical_paper") ||
      text.includes("organic-botanical") ||
      text.includes("botanical")
    ) {
      return true
    }

    return Boolean(
      document.querySelector(
        '[class*="modern-green"], [class*="modernGreen"], [data-pmd-mg-button-v2], [data-pmd-modern], [class*="organic"], [class*="botanical"], [data-pmd-organic]'
      )
    )
  }

  const isDarkMode = () => {
    try {
      if (
        document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark") ||
        document.documentElement.getAttribute("data-mode") === "dark" ||
        document.body.getAttribute("data-mode") === "dark" ||
        document.documentElement.getAttribute("data-color-mode") === "dark" ||
        document.body.getAttribute("data-color-mode") === "dark"
      ) {
        return true
      }

      const bg =
        window.getComputedStyle(document.body).backgroundColor ||
        window.getComputedStyle(document.documentElement).backgroundColor ||
        ""

      const nums = bg.match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number) || []
      if (nums.length >= 3) {
        const brightness = (nums[0] * 299 + nums[1] * 587 + nums[2] * 114) / 1000
        return brightness < 92
      }
    } catch {}

    return false
  }

  const ensureStyle = () => {
    if (document.getElementById("pmd-menu-footer-logo-style")) return

    const style = document.createElement("style")
    style.id = "pmd-menu-footer-logo-style"
    style.textContent = `
      .pmd-menu-theme-footer-logo {
        width: 100% !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        margin: 72px auto 132px !important;
        padding: 0 16px !important;
        opacity: 1 !important;
        filter: none !important;
        pointer-events: none !important;
        position: relative !important;
        z-index: 1 !important;
      }

      .pmd-menu-theme-footer-logo img {
        display: block !important;
        width: 82px !important;
        max-width: 82px !important;
        min-width: 82px !important;
        height: auto !important;
        object-fit: contain !important;
        opacity: 1 !important;
        filter: none !important;
        mix-blend-mode: normal !important;
      }

      @media (max-width: 640px) {
        .pmd-menu-theme-footer-logo {
          margin-top: 64px !important;
          margin-bottom: 126px !important;
        }

        .pmd-menu-theme-footer-logo img {
          width: 74px !important;
          max-width: 74px !important;
          min-width: 74px !important;
        }
      }
    `
    document.head.appendChild(style)
  }

  const getTarget = () => {
    return (
      document.querySelector<HTMLElement>('main') ||
      document.querySelector<HTMLElement>('#__next') ||
      document.body
    )
  }

  let running = false

  const ensure = () => {
    if (running) return

    running = true
    window.requestAnimationFrame(() => {
      running = false

      ensureStyle()

      const target = getTarget()
      if (!target) return

      const shouldShow = !isKazen() && isModernOrOrganic()

      if (!shouldShow) {
        document.querySelectorAll(footerSelector).forEach((el) => el.remove())
        return
      }

      const desiredSrc = isDarkMode() ? darkLogo : lightLogo

      let footer = target.querySelector<HTMLElement>('[data-pmd-menu-footer-logo="1"]')

      document.querySelectorAll(footerSelector).forEach((el) => {
        if (el !== footer) el.remove()
      })

      if (!footer) {
        footer = document.createElement("div")
        footer.className = "pmd-menu-theme-footer-logo"
        footer.setAttribute("data-pmd-menu-footer-logo", "1")

        const img = document.createElement("img")
        img.alt = "PayMyDine"
        img.src = desiredSrc
        footer.appendChild(img)

        target.appendChild(footer)
        return
      }

      const img = footer.querySelector("img") || document.createElement("img")
      img.alt = "PayMyDine"
      if (!img.parentElement) footer.appendChild(img)

      if (!img.getAttribute("src")?.includes(desiredSrc)) {
        img.setAttribute("src", desiredSrc)
      }

      if (target.lastElementChild !== footer) {
        target.appendChild(footer)
      }
    })
  }

  ensure()

  const timers = [
    window.setTimeout(ensure, 250),
    window.setTimeout(ensure, 900),
    window.setTimeout(ensure, 1800),
    window.setTimeout(ensure, 3200),
  ]

  const observer = new MutationObserver(ensure)
  observer.observe(document.body, { childList: true, subtree: true })

  window.addEventListener("storage", ensure)
  window.addEventListener("resize", ensure)

  return () => {
    timers.forEach((timer) => window.clearTimeout(timer))
    observer.disconnect()
    window.removeEventListener("storage", ensure)
    window.removeEventListener("resize", ensure)
  }
}


function pmdForceKazenFrontendThemePayload(payload: any) {
  if (!payload || typeof payload !== "object") return payload

  const normalize = (value: any) => String(value || "").trim().replace(/-/g, "_").toLowerCase()
  const topAdmin = normalize(payload.admin_theme)
  const nestedAdmin = normalize(payload.data?.admin_theme)
  const topFrontend = normalize(payload.frontend_theme)
  const nestedFrontend = normalize(payload.data?.frontend_theme)

  const hasKazen =
    topAdmin === "kazen_japanese" ||
    nestedAdmin === "kazen_japanese" ||
    topFrontend === "kazen_japanese" ||
    nestedFrontend === "kazen_japanese"

  if (hasKazen) {
    payload.admin_theme = "kazen_japanese"
    payload.frontend_theme = "kazen_japanese"
    payload.theme_id = "kazen_japanese"
    if (payload.data && typeof payload.data === "object") {
      payload.data.admin_theme = "kazen_japanese"
      payload.data.frontend_theme = "kazen_japanese"
      payload.data.theme_id = "kazen_japanese"
    }
  }

  return payload
}

// PMD_EMERGENCY_SPLITMETHOD_SCOPE_FALLBACK
// Prevents legacy/out-of-scope injected UI code from crashing the menu page.
// Real split state inside PaymentModal still shadows this fallback.
const MODERN_GREEN_THEME_KEY = "modern_green"
const KAZEN_JAPANESE_THEME_KEY = "kazen_japanese"


// PMD_FIX_KAZEN_PARENT_STABLE_CATEGORIES_20260613
// Kazen iframe must receive the full admin category list.
// Never let later cache refresh/scroll sync shrink categories.
let pmdKazenParentStableCategories: string[] = []

function pmdKazenParentCategoryKey(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase()
}

// PMD_FIX_KAZEN_CATEGORY_ORDER_HARD_20260613

function pmdKazenKnownCategoryRank(value: unknown) {
  const order = [
    "all",
    "appetizer",
    "breakfast & brunch",
    "test",
    "appetizers",
    "specials",
    "desserts",
    "main course",
    "drinks",
  ]

  const key = String(value || "").trim().replace(/\s+/g, " ").toLowerCase()
  const index = order.indexOf(key)
  return index >= 0 ? index : 1000
}

// PMD_FIX_KAZEN_FORCE_EXPECTED_CATEGORIES_20260613
function pmdKazenExpectedCategoryLabels() {
  // PMD_FIX_KAZEN_BACKEND_CATEGORIES_ONLY_20260613
  // No hardcoded Kazen categories. Categories must come from backend/admin only.
  return [] as string[]
}

function pmdKazenSortKnownCategories(categories: string[]) {
  // PMD_FIX_KAZEN_BACKEND_CATEGORIES_ONLY_20260613
  // Preserve backend/admin order. Do not force Japanese demo categories.
  const incoming = Array.isArray(categories)
    ? categories.map((cat) => String(cat || "").trim()).filter(Boolean)
    : []

  const demoFallbackKeys = new Set(["omakase", "sushi", "grill"])
  const hasRealBackendCategories = incoming.some((cat) => {
    const key = pmdKazenParentCategoryKey(cat)
    return key && key !== "all" && !demoFallbackKeys.has(key)
  })

  const seen = new Set<string>()
  const next: string[] = []

  incoming.forEach((cat) => {
    const label = String(cat || "").trim()
    const key = pmdKazenParentCategoryKey(label)
    if (!key || seen.has(key)) return

    // When real backend categories exist, never keep demo fallback labels.
    if (hasRealBackendCategories && demoFallbackKeys.has(key)) return

    seen.add(key)
    next.push(label)
  })

  return next
}


// PMD_FIX_KAZEN_PARENT_DEEP_CATEGORY_EXTRACT_20260613
function pmdKazenCategoryLabelFromAny(value: any): string {
  if (value == null) return ""

  if (typeof value === "string" || typeof value === "number") {
    return String(value || "").trim()
  }

  if (typeof value === "object") {
    const direct =
      value.name ??
      value.title ??
      value.label ??
      value.category ??
      value.category_name ??
      value.categoryName ??
      value.menu_category ??
      value.menuCategory ??
      value.group ??
      value.group_name ??
      value.display_name ??
      ""

    if (direct && typeof direct !== "object") return String(direct).trim()

    if (direct && typeof direct === "object") {
      return pmdKazenCategoryLabelFromAny(direct)
    }
  }

  return ""
}

function pmdKazenPushUniqueCategory(target: string[], value: any) {
  const label = pmdKazenCategoryLabelFromAny(value)
  if (!label || label === "[object Object]") return

  const key = pmdKazenParentCategoryKey(label)
  if (!key) return
  if (target.some((existing) => pmdKazenParentCategoryKey(existing) === key)) return

  target.push(label)
}

function pmdKazenExtractCategoryList(value: any): string[] {
  const found: string[] = []

  if (Array.isArray(value)) {
    value.forEach((entry) => pmdKazenPushUniqueCategory(found, entry))
  } else {
    pmdKazenPushUniqueCategory(found, value)
  }

  return found
}

function pmdKazenExtractCategoriesFromItem(item: any): string[] {
  const found: string[] = []
  if (!item || typeof item !== "object") return found

  const candidates = [
    item.category,
    item.category_name,
    item.categoryName,
    item.menu_category,
    item.menuCategory,
    item.category_title,
    item.categoryTitle,
    item.group,
    item.group_name,
    item.department,
    item.section,
    item.menu?.category,
    item.menu?.category_name,
    item.meta?.category,
    item.metadata?.category,
  ]

  candidates.forEach((value) => {
    pmdKazenExtractCategoryList(value).forEach((cat) => pmdKazenPushUniqueCategory(found, cat))
  })

  if (Array.isArray(item.categories)) {
    item.categories.forEach((value: any) => {
      pmdKazenExtractCategoryList(value).forEach((cat) => pmdKazenPushUniqueCategory(found, cat))
    })
  }

  return found
}

function pmdKazenExtractCategoriesFromItems(items: unknown[]): string[] {
  const found: string[] = []

  if (!Array.isArray(items)) return found

  items.forEach((item: any) => {
    pmdKazenExtractCategoriesFromItem(item).forEach((cat) => pmdKazenPushUniqueCategory(found, cat))
  })

  return found
}


function pmdReadKazenCachedCategoriesFromStorage() {
  if (typeof window === "undefined") return [] as string[]

  const found: string[] = []

  const scanStorage = (storage: Storage) => {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i) || ""
      if (!/pmd-menu-cache|menu-cache|categories|paymydine|cms/i.test(key)) continue

      const raw = storage.getItem(key)
      if (!raw) continue

      try {
        const parsed = JSON.parse(raw)

        const categoryCandidates = [
          parsed?.categories,
          parsed?.categoryNames,
          parsed?.data?.categories,
          parsed?.data?.categoryNames,
          parsed?.state?.categories,
          parsed?.state?.categoryNames,
          parsed?.settings?.categories,
          parsed?.state?.settings?.categories,
        ]

        categoryCandidates.forEach((value) => {
          pmdKazenExtractCategoryList(value).forEach((cat) => pmdKazenPushUniqueCategory(found, cat))
        })

        const itemCandidates = [
          parsed?.items,
          parsed?.menuItems,
          parsed?.products,
          parsed?.data?.items,
          parsed?.data?.menuItems,
          parsed?.data?.products,
          parsed?.state?.items,
          parsed?.state?.menuItems,
          parsed?.state?.products,
          parsed?.menu?.items,
          parsed?.menu?.menuItems,
        ]

        itemCandidates.forEach((value) => {
          if (!Array.isArray(value)) return
          pmdKazenExtractCategoriesFromItems(value).forEach((cat) => pmdKazenPushUniqueCategory(found, cat))
        })
      } catch {}
    }
  }

  try { scanStorage(window.localStorage) } catch {}
  try { scanStorage(window.sessionStorage) } catch {}

  return found
}

function pmdBuildKazenParentCategories(baseCategories: unknown, items: unknown[]) {
  const base = pmdKazenExtractCategoryList(baseCategories)

  const fromItems = pmdKazenExtractCategoriesFromItems(Array.isArray(items) ? items : [])

  const fromStorage = pmdReadKazenCachedCategoriesFromStorage()

  // PMD_FIX_KAZEN_PARENT_CATEGORY_ORDER_20260613
  // Preserve the live/admin category order first.
  // Use previous/storage/items only to append missing categories, never to reorder the list.
  const preferredOrder = base.length ? base : fromItems
  const appendOnly = [
    ...preferredOrder,
    ...pmdKazenParentStableCategories,
    ...fromStorage,
    ...fromItems,
  ]

  const seen = new Set<string>()
  const next: string[] = []

  appendOnly.forEach((cat) => {
    const label = String(cat || "").trim()
    const key = pmdKazenParentCategoryKey(label)
    if (!key || seen.has(key)) return
    seen.add(key)
    next.push(label)
  })

  // Never shrink. If incoming list is shorter, keep old list order.
  // But if incoming base has same/more categories, it becomes the new preferred order.
  if (
    next.length > pmdKazenParentStableCategories.length ||
    (base.length && next.length === pmdKazenParentStableCategories.length)
  ) {
    pmdKazenParentStableCategories = pmdKazenSortKnownCategories(next)
  }

  return pmdKazenSortKnownCategories(pmdKazenParentStableCategories.length ? pmdKazenParentStableCategories : next)
}

const splitMethod = "equal" as const


/* WALLET_STRIPE_PAY_COMPONENT */
function WalletStripePay(props: {
  method: "apple_pay" | "google_pay";
  amount: number;
  currency: string;
  countryCode?: string;

  restaurantId: string | number;
  cartId?: string | number | null;
  userId?: string | number | null;
  items?: any[];
  customerInfo?: any;
  tableNumber?: string | number | null;
  onSuccess: (paymentIntentId: string) => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  try {
    if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
      (window as any).__PMD_WALLET_POST({
        level: "info",
        message: "PMD_WALLET_COMPONENT_MOUNT",
        data: {
          method: props.method,
          amount: props.amount,
          currency: props.currency,
          countryCode: props.countryCode || null,
          hasStripe: !!stripe,
          hasElements: !!elements,
          restaurantId: props.restaurantId,
          cartId: props.cartId ?? null,
          userId: props.userId ?? null,
          tableNumber: props.tableNumber ?? null,
          itemsLen: Array.isArray(props.items) ? props.items.length : null,
        }
      });
    }
  } catch {}

  const [ready, setReady] = (require('react') as typeof import('react')).useState(false);
  const [supported, setSupported] = (require('react') as typeof import('react')).useState<boolean | null>(null);
  const [loading, setLoading] = (require('react') as typeof import('react')).useState(false);
  const [msg, setMsg] = (require('react') as typeof import('react')).useState<string>("");

  (require('react') as typeof import('react')).useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        if (!stripe) return;

        // Stripe PaymentRequest API (drives Apple Pay / Google Pay buttons where available)
        const cur = (props.currency || "eur").toLowerCase();
        const countryForCurrency = (props.countryCode || "DE");
        (WalletStripePay as any)._paymentRequest = null;
        const pr = stripe.paymentRequest({
          country: countryForCurrency, // not critical for test; Stripe mainly uses currency + merchant.
          currency: cur,
          total: { label: props.method === "apple_pay" ? "Apple Pay" : "Google Pay", amount: Math.round(Number(props.amount || 0) * 100)},
          requestPayerName: true,
          requestPayerEmail: true,
        });

        const result = await pr.canMakePayment();
        try {
          if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
            (window as any).__PMD_WALLET_POST({
              level: "info",
              message: "PMD_CAN_MAKE_PAYMENT_RESULT",
              data: {
                method: props.method,
                result,
              }
            });
          }
        } catch {}
        if (cancelled) return;

        setSupported(!!result);
        setReady(true);

        if (!result) {
          try {
            if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
              (window as any).__PMD_WALLET_POST({
                level: "warn",
                message: "PMD_WALLET_NOT_SUPPORTED",
                data: {
                  method: props.method,
                }
              });
            }
          } catch {}
          setMsg(
            props.method === "apple_pay"
              ? "Apple Pay is not available on this browser/device (or wallet is not configured). Please try Safari on iPhone with Apple Pay enabled."
              : "Google Pay is not available on this browser/device (or wallet is not configured). Please try Chrome with Google Pay enabled."
          );
          return;
        }

        pr.on('paymentmethod', async (ev: any) => {
          try {
            if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
              (window as any).__PMD_WALLET_POST({
                level: "info",
                message: "PMD_PAYMENTMETHOD_EVENT",
                data: {
                  method: props.method,
                  paymentMethodId: ev?.paymentMethod?.id || null,
                  payerName: ev?.payerName || null,
                  payerEmail: ev?.payerEmail || null,
                }
              });
            }
          } catch {}
          try {
            setLoading(true);

            // 1) create PaymentIntent from our Next API
            const res = await fetch('/api/v1/payments/stripe/create-intent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: props.amount,
                currency: (props.currency || "eur").toLowerCase(),
                preferredMethod: props.method,
                restaurantId: String(props.restaurantId),
                cartId: props.cartId ? String(props.cartId) : null,
                userId: props.userId ? String(props.userId) : null,
                items: props.items || [],
                customerInfo: props.customerInfo || {},
                tableNumber: props.tableNumber || null,
              })
            });

            const data = await res.json()
      pmdForceKazenFrontendThemePayload(data);
            if (!res.ok || !data?.clientSecret) {
              throw new Error(data?.error || "Failed to create payment intent");
            }

            // 2) confirm PI using the wallet payment method from the event
            const { paymentIntent, error } = await stripe.confirmCardPayment(
              data.clientSecret,
              { payment_method: ev.paymentMethod.id },
              { handleActions: true }
            );

            if (error) {
              ev.complete('fail');
              throw new Error(error.message || "Wallet payment failed");
            }

            ev.complete('success');

            if (paymentIntent?.status === 'succeeded') {
              props.onSuccess(paymentIntent.id);
            } else {
              throw new Error("Unexpected PI status: " + (paymentIntent?.status || "unknown"));
            }

          } catch (e: any) {
            try {
              if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
                (window as any).__PMD_WALLET_POST({
                  level: "error",
                  message: "PMD_WALLET_ONERROR",
                  data: {
                    method: props.method,
                    message: e?.message || String(e),
                  },
                });
              }
            } catch {}
          } finally {
            setLoading(false);
          }
        });

        // attach paymentRequest to button element via options below
        (WalletStripePay as any)._paymentRequest = pr;

      } catch (e: any) {
        if (cancelled) return;
        setSupported(false);
        setReady(true);
        try {
            if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
              (window as any).__PMD_WALLET_POST({
                level: "warn",
                message: "PMD_WALLET_NOT_SUPPORTED",
                data: {
                  method: props.method,
                }
              });
            }
          } catch {}
          setMsg(e?.message || String(e));
      }
    }
    run();
    return () => { cancelled = true; };
  }, [stripe, props.currency, props.countryCode, props.amount]);

  if (!ready) {
    return (
      <div className="py-2 text-xs text-gray-500">Loading wallet…</div>
    );
  }

  if (!supported) {
    return (
      <div className="rounded-xl border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800">
        {msg || "Wallet not supported here."}
      </div>
    );
  }
  const __prKey = String((props.currency || "eur").toLowerCase()) + "-" + String((props.countryCode || "DE")) + "-" + String(props.amount);

  const pr = (WalletStripePay as any)._paymentRequest;
  return (
    <div className="space-y-3">
<div className="rounded-xl overflow-hidden">
        <PaymentRequestButtonElement key={__prKey}
          options={{
            paymentRequest: pr,
            style: {
              paymentRequestButton: {
                type: props.method === "apple_pay" ? "default" : "default",
                theme: "dark",
                height: "44px",
              },
            },
          }}
        />
      </div>

      {loading && <div className="text-xs text-gray-500">Processing…</div>}
    </div>
  );
}

type ToolbarState = "collapsed" | "preview" | "expanded"

type PayPalPublicConfig = {
  enabled: boolean
  clientId: string
  currency: string
} | null

type PaymentFormData = {
  email: string
  phone: string
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  tableInfo?: any;
  existingOrderId?: number | null;
  pendingSummary?: {
    orderTotal: number;
    settledAmount: number;
    remainingAmount: number;
  } | null;
  initialSubmittedOrder?: any | null;
  initialCheckoutStep?: CheckoutStep;
  preferPersonalReview?: boolean
  onOpenOrderUpdate?: (snapshot: any | null) => void;
  onCartPricingUpdate?: (snapshot: PmdToolbarPricingSnapshot | null) => void;
  checkoutVisualTheme?: "gold-luxury" | "organic_botanical_paper" | "modern_green" | "kazen_japanese" | "neutral";
}

interface ExpandingBottomToolbarProps {
  toolbarState: ToolbarState;
  setToolbarState: (state: ToolbarState) => void;
  showBillArrow: boolean;
  items: CartItem[];
  totalPrice: number;
  subtotalPrice?: number;
  taxAmount?: number;
  taxPercentage?: number;
  t: (key: TranslationKey) => string;
  onCartClick: () => void;
  onWaiterClick?: () => void;
  onNoteClick?: () => void;
  onOrderClick?: () => void;
  orderCount?: number;
  waiterDisabled?: boolean;
  noteDisabled?: boolean;
  totalItems: number;
  themeBackgroundColor: string;
}

interface MenuItemModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

const SPLIT_GUEST_PROFILES = [
  { name: "Luna", avatar: "L" },
  { name: "Milo", avatar: "M" },
  { name: "Zara", avatar: "Z" },
  { name: "Leo", avatar: "L" },
  { name: "Nova", avatar: "N" },
  { name: "Coco", avatar: "C" },
  { name: "Rio", avatar: "R" },
  { name: "Nala", avatar: "N" },
  { name: "Oscar", avatar: "O" },
  { name: "Bella", avatar: "B" },
]

function MenuRecommendationBadges({
  item,
  compact = false,
  settings = defaultMenuHighlightSettings,
  placement = 'card',
}: {
  item: MenuItem
  compact?: boolean
  settings?: MenuHighlightSettings
  placement?: 'card' | 'modal' | 'section'
}) {
  if (placement === 'card' && (!settings.show_card_badges || settings.badge_position === 'hidden')) return null
  if (placement === 'modal' && !settings.show_modal_badges) return null

  const candidates = [] as Array<{ key: string; label: string; icon: React.ReactNode; tone: 'gold' | 'emerald' }>
  if ((item as any).is_chef_recommended) {
    candidates.push({
      key: 'chef',
      label: settings.chef_label || "Chef’s Choice",
      icon: <ChefHat className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />,
      tone: 'emerald',
    })
  }
  if ((item as any).is_bestseller) {
    candidates.push({
      key: 'best',
      label: settings.bestseller_label || 'Best Seller',
      icon: <Trophy className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />,
      tone: 'gold',
    })
  }
  const badges = settings.badge_display_mode === 'show_all' ? candidates : candidates.slice(0, 1)
  if (!badges.length) return null

  const showText = placement === 'modal' ? settings.show_badge_text_in_modal : settings.show_badge_text_on_cards
  const style = placement === 'modal' ? 'soft_pill' : settings.badge_style
  const cardCircle = style === 'minimal_circle'
  const cardRibbon = style === 'corner_ribbon' && placement === 'card'

  const classFor = (tone: 'gold' | 'emerald') => {
    const colors = tone === 'gold'
      ? 'border-[#C7A45A]/45 bg-[#F7E8BD] text-[#704A10]'
      : 'border-[#0F4D43]/35 bg-[#E6F2EF] text-[#0F4D43]'
    if (cardCircle) return `inline-flex h-8 w-8 items-center justify-center rounded-full border ${colors} shadow-sm`
    if (cardRibbon) return `inline-flex items-center gap-1 border ${colors} px-2 py-1 text-[10px] font-bold uppercase tracking-[0.05em] shadow-sm`
    if (style === 'luxury_label') return `inline-flex items-center gap-1.5 rounded-md border ${colors} px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] shadow-sm`
    return `inline-flex items-center gap-1.5 rounded-full border ${colors} px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] shadow-sm`
  }

  return (
    <div className={`pmd-menu-recommendation-badges flex flex-wrap items-center gap-1 ${cardRibbon ? 'max-w-[112px]' : ''}`} aria-label="Menu item highlights">
      {badges.map((badge) => (
        <span key={badge.key} className={classFor(badge.tone)} aria-label={badge.label} title={badge.label}>
          {badge.icon}
          {showText && !cardCircle && <span>{badge.label}</span>}
        </span>
      ))}
    </div>
  )
}

function MenuHighlightSection({
  title,
  subtitle,
  items,
  settings,
  onSelect,
  onFirstAdd,
  organic = false,
  onOrganicAdd,
}: {
  title: string
  subtitle: string
  items: MenuItem[]
  settings: MenuHighlightSettings
  onSelect: (item: MenuItem) => void
  onFirstAdd: (item: MenuItem) => void
  organic?: boolean
  onOrganicAdd?: (item: MenuItem, event: React.MouseEvent) => void
}) {
  if (!items.length) return null

  return (
    <section className={organic ? "organic-highlight-section relative mb-9 px-4" : "mb-8 px-4"} aria-label={title}>
      <div className={organic ? "mb-4 text-center" : "mb-3 flex items-end justify-between gap-3"}>
        <div>
          {organic && <div className="mx-auto mb-2 flex w-fit items-center gap-2 text-[var(--organic-accent)]" aria-hidden="true"><span className="h-px w-8 bg-current" /><span className="text-lg">☘</span><span className="h-px w-8 bg-current" /></div>}
          <h2 className={organic ? "font-serif text-3xl uppercase tracking-[0.16em] text-[var(--organic-text)]" : "font-serif text-2xl font-bold text-paydine-elegant-gray"}>{title}</h2>
          <p className={organic ? "mt-1 font-serif text-sm text-[var(--organic-muted)]" : "text-sm text-gray-500"}>{subtitle}</p>
        </div>
      </div>
      <div className={organic ? "flex gap-4 overflow-x-auto rounded-[2.4rem] border border-[#E5D8BF]/70 bg-[#FFF9EF]/42 p-3 pb-4 shadow-[inset_0_1px_0_rgba(255,255,255,.65)] md:grid md:grid-cols-2 md:overflow-visible" : "flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible"}>
        {items.map((item, index) => (
          <div key={`highlight-${title}-${item.id}`} className="min-w-[82vw] md:min-w-0">
            {organic ? (
              <OrganicBotanicalMenuCard
                item={item}
                onSelect={onSelect}
                onAdd={(event) => onOrganicAdd ? onOrganicAdd(item, event) : onFirstAdd(item)}
                highlightSettings={settings}
              />
            ) : (
              <ExpandingToolbarMenuItemCard
                item={item}
                onSelect={onSelect}
                onFirstAdd={() => onFirstAdd(item)}
                prioritizeImage={index < 2}
                highlightSettings={settings}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// Component for individual order item with expandable options
// PMD_QUANTITY_ICON_SOURCE_WHITE_FINAL_20260601
// PMD_QTY_SVG_REPLACED_WITH_TEXT_SYMBOLS_20260601
function OrderItemWithOptions({
  cartItem,
  addToCart,
  t,
  onOptionsChange,
  optionKey,
  unitLabel
}: {
  cartItem: CartItem;
  addToCart: (item: MenuItem, quantity: number) => void;
  t: (key: TranslationKey) => string;
  onOptionsChange?: (itemKey: string | number, options: Record<string, string>) => void;
  optionKey?: string;
  unitLabel?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})

  // Use real backend options from the menu item
  const itemOptions = cartItem.item.options || []
  const effectiveOptionKey = optionKey || String(cartItem.item.id)
  const itemDisplayName = cartItem.item.nameKey ? t(cartItem.item.nameKey as TranslationKey) : cartItem.item.name
  const displayLabel = unitLabel || `${cartItem.quantity}x ${itemDisplayName}`

  const handleOptionChange = (optionType: string, optionId: string) => {
    const newOptions = {
      ...selectedOptions,
      [optionType]: optionId
    }
    setSelectedOptions(newOptions)

    // Notify parent component of option changes
    if (onOptionsChange) {
      onOptionsChange(effectiveOptionKey, newOptions)
    }
  }

  const getTotalPrice = () => {
    // Get adjusted price helper from parent scope (need to pass it or get from store)
    const { taxSettings } = useCmsStore.getState()
    const adjustPrice = (price: number): number => {
      if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
        return price * (1 + taxSettings.percentage / 100)
      }
      return price
    }

    let total = adjustPrice(cartItem.item.price || 0) * cartItem.quantity
    Object.values(selectedOptions).forEach(optionId => {
      // Find the option in all option types and add its price
      itemOptions.forEach(option => {
        const optionValue = option.values.find(val => val.id.toString() === optionId)
        if (optionValue) {
          total += adjustPrice(optionValue.price) * cartItem.quantity
        }
      })
    })
    return total
  }

  return (
    <div className="pmd-checkout-item-card border border-paydine-champagne/20 rounded-2xl overflow-hidden">
      {/* Main item row */}
      <div className="pmd-checkout-item-row flex justify-between items-center text-xs p-2">
        <span className="text-paydine-elegant-gray min-w-[120px]">
          {displayLabel}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart(cartItem.item, -1);
            }}
            className="quantity-btn pmd-v2-action-circle w-5 h-5 flex items-center justify-center transition-colors"
          >
            <span data-pmd-force-qty-symbol="minus" aria-hidden="true" style={{ color: "#FFFFFF", WebkitTextFillColor: "#FFFFFF", fontWeight: 900, fontSize: "22px", lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", transform: "translateY(-1px)" }}>−</span>
          </button>
          <span className="pmd-checkout-item-price text-paydine-elegant-gray font-semibold min-w-[48px] text-center">
            {formatCurrency(getTotalPrice())}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart(cartItem.item, 1);
            }}
            className="quantity-btn pmd-v2-action-circle w-5 h-5 flex items-center justify-center transition-colors"
          >
            <span data-pmd-force-qty-symbol="plus" aria-hidden="true" style={{ color: "#FFFFFF", WebkitTextFillColor: "#FFFFFF", fontWeight: 900, fontSize: "22px", lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", transform: "translateY(-1px)" }}>+</span>
          </button>
        </div>
      </div>

      {/* Expandable options section - only show if there are options */}
      {itemOptions.length > 0 && (
        <div className="border-t border-paydine-champagne/10">
          <button
            type="button"
            data-pmd-customize-options-btn="1"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors"
            style={{
              background: "rgba(255, 255, 255, 0.62)",
              backgroundColor: "rgba(255, 255, 255, 0.62)",
              borderColor: "rgba(216, 185, 130, 0.45)",
              color: "#374151",
              WebkitTextFillColor: "#374151",
              boxShadow: "none",
              textShadow: "none",
            }}
          >
            <span>Customize Options</span>
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`}
              style={{ color: "#374151", stroke: "#374151" }}
            />
          </button>

          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28 }}
              className="overflow-hidden"
            >
              <div className="p-2 space-y-3 bg-paydine-rose-beige/5">
                {itemOptions.map((option) => (
                  <div key={option.id}>
                    <h4 className="text-xs font-medium text-paydine-elegant-gray mb-1">
                      {option.name} {option.required && '*'}
                    </h4>
                    <div className="space-y-1">
                      {option.values.map((value) => (
                        <label key={value.id} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input
                            type={option.display_type === 'radio' ? 'radio' : 'checkbox'}
                            name={`${option.name}-${effectiveOptionKey}`}
                            value={value.id.toString()}
                            checked={selectedOptions[option.name] === value.id.toString()}
                            onChange={() => {
                              if (option.display_type === 'radio') {
                                handleOptionChange(option.name, value.id.toString())
                              } else {
                                // For checkboxes, toggle the selection
                                const currentValue = selectedOptions[option.name]
                                handleOptionChange(option.name, currentValue === value.id.toString() ? '' : value.id.toString())
                              }
                            }}
                            className="w-3 h-3 pmd-customer-price"
                          />
                          <span className="text-paydine-elegant-gray">{value.value}</span>
                          {value.price > 0 && (() => {
                            const { taxSettings } = useCmsStore.getState()
                            const adjustPrice = (price: number): number => {
                              if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
                                return price * (1 + taxSettings.percentage / 100)
                              }
                              return price
                            }
                            return (
                              <span className="pmd-customer-price font-medium">
                                +{formatCurrency(adjustPrice(value.price))}
                              </span>
                            )
                          })()}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  )
}


const KazenGoldCheckoutSkinStyles = () => (
  <style
    data-pmd-kazen-gold-checkout-skin="1"
    dangerouslySetInnerHTML={{
      __html: `
        /* PMD_KAZEN_SKIN_GOLD_CHECKOUT_20260612 */

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"].pmd-checkout-modal,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"].pmd-checkout-modal {
          --kgc-bg: #090705;
          --kgc-panel: #0f0c08;
          --kgc-panel-soft: #15110c;
          --kgc-ink: #f4e7c8;
          --kgc-muted: #c7b48b;
          --kgc-line: rgba(198,164,93,.36);
          --kgc-line-strong: rgba(198,164,93,.58);
          --kgc-red: #df685d;
          --kgc-green: #063f35;

          background:
            radial-gradient(circle at 84% 0%, rgba(120,38,30,.18), transparent 30%),
            linear-gradient(180deg, #0f0b08 0%, #070605 100%) !important;
          border: 1px solid var(--kgc-line-strong) !important;
          border-radius: 0 !important;
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
          box-shadow:
            0 34px 90px rgba(0,0,0,.64),
            inset 0 1px 0 rgba(244,231,200,.08) !important;
          overflow: hidden !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] *,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] * {
          text-shadow: none !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .surface-sub,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .surface-sub {
          background: rgba(8,7,5,.82) !important;
          border-bottom: 1px solid rgba(198,164,93,.20) !important;
          border-radius: 0 !important;
          color: var(--kgc-ink) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-modal-title,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-modal-title {
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .26em !important;
          text-transform: uppercase !important;
          font-size: 1.02rem !important;
          font-weight: 700 !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-scroll="1"],
        body[data-pmd-kazen-mode] [data-pmd-checkout-scroll="1"],
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-body,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-body {
          background:
            radial-gradient(circle at 1px 1px, rgba(198,164,93,.055) 1px, transparent 0),
            linear-gradient(180deg, #0b0907 0%, #070605 100%) !important;
          background-size: 18px 18px, 100% 100% !important;
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
          padding: 1rem !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-flat-section,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-item-card,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-total-card,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-payment-card,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-meta-row,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .surface,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-flat-section,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-item-card,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-total-card,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-payment-card,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-meta-row,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .surface {
          background:
            linear-gradient(180deg, rgba(244,231,200,.045), rgba(244,231,200,.018)),
            rgba(14,11,8,.86) !important;
          border: 1px solid var(--kgc-line) !important;
          border-radius: 0 !important;
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
          box-shadow:
            inset 0 1px 0 rgba(244,231,200,.06),
            0 16px 34px rgba(0,0,0,.18) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h1,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h2,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h3,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h4,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] strong,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h1,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h2,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h3,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] h4,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] strong {
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
          font-family: Georgia, "Times New Roman", serif !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] p,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] span,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] label,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] div,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] p,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] span,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] label,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] div {
          color: var(--kgc-muted);
          -webkit-text-fill-color: currentColor;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-item-price,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] [class*="price"],
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] [class*="total"],
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .pmd-checkout-item-price,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] [class*="price"],
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] [class*="total"] {
          color: var(--kgc-red) !important;
          -webkit-text-fill-color: var(--kgc-red) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button {
          border-radius: 0 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .12em !important;
          text-transform: uppercase !important;
          transition: transform .18s ease, border-color .18s ease, background-color .18s ease, box-shadow .18s ease !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:hover,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:hover {
          transform: translateY(-1px) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:active,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:active {
          transform: translateY(0) scale(.985) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"],
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"],
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .icon-btn--accent,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] .icon-btn--accent {
          background: var(--kgc-green) !important;
          background-color: var(--kgc-green) !important;
          border-color: var(--kgc-green) !important;
          color: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
          box-shadow: 0 14px 28px rgba(0,0,0,.28) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"] svg,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"] svg *,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"] svg,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button[data-pmd-order-status-back="1"] svg * {
          color: #fff6dc !important;
          stroke: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:not([data-pmd-order-status-back="1"]):not(.icon-btn--accent),
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] button:not([data-pmd-order-status-back="1"]):not(.icon-btn--accent) {
          background: rgba(8,7,5,.72) !important;
          border: 1px solid var(--kgc-line) !important;
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] input,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] textarea,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] input,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] textarea {
          background: rgba(244,231,200,.06) !important;
          border: 1px solid rgba(198,164,93,.32) !important;
          border-radius: 0 !important;
          color: var(--kgc-ink) !important;
          -webkit-text-fill-color: var(--kgc-ink) !important;
        }

        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] input::placeholder,
        html[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] textarea::placeholder,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] input::placeholder,
        body[data-pmd-kazen-mode] [data-pmd-checkout-visual-theme="gold-luxury"] textarea::placeholder {
          color: rgba(199,180,139,.58) !important;
          -webkit-text-fill-color: rgba(199,180,139,.58) !important;
        }
      `,
    }}
  />
)




const KazenSharedCheckoutNightPolishStyles = () => (
  <style
    data-pmd-kazen-checkout-night-polish="1"
    dangerouslySetInnerHTML={{
      __html: `
        /* PMD_KAZEN_CHECKOUT_NIGHT_POLISH_20260612
           This is intentionally scoped only to Kazen shared checkout.
           It does not touch Gold, Modern Green, Organic, or the menu layout.
        */

        [data-pmd-checkout-kazen-skin="1"].pmd-checkout-modal {
          width: min(94vw, 430px) !important;
          max-height: min(88vh, 820px) !important;
          border-radius: 0 !important;
          border: 1px solid rgba(198,164,93,.58) !important;
          background:
            radial-gradient(circle at 88% 0%, rgba(120,38,30,.22), transparent 30%),
            linear-gradient(180deg, #0c0906 0%, #070604 100%) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          box-shadow: 0 34px 100px rgba(0,0,0,.72), inset 0 1px 0 rgba(244,231,200,.08) !important;
          overflow: hidden !important;
        }

        [data-pmd-checkout-kazen-skin="1"] *,
        [data-pmd-checkout-kazen-skin="1"] *::before,
        [data-pmd-checkout-kazen-skin="1"] *::after {
          box-sizing: border-box !important;
          text-shadow: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] > .surface-sub:first-child,
        [data-pmd-checkout-kazen-skin="1"] .surface-sub:first-child {
          min-height: 58px !important;
          padding: 12px 14px !important;
          border-bottom: 1px solid rgba(198,164,93,.26) !important;
          background: rgba(8,7,5,.92) !important;
          border-radius: 0 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-modal-title {
          color: #f6e6c2 !important;
          -webkit-text-fill-color: #f6e6c2 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .22em !important;
          text-transform: uppercase !important;
          font-size: 1.02rem !important;
          font-weight: 800 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"],
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-body {
          background:
            radial-gradient(circle at 1px 1px, rgba(198,164,93,.052) 1px, transparent 0),
            linear-gradient(180deg, #090705 0%, #060504 100%) !important;
          background-size: 18px 18px, 100% 100% !important;
          padding: 14px !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          scrollbar-width: thin !important;
          scrollbar-color: rgba(198,164,93,.42) rgba(8,7,5,.62) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-flat-section,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-item-card,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-total-card,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-payment-card,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-meta-row,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-list-scroll,
        [data-pmd-checkout-kazen-skin="1"] .surface,
        [data-pmd-checkout-kazen-skin="1"] .surface-sub:not(:first-child),
        [data-pmd-checkout-kazen-skin="1"] div[class*="rounded-2xl"][class*="border"]:not(button),
        [data-pmd-checkout-kazen-skin="1"] div[class*="rounded-3xl"]:not(button),
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-split-method-real],
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-split-guest-stepper] {
          background:
            linear-gradient(180deg, rgba(244,231,200,.055), rgba(244,231,200,.018)),
            rgba(15,12,8,.88) !important;
          border: 1px solid rgba(198,164,93,.34) !important;
          border-radius: 0 !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          box-shadow: inset 0 1px 0 rgba(244,231,200,.06), 0 14px 28px rgba(0,0,0,.18) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-item-row,
        [data-pmd-checkout-kazen-skin="1"] .pmd-table-order-item-row {
          background: rgba(10,8,6,.58) !important;
          border: 1px solid rgba(198,164,93,.26) !important;
          border-radius: 0 !important;
          padding: .72rem .8rem !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] h1,
        [data-pmd-checkout-kazen-skin="1"] h2,
        [data-pmd-checkout-kazen-skin="1"] h3,
        [data-pmd-checkout-kazen-skin="1"] h4,
        [data-pmd-checkout-kazen-skin="1"] strong,
        [data-pmd-checkout-kazen-skin="1"] b,
        [data-pmd-checkout-kazen-skin="1"] .font-semibold,
        [data-pmd-checkout-kazen-skin="1"] .font-bold {
          color: #f6e6c2 !important;
          -webkit-text-fill-color: #f6e6c2 !important;
          font-family: Georgia, "Times New Roman", serif !important;
        }

        [data-pmd-checkout-kazen-skin="1"] p,
        [data-pmd-checkout-kazen-skin="1"] span,
        [data-pmd-checkout-kazen-skin="1"] label,
        [data-pmd-checkout-kazen-skin="1"] div,
        [data-pmd-checkout-kazen-skin="1"] .muted,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-helper-text {
          color: #cbb88d !important;
          -webkit-text-fill-color: #cbb88d !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-status-title,
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-item-row span:first-child,
        [data-pmd-checkout-kazen-skin="1"] .pmd-table-order-item-row span:first-child {
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-item-price,
        [data-pmd-checkout-kazen-skin="1"] [class*="price"],
        [data-pmd-checkout-kazen-skin="1"] [class*="total"],
        [data-pmd-checkout-kazen-skin="1"] [class*="Total"] {
          color: #df685d !important;
          -webkit-text-fill-color: #df685d !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button {
          border-radius: 0 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .10em !important;
          text-transform: uppercase !important;
          transition: transform .18s ease, border-color .18s ease, background-color .18s ease, box-shadow .18s ease !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button:hover { transform: translateY(-1px) !important; }
        [data-pmd-checkout-kazen-skin="1"] button:active { transform: translateY(0) scale(.985) !important; }

        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-order-status-back="1"],
        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-stripe-native-button="1"],
        [data-pmd-checkout-kazen-skin="1"] button[style*="rgb(6, 47, 42)"],
        [data-pmd-checkout-kazen-skin="1"] button[style*="#062F2A"],
        [data-pmd-checkout-kazen-skin="1"] .icon-btn--accent {
          background: #063f35 !important;
          background-color: #063f35 !important;
          border: 1px solid rgba(198,164,93,.34) !important;
          color: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
          box-shadow: 0 14px 30px rgba(0,0,0,.34) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-order-status-back="1"] *,
        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-stripe-native-button="1"] *,
        [data-pmd-checkout-kazen-skin="1"] button[style*="rgb(6, 47, 42)"] *,
        [data-pmd-checkout-kazen-skin="1"] button[style*="#062F2A"] *,
        [data-pmd-checkout-kazen-skin="1"] .icon-btn--accent * {
          color: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
          stroke: #fff6dc !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button:not([data-pmd-order-status-back="1"]):not([data-pmd-stripe-native-button="1"]):not(.icon-btn--accent):not([style*="rgb(6, 47, 42)"]):not([style*="#062F2A"]) {
          background: rgba(8,7,5,.62) !important;
          border: 1px solid rgba(198,164,93,.42) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          box-shadow: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] input:not(.__PrivateStripeElement-input),
        [data-pmd-checkout-kazen-skin="1"] textarea,
        [data-pmd-checkout-kazen-skin="1"] select,
        [data-pmd-checkout-kazen-skin="1"] form[data-pmd-stripe-form="1"] .StripeElement,
        [data-pmd-checkout-kazen-skin="1"] form[data-pmd-stripe-form="1"] .__PrivateStripeElement {
          background: rgba(244,231,200,.075) !important;
          border: 1px solid rgba(198,164,93,.42) !important;
          border-radius: 0 !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          box-shadow: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] input::placeholder,
        [data-pmd-checkout-kazen-skin="1"] textarea::placeholder {
          color: rgba(203,184,141,.72) !important;
          -webkit-text-fill-color: rgba(203,184,141,.72) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] img {
          filter: none !important;
          opacity: 1 !important;
        }

        @media (max-width: 520px) {
          [data-pmd-checkout-kazen-skin="1"].pmd-checkout-modal {
            width: min(94vw, 420px) !important;
            max-height: 86vh !important;
          }
          [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] {
            padding: 12px !important;
          }
        }
      `,
    }}
  />
)


const KazenSharedCheckoutSkinStyles = () => (
  <style
    data-pmd-kazen-shared-checkout-skin="1"
    dangerouslySetInnerHTML={{
      __html: `
        /* PMD_KAZEN_SHARED_CHECKOUT_SKIN_20260612
           This is a skin only. It does not create checkout steps/cards/logic.
           Kazen uses the shared PaymentModal flow; these selectors target only
           data-pmd-checkout-kazen-skin="1" so other themes stay untouched.
        */

        [data-pmd-kazen-checkout-overlay="1"] {
          background:
            radial-gradient(circle at 75% 10%, rgba(128, 38, 31, .26), transparent 30%),
            rgba(2, 2, 2, .68) !important;
          backdrop-filter: blur(14px) saturate(.88) !important;
          -webkit-backdrop-filter: blur(14px) saturate(.88) !important;
          padding: 1.15rem !important;
        }

        [data-pmd-checkout-kazen-skin="1"],
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] {
          --pmd-checkout-shell-final: #080706 !important;
          --pmd-checkout-panel-final: #100d09 !important;
          --pmd-checkout-field-final: #15110c !important;
          --pmd-checkout-border-final: rgba(198, 164, 93, .36) !important;
          --pmd-checkout-shadow-final: 0 20px 44px rgba(0,0,0,.32) !important;
          --pmd-checkout-primary: #063f35 !important;
          --pmd-checkout-primary-2: #0a4c41 !important;
          --theme-text-primary: #f4e7c8 !important;
          --theme-text-muted: #c9b78f !important;
          --theme-border: rgba(198, 164, 93, .36) !important;
          --theme-surface: #100d09 !important;
          --theme-surface-sub: #15110c !important;
          --theme-primary: #df685d !important;
          --theme-primary-foreground: #fff5dc !important;
        }

        [data-pmd-checkout-kazen-skin="1"].pmd-checkout-modal {
          background:
            radial-gradient(circle at 86% 0%, rgba(122, 38, 30, .20), transparent 30%),
            linear-gradient(180deg, #0c0906 0%, #080706 100%) !important;
          background-color: #080706 !important;
          border: 1px solid rgba(198, 164, 93, .52) !important;
          border-radius: 0 !important;
          box-shadow: 0 34px 90px rgba(0,0,0,.68), inset 0 1px 0 rgba(244,231,200,.08) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          max-height: min(92vh, 860px) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .surface-sub:first-child,
        [data-pmd-checkout-kazen-skin="1"] > .surface-sub:first-child {
          background: rgba(8, 7, 5, .92) !important;
          background-color: rgba(8, 7, 5, .92) !important;
          border-bottom: 1px solid rgba(198,164,93,.24) !important;
          border-radius: 0 !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-modal-title {
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .22em !important;
          text-transform: uppercase !important;
          font-weight: 700 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"],
        [data-pmd-checkout-kazen-skin="1"] .pmd-checkout-body {
          background:
            radial-gradient(circle at 1px 1px, rgba(198,164,93,.055) 1px, transparent 0),
            linear-gradient(180deg, #0a0806 0%, #070605 100%) !important;
          background-size: 18px 18px, 100% 100% !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          scrollbar-color: rgba(198,164,93,.58) rgba(8,7,5,.92) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .surface-sub,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-total-card,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-payment-card,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-item-card,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-meta-row,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-list-scroll,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] div[class*="rounded-2xl"][class*="border"]:not(button),
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] div[class*="rounded-3xl"]:not(button),
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] [data-pmd-split-method-real],
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] [data-pmd-split-guest-stepper] {
          background:
            linear-gradient(180deg, rgba(244,231,200,.050), rgba(244,231,200,.018)),
            rgba(16, 13, 9, .90) !important;
          background-color: rgba(16, 13, 9, .90) !important;
          border-color: rgba(198,164,93,.34) !important;
          border-radius: 0 !important;
          box-shadow: inset 0 1px 0 rgba(244,231,200,.055) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-item-row,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-table-order-item-row {
          background: transparent !important;
          background-color: transparent !important;
          border-color: rgba(198,164,93,.20) !important;
          box-shadow: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] h1,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] h2,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] h3,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] h4,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] strong,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] b {
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          font-family: Georgia, "Times New Roman", serif !important;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] p,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] span,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] label,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] div {
          color: #c9b78f;
          -webkit-text-fill-color: currentColor;
        }

        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] .pmd-checkout-item-price,
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] [class*="price"],
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] [class*="total"],
        [data-pmd-checkout-kazen-skin="1"] [data-pmd-checkout-scroll="1"] [class*="Total"] {
          color: #df685d !important;
          -webkit-text-fill-color: #df685d !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button {
          border-radius: 0 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          letter-spacing: .12em !important;
          text-transform: uppercase !important;
          transition: transform .18s ease, border-color .18s ease, background-color .18s ease, box-shadow .18s ease !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button:hover { transform: translateY(-1px) !important; }
        [data-pmd-checkout-kazen-skin="1"] button:active { transform: translateY(0) scale(.985) !important; }

        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-order-status-back="1"],
        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-stripe-native-button="1"],
        [data-pmd-checkout-kazen-skin="1"] button[style*="rgb(6, 47, 42)"],
        [data-pmd-checkout-kazen-skin="1"] button[style*="#062F2A"],
        [data-pmd-checkout-kazen-skin="1"] .icon-btn--accent {
          background: #063f35 !important;
          background-color: #063f35 !important;
          border-color: rgba(198,164,93,.48) !important;
          color: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
          box-shadow: 0 14px 28px rgba(0,0,0,.28) !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-order-status-back="1"] *,
        [data-pmd-checkout-kazen-skin="1"] button[data-pmd-stripe-native-button="1"] *,
        [data-pmd-checkout-kazen-skin="1"] button[style*="rgb(6, 47, 42)"] *,
        [data-pmd-checkout-kazen-skin="1"] button[style*="#062F2A"] *,
        [data-pmd-checkout-kazen-skin="1"] .icon-btn--accent * {
          color: #fff6dc !important;
          stroke: #fff6dc !important;
          -webkit-text-fill-color: #fff6dc !important;
        }

        [data-pmd-checkout-kazen-skin="1"] button:not([data-pmd-order-status-back="1"]):not([data-pmd-stripe-native-button="1"]):not(.icon-btn--accent):not([style*="rgb(6, 47, 42)"]):not([style*="#062F2A"]) {
          background: rgba(8,7,5,.72) !important;
          background-color: rgba(8,7,5,.72) !important;
          border: 1px solid rgba(198,164,93,.36) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        [data-pmd-checkout-kazen-skin="1"] input:not(.__PrivateStripeElement-input),
        [data-pmd-checkout-kazen-skin="1"] textarea,
        [data-pmd-checkout-kazen-skin="1"] select,
        [data-pmd-checkout-kazen-skin="1"] form[data-pmd-stripe-form="1"] .StripeElement,
        [data-pmd-checkout-kazen-skin="1"] form[data-pmd-stripe-form="1"] .__PrivateStripeElement {
          background: rgba(21,17,12,.92) !important;
          background-color: rgba(21,17,12,.92) !important;
          border: 1px solid rgba(198,164,93,.34) !important;
          border-radius: 0 !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
          box-shadow: none !important;
        }

        [data-pmd-checkout-kazen-skin="1"] input::placeholder,
        [data-pmd-checkout-kazen-skin="1"] textarea::placeholder {
          color: rgba(201,183,143,.62) !important;
          -webkit-text-fill-color: rgba(201,183,143,.62) !important;
        }

        @media (prefers-reduced-motion: reduce) {
          [data-pmd-checkout-kazen-skin="1"] *,
          [data-pmd-checkout-kazen-skin="1"] button {
            transition: none !important;
            animation: none !important;
          }
        }
      `,
    }}
  />
)


// PMD_FORCE_ALL_PLUS_MINUS_SOURCE_WHITE_20260601
// Phase 2B: move PaymentModal orchestration into checkout feature components/hooks after pure helpers are stable.
function PaymentModal({ isOpen, onClose, items: allItems, tableInfo, existingOrderId, pendingSummary, initialSubmittedOrder, initialCheckoutStep, preferPersonalReview = false, onOpenOrderUpdate, onCartPricingUpdate, checkoutVisualTheme = "neutral" }: PaymentModalProps) {

  // PMD_QUANTITY_ICON_FIRST_PAINT_FIX_20260601
  // Prevent checkout quantity plus/minus icons from flashing black before legacy runtime styles settle.
  useEffect(() => {
    if (typeof document === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const fixQuantityIcons = () => {
      document
        .querySelectorAll('[role="dialog"] button svg.lucide-plus, [role="dialog"] button svg.lucide-minus, [data-pmd-gold-checkout-modal] button svg.lucide-plus, [data-pmd-gold-checkout-modal] button svg.lucide-minus')
        .forEach((svg) => {
          const nodes = [svg, ...Array.from(svg.querySelectorAll("*"))]
          nodes.forEach((node) => {
            if (!(node instanceof HTMLElement) && !(node instanceof SVGElement)) return
            ;(node as HTMLElement | SVGElement).style.setProperty("color", "#FFFFFF", "important")
            ;(node as HTMLElement | SVGElement).style.setProperty("stroke", "#FFFFFF", "important")
            ;(node as HTMLElement | SVGElement).style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
          })
        })
    }

    fixQuantityIcons()
    const timer = window.setInterval(fixQuantityIcons, 250)

    const observer = new MutationObserver(fixQuantityIcons)
    if (document.body) {
      observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style"] })
    }

    return () => {
      window.clearInterval(timer)
      observer.disconnect()
    }
  }, [])


  // PMD_HIDE_PAYMENT_BASE_AMOUNT_DUPLICATE_20260601
  // Hide duplicate "Base amount" row in payment UI when Payable total is already shown.
  useEffect(() => {
    if (typeof document === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const hideBaseAmountRows = () => {
      const roots = document.querySelectorAll("[data-pmd-checkout-scroll], [role='dialog']")
      roots.forEach((root) => {
        root.querySelectorAll("span, p, div").forEach((node) => {
          const text = (node.textContent || "").trim()
          if (text !== "Base amount") return

          const row =
            node.closest("div.flex") ||
            node.closest("div[class*='justify-between']") ||
            node.parentElement

          if (row instanceof HTMLElement) {
            row.style.setProperty("display", "none", "important")
          }
        })
      })
    }

    hideBaseAmountRows()

    const timer = window.setInterval(hideBaseAmountRows, 350)
    const observer = new MutationObserver(hideBaseAmountRows)

    if (document.body) {
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class", "style"],
      })
    }

    return () => {
      window.clearInterval(timer)
      observer.disconnect()
    }
  }, [])


  // PMD_SPLIT_METHOD_RUNTIME_TEXT_FIX_20260601
  // Old frontend has runtime/theme rules that override split method button text.
  // This exact scoped fixer wins by setting active split text with inline !important.
  useEffect(() => {
    if (typeof document === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const applySplitMethodTextFix = () => {
      document
        .querySelectorAll('button[data-pmd-split-method-real]')
        .forEach((button) => {
          const active = button.getAttribute("data-pmd-active") === "1"
          const color = active ? "#FFFFFF" : "#10201D"
          const nodes = [button, ...Array.from(button.querySelectorAll("*"))]

          nodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return
            node.style.setProperty("color", color, "important")
            node.style.setProperty("-webkit-text-fill-color", color, "important")
            node.style.setProperty("text-decoration-color", color, "important")
          })
        })
    }

    applySplitMethodTextFix()

    const timer = window.setInterval(applySplitMethodTextFix, 150)

    const observer = new MutationObserver(applySplitMethodTextFix)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-pmd-active", "class", "style"],
    })

    return () => {
      window.clearInterval(timer)
      observer.disconnect()
    }
  }, [])

  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguageStore()
  const { paymentOptions, tipSettings, taxSettings, merchantSettings, loadVATSettings, loadMerchantSettings, appliedCoupon, validateCoupon, removeCoupon } = useCmsStore()
const { clearCart, addToCart, clearTableContext } = useCartStore()
  const [isLoading, setIsLoading] = useState(false)
  const [paypalPublicConfig, setPaypalPublicConfig] = useState<{ enabled: boolean; clientId: string; currency: string } | null>(null)
  const [paypalConfigLoading, setPaypalConfigLoading] = useState(false)

  // Helper function to adjust price if VAT is included in menu prices
  const adjustPriceForVAT = (price: number): number => {
    if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
      // VAT is included in prices - increase price by VAT percentage
      return price * (1 + taxSettings.percentage / 100)
    }
    return price
  }
  const [isSplitting, setIsSplitting] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Record<string, SplitBillItem>>({})
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal")
  const [splitGuestCount, setSplitGuestCount] = useState(2)
  const [itemAssignments, setItemAssignments] = useState<Record<string, number | null>>({})
  const [sharePercents, setSharePercents] = useState<number[]>([50, 50])
  const [selectedSplitPersonId, setSelectedSplitPersonId] = useState<string | null>(null)
  const [paidSplitPeople, setPaidSplitPeople] = useState<Record<string, boolean>>({})
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState("")
  const [reviewSubmitStatus, setReviewSubmitStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState("")
  const [invoiceDownloadStatus, setInvoiceDownloadStatus] = useState<"idle" | "loading" | "error">("idle")
  const [invoiceDownloadMessage, setInvoiceDownloadMessage] = useState("")
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Record<string, string>>>({})
  const [tipPercentage, setTipPercentage] = useState(0)
  const [customTip, setCustomTip] = useState("")
  const [splitPaymentTips, setSplitPaymentTips] = useState<Record<string, { percentage: number; custom: string }>>({})
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [cashCollectionConfirmed, setCashCollectionConfirmed] = useState(false)
  const [providerInlineError, setProviderInlineError] = useState<string | null>(null)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  // Debug (safe): expose key settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__CMS_STORE__ = { merchantSettings }
    }
  }, [merchantSettings])

  useEffect(() => {
    const detectDarkTheme = () => {
      const themeName = document.documentElement.getAttribute('data-theme') || 'clean-light'
      setIsDarkTheme(themeName === 'modern-dark')
    }

    detectDarkTheme()

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          detectDarkTheme()
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => observer.disconnect()
  }, [])

  const [loadingPayments, setLoadingPayments] = useState(true)
  const [couponCode, setCouponCode] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    email: "",
    phone: "",
  })
  const isOrganicCheckoutVisual = checkoutVisualTheme === ORGANIC_BOTANICAL_THEME_KEY
  const isModernGreenCheckoutVisual = checkoutVisualTheme === "modern_green"
  const isKazenJapaneseCheckoutVisual = checkoutVisualTheme === KAZEN_JAPANESE_THEME_KEY
  const isThemedCheckoutVisual = isOrganicCheckoutVisual || isModernGreenCheckoutVisual || isKazenJapaneseCheckoutVisual


  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(
    getInitialCheckoutStep(initialCheckoutStep, existingOrderId)
  )


  // PMD_ORDER_STATUS_PARENT_JUMP_LOCK_20260603_SAFE
  // Diagnostic showed orderStatusCard + ETA circle jump together by ~239px.
  // Their own size/top stayed stable, so the parent scroll/layout wrapper is moving.
  // useLayoutEffect runs before paint and locks the checkout scroll parent immediately.
  useLayoutEffect(() => {
    if (!isOpen || checkoutStep !== "submitted") return;

    const lockOrderStatusParent = () => {
      const scrollRoots = document.querySelectorAll<HTMLElement>('[data-pmd-checkout-scroll="1"]');

      scrollRoots.forEach((root) => {
        root.dataset.pmdOrderStatusStable = "1";
        root.style.scrollBehavior = "auto";
        root.style.overflowAnchor = "none";
        root.style.alignItems = "stretch";
        root.style.justifyContent = "flex-start";

        if (root.scrollTop !== 0) {
          root.scrollTop = 0;
        }
      });

      const card = document.querySelector<HTMLElement>('[data-pmd-order-status-card="1"]');
      if (card) {
        card.dataset.pmdOrderStatusStableCard = "1";
      }

      const eta = document.querySelector<HTMLElement>('[data-pmd-floating-eta-circle="1"]');
      if (eta) {
        eta.dataset.pmdEtaStable = "1";
      }
    };

    lockOrderStatusParent();
  }, [isOpen, checkoutStep]);
const [submittedSnapshot, setSubmittedSnapshot] = useState<any | null>(initialSubmittedOrder || null)
  // PMD_USE_LATEST_SUBMITTED_ORDER_ID_FOR_PAYMENT_20260612
  const pmdLatestSubmittedPaymentOrderIdRef = useRef<number | null>(null)
  // Phase 2B: table draft/order fetching and submit handlers should move into a shared checkout feature hook.
  const [tableDraft, setTableDraft] = useState<TableOrderDraftResponse | null>(null)
  const hasPersonalItems = allItems.length > 0
  const [draftLoading, setDraftLoading] = useState(false)

  const [stripeConfig, setStripeConfig] = useState<{
    publishableKey: string
    mode: string
    currency?: string
    countryCode?: string
    methods?: {
      card?: boolean
      apple_pay?: boolean
      google_pay?: boolean
    }
  } | null>(null)
  const [stripeConfigError, setStripeConfigError] = useState<string | null>(null)


  useEffect(() => {
    if (!isOpen) return
    setCheckoutStep((current) => getCheckoutStepOnOpen({
      initialCheckoutStep,
      existingOrderId,
      hasPersonalItems,
      preferPersonalReview,
      currentStep: current,
    }))
  }, [isOpen, existingOrderId, initialCheckoutStep, hasPersonalItems, preferPersonalReview])

  useEffect(() => {
    if (!initialSubmittedOrder) return
    if ((tableDraft as any)?.draft_id && !(tableDraft as any)?.order_id && !(tableDraft as any)?.orderId) return
    const tableDraftOrderId = Number((tableDraft as any)?.order_id || (tableDraft as any)?.orderId || 0)
    const initialOrderId = Number((initialSubmittedOrder as any)?.orderId || (initialSubmittedOrder as any)?.order_id || 0)
    if (tableDraftOrderId > 0 && initialOrderId > 0 && tableDraftOrderId !== initialOrderId) return
    setSubmittedSnapshot((prev: any) => {
      const prevOrderId = Number(prev?.orderId || prev?.order_id || 0)
      if (prevOrderId > 0 && tableDraftOrderId > 0 && prevOrderId === tableDraftOrderId && initialOrderId !== tableDraftOrderId) return prev
      return initialSubmittedOrder
    })
  }, [initialSubmittedOrder, (tableDraft as any)?.draft_id, (tableDraft as any)?.order_id, (tableDraft as any)?.orderId])

  useEffect(() => {
    if (!(tableDraft as any)?.draft_id) return
    if ((tableDraft as any)?.order_id || (tableDraft as any)?.orderId) return
    setSubmittedSnapshot(null)
  }, [(tableDraft as any)?.draft_id, (tableDraft as any)?.order_id, (tableDraft as any)?.orderId])

  const getTenantKey = () => {
    if (typeof window === 'undefined') return 'tenant'
    return window.location.host
  }
  const getTableKey = () => {
    const p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const qTable = p?.get('table') || p?.get('table_id') || p?.get('table_no')
    const routeTable = typeof window !== 'undefined' ? (window.location.pathname.match(/\/table\/(\d+)/)?.[1] ?? null) : null
    return String(tableInfo?.table_id || tableInfo?.table_no || qTable || routeTable || 'delivery')
  }
  const ensureGuestSession = () => {
    if (typeof window === 'undefined') return ''
    const key = 'pmd_guest_session_id'
    let v = localStorage.getItem(key)
    if (!v) { v = `g_${Date.now()}_${Math.random().toString(36).slice(2,10)}`; localStorage.setItem(key, v) }
    return v
  }

  const buildOpenOrderStorageKeys = () => {
    const tenant = getTenantKey()
    const tableKey = getTableKey()
    const guestSessionId = ensureGuestSession()
    return {
      sessionKey: `pmd_open_order:${tenant}:${tableKey}:${guestSessionId}`,
      legacyKey: `pmd_open_order:${tenant}:${tableKey}`,
      guestSessionId,
      tenant,
      tableKey,
    }
  }

  const effectivePayPalClientId =
    paypalPublicConfig?.enabled && paypalPublicConfig?.clientId
      ? paypalPublicConfig.clientId
      : ""

  const effectivePayPalCurrency =
    String(
      paypalPublicConfig?.currency ||
      merchantSettings?.currency ||
      "EUR"
    ).toUpperCase()

  const stripePromise = useMemo(
    () => (stripeConfig?.publishableKey ? loadStripe(stripeConfig.publishableKey) : null),
    [stripeConfig?.publishableKey]
  )

  const visiblePaymentMethods = useMemo(() => getVisiblePaymentMethods(paymentMethods), [paymentMethods])

  const methodByCode = useMemo(() => mapPaymentMethodsByCode(visiblePaymentMethods), [visiblePaymentMethods])

  useEffect(() => {
    if (!selectedPaymentMethod) return
    if (!isPaymentMethodAvailable(visiblePaymentMethods, selectedPaymentMethod)) {
      setSelectedPaymentMethod(null)
    }
  }, [selectedPaymentMethod, visiblePaymentMethods])

  useEffect(() => {
    const selected = selectedPaymentMethod ? methodByCode.get(selectedPaymentMethod) : null

    if (!isStripePaymentMethodForConfig(selected)) return

    let cancelled = false
    fetch("/api/v1/payments/stripe/config")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data?.success && data.publishableKey) {
          setStripeConfig({
            publishableKey: data.publishableKey,
            mode: data.mode || "test",
            currency: data.currency || "EUR",
            countryCode: data.countryCode || "DE",
            methods: {
              card: !!data?.methods?.card,
              apple_pay: !!data?.methods?.apple_pay,
              google_pay: !!data?.methods?.google_pay,
            },
          })
          setStripeConfigError(null)
        } else {
          setStripeConfig(null)
          setStripeConfigError(data?.error || "Stripe is not configured")
        }
      })
      .catch(() => {
        if (!cancelled) setStripeConfigError("Failed to load Stripe configuration")
      })

    return () => {
      cancelled = true
    }
  }, [selectedPaymentMethod, methodByCode])

  // Handle option changes from OrderItemWithOptions
  const handleOptionsChange = (itemKey: string | number, options: Record<string, string>) => {
    setSelectedOptions(prev => ({
      ...prev,
      [String(itemKey)]: options
    }))
  }

  // PMD_UNIT_OPTIONS_CHECKOUT_REVIEW_20260604_V4
  // Option-enabled items must be configurable per unit in checkout review.
  // Example: 4x Burger with sides becomes Burger · Item 1..4.
  // Simple items without options stay grouped, e.g. 3x Cola.
  const personalReviewItems = useMemo(() => {
    return allItems.flatMap((cartItem, cartIndex) => {
      const quantity = Math.max(1, Number(cartItem.quantity || 1))
      const hasOptions = Array.isArray((cartItem.item as any)?.options) && (cartItem.item as any).options.length > 0
      const itemId = String((cartItem.item as any)?.id || `item-${cartIndex}`)
      const baseName = cartItem.item.nameKey ? t(cartItem.item.nameKey as TranslationKey) : cartItem.item.name

      if (!hasOptions) {
        return [{
          ...cartItem,
          __pmdOptionKey: itemId,
          __pmdUnitLabel: undefined,
        }]
      }

      if (quantity <= 1) {
        return [{
          ...cartItem,
          quantity: 1,
          __pmdOptionKey: `${itemId}-${cartIndex}-0`,
          __pmdUnitLabel: undefined,
          __pmdSourceQuantity: quantity,
        }]
      }

      return Array.from({ length: quantity }, (_, unitIndex) => ({
        ...cartItem,
        quantity: 1,
        __pmdOptionKey: `${itemId}-${cartIndex}-${unitIndex}`,
        __pmdUnitLabel: `${baseName} · Item ${unitIndex + 1}`,
        __pmdSourceQuantity: quantity,
      }))
    })
  }, [allItems, t])

  // Flatten allItems into individual item instances for split bill
  const allItemInstances = allItems.flatMap((cartItem, cartIndex) =>
    Array.from({ length: cartItem.quantity }).map((_, i) => ({
      cartIndex,
      item: cartItem.item,
      price: cartItem.item.price || 0,
      key: `${cartItem.item.id}-${cartIndex}-${i}`,
      quantity: 1,
      orderMenuId: Number((cartItem.item as any).__order_menu_id || 0) || undefined,
      menuId: Number((cartItem.item as any).__menu_id || (cartItem.item as any).id || 0) || undefined,
    }))
  )

  // For split bill, use selected individual items; otherwise, use all items
  const itemsToPay = isSplitting
    ? Object.values(selectedItems)
    : personalReviewItems.map((cartItem: any) => ({
        item: cartItem.item,
        price: adjustPriceForVAT(cartItem.item.price || 0),
        quantity: Number(cartItem.quantity || 1),
        optionKey: String(cartItem.__pmdOptionKey || cartItem.item.id)
      }))

  const subtotal = useMemo(
    () => itemsToPay.reduce((acc, inst) => {
      let itemTotal = inst.price * (inst.quantity || 1)

      // Add option prices (with VAT adjustment if needed)
      const itemOptions = selectedOptions[String((inst as any).optionKey || inst.item.id)] || {}
      if (Object.keys(itemOptions).length > 0) {
        const menuItem = allItems.find(cartItem => cartItem.item.id === inst.item.id)
        if (menuItem && menuItem.item.options) {
          Object.values(itemOptions).forEach(optionId => {
            menuItem.item.options!.forEach(option => {
              const optionValue = option.values.find(val => val.id.toString() === optionId)
              if (optionValue) {
                itemTotal += adjustPriceForVAT(optionValue.price) * (inst.quantity || 1)
              }
            })
          })
        }
      }

      return acc + itemTotal
    }, 0),
    [itemsToPay, selectedOptions, allItems, taxSettings],
  )
  // Calculate VAT if enabled AND VAT should be applied on checkout (not already included in prices)
  // vat_menu_price: 0 = VAT included in menu price, 1 = apply VAT on checkout
  const taxAmount = useMemo(() => calculateCheckoutTax(subtotal, taxSettings), [subtotal, taxSettings.enabled, taxSettings.percentage, taxSettings.menuPrice])
  useEffect(() => {
    if (!onCartPricingUpdate) return
    if (!Array.isArray(allItems) || allItems.length === 0) {
      onCartPricingUpdate(null)
      return
    }

    const displayItems = personalReviewItems.map((cartItem: any) => {
      const optionKey = String(cartItem.__pmdOptionKey || cartItem.item.id)
      const selectedForUnit = selectedOptions[optionKey] || {}
      const optionDetails: Array<{ name: string; price: number }> = []

      Object.entries(selectedForUnit).forEach(([optionName, optionId]) => {
        const option = (cartItem.item.options || []).find((candidate: any) => String(candidate.name) === String(optionName))
        const value = option?.values?.find((candidate: any) => String(candidate.id) === String(optionId))
        if (value) optionDetails.push({ name: String(value.value || value.name || ''), price: Number(adjustPriceForVAT(Number(value.price || 0))) })
      })

      const baseName = cartItem.item.nameKey ? t(cartItem.item.nameKey as TranslationKey) : cartItem.item.name
      const optionSummary = optionDetails.map((option) => option.name).filter(Boolean).join(', ')
      const displayName = optionSummary ? `${baseName} — ${optionSummary}` : String(cartItem.__pmdUnitLabel || baseName)
      const unitPrice = Number(adjustPriceForVAT(cartItem.item.price || 0)) + optionDetails.reduce((sum, option) => sum + Number(option.price || 0), 0)
      const quantity = Number(cartItem.quantity || 1)

      return {
        ...cartItem,
        quantity,
        __pmdDisplayName: displayName,
        __pmdDisplayUnitPrice: unitPrice,
        __pmdDisplaySubtotal: unitPrice * quantity,
      }
    })

    onCartPricingUpdate({ items: displayItems, subtotal, tax: taxAmount, total: subtotal + taxAmount })
  }, [allItems, personalReviewItems, selectedOptions, subtotal, taxAmount, onCartPricingUpdate, t, taxSettings.enabled, taxSettings.percentage, taxSettings.menuPrice])

  const submittedBaseTotal = useMemo(() => calculateSubmittedBaseTotal(submittedSnapshot, pendingSummary), [submittedSnapshot?.remainingAmount, submittedSnapshot?.total, submittedSnapshot?.orderTotal, pendingSummary?.remainingAmount])
  const isOrderStatusFlow = submittedBaseTotal > 0 && checkoutStep !== "review"
  const tipBaseAmount = isOrderStatusFlow ? submittedBaseTotal : subtotal
  const tipAmount = calculateTipAmount(tipBaseAmount, tipPercentage, customTip)
  const couponBaseAmount = isOrderStatusFlow ? submittedBaseTotal : subtotal

  // Calculate coupon discount
  const couponDiscount = useMemo(() => calculateCouponDiscount(appliedCoupon, couponBaseAmount), [appliedCoupon, couponBaseAmount])

  const finalTotal = calculateFinalTotal(subtotal, taxAmount, tipAmount, couponDiscount)
  const orderStatusTotal = calculateOrderStatusTotal(submittedBaseTotal, subtotal, taxAmount)

  // Phase 2B: split bill state transitions should move behind a shared checkout hook without changing this UI.
  const splitGuestProfiles = useMemo(() => buildSplitGuestProfiles(splitGuestCount, SPLIT_GUEST_PROFILES), [splitGuestCount])
  const splitGuestNames = useMemo(() => splitGuestProfiles.map((profile) => profile.name), [splitGuestProfiles])
  const getSplitGuestAvatar = (idx: number) => getSplitGuestAvatarFromProfiles(splitGuestProfiles, idx)

  const suggestedSplitGuestCount = useMemo(() => {
    const groupCount = Array.isArray(tableDraft?.groups)
      ? tableDraft.groups.filter((group: any) => Array.isArray(group?.items) && group.items.length > 0).length
      : 0
    const contributorIds = new Set<string>()
    const submittedItems = Array.isArray(submittedSnapshot?.submittedItems) ? submittedSnapshot.submittedItems : []
    submittedItems.forEach((item: any) => {
      const contributor = String(item?.guest_session_id || item?.guestSessionId || item?.submitted_by || "").trim()
      if (contributor) contributorIds.add(contributor)
    })
    const itemContributorCount = contributorIds.size
    return Math.max(2, Math.min(10, groupCount || itemContributorCount || 2))
  }, [tableDraft?.groups, submittedSnapshot?.submittedItems])

  const addSplitGuest = () => {
    const nextCount = Math.min(10, splitGuestCount + 1)
    setSplitGuestCount(nextCount)
    setSharePercents(buildEvenSharePercents(nextCount))
  }

  const removeSplitGuest = () => {
    const nextCount = Math.max(2, splitGuestCount - 1)
    setSplitGuestCount(nextCount)
    setSharePercents(buildEvenSharePercents(nextCount))
  }

  useEffect(() => {
    setSharePercents((prev) => normalizeSharePercentsForGuestCount(prev, splitGuestCount, buildEvenSharePercents(splitGuestCount)))
    setItemAssignments((prev) => pruneItemAssignmentsForGuestCount(prev, splitGuestCount))
  }, [splitGuestCount])

  const splitSourceItems = useMemo<SplitSourceItem[]>(() => {
    const submittedItems = groupOrderDisplayItems(Array.isArray(submittedSnapshot?.submittedItems) ? submittedSnapshot.submittedItems : [])
    if (submittedItems.length > 0) {
      return submittedItems.flatMap((item: any, itemIndex: number) => {
        const quantity = Math.max(1, Number(item?.quantity || 1))
        const unitAmount = getOrderItemUnitAmount(item)
        return Array.from({ length: quantity }, (_, unitIndex) => ({
          key: `submitted-${item?.order_menu_id || item?.menu_id || item?.id || itemIndex}-${unitIndex}`,
          name: String(item?.name || `Item ${itemIndex + 1}`),
          amount: Number.isFinite(unitAmount) ? unitAmount : 0,
          orderMenuId: Number(item?.order_menu_id || item?.id || 0) || undefined,
        }))
      })
    }

    return allItemInstances.map((instance, index) => ({
      key: instance.key,
      name: instance.item.nameKey ? t(instance.item.nameKey as TranslationKey) : (instance.item.name || `Item ${index + 1}`),
      amount: Number(adjustPriceForVAT(instance.price || 0)),
      orderMenuId: instance.orderMenuId,
    }))
  }, [submittedSnapshot?.submittedItems, allItemInstances, t, taxSettings.enabled, taxSettings.percentage, taxSettings.menuPrice])

  const splitSubtotal = useMemo(() => calculateSplitSubtotal(splitSourceItems), [splitSourceItems])
  const splitGrandTotal = useMemo(() => submittedBaseTotal > 0 ? orderStatusTotal : finalTotal, [submittedBaseTotal, orderStatusTotal, finalTotal])
  const splitExtraAmount = Math.max(0, splitGrandTotal - splitSubtotal)

  const equalSplitPeople = useMemo(() => buildEqualSplitPeople({
    splitGrandTotal,
    splitGuestCount,
    splitGuestNames,
    splitGuestProfiles,
    splitSubtotal,
    splitExtraAmount,
    paidSplitPeople,
    selectedSplitPersonId,
  }), [splitGrandTotal, splitGuestCount, splitGuestNames, splitGuestProfiles, splitSubtotal, splitExtraAmount, paidSplitPeople, selectedSplitPersonId])

  const itemSplitPeople = useMemo(() => buildItemSplitPeople({
    splitGuestCount,
    splitSourceItems,
    itemAssignments,
    splitSubtotal,
    splitExtraAmount,
    couponDiscount,
    splitGuestNames,
    splitGuestProfiles,
    paidSplitPeople,
    selectedSplitPersonId,
  }), [splitGuestCount, splitSourceItems, itemAssignments, splitSubtotal, splitExtraAmount, couponDiscount, splitGuestNames, splitGuestProfiles, paidSplitPeople, selectedSplitPersonId])

  const shareSplitPeople = useMemo(() => buildShareSplitPeople({
    splitGuestCount,
    sharePercents,
    splitGrandTotal,
    splitSubtotal,
    splitExtraAmount,
    splitGuestNames,
    splitGuestProfiles,
    paidSplitPeople,
    selectedSplitPersonId,
  }), [splitGuestCount, sharePercents, splitGrandTotal, splitSubtotal, splitExtraAmount, splitGuestNames, splitGuestProfiles, paidSplitPeople, selectedSplitPersonId])

  const activeSplitPeople = getActiveSplitPeople({ splitMethod, equalSplitPeople, itemSplitPeople, shareSplitPeople })
  const selectedSplitPerson = getSelectedSplitPerson(activeSplitPeople, selectedSplitPersonId)
  const { unassignedSplitItems, sharePercentTotal, canConfirmSplitMethod } = calculateSplitConfirmationState({
    splitMethod,
    splitSourceItems,
    itemAssignments,
    sharePercents,
    splitGuestCount,
  })

  const splitPaymentTip = selectedSplitPersonId ? (splitPaymentTips[selectedSplitPersonId] || { percentage: 0, custom: "" }) : { percentage: 0, custom: "" }
  const paymentTipPercentage = selectedSplitPerson ? splitPaymentTip.percentage : tipPercentage
  const paymentCustomTip = selectedSplitPerson ? splitPaymentTip.custom : customTip
  const {
    paymentBaseAmount,
    paymentTipAmount,
    paymentCouponDiscount,
    paymentPayableTotal,
    paymentSubtotalAmount,
    paymentVatAmount,
    paymentVatPercentage,
  } = calculatePaymentSummary({
    selectedSplitPerson,
    submittedBaseTotal,
    finalTotal,
    paymentCustomTip,
    paymentTipPercentage,
    couponDiscount,
    submittedSnapshot,
    taxPercentage: taxSettings?.percentage ?? 0,
  })
  const { paidTipAmount, paidCouponDiscount, paidAmountTotal } = calculatePaidSnapshotTotals({
    checkoutStep,
    submittedSnapshot,
    paymentTipAmount,
    tipAmount,
    paymentCouponDiscount,
    couponDiscount,
    orderStatusTotal,
    paymentPayableTotal,
  })

  const updatePaymentTipPercentage = (percentage: number) => {
    if (selectedSplitPersonId) {
      setSplitPaymentTips((prev) => ({ ...prev, [selectedSplitPersonId]: { percentage, custom: "" } }))
      return
    }
    setTipPercentage(percentage)
    setCustomTip("")
  }

  const updatePaymentCustomTip = (value: string) => {
    if (selectedSplitPersonId) {
      setSplitPaymentTips((prev) => ({ ...prev, [selectedSplitPersonId]: { percentage: 0, custom: value } }))
      return
    }
    setCustomTip(value)
    setTipPercentage(0)
  }

  const resetPaymentAdjustmentsAfterSuccess = () => {
    removeCoupon()
    setCouponCode("")
    setCouponError(null)
    setTipPercentage(0)
    setCustomTip("")
  }

  const payableTotal = useMemo(() => calculatePayableTotal({ checkoutStep, paymentPayableTotal, orderStatusTotal, finalTotal }), [checkoutStep, paymentPayableTotal, orderStatusTotal, finalTotal])
  // PMD_PAYMENT_METHOD_SMOOTH_SCROLL_EFFECT
  useEffect(() => {
    if (checkoutStep !== "payment" || !selectedPaymentMethod) return

    const container = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
    const detail = document.querySelector('[data-pmd-payment-selected-detail="1"]') as HTMLElement | null
    if (!container) return

    let raf = 0
    let cancelled = false

    const easeInOutCubic = (t: number) => (
      t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2
    )

    const animateTo = (targetTop: number, duration = 760) => {
      const startTop = container.scrollTop
      const maxTop = Math.max(0, container.scrollHeight - container.clientHeight)
      const finalTop = Math.max(0, Math.min(targetTop, maxTop))
      const delta = finalTop - startTop
      const startTime = performance.now()

      const step = (now: number) => {
        if (cancelled) return
        const progress = Math.min(1, (now - startTime) / duration)
        container.scrollTop = startTop + (delta * easeInOutCubic(progress))
        if (progress < 1) {
          raf = window.requestAnimationFrame(step)
        }
      }

      raf = window.requestAnimationFrame(step)
    }

    const runSmoothScroll = () => {
      if (detail) {
        const buffer = 28
        const targetTop = detail.offsetTop + detail.offsetHeight - container.clientHeight + buffer
        animateTo(targetTop, 820)
      } else {
        animateTo(container.scrollHeight - container.clientHeight, 820)
      }
    }

    const t1 = window.setTimeout(runSmoothScroll, 50)
    const t2 = window.setTimeout(runSmoothScroll, 240)
    const t3 = window.setTimeout(runSmoothScroll, 520)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [checkoutStep, selectedPaymentMethod])

  // PMD_MARK_REAL_PAYMENT_PANELS_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return
    if (checkoutStep !== "payment") return

    const markRealPaymentPanels = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (!root) return

      const candidates = Array.from(root.querySelectorAll("div")) as HTMLElement[]

      const normalizedText = (el: HTMLElement) =>
        (el.textContent || "").replace(/\s+/g, " ").trim()

      const scoreCandidate = (el: HTMLElement) => {
        const rect = el.getBoundingClientRect()
        const text = normalizedText(el)
        return {
          el,
          text,
          area: rect.width * rect.height,
          length: text.length,
        }
      }

      const findSmallestPanel = (required: string[], forbidden: string[] = []) => {
        return candidates
          .map(scoreCandidate)
          .filter((row) => {
            if (row.area < 8000) return false
            if (row.length < 5) return false
            if (!required.every((word) => row.text.includes(word))) return false
            if (forbidden.some((word) => row.text.includes(word))) return false
            return true
          })
          .sort((a, b) => a.length - b.length || a.area - b.area)[0]?.el || null
      }

      const summaryPanel = findSmallestPanel(["Ready to pay?", "Base amount", "Payable total"], ["Payment Methods"])
      const tipCouponPanel = findSmallestPanel(["Add tip", "0%", "5%", "10%"], ["Payment Methods", "Card Information"])

      if (summaryPanel) {
        summaryPanel.setAttribute("data-pmd-payment-real-panel", "summary")
      }

      if (tipCouponPanel) {
        tipCouponPanel.setAttribute("data-pmd-payment-real-panel", "tip-coupon")
      }

      ;[summaryPanel, tipCouponPanel].filter(Boolean).forEach((panel) => {
        const el = panel as HTMLElement
        el.style.setProperty("background", "transparent", "important")
        el.style.setProperty("background-color", "transparent", "important")
        el.style.setProperty("border-color", "transparent", "important")
        el.style.setProperty("box-shadow", "none", "important")

        Array.from(el.querySelectorAll("div")).forEach((child) => {
          const childEl = child as HTMLElement
          childEl.style.setProperty("background-color", "transparent", "important")
          childEl.style.setProperty("background", "transparent", "important")
          childEl.style.setProperty("box-shadow", "none", "important")
        })
      })
    }

    markRealPaymentPanels()

    const t1 = window.setTimeout(markRealPaymentPanels, 60)
    const t2 = window.setTimeout(markRealPaymentPanels, 220)
    const t3 = window.setTimeout(markRealPaymentPanels, 700)

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(markRealPaymentPanels)
    })

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]')
    if (root) {
      void observer; // PMD_PERF_SAFE: observer disabled to prevent Payment freeze
    }

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      observer.disconnect()
    }
  }, [checkoutStep, couponDiscount, tipPercentage, customTip, appliedCoupon?.code, selectedPaymentMethod])


  // PMD_SEND_KITCHEN_BUTTON_MARKER_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll('button')) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()
        if (txt.includes("Send order to kitchen")) {
          btn.setAttribute("data-pmd-send-kitchen-btn", "1")

          const spans = btn.querySelectorAll("span")
          if (spans[0]) spans[0].setAttribute("data-pmd-send-kitchen-label", "1")
          if (spans[1]) spans[1].setAttribute("data-pmd-send-kitchen-arrow-wrap", "1")

          const svg = btn.querySelector("svg")
          if (svg) svg.setAttribute("data-pmd-send-kitchen-arrow", "1")
        }
      })
    }

    apply()

    const t1 = window.setTimeout(apply, 40)
    const t2 = window.setTimeout(apply, 180)
    const t3 = window.setTimeout(apply, 700)

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document.body
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(apply)
    })

    void observer; // PMD_PERF_SAFE: observer disabled to prevent Payment freeze

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      observer.disconnect()
    }
  }, [checkoutStep, selectedPaymentMethod, isSplitting, selectedSplitPersonId, couponDiscount, tipPercentage, customTip])


  // PMD_MARK_REAL_PAYMENT_PANELS_BG_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return
    if (checkoutStep !== "payment") return

    const markPanels = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (!root) return

      const allDivs = Array.from(root.querySelectorAll("div")) as HTMLElement[]

      const normalize = (el: HTMLElement) =>
        (el.textContent || "").replace(/\s+/g, " ").trim()

      const scored = allDivs.map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          el,
          txt: normalize(el),
          area: rect.width * rect.height,
          len: normalize(el).length,
        }
      })

      const pick = (required: string[], forbidden: string[] = []) => {
        return scored
          .filter((row) => row.area > 9000)
          .filter((row) => required.every((needle) => row.txt.includes(needle)))
          .filter((row) => !forbidden.some((needle) => row.txt.includes(needle)))
          .sort((a, b) => a.len - b.len || a.area - b.area)[0]?.el || null
      }

      const summary = pick(["Ready to pay?", "Base amount", "Payable total"], ["Card Information", "Payment Methods"])
      const tipCoupon = pick(["Add tip", "0%", "5%", "10%"], ["Card Information", "Payment Methods"])

      if (summary) summary.setAttribute("data-pmd-payment-real-panel", "summary")
      if (tipCoupon) tipCoupon.setAttribute("data-pmd-payment-real-panel", "tip-coupon")

      const wrapper = pick(["Ready to pay?", "Add tip"], ["Card Information", "Payment Methods"])
      if (wrapper) wrapper.setAttribute("data-pmd-payment-adjustment-card", "1")
    }

    markPanels()

    const t1 = window.setTimeout(markPanels, 50)
    const t2 = window.setTimeout(markPanels, 220)
    const t3 = window.setTimeout(markPanels, 800)

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]')
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(markPanels)
    })

    if (root) {
      void observer; // PMD_PERF_SAFE: observer disabled to prevent Payment freeze
    }

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      observer.disconnect()
    }
  }, [checkoutStep, couponDiscount, tipPercentage, customTip, appliedCoupon?.code, selectedPaymentMethod])

  // PMD_COMPACT_ACTIONS_REAL_PAYMENT_BG_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const softCream = "#FAF9F3"

    const normalize = (value: string | null | undefined) =>
      String(value || "").replace(/\s+/g, " ").trim()

    const setSoftCream = (el: HTMLElement | null) => {
      if (!el) return
      el.style.setProperty("background", softCream, "important")
      el.style.setProperty("background-color", softCream, "important")
      el.style.setProperty("background-image", "none", "important")
      el.style.setProperty("box-shadow", "none", "important")
    }

    const markTableOrderActions = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = normalize(btn.textContent)

        if (txt.includes("Send order to kitchen")) {
          btn.setAttribute("data-pmd-send-kitchen-btn", "1")

          const spans = btn.querySelectorAll("span")
          if (spans[0]) spans[0].setAttribute("data-pmd-send-kitchen-label", "1")
          if (spans[1]) spans[1].setAttribute("data-pmd-send-kitchen-arrow-wrap", "1")

          const svg = btn.querySelector("svg")
          if (svg) svg.setAttribute("data-pmd-send-kitchen-arrow", "1")

          let parent = btn.parentElement as HTMLElement | null
          for (let i = 0; i < 6 && parent; i += 1) {
            const parentText = normalize(parent.textContent)
            const buttonCount = parent.querySelectorAll("button").length

            if (parentText.includes("Send order to kitchen") && parentText.includes("Continue ordering") && buttonCount >= 2) {
              parent.setAttribute("data-pmd-table-order-actions-row", "1")

              Array.from(parent.querySelectorAll("button")).forEach((rowButton) => {
                const rowBtn = rowButton as HTMLElement
                const rowText = normalize(rowBtn.textContent)

                if (rowText.includes("Continue ordering")) {
                  rowBtn.setAttribute("data-pmd-table-order-continue-btn", "1")
                }
              })

              break
            }

            parent = parent.parentElement as HTMLElement | null
          }
        }
      })
    }

    const markPaymentPanels = () => {
      if (checkoutStep !== "payment") return

      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (!root) return

      const divs = Array.from(root.querySelectorAll("div")) as HTMLElement[]

      const score = (el: HTMLElement) => {
        const rect = el.getBoundingClientRect()
        const txt = normalize(el.textContent)
        return {
          el,
          txt,
          area: rect.width * rect.height,
          len: txt.length,
        }
      }

      const rows = divs.map(score)

      const pickSmallest = (required: string[], forbidden: string[] = []) => {
        return rows
          .filter((row) => row.area > 4000)
          .filter((row) => required.every((word) => row.txt.includes(word)))
          .filter((row) => !forbidden.some((word) => row.txt.includes(word)))
          .sort((a, b) => a.len - b.len || a.area - b.area)[0]?.el || null
      }

      const paymentHeader = root.querySelector('[data-pmd-payment-header-copy-row="1"]') as HTMLElement | null
      const summaryOnly = pickSmallest(["Base amount", "Payable total"], ["Card Information", "Payment Methods"])
      const tipOnly = pickSmallest(["Add tip", "0%", "5%", "10%"], ["Card Information", "Payment Methods"])
      const fullAdjustment = pickSmallest(["Base amount", "Payable total", "Add tip"], ["Card Information", "Payment Methods"])

      if (paymentHeader) {
        paymentHeader.setAttribute("data-pmd-payment-soft-bg", "header")
        setSoftCream(paymentHeader)
      }

      if (summaryOnly) {
        summaryOnly.setAttribute("data-pmd-payment-real-panel", "summary")
        setSoftCream(summaryOnly)
      }

      if (tipOnly) {
        tipOnly.setAttribute("data-pmd-payment-real-panel", "tip-coupon")
        // PMD_REAL_TIP_COUPON_WRITER_NO_BLINK_20260605
        // Do NOT paint the Add tip / coupon panel cream.
        // It must be transparent from the same writer that marks it,
        // otherwise another hook has to correct it after paint and the UI blinks.
        tipOnly.style.setProperty("background", "transparent", "important")
        tipOnly.style.setProperty("background-color", "transparent", "important")
        tipOnly.style.setProperty("background-image", "none", "important")
        tipOnly.style.setProperty("border-color", "transparent", "important")
        tipOnly.style.setProperty("box-shadow", "none", "important")
      }

      if (fullAdjustment) {
        fullAdjustment.setAttribute("data-pmd-payment-adjustment-shell", "1")
        fullAdjustment.setAttribute("data-pmd-payment-soft-bg", "shell")
        setSoftCream(fullAdjustment)

        Array.from(fullAdjustment.querySelectorAll("div")).forEach((child) => {
          const childEl = child as HTMLElement

          // PMD_REAL_TIP_COUPON_WRITER_NO_BLINK_20260605
          // Do not repaint Add tip / coupon inner rows.
          if (childEl.closest('[data-pmd-payment-real-panel="tip-coupon"]')) return

          setSoftCream(childEl)
        })
      }

      ;[paymentHeader, summaryOnly, tipOnly, fullAdjustment].filter(Boolean).forEach((panel) => {
        const el = panel as HTMLElement
        el.querySelectorAll("input, textarea, select").forEach((input) => {
          const pmdKazenInputSkipTarget = input as HTMLElement
          if (pmdKazenInputSkipTarget.closest('[data-pmd-kazen-checkout-shell="1"] form[data-pmd-stripe-form="1"]')) return // PMD_SKIP_OLD_INPUT_STYLER_FOR_KAZEN_PAYMENT_20260612
          const inputEl = input as HTMLElement
          inputEl.style.setProperty("background", softCream, "important")
          inputEl.style.setProperty("background-color", softCream, "important")
          inputEl.style.setProperty("box-shadow", "none", "important")
        })
      })
    }

    const applyAll = () => {
      markTableOrderActions()
      markPaymentPanels()
    }

    applyAll()

    const t1 = window.setTimeout(applyAll, 40)
    const t2 = window.setTimeout(applyAll, 180)
    const t3 = window.setTimeout(applyAll, 520)
    const t4 = window.setTimeout(applyAll, 1100)

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document.body
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applyAll)
    })

    void observer; // PMD_PERF_SAFE: observer disabled to prevent Payment freeze

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.clearTimeout(t4)
      observer.disconnect()
    }
  }, [checkoutStep, selectedPaymentMethod, couponDiscount, tipPercentage, customTip, appliedCoupon?.code, isSplitting, selectedSplitPersonId])

  // PMD_TABLE_ORDER_BUTTONS_LIKE_CONFIRM_EFFECT
  useEffect(() => {
    const normalize = (value: string | null | undefined) =>
      String(value || "").replace(/\s+/g, " ").trim()

    const applyTableOrderButtonLayout = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const text = normalize(btn.textContent)

        if (!text.includes("Send order to kitchen")) return

        btn.setAttribute("data-pmd-table-order-confirm-like", "primary")
        btn.setAttribute("data-pmd-send-kitchen-btn", "1")

        const spans = Array.from(btn.querySelectorAll("span")) as HTMLElement[]
        if (spans[0]) spans[0].setAttribute("data-pmd-send-kitchen-label", "1")
        if (spans[1]) spans[1].setAttribute("data-pmd-send-kitchen-arrow-wrap", "1")

        const svg = btn.querySelector("svg") as SVGElement | null
        if (svg) svg.setAttribute("data-pmd-send-kitchen-arrow", "1")

        const readyRow = btn.parentElement as HTMLElement | null
        if (readyRow && normalize(readyRow.textContent).includes("Ready to send?")) {
          readyRow.setAttribute("data-pmd-table-order-ready-row", "1")
        }

        let shell = readyRow?.parentElement as HTMLElement | null
        for (let i = 0; i < 8 && shell; i += 1) {
          const shellText = normalize(shell.textContent)
          const shellButtons = Array.from(shell.querySelectorAll("button")) as HTMLElement[]

          if (
            shellText.includes("Ready to send?") &&
            shellText.includes("Send order to kitchen") &&
            shellText.includes("Continue ordering") &&
            shellButtons.length >= 2
          ) {
            shell.setAttribute("data-pmd-table-order-actions-shell", "1")

            shellButtons.forEach((candidate) => {
              const candidateText = normalize(candidate.textContent)
              if (candidateText.includes("Continue ordering")) {
                candidate.setAttribute("data-pmd-table-order-confirm-like", "secondary")
                candidate.setAttribute("data-pmd-table-order-continue-btn", "1")
              }
            })

            break
          }

          shell = shell.parentElement as HTMLElement | null
        }
      })
    }

    applyTableOrderButtonLayout()

    const t1 = window.setTimeout(applyTableOrderButtonLayout, 40)
    const t2 = window.setTimeout(applyTableOrderButtonLayout, 180)
    const t3 = window.setTimeout(applyTableOrderButtonLayout, 650)

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document.body
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applyTableOrderButtonLayout)
    })

    void observer; // PMD_PERF_SAFE: observer disabled to prevent Payment freeze

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      observer.disconnect()
    }
  }, [checkoutStep, submittedSnapshot?.orderId, selectedPaymentMethod])

  // PMD_CARD_ACTION_BUTTONS_CONFIRM_SEND_CONTINUE_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const primaryBg = "#062F2A"
    const primaryHover = "#021F1C"
    const secondaryText = "#0D1B1E"
    const secondaryBorder = "color-mix(in srgb, #b88940 42%, var(--theme-border) 58%)"

    const forceChildrenColor = (btn: HTMLElement, color: string) => {
      btn.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty("color", color, "important")
        el.style.setProperty("-webkit-text-fill-color", color, "important")
        el.style.setProperty("text-shadow", "none", "important")
        if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) {
          el.style.setProperty("stroke", color, "important")
        }
      })
    }

    const stylePrimary = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("background", primaryBg, "important")
      btn.style.setProperty("background-color", primaryBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("box-shadow", "0 10px 22px rgba(0, 0, 0, 0.24)", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("opacity", "1", "important")
      forceChildrenColor(btn, "#FFFFFF")
    }

    const styleSecondary = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("background", "transparent", "important")
      btn.style.setProperty("background-color", "transparent", "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1.5px solid ${secondaryBorder}`, "important")
      btn.style.setProperty("color", secondaryText, "important")
      btn.style.setProperty("-webkit-text-fill-color", secondaryText, "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(17, 24, 39, 0.04)", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      forceChildrenColor(btn, secondaryText)
    }

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()

        if (txt === "Confirm") {
          btn.setAttribute("data-pmd-card-confirm-btn", "1")
          stylePrimary(btn)
        }

        if (txt === "Send to kitchen" || txt === "Send order to kitchen" || txt === "Sending...") {
          btn.setAttribute("data-pmd-card-send-kitchen-btn", "1")
          stylePrimary(btn)
        }

        if (txt === "Continue ordering") {
          btn.setAttribute("data-pmd-card-continue-btn", "1")
          styleSecondary(btn)
        }
      })
    }

    apply()

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(apply)
    })
    // PMD_PERF_FIX: body MutationObserver disabled to prevent Payment/Order modal freeze.

    ;[0, 50, 150, 350, 700, 1200].forEach((delay) => {
      window.setTimeout(apply, delay)
    })

    return () => observer.disconnect()
  }, [])

  // PMD_PAY_SPLIT_REVIEW_BUTTONS_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const primaryBg = "#062F2A"
    const primaryHover = "#021F1C"
    const secondaryText = "#0D1B1E"
    const secondaryBorder = "color-mix(in srgb, #b88940 48%, var(--theme-border) 52%)"

    const forceChildrenColor = (btn: HTMLElement, color: string) => {
      btn.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty("color", color, "important")
        el.style.setProperty("-webkit-text-fill-color", color, "important")
        el.style.setProperty("text-shadow", "none", "important")

        if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) {
          el.style.setProperty("stroke", color, "important")
          el.style.setProperty("fill", "none", "important")
        }
      })
    }

    const common = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("max-width", "none", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("gap", "0.55rem", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("letter-spacing", "-0.01em", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("transition", "transform 180ms cubic-bezier(.2,0,0,1), box-shadow 180ms ease, background-color 180ms ease, border-color 180ms ease", "important")
    }

    const stylePrimary = (btn: HTMLElement) => {
      common(btn)
      btn.style.setProperty("background", primaryBg, "important")
      btn.style.setProperty("background-color", primaryBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("box-shadow", "0 10px 22px rgba(0, 0, 0, 0.24)", "important")
      btn.style.setProperty("opacity", "1", "important")
      forceChildrenColor(btn, "#FFFFFF")
    }

    const styleSecondary = (btn: HTMLElement) => {
      common(btn)
      btn.style.setProperty("background", "transparent", "important")
      btn.style.setProperty("background-color", "transparent", "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1.5px solid ${secondaryBorder}`, "important")
      btn.style.setProperty("color", secondaryText, "important")
      btn.style.setProperty("-webkit-text-fill-color", secondaryText, "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(17, 24, 39, 0.04)", "important")
      forceChildrenColor(btn, secondaryText)
    }

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()

        if (txt.includes("Pay in full")) {
          btn.setAttribute("data-pmd-card-pay-full-btn", "1")
          stylePrimary(btn)
        }

        if (txt.includes("Split bill")) {
          btn.setAttribute("data-pmd-card-split-bill-btn", "1")
          styleSecondary(btn)
        }

        if (txt === "Review split" || txt.includes("Review split")) {
          btn.setAttribute("data-pmd-card-review-split-btn", "1")
          stylePrimary(btn)
        }
      })
    }

    apply()

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(apply)
    })
    // PMD_PERF_FIX: body MutationObserver disabled to prevent Payment/Order modal freeze.

    ;[0, 50, 150, 350, 700, 1200].forEach((delay) => {
      window.setTimeout(apply, delay)
    })

    return () => observer.disconnect()
  }, [])

  // PMD_NO_OBSERVER_BUTTON_STYLE_FINAL
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const primaryBg = "#062F2A"
    const primaryHover = "#021F1C"
    const secondaryText = "#0D1B1E"
    const secondaryBorder = "color-mix(in srgb, #b88940 48%, var(--theme-border) 52%)"

    const forceChildren = (btn: HTMLElement, color: string) => {
      btn.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty("color", color, "important")
        el.style.setProperty("-webkit-text-fill-color", color, "important")
        el.style.setProperty("text-shadow", "none", "important")
        if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) {
          el.style.setProperty("stroke", color, "important")
        }
      })
    }

    const common = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("max-width", "none", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("gap", "0.55rem", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("letter-spacing", "-0.01em", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("opacity", "1", "important")
    }

    const primary = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-no-observer-action", "primary")
      common(btn)
      btn.style.setProperty("background", primaryBg, "important")
      btn.style.setProperty("background-color", primaryBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("box-shadow", "0 10px 22px rgba(0, 0, 0, 0.24)", "important")
      forceChildren(btn, "#FFFFFF")
    }

    const secondary = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-no-observer-action", "secondary")
      common(btn)
      btn.style.setProperty("background", "transparent", "important")
      btn.style.setProperty("background-color", "transparent", "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1.5px solid ${secondaryBorder}`, "important")
      btn.style.setProperty("color", secondaryText, "important")
      btn.style.setProperty("-webkit-text-fill-color", secondaryText, "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(17, 24, 39, 0.04)", "important")
      forceChildren(btn, secondaryText)
    }

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()

        if (
          txt === "Confirm" ||
          txt.includes("Send to kitchen") ||
          txt.includes("Send order to kitchen") ||
          txt.includes("Sending") ||
          txt.includes("Pay in full") ||
          txt.includes("Review split")
        ) {
          primary(btn)
          return
        }

        if (
          txt === "Continue ordering" ||
          txt.includes("Split bill")
        ) {
          secondary(btn)
          return
        }
      })
    }

    apply()
    const timers = [0, 80, 200, 500, 900, 1400].map((delay) => window.setTimeout(apply, delay))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [checkoutStep])

  // PMD_RENDER_SAFE_PLUS_CONFIRM_SEND_SPLIT_FIX
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const primaryBg = "#062F2A"
    const primaryHover = "#021F1C"
    const secondaryText = "#0D1B1E"
    const softBg = "#FAF9F3"

    const forceChildren = (btn: HTMLElement, color: string) => {
      btn.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty("color", color, "important")
        el.style.setProperty("-webkit-text-fill-color", color, "important")
        el.style.setProperty("text-shadow", "none", "important")
        if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) {
          el.style.setProperty("stroke", color, "important")
        }
      })
    }

    const commonButton = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("max-width", "none", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("gap", "0.55rem", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("letter-spacing", "-0.01em", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("opacity", "1", "important")
    }

    const primary = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-render-safe-action", "primary")
      commonButton(btn)
      btn.style.setProperty("background", primaryBg, "important")
      btn.style.setProperty("background-color", primaryBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("box-shadow", "0 10px 22px rgba(0, 0, 0, 0.24)", "important")
      forceChildren(btn, "#FFFFFF")
    }

    const secondary = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-render-safe-action", "secondary")
      commonButton(btn)
      btn.style.setProperty("background", "transparent", "important")
      btn.style.setProperty("background-color", "transparent", "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", "1.5px solid color-mix(in srgb, #b88940 48%, var(--theme-border) 52%)", "important")
      btn.style.setProperty("color", secondaryText, "important")
      btn.style.setProperty("-webkit-text-fill-color", secondaryText, "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(17, 24, 39, 0.04)", "important")
      forceChildren(btn, secondaryText)
    }

    const splitChoice = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-render-safe-split-method", "1")
      commonButton(btn)
      btn.style.setProperty("background", softBg, "important")
      btn.style.setProperty("background-color", softBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1.5px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", primaryBg, "important")
      btn.style.setProperty("-webkit-text-fill-color", primaryBg, "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(6, 47, 42, 0.06)", "important")
      forceChildren(btn, primaryBg)
    }

    const plusButton = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-render-safe-plus", "1")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("font-weight", "900", "important")
      btn.style.setProperty("opacity", "1", "important")
    }

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()
        const aria = btn.getAttribute("aria-label") || ""

        if (aria === "Increase quantity" && txt.includes("+")) {
          plusButton(btn)
          return
        }

        if (
          txt === "Confirm" ||
          txt.includes("Send to kitchen") ||
          txt.includes("Send order to kitchen") ||
          txt.includes("Sending") ||
          txt.includes("Pay in full") ||
          txt.includes("Review split")
        ) {
          primary(btn)
          return
        }

        if (
          txt === "Continue ordering" ||
          txt.includes("Split bill")
        ) {
          secondary(btn)
          return
        }

        if (
          false /* PMD_DISABLE_OLD_SPLIT_RUNTIME_WRITER: Split equally */ ||
          false /* PMD_DISABLE_OLD_SPLIT_RUNTIME_WRITER: By order items */ ||
          false /* PMD_DISABLE_OLD_SPLIT_RUNTIME_WRITER: By shares */
        ) {
          splitChoice(btn)
          return
        }
      })
    }

    const w = window as any
    w.__pmdRenderSafeButtonSeq = (w.__pmdRenderSafeButtonSeq || 0) + 1
    const seq = w.__pmdRenderSafeButtonSeq

    const timers = [0, 40, 120, 260, 520, 900, 1400].map((delay) =>
      window.setTimeout(() => {
        if ((window as any).__pmdRenderSafeButtonSeq === seq) apply()
      }, delay)
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  })

  // PMD_PLUS_WHITE_AND_SHARE_LINK_BUTTONS_FIX
  useEffect(() => {
    const primaryBg = "#062F2A"
    const primaryHover = "#021F1C"
    const softBg = "#FAF9F3"

    const forceChildren = (btn: HTMLElement, color: string) => {
      btn.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty("color", color, "important")
        el.style.setProperty("-webkit-text-fill-color", color, "important")
        el.style.setProperty("text-shadow", "none", "important")
        if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) {
          el.style.setProperty("stroke", color, "important")
        }
      })
    }

    const commonButton = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("gap", "0.55rem", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("opacity", "1", "important")
    }

    const primary = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-share-extra-action", "primary")
      commonButton(btn)
      btn.style.setProperty("background", primaryBg, "important")
      btn.style.setProperty("background-color", primaryBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("box-shadow", "0 10px 22px rgba(0, 0, 0, 0.24)", "important")
      forceChildren(btn, "#FFFFFF")
    }

    const secondaryGreenFrame = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-share-extra-action", "secondary")
      commonButton(btn)
      btn.style.setProperty("background", softBg, "important")
      btn.style.setProperty("background-color", softBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1.5px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", primaryBg, "important")
      btn.style.setProperty("-webkit-text-fill-color", primaryBg, "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(6, 47, 42, 0.06)", "important")
      forceChildren(btn, primaryBg)
    }

    const plusWhite = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-plus-force-white", "1")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("font-weight", "900", "important")
      btn.style.setProperty("opacity", "1", "important")
    }

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()
        const aria = btn.getAttribute("aria-label") || ""

        if (aria === "Increase quantity" && txt.includes("+")) {
          plusWhite(btn)
          return
        }

        if (txt.includes("Pay my share")) {
          primary(btn)
          return
        }

        if (
          txt.includes("Send payment link to others") ||
          txt.includes("Show QR/share link")
        ) {
          secondaryGreenFrame(btn)
          return
        }
      })
    }

    const timers = [0, 30, 80, 180, 350, 700, 1200, 1800].map((delay) =>
      window.setTimeout(apply, delay)
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [checkoutStep])


// PMD_SELECT_PAYER_BUTTON_FRAME_FIX
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const applySelectPayerStyle = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()

        if (txt === "Select payer") {
          btn.setAttribute("data-pmd-select-payer-btn", "1")
          btn.style.setProperty("min-height", "3.5rem", "important")
          btn.style.setProperty("height", "3.5rem", "important")
          btn.style.setProperty("width", "100%", "important")
          btn.style.setProperty("border-radius", "9999px", "important")
          btn.style.setProperty("display", "flex", "important")
          btn.style.setProperty("align-items", "center", "important")
          btn.style.setProperty("justify-content", "center", "important")
          btn.style.setProperty("padding", "0 1.25rem", "important")
          btn.style.setProperty("background", "#FAF9F3", "important")
          btn.style.setProperty("background-color", "#FAF9F3", "important")
          btn.style.setProperty("background-image", "none", "important")
          btn.style.setProperty("border", "1.5px solid #062F2A", "important")
          btn.style.setProperty("color", "#062F2A", "important")
          btn.style.setProperty("-webkit-text-fill-color", "#062F2A", "important")
          btn.style.setProperty("font-weight", "750", "important")
          btn.style.setProperty("font-size", "1rem", "important")
          btn.style.setProperty("box-shadow", "0 8px 18px rgba(6, 47, 42, 0.06)", "important")
          btn.style.setProperty("text-shadow", "none", "important")
        }
      })
    }

    const timers = [0, 60, 160, 350, 700].map((delay) => window.setTimeout(applySelectPayerStyle, delay))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [checkoutStep, selectedSplitPersonId, splitMethod])
  const estimatePrepMinutes = (items: Array<any>) => {
    const normalized = (items || []).map((item) => ({
      quantity: Math.max(1, Number(item?.quantity || 1)),
      prep: Math.max(0, Number(item?.prep_time_minutes ?? item?.item?.prep_time_minutes ?? 15) || 15),
    }))
    const quantity = normalized.reduce((acc, item) => acc + item.quantity, 0)
    const base = normalized.reduce((acc, item) => Math.max(acc, item.prep), 15)
    const buffer = Math.min(15, Math.max(0, (quantity - 1) * 2))
    return Math.max(10, Math.min(90, Math.round(base + buffer)))
  }
  const estimatedMinutes = useMemo(() => {
    const backendEta = Number(submittedSnapshot?.etaMinutes || submittedSnapshot?.estimated_prep_minutes || 0)
    if (backendEta > 0) return backendEta
    return estimatePrepMinutes(submittedSnapshot?.submittedItems || itemsToPay)
  }, [submittedSnapshot?.submittedItems, submittedSnapshot?.etaMinutes, submittedSnapshot?.estimated_prep_minutes, itemsToPay])
  // NOTE: Live status-based ETA text would require backend order-status polling/endpoint.
  const vatLabels = useMemo(() => {
    if (!taxSettings.enabled || taxSettings.percentage <= 0) {
      return { summary: "Order Summary", subtotal: "Subtotal", total: "Total", includedNote: "" }
    }

    if (taxSettings.menuPrice === 0) {
      const vatPct = Number.isInteger(taxSettings.percentage)
        ? String(taxSettings.percentage)
        : String(Number(taxSettings.percentage.toFixed(2)))

      return {
        summary: "Order Summary",
        subtotal: `Subtotal (incl. ${vatPct}% VAT)`,
        total: "Total",
        includedNote: `prices incl. ${vatPct}% VAT`,
      }
    }

    return { summary: "Order Summary", subtotal: "Subtotal", total: "Total", includedNote: "" }
  }, [taxSettings.enabled, taxSettings.percentage, taxSettings.menuPrice])

  // PMD_TIP_COUPON_PANEL_INLINE_BG_FINAL_20260605
  // VISUAL ONLY: override only the inline background of Add tip / coupon panel.
  // No payment logic, no coupon logic, no cart logic, no plus/minus logic.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const clearTipCouponPanelBackground = () => {
      if (checkoutStep !== "payment") return

      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (!root) return

      const panel = root.querySelector('[data-pmd-payment-real-panel="tip-coupon"]') as HTMLElement | null
      if (!panel) return

      const makeTransparent = (el: HTMLElement | null | undefined) => {
        if (!el) return
        el.style.setProperty("background", "transparent", "important")
        el.style.setProperty("background-color", "transparent", "important")
        el.style.setProperty("background-image", "none", "important")
        el.style.setProperty("border-color", "transparent", "important")
        el.style.setProperty("box-shadow", "none", "important")
      }

      makeTransparent(panel)

      Array.from(panel.children).forEach((child) => {
        const childEl = child as HTMLElement
        makeTransparent(childEl)

        Array.from(childEl.children).forEach((grandChild) => {
          makeTransparent(grandChild as HTMLElement)
        })
      })
    }

    clearTipCouponPanelBackground()

    const t1 = window.setTimeout(clearTipCouponPanelBackground, 60)
    const t2 = window.setTimeout(clearTipCouponPanelBackground, 220)
    const t3 = window.setTimeout(clearTipCouponPanelBackground, 700)
    const t4 = window.setTimeout(clearTipCouponPanelBackground, 1400)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.clearTimeout(t4)
    }
  }, [checkoutStep, couponDiscount, tipPercentage, customTip, appliedCoupon?.code, selectedPaymentMethod])


  // PMD_FLATTEN_EXACT_CHECKOUT_FRAMES_SAFE_20260606
  // VISUAL ONLY: flatten only the exact checkout div frames found by audit.
  // Does NOT touch buttons, inputs, Pay, Send to kitchen, Split bill, quantity controls, or payment/order logic.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
    if (!root) return

    const flattenDiv = (el: HTMLElement | null | undefined) => {
      if (!el) return

      // Never touch controls or payment form internals.
      if (el.matches("button,input,textarea,select")) return
      if (el.closest('form[data-pmd-stripe-form="1"]')) return
      if (el.closest('[data-pmd-payment-selected-detail="1"]')) return

      el.style.setProperty("background", "transparent", "important")
      el.style.setProperty("background-color", "transparent", "important")
      el.style.setProperty("background-image", "none", "important")
      el.style.setProperty("border-color", "transparent", "important")
      el.style.setProperty("box-shadow", "none", "important")
    }

    const exactSelectors = [
      '[data-pmd-payment-header-copy-row="1"]',
      '[data-pmd-split-guest-stepper="1"]',
      '.pmd-checkout-meta-row',
      '.pmd-checkout-total-card',
      '.pmd-checkout-flat-section',
      '.pmd-checkout-list-scroll',
      '.pmd-checkout-item-card',
      '.surface-sub.rounded-2xl.p-4.space-y-4',
      '.surface-sub.rounded-2xl.p-3.space-y-1',
      '.surface-sub.rounded-2xl.p-3.space-y-2',
      '.surface-sub.rounded-2xl.p-3.space-y-3',
      '.surface-sub.rounded-3xl.p-3.space-y-3',
      '.rounded-2xl.p-3.shadow-sm',
      '.rounded-2xl.border.p-3',
      '.flex.items-center.justify-between.rounded-2xl.border.p-3'
    ]

    for (const selector of exactSelectors) {
      root.querySelectorAll(selector).forEach((node) => {
        flattenDiv(node as HTMLElement)
      })
    }
  }, [checkoutStep, selectedPaymentMethod, splitMethod, splitGuestCount, couponDiscount, tipPercentage, customTip, appliedCoupon?.code])


  // PMD_HIDE_ORDER_TYPE_TABLE_NUMBER_20260606
  // VISUAL ONLY: hide Order type / Table number / Order Number rows inside checkout cards.
  // Does NOT touch buttons, inputs, payment logic, split logic, quantity controls, or order submit logic.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return

    const hideOrderMetaRows = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (!root) return

      // Main known row used for "Order type Delivery" / table context.
      root.querySelectorAll(".pmd-checkout-meta-row").forEach((node) => {
        const el = node as HTMLElement
        el.setAttribute("data-pmd-order-meta-hidden", "1")
        el.style.setProperty("display", "none", "important")
      })

      // Catch small direct rows such as "Order Number: 1606" or "Table number: 4"
      // without hiding large cards that contain totals.
      root.querySelectorAll("div").forEach((node) => {
        const el = node as HTMLElement

        if (el.matches("button,input,textarea,select")) return
        if (el.closest('form[data-pmd-stripe-form="1"]')) return
        if (el.closest('[data-pmd-payment-selected-detail="1"]')) return

        const rect = el.getBoundingClientRect()
        if (rect.width < 80 || rect.height < 10 || rect.height > 80) return

        const text = (el.innerText || "").trim().replace(/\s+/g, " ")
        if (!text) return

        const firstChildText = ((el.children?.[0] as HTMLElement | undefined)?.innerText || "")
          .trim()
          .replace(/\s+/g, " ")

        const isMetaLabel =
          /^(Order\s*type|Order\s*Number|Table\s*Number|Table)\s*:?\s*$/i.test(firstChildText)

        const isMetaRow =
          /^(Order\s*type|Order\s*Number|Table\s*Number|Table)\s*:?/i.test(text)

        if (isMetaLabel || isMetaRow) {
          el.setAttribute("data-pmd-order-meta-hidden", "1")
          el.style.setProperty("display", "none", "important")
        }
      })
    }

    hideOrderMetaRows()

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
    if (!root) return

    const observer = new MutationObserver(() => hideOrderMetaRows())
    observer.observe(root, { childList: true, subtree: true })

    const t1 = window.setTimeout(hideOrderMetaRows, 50)
    const t2 = window.setTimeout(hideOrderMetaRows, 250)

    return () => {
      observer.disconnect()
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [checkoutStep])









  const modalPrimaryBtn = isKazenJapaneseCheckoutVisual
    ? "min-h-10 w-full rounded-none px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.025em] leading-tight transition disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 whitespace-normal break-words overflow-hidden"
    : "min-h-12 w-full rounded-2xl px-5 py-3 text-sm font-semibold transition hover:brightness-105 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
  const modalPrimaryBtnStyle: React.CSSProperties = isKazenJapaneseCheckoutVisual
    ? {
        background: "#17120e",
        color: "#f8f0df",
        WebkitTextFillColor: "#f8f0df",
        textShadow: "none",
        border: "1px solid rgba(125, 92, 48, .68)",
        borderRadius: 0,
        boxShadow: "none",
      }
    : isOrganicCheckoutVisual
      ? organicCheckoutPrimaryButtonStyle
      : {
          background: "#062F2A",
          color: "#FFFFFF",
          textShadow: "none",
          border: "1px solid #062F2A",
        }

  // PMD_PERMANENT_CONSOLE_TIP_COUPON_FIX_20260605
  // Narrow runtime visual fix for tip custom field + coupon/apply only.
  // This intentionally does NOT touch plus/minus buttons, cart buttons, Pay in full, Split bill, or payment logic.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const forceStyle = (el: HTMLElement | null | undefined, styles: Record<string, string>) => {
      if (!el) return
      Object.entries(styles).forEach(([key, value]) => {
        el.style.setProperty(key, value, "important")
      })
    }

    const applyTipCouponVisualFix = () => {
      const root =
        (document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null) ||
        (document.querySelector('[data-pmd-checkout-design-system="1"]') as HTMLElement | null)

      if (!root) return

      const custom = root.querySelector(
        'input[data-pmd-custom-tip-shows-selected-amount="1"]'
      ) as HTMLElement | null

      const customWrap = custom?.closest("div") as HTMLElement | null
      const euro = customWrap?.querySelector("span") as HTMLElement | null

      const coupon = root.querySelector('input[placeholder="Coupon code"]') as HTMLElement | null
      const applyButton = coupon?.parentElement?.querySelector("button") as HTMLElement | null

      forceStyle(customWrap, {
        height: "46px",
        "min-height": "46px",
        "max-height": "46px",
      })

      forceStyle(euro, {
        left: "20px",
        top: "50%",
        height: "46px",
        "line-height": "46px",
        display: "flex",
        "align-items": "center",
        transform: "translateY(-50%)",
        "font-size": "14px",
        "font-weight": "750",
        "z-index": "2",
        "pointer-events": "none",
      })

      forceStyle(custom, {
        height: "46px",
        "min-height": "46px",
        "max-height": "46px",
        "line-height": "46px",
        "box-sizing": "border-box",
        "padding-left": "54px",
        "padding-right": "14px",
        "font-size": "14.72px",
        "font-weight": "650",
        "border-radius": "9999px",
      })

      forceStyle(coupon, {
        height: "46px",
        "min-height": "46px",
        "max-height": "46px",
        "line-height": "46px",
        "box-sizing": "border-box",
        "padding-left": "16px",
        "padding-right": "16px",
        "font-size": "14.72px",
        "font-weight": "650",
        "border-radius": "9999px",
      })

      forceStyle(applyButton, {
        height: "46px",
        "min-height": "46px",
        "max-height": "46px",
        "line-height": "1",
        "box-sizing": "border-box",
        "font-size": "14.72px",
        "font-weight": "750",
        "border-radius": "9999px",
      })
    }

    let rafId: number | null = null

    const scheduleFix = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        applyTipCouponVisualFix()
      })
    }

    applyTipCouponVisualFix()

    const observer = new MutationObserver(scheduleFix)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "disabled"],
    })

    const intervalId = window.setInterval(applyTipCouponVisualFix, 700)

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId)
      observer.disconnect()
      window.clearInterval(intervalId)
    }
  }, [])

  const modalSecondaryBtn = isKazenJapaneseCheckoutVisual
    ? "min-h-10 w-full rounded-none px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.025em] leading-tight transition border border-[rgba(125,92,48,.68)] text-[#17120e] bg-[#fbf7ee] inline-flex items-center justify-center gap-2 whitespace-normal break-words overflow-hidden"
    : "min-h-10 w-full rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--theme-surface)] active:scale-[0.99] border border-[color:var(--theme-border)] text-[color:var(--theme-text-primary)] bg-transparent inline-flex items-center justify-center gap-2"
  const iconBackBtn = "h-9 w-9 rounded-full border border-[#062F2A] bg-[#062F2A] text-white hover:bg-[#021F1C] hover:text-white pmd-v2-action-circle hover:opacity-90"
  const toolbarIconBtnStyle: React.CSSProperties = {
    background: "color-mix(in srgb, var(--theme-surface) 92%, #f5fff8 8%)",
    border: "1px solid var(--theme-border)",
    color: "var(--theme-text-primary)",
    boxShadow: "0 6px 16px rgba(17,24,39,0.08)",
              borderRadius: "9999px",
  }
  const draftContext = useMemo(() => buildTableOrderDraftContext(
    tableInfo,
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("qr") : null,
  ), [tableInfo?.table_id, tableInfo?.table_no, tableInfo?.qr_code])

  const getDraftContext = () => draftContext

  const refreshTableDraft = async () => {
    const context = getDraftContext()
    if (!context.table_id && !context.table_no && !context.qr) return null
    setDraftLoading(true)
    try {
      const latest = await apiClient.getTableOrderDraft(context)
      if (latest?.success) {
        setTableDraft(latest)
        console.info("PMD_TABLE_DRAFT_LOADED", { status: latest.status, draft_id: latest.draft_id ?? null, order_id: latest.order_id ?? null })
        if (latest.order_id && latest.status && latest.status !== "draft" && latest.status !== "empty") {
          const normalizedLatestSnapshot = createSubmittedTableOrderSnapshot(latest, tableInfo, taxSettings?.percentage || 0)
          setSubmittedSnapshot((prev: any) => {
            const prevOrderId = Number(prev?.orderId || prev?.order_id || 0)
            const latestOrderId = Number(normalizedLatestSnapshot.orderId || 0)
            return !prev || prevOrderId !== latestOrderId ? normalizedLatestSnapshot : { ...prev, ...normalizedLatestSnapshot }
          })
          console.info("PMD_TABLE_ORDER_PAYMENT_READY", { order_id: latest.order_id, status: latest.status })
        }
      }
      return latest
    } finally {
      setDraftLoading(false)
    }
  }


  const {
    isSubmittingDraft: submitDraftLoading,
    confirmTableDraftItems: confirmTableDraftItemsAction,
    submitTableDraft: submitTableDraftAction,
  } = useTableOrderActions({
    context: draftContext,
    getGuestSessionId: ensureGuestSession,
    refreshDraft: refreshTableDraft,
  })

  useEffect(() => {
    if (!isOpen) return
    void refreshTableDraft()
    const timer = window.setInterval(() => { void refreshTableDraft() }, 12000)
    const onFocus = () => { void refreshTableDraft() }
    window.addEventListener("focus", onFocus)
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus) }
  }, [isOpen, tableInfo?.table_id, tableInfo?.table_no, tableInfo?.qr_code])

  // PMD_PRICED_OPTIONS_DRAFT_PAYLOAD_20260604
  // Send option-enabled unit rows with priced options to backend.
  // Backend remains source of truth for VAT/order totals, but it needs the per-line option subtotal.
  const buildPersonalDraftItems = () => personalReviewItems.map((cartItem: any) => {
    const menuId = Number((cartItem.item as any)?.id || (cartItem.item as any)?.menu_id || 0)
    const baseName = String((cartItem.item as any)?.name || (cartItem.item as any)?.title || "Item")
    const quantity = Number(cartItem.quantity || 1)
    const optionKey = String((cartItem as any).__pmdOptionKey || (cartItem.item as any)?.id)
    const selectedForUnit = selectedOptions[optionKey] || {}
    const optionGroups = Array.isArray((cartItem.item as any)?.options) ? (cartItem.item as any).options : []

    const optionDetails = Object.entries(selectedForUnit)
      .map(([groupName, selectedValueId]) => {
        const group = optionGroups.find((opt: any) =>
          String(opt?.name || "") === String(groupName) ||
          String(opt?.id || "") === String(groupName)
        )
        const value = (Array.isArray(group?.values) ? group.values : []).find((val: any) =>
          String(val?.id) === String(selectedValueId)
        )
        if (!group || !value) return null

        return {
          group: String(group?.name || groupName),
          option_id: String(group?.id || ""),
          option_value_id: String(value?.id || selectedValueId),
          value: String(value?.value || value?.name || selectedValueId),
          price: Number(adjustPriceForVAT(Number(value?.price || 0))),
        }
      })
      .filter(Boolean) as Array<{ group: string; option_id: string; option_value_id: string; value: string; price: number }>

    const optionLabel = optionDetails.map((option) => option.value).filter(Boolean).join(", ")
    const unitBasePrice = Number(adjustPriceForVAT(cartItem.item.price || 0))
    const unitOptionPrice = optionDetails.reduce((sum, option) => sum + Number(option.price || 0), 0)
    const unitPrice = Number((unitBasePrice + unitOptionPrice).toFixed(4))
    const lineSubtotal = Number((unitPrice * quantity).toFixed(4))

    return {
      menu_id: menuId,
      name: optionLabel ? `${baseName} — ${optionLabel}` : baseName,
      base_name: baseName,
      quantity,
      price: unitPrice,
      base_price: Number(unitBasePrice.toFixed(4)),
      option_total: Number((unitOptionPrice * quantity).toFixed(4)),
      subtotal: lineSubtotal,
      options: Object.fromEntries(optionDetails.map((option) => [option.group, option.option_value_id])),
      option_details: optionDetails,
      option_summary: optionLabel,
    }
  }).filter((item) => item.menu_id > 0 && item.quantity > 0)

  const handleConfirmMyItems = async () => {
    const draftItems = buildPersonalDraftItems()
    if (draftItems.length === 0) {
      toast({ title: "No items selected", description: "Add items to your personal cart before confirming.", variant: "destructive" })
      return
    }
    setIsLoading(true)
    try {
      const result = await confirmTableDraftItemsAction(draftItems)
      setTableDraft(result)
      setSubmittedSnapshot(null)
      clearCart()
      console.info("PMD_TABLE_DRAFT_CONFIRMED_ITEMS", { draft_id: result.draft_id ?? null, count: draftItems.length })
      toast({ title: "Items confirmed", description: "Your items were added to the table order. Submit the table order when everyone is ready." })
      await refreshTableDraft()
      onOpenOrderUpdate?.(result)
    } catch (error) {
      toast({ title: "Could not confirm items", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitTableDraft = async () => {
    if (!tableDraft?.draft_id && tableDraft?.status !== "draft") return
    try {
      const result = await submitTableDraftAction({ draftId: tableDraft?.draft_id ?? null, refreshOnError: true })
      const pmdSubmittedOrderId = Number((result as any)?.order_id || (result as any)?.orderId || 0)
      if (Number.isFinite(pmdSubmittedOrderId) && pmdSubmittedOrderId > 0) {
        pmdLatestSubmittedPaymentOrderIdRef.current = pmdSubmittedOrderId
        try {
          sessionStorage.setItem("pmd:latest-submitted-payment-order-id", String(pmdSubmittedOrderId))
          localStorage.setItem("pmd:latest-submitted-payment-order-id", String(pmdSubmittedOrderId))
        } catch {}
      }
      setTableDraft(result)
      clearCart()
      const submittedTableSnapshot = createSubmittedTableOrderSnapshot(result, tableInfo, taxSettings?.percentage || 0)
      try {
        const { sessionKey, legacyKey } = buildOpenOrderStorageKeys()
        localStorage.removeItem(legacyKey)
        localStorage.setItem(sessionKey, JSON.stringify({ ...submittedTableSnapshot, tenant: getTenantKey(), tableKey: getTableKey(), guestSessionId: ensureGuestSession() }))
      } catch {}
      console.info("PMD_SUBMITTED_ORDER_SNAPSHOT_NORMALIZED", {
        order_id: submittedTableSnapshot.orderId,
        total: submittedTableSnapshot.total,
        remainingAmount: submittedTableSnapshot.remainingAmount,
        itemCount: Array.isArray(submittedTableSnapshot.submittedItems) ? submittedTableSnapshot.submittedItems.length : 0,
      })
      setSubmittedSnapshot(submittedTableSnapshot)
            // PMD_NO_DOUBLE_CARD_CLEAR_SUBMIT_LOADING: action hook clears the old Sending state before showing Order Status.
      setCheckoutStep(getCheckoutStepAfterDraftSubmit())
      console.info("PMD_TABLE_DRAFT_SUBMITTED", { draft_id: tableDraft?.draft_id ?? null, order_id: result.order_id ?? null })
      toast({ title: "Table order submitted", description: "The table order was sent to the kitchen. Payment is now available." })
      onOpenOrderUpdate?.(submittedTableSnapshot)
    } catch (error) {
      toast({ title: "Could not submit table order", description: error instanceof Error ? error.message : "Please refresh and try again.", variant: "destructive" })
    }
  }

  const markOpenOrderAsPaid = (orderIdLike?: string | number | null, paymentDetails?: { tipAmount?: number; couponDiscount?: number; paidTotal?: number; couponCode?: string | null }) => {
    try {
      const sessionKey = buildOpenOrderStorageKeys().sessionKey
      const raw = localStorage.getItem(sessionKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (orderIdLike && parsed?.orderId && String(parsed.orderId) !== String(orderIdLike)) return
      parsed.paymentStatus = "paid"
      parsed.status = "paid"
      parsed.paidAt = Date.now()
      if (paymentDetails) {
        parsed.paidTipAmount = Number(paymentDetails.tipAmount || 0)
        parsed.paidCouponDiscount = Number(paymentDetails.couponDiscount || 0)
        parsed.paidTotal = Number(paymentDetails.paidTotal || 0)
        parsed.paidCouponCode = paymentDetails.couponCode || null
      }
      setSubmittedSnapshot((prev: any) => prev ? { ...prev, paymentStatus: 'paid', status: 'paid', paidAt: parsed.paidAt, paidTipAmount: parsed.paidTipAmount, paidCouponDiscount: parsed.paidCouponDiscount, paidTotal: parsed.paidTotal, paidCouponCode: parsed.paidCouponCode } : parsed)
      localStorage.setItem(sessionKey, JSON.stringify(parsed))
      onOpenOrderUpdate?.(parsed)
    } catch {}
  }


  // PMD_BLOCK_DRAFT_ID_AS_ORDER_ID_20260612
  // PMD_IGNORE_STALE_EXISTING_ORDER_ID_20260612
  const resolveSubmittedPaymentOrderId = (): number | null => {
    const draftIdRaw = Number((tableDraft as any)?.draft_id || 0)
    const draftId = Number.isFinite(draftIdRaw) && draftIdRaw > 0 ? draftIdRaw : null

    const tableDraftOrderIdRaw = Number((tableDraft as any)?.order_id || (tableDraft as any)?.orderId || 0)
    const tableDraftOrderId = Number.isFinite(tableDraftOrderIdRaw) && tableDraftOrderIdRaw > 0 ? tableDraftOrderIdRaw : null

    // PMD_FIX_PAYMENT_REQUIRES_REAL_ORDER_ID_20260612
    // A confirmed table draft is not payable until it is submitted and the backend returns a real order_id.
    if (draftId && !tableDraftOrderId) {
      return null
    }

    let storedLatestSubmittedOrderId: number | null = null
    try {
      const storedRaw =
        (typeof window !== "undefined" && (
          sessionStorage.getItem("pmd:latest-submitted-payment-order-id") ||
          localStorage.getItem("pmd:latest-submitted-payment-order-id")
        )) ||
        ""
      const storedValue = Number(storedRaw || 0)
      storedLatestSubmittedOrderId =
        Number.isFinite(storedValue) && storedValue > 0 ? storedValue : null
    } catch {}

    const snapshotOrderIdRaw = Number((submittedSnapshot as any)?.orderId || (submittedSnapshot as any)?.order_id || 0)
    const snapshotOrderId = Number.isFinite(snapshotOrderIdRaw) && snapshotOrderIdRaw > 0 ? snapshotOrderIdRaw : null
    const latestRefOrderId = pmdLatestSubmittedPaymentOrderIdRef.current
    const currentSubmittedOrderId = tableDraftOrderId || snapshotOrderId || latestRefOrderId || null
    const validatedStoredLatestOrderId =
      storedLatestSubmittedOrderId && (!currentSubmittedOrderId || storedLatestSubmittedOrderId === currentSubmittedOrderId)
        ? storedLatestSubmittedOrderId
        : null

    const existingOrderIdRaw = Number(existingOrderId || 0)
    const trustedExistingOrderId =
      Number.isFinite(existingOrderIdRaw) &&
      existingOrderIdRaw > 0 &&
      currentSubmittedOrderId &&
      existingOrderIdRaw === currentSubmittedOrderId
        ? existingOrderIdRaw
        : null

    const candidates = [
      currentSubmittedOrderId,
      tableDraftOrderId,
      snapshotOrderId,
      latestRefOrderId,
      validatedStoredLatestOrderId,
      trustedExistingOrderId,
    ]

    for (const raw of candidates) {
      const value = Number(raw || 0)
      if (!Number.isFinite(value) || value <= 0) continue

      // A table draft id is not a payable order id. Only allow the same number
      // if the backend explicitly returned it as tableDraft.order_id too.
      if (draftId && value === draftId && tableDraftOrderId !== value) continue

      return value
    }

    return null
  }

  const hasUnsubmittedPaymentDraft = (): boolean => {
    return Boolean((tableDraft as any)?.draft_id && !resolveSubmittedPaymentOrderId())
  }

  // PMD_USE_SUBMITTED_ORDER_AMOUNT_FOR_PAYMENT_20260612
  const pmdPositiveMoney = (value: any): number | null => {
    const amount = Number(value || 0)
    if (!Number.isFinite(amount) || amount <= 0) return null
    return Number(amount.toFixed(2))
  }

  const pmdSubmittedItemsSubtotal = (): number | null => {
    const rows =
      Array.isArray((submittedSnapshot as any)?.submittedItems) && (submittedSnapshot as any).submittedItems.length > 0
        ? (submittedSnapshot as any).submittedItems
        : (Array.isArray((tableDraft as any)?.items) ? (tableDraft as any).items : [])

    const total = rows.reduce((sum: number, row: any) => {
      const qty = Number(row?.quantity || row?.qty || 1)
      const direct =
        pmdPositiveMoney(row?.total) ??
        pmdPositiveMoney(row?.line_total) ??
        pmdPositiveMoney(row?.subtotal) ??
        null

      if (direct !== null) return sum + direct

      const price =
        pmdPositiveMoney(row?.price) ??
        pmdPositiveMoney(row?.unit_price) ??
        pmdPositiveMoney(row?.menu_price) ??
        pmdPositiveMoney(row?.item?.price) ??
        0

      return sum + (price * (Number.isFinite(qty) && qty > 0 ? qty : 1))
    }, 0)

    return pmdPositiveMoney(total)
  }

  const resolveSubmittedPaymentAmount = (): number => {
    const snapshot: any = submittedSnapshot || {}
    const draft: any = tableDraft || {}
    const draftTotals: any = draft?.totals || {}
    const initial: any = initialSubmittedOrder || {}
    const initialTotals: any = initial?.totals || {}

    if (selectedSplitPersonId && selectedSplitPerson) {
      return (
        pmdPositiveMoney(selectedSplitPerson.total) ??
        pmdPositiveMoney(paymentPayableTotal) ??
        0
      )
    }

    const candidates = [
      snapshot.remainingAmount,
      snapshot.orderTotal,
      snapshot.total,
      draftTotals.remainingAmount,
      draftTotals.orderTotal,
      draftTotals.total,
      pmdSubmittedItemsSubtotal(),
      initial.remainingAmount,
      initial.orderTotal,
      initial.total,
      initialTotals.remainingAmount,
      initialTotals.orderTotal,
      initialTotals.total,
      pendingSummary?.remainingAmount,
      pendingSummary?.orderTotal,
      pendingSummary?.total,
      paymentPayableTotal,
      payableTotal,
      finalTotal,
    ]

    for (const value of candidates) {
      const amount = pmdPositiveMoney(value)
      if (amount !== null) return amount
    }

    return 0
  }


  const handlePayment = async (
    stripePaymentIntentId?: string,
    forcedPaymentContext?: { method_code?: string | null; provider_code?: string | null }
  ) => {
    const effectiveMethodCode = forcedPaymentContext?.method_code || selectedPaymentMethod
    const selectedMethodForSubmit = visiblePaymentMethods.find(method => method.code === effectiveMethodCode)
    const selectedProviderCodeForSubmit =
      effectiveMethodCode === "cod"
        ? null
        : (forcedPaymentContext?.provider_code || (selectedMethodForSubmit as any)?.provider_code || null)
    const isStripeMethodForSubmit =
      selectedProviderCodeForSubmit === "stripe" &&
      (effectiveMethodCode === "card" || effectiveMethodCode === "apple_pay" || effectiveMethodCode === "google_pay" || effectiveMethodCode === "wero")

    if (isStripeMethodForSubmit && !stripePaymentIntentId) {
      toast({
        title: "Payment Failed",
        description: "Stripe payment confirmation is missing. Please try again.",
        variant: "destructive",
      })
      return
    }
    setIsLoading(true)
    try {
      const isCashier = tableInfo?.is_codier || false

      const routeTableId =
        typeof window !== "undefined"
          ? (window.location.pathname.match(/\/table\/(\d+)/)?.[1] ?? null)
          : null

      const queryTableId =
        typeof window !== "undefined"
          ? (
              new URLSearchParams(window.location.search).get("table") ||
              new URLSearchParams(window.location.search).get("table_id") ||
              new URLSearchParams(window.location.search).get("table_no") ||
              null
            )
          : null

      const rawResolvedTableId =
        tableInfo?.table_id ??
        routeTableId ??
        queryTableId ??
        null

      const numericResolvedTableId =
        rawResolvedTableId !== null &&
        rawResolvedTableId !== undefined &&
        String(rawResolvedTableId).trim() !== "" &&
        !Number.isNaN(Number(rawResolvedTableId))
          ? Number(rawResolvedTableId)
          : null

      const resolvedTableName =
        (tableInfo?.table_name && String(tableInfo.table_name).trim() !== "")
          ? String(tableInfo.table_name)
          : (numericResolvedTableId ? `Table ${numericResolvedTableId}` : "Delivery")

      const resolvedLocationId = Number(tableInfo?.location_id || 1)

      const normalizedItemsForOrder = itemsToPay.map((item, index) => {
        const menuIdCandidate = Number((item as any)?.item?.id ?? (item as any)?.item?.menu_id ?? 0)
        const quantityCandidate = Number((item as any)?.quantity || 1)
        const priceCandidate = Number((item as any)?.price ?? (item as any)?.item?.price ?? 0)
        const nameCandidate = String((item as any)?.item?.name ?? (item as any)?.item?.title ?? "").trim()

        return {
          menu_id: Number.isFinite(menuIdCandidate) ? menuIdCandidate : 0,
          name: nameCandidate !== "" ? nameCandidate : `Item ${index + 1}`,
          quantity: Number.isFinite(quantityCandidate) && quantityCandidate > 0 ? quantityCandidate : 1,
          price: Number.isFinite(priceCandidate) && priceCandidate >= 0 ? priceCandidate : 0,
          special_instructions: "",
          options: Object.fromEntries(
            Object.entries(selectedOptions[String((item as any)?.optionKey || (item as any)?.item?.id)] || {})
              .map(([key, value]) => [String(key), String(value ?? "")])
              .filter(([, value]) => value !== "")
          ),
        }
      })

      const orderData = {
        table_id: isCashier ? "cashier" : (numericResolvedTableId != null ? String(numericResolvedTableId) : null),
        table_name: String(isCashier ? "Cashier" : resolvedTableName),
        location_id: resolvedLocationId,
        is_codier: Boolean(isCashier),
        items: normalizedItemsForOrder,
        customer_name: String(
          isCashier
            ? "Cashier Customer"
            : `${resolvedTableName} Customer`
        ),
        customer_phone: String(paymentFormData.phone || ""),
        customer_email: String(paymentFormData.email || ""),
        payment_method: (
          effectiveMethodCode === "cod"
            ? "cash"
            : effectiveMethodCode === "paypal"
              ? "paypal"
              : "card"
        ) as 'cash' | 'paypal' | 'card',
        payment_method_raw: effectiveMethodCode || undefined,
        payment_provider: selectedProviderCodeForSubmit || undefined,
        payment_reference: stripePaymentIntentId ? String(stripePaymentIntentId) : undefined,
        stripe_payment_intent_id: (isStripeMethodForSubmit && stripePaymentIntentId) ? String(stripePaymentIntentId) : undefined,
        total_amount: Number(checkoutStep === "payment" ? payableTotal : finalTotal),
        tip_amount: Number(checkoutStep === "payment" ? paymentTipAmount : tipAmount),
        coupon_code: (checkoutStep === "payment" && selectedSplitPersonId) ? null : (appliedCoupon?.code ? String(appliedCoupon.code) : null),
        coupon_discount: Number(checkoutStep === "payment" ? paymentCouponDiscount : couponDiscount),
        guest_session_id: ensureGuestSession(),
        special_instructions: "",
      }

      const existingLocalOrder = !hasUnsubmittedPaymentDraft() && initialSubmittedOrder?.paymentStatus !== "paid" ? initialSubmittedOrder : null
      if (existingLocalOrder?.orderId) {
        ;(orderData as any).existing_order_id = Number(existingLocalOrder.orderId)
        ;(orderData as any).append_to_order = true
      }
      const paymentOrderIdCandidate = resolveSubmittedPaymentOrderId()
      console.info("PMD_PAYMENT_ORDER_ID_RESOLVED", {
        paymentOrderIdCandidate,
        latestRef: pmdLatestSubmittedPaymentOrderIdRef.current,
        submittedSnapshotOrderId: (submittedSnapshot as any)?.orderId || (submittedSnapshot as any)?.order_id || null,
        tableDraftOrderId: (tableDraft as any)?.order_id || (tableDraft as any)?.orderId || null,
        existingOrderId,
      })
      if (checkoutStep === "payment" && !paymentOrderIdCandidate) {
        setIsLoading(false)
        toast({
          title: "Order not found",
          description: "Please send the table order to the kitchen first.",
          variant: "destructive",
        })
        return
      }
      const isQrPayLaterSubmittedOrder = String(tableDraft?.payment || submittedSnapshot?.payment || "").toLowerCase() === "qr_pay_later"
      const shouldUsePayExisting = !!(checkoutStep === "payment" && paymentOrderIdCandidate && (pendingSummary || isQrPayLaterSubmittedOrder))
      if (checkoutStep === "payment" && paymentOrderIdCandidate && !shouldUsePayExisting) {
        try {
          const started = await apiClient.startExistingOrderPayment({
            order_id: Number(paymentOrderIdCandidate),
            payment_method: String(effectiveMethodCode || "card"),
            provider: selectedProviderCodeForSubmit || undefined,
            guest_session_id: ensureGuestSession(),
            table_id: tableInfo?.table_id ? String(tableInfo.table_id) : null,
            table_no: tableInfo?.table_no ? String(tableInfo.table_no) : null,
            source: "menu_existing_submitted",
          })
          if (String(effectiveMethodCode || "") === "cod") {
            setIsLoading(false)
            toast({ title: "Cash collection requested", description: started?.message || "Staff will collect payment shortly." })
            return
          }
          if (isStripeMethodForSubmit) {
            if (!stripePaymentIntentId) {
              throw new Error("Stripe payment confirmation is missing")
            }
            await apiClient.finalizeExistingOrderPayment({
              order_id: Number(paymentOrderIdCandidate),
              payment_intent_id: String(stripePaymentIntentId),
              payment_method: String(effectiveMethodCode || "card"),
              provider: selectedProviderCodeForSubmit || "stripe",
            })
          }
          if (selectedSplitPersonId) {
            setPaidSplitPeople((prev) => ({ ...prev, [selectedSplitPersonId]: true }))
          } else {
            markOpenOrderAsPaid(paymentOrderIdCandidate, { tipAmount: paymentTipAmount, couponDiscount: paymentCouponDiscount, paidTotal: paymentPayableTotal, couponCode: appliedCoupon?.code || null })
            resetPaymentAdjustmentsAfterSuccess()
          }
          setCheckoutStep(getCheckoutStepAfterPaymentSuccess())
          setIsLoading(false)
          toast({
            title: t("paymentSuccessful"),
            description: `Order #${paymentOrderIdCandidate} paid successfully!`,
          })
          return
        } catch (e) {
          setIsLoading(false)
          toast({
            title: "Payment unavailable",
            description: "Payment could not be started. Please ask staff or try again.",
            variant: "destructive",
          })
          return
        }
      }
      if (shouldUsePayExisting && paymentOrderIdCandidate) {
        const paidMethod = orderData.payment_method
        const selectedItemsPayload = selectedSplitPersonId && splitMethod === "items"
          ? splitSourceItems.reduce<Array<{ order_menu_id: number; quantity: number }>>((acc, item) => {
              const guestIndex = Number(String(selectedSplitPersonId).replace("guest-", ""))
              if (itemAssignments[item.key] !== guestIndex) return acc
              const orderMenuId = Number(item.orderMenuId || 0)
              if (!orderMenuId) return acc
              const existing = acc.find((row) => row.order_menu_id === orderMenuId)
              if (existing) existing.quantity += 1
              else acc.push({ order_menu_id: orderMenuId, quantity: 1 })
              return acc
            }, [])
          : undefined

        const existingOrderAmount = checkoutStep === "payment"
          ? resolveSubmittedPaymentAmount()
          : (selectedSplitPerson?.total
            ? Number(selectedSplitPerson.total.toFixed(2))
            : (isSplitting
              ? null
              : (toPositiveAmount(pendingSummary?.remainingAmount) ?? toPositiveAmount(submittedSnapshot?.total) ?? null)))

        console.info("PMD_PAYMENT_AMOUNT_RESOLVED", {
          order_id: paymentOrderIdCandidate,
          amount: existingOrderAmount,
          payableTotal,
          paymentPayableTotal,
          submittedSnapshotTotal: (submittedSnapshot as any)?.total ?? null,
          submittedSnapshotRemaining: (submittedSnapshot as any)?.remainingAmount ?? null,
          tableDraftTotal: (tableDraft as any)?.totals?.total ?? null,
          submittedItemsSubtotal: pmdSubmittedItemsSubtotal(),
        })

        const payExistingPayload = {
          payment_method: String(paidMethod),
          payment_reference: stripePaymentIntentId ? String(stripePaymentIntentId) : null,
          amount: existingOrderAmount,
          tip_amount: checkoutStep === "payment" ? Number(paymentTipAmount.toFixed(2)) : 0,
          coupon_discount: checkoutStep === "payment" ? Number(paymentCouponDiscount.toFixed(2)) : 0,
          coupon_code: checkoutStep === "payment" && appliedCoupon?.code ? String(appliedCoupon.code) : null,
          selected_items: selectedItemsPayload,
          table_id: tableInfo?.table_id ? String(tableInfo.table_id) : null,
          table_no: tableInfo?.table_no ? String(tableInfo.table_no) : null,
          qr: tableInfo?.qr_code ? String(tableInfo.qr_code) : null,
        }
        console.info("PMD_PAY_EXISTING_PAYLOAD", { order_id: paymentOrderIdCandidate, ...payExistingPayload })
        const paidResponse = await apiClient.payExistingQrOrder(paymentOrderIdCandidate, payExistingPayload)

        if (paidResponse?.success) {
          setIsLoading(false)
          toast({
            title: t("paymentSuccessful"),
            description: `Order #${paymentOrderIdCandidate} paid successfully!`
          })

          const orderId = String(paymentOrderIdCandidate)
          localStorage.setItem("lastOrderId", orderId)

          const returnUrl =
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : "/menu"

          const params = new URLSearchParams()
          params.set("order_id", orderId)
          params.set("return_url", returnUrl)

          if (selectedSplitPersonId) {
            setPaidSplitPeople((prev) => ({ ...prev, [selectedSplitPersonId]: true }))
          } else {
            markOpenOrderAsPaid(paymentOrderIdCandidate, { tipAmount: paymentTipAmount, couponDiscount: paymentCouponDiscount, paidTotal: paymentPayableTotal, couponCode: appliedCoupon?.code || null })
            resetPaymentAdjustmentsAfterSuccess()
          }
          setCheckoutStep(getCheckoutStepAfterPaymentSuccess())
          return
        }
      }

      const response = await apiClient.submitOrder(orderData)

      if (response.success) {
        setIsLoading(false)
        toast({
          title: t("paymentSuccessful"),
          description: `Order #${response.order_id} submitted successfully!`
        })

        const orderId = response.order_id ? String(response.order_id) : ""

        // Save order ID for status tracking
        if (orderId) {
          localStorage.setItem("lastOrderId", orderId)
        }

        const returnUrl =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "/menu"

        const params = new URLSearchParams()
        if (orderId) params.set("order_id", orderId)
        params.set("return_url", returnUrl)

        try {
          const guestSessionId = ensureGuestSession()
          const tenant = getTenantKey()
          const tableKey = getTableKey()
          const sessionKey = buildOpenOrderStorageKeys().sessionKey
          const orderIdVal = response.order_id ? String(response.order_id) : ''
          const responseTotals = Array.isArray((response as any)?.order_totals) ? (response as any).order_totals : []
          const getTotalByCode = (code: string) => {
            const found = responseTotals.find((row: any) => String(row?.code || '') === code)
            const amount = Number(found?.value ?? 0)
            return Number.isFinite(amount) ? amount : 0
          }
          const responseItems = Array.isArray((response as any)?.items) ? (response as any).items : []
          const combinedSubmittedItems = responseItems.length > 0
            ? responseItems.map((item: any) => ({
                id: Number(item?.menu_id || item?.id || 0),
                name: String(item?.name || 'Item'),
                quantity: Number(item?.quantity || 0),
                price: Number(item?.price || 0),
                subtotal: Number(item?.subtotal || (Number(item?.quantity || 0) * Number(item?.price || 0))),
              }))
            : normalizedItemsForOrder
          const settlement = (response as any)?.settlement || {}
          const serverOrderTotal = Number((response as any)?.order_total ?? (response as any)?.total ?? 0)
          const snapshot = {
            guestSessionId, tenant, tableKey,
            tableNumber: tableInfo?.table_no || tableInfo?.table_id || null,
            orderId: orderIdVal || null,
            status: 'submitted',
            paymentStatus: 'unpaid',
            subtotal: Number(getTotalByCode('subtotal') || subtotal || 0),
            vatAmount: Number(getTotalByCode('tax') || taxAmount || 0),
            vatPercentage: Number(taxSettings?.percentage || 0),
            total: Number(serverOrderTotal > 0 ? serverOrderTotal : (finalTotal || 0)),
            orderTotal: Number(serverOrderTotal > 0 ? serverOrderTotal : (finalTotal || 0)),
            settledAmount: Number(settlement?.settledAmount || 0),
            remainingAmount: Number(settlement?.remainingAmount ?? (serverOrderTotal > 0 ? serverOrderTotal : (finalTotal || 0))),
            settlementStatus: String(settlement?.settlementStatus || 'unpaid'),
            etaMinutes: Number((response as any)?.eta_minutes ?? (response as any)?.estimated_prep_minutes ?? estimatedMinutes),
            showCustomerEta: Boolean((response as any)?.show_customer_eta ?? true),
            currency: String(merchantSettings?.currency || 'EUR'),
            submittedItems: combinedSubmittedItems,
            createdAt: Date.now()
          }
          localStorage.setItem(sessionKey, JSON.stringify(snapshot))
          setSubmittedSnapshot(snapshot)
          onOpenOrderUpdate?.(snapshot)
        } catch {}
        clearCart()
        if (checkoutStep === "payment") {
          markOpenOrderAsPaid(orderId || submittedSnapshot?.orderId || null, { tipAmount: paymentTipAmount, couponDiscount: paymentCouponDiscount, paidTotal: paymentPayableTotal, couponCode: appliedCoupon?.code || null })
          resetPaymentAdjustmentsAfterSuccess()
          setCheckoutStep(getCheckoutStepAfterOrderSubmit(checkoutStep))
        } else {
          setCheckoutStep(getCheckoutStepAfterOrderSubmit(checkoutStep))
        }
        return
      } else {
        throw new Error('Order submission failed')
      }
    } catch (error) {
    setIsLoading(false)
      console.error('Order submission error:', error)
      const normalizedMessage =
        error instanceof Error && /given data was invalid|unprocessable|amount|selected items amount mismatch/i.test(error.message)
          ? "Payment could not be started. Please ask staff or try again."
          : null
      const validationDetails = (error as any)?.details as Record<string, string[]> | undefined
      const firstValidationMessage = validationDetails
        ? Object.values(validationDetails).flat().find(Boolean)
        : null
      toast({
        title: "Order Failed",
        description: normalizedMessage || firstValidationMessage || (error instanceof Error ? error.message : "Failed to submit order. Please try again."),
        variant: "destructive"
      })
    }
  }

  // Toggle selection for individual item instance
  const toggleItemSelection = (instance: SplitBillItem) => {
    setSelectedItems((prev) => {
      const newSelection = { ...prev }
      if (newSelection[instance.key]) {
        delete newSelection[instance.key]
      } else {
        newSelection[instance.key] = instance
      }
      return newSelection
    })
  }

  const handlePaymentMethodSelect = (methodId: string) => {
    setProviderInlineError(null)

    // Apple Pay / Google Pay must remain their own methods.
    // Do NOT reroute them to Stripe card fields.
    if (methodId === "card") {
      try {
        (globalThis as any).__stripePreferred = "card"
      } catch {}
    }
    setSelectedPaymentMethod(methodId)
  }
  const handleBackToMethods = () => {
    setProviderInlineError(null)
    setSelectedPaymentMethod(null)
    setCashCollectionConfirmed(false)
  }

  const handleFormChange = (field: keyof PaymentFormData, value: string) => {
    setPaymentFormData(prev => ({ ...prev, [field]: value }))
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = matches && matches[0] || ''
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(' ')
    } else {
      return v
    }
  }

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    if (v.length >= 2) {
      return v.substring(0, 2) + ' / ' + v.substring(2, 4)
    }
    return v
  }

  useEffect(() => {
    const api = new ApiClient();
    api.getPaymentMethods()
      .then(setPaymentMethods)
      .finally(() => setLoadingPayments(false));
  }, [])

  useEffect(() => {
    let cancelled = false
    setPaypalConfigLoading(true)

    fetch('/api/v1/payments/config-public')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        setPaypalPublicConfig({
          enabled: !!data?.paypalEnabled,
          clientId: data?.paypalClientId || "",
          currency: data?.currency || "EUR",
        })
      })
      .catch(() => {
        if (!cancelled) {
          setPaypalPublicConfig({
            enabled: false,
            clientId: "",
            currency: "EUR",
          })
        }
      })
      .finally(() => {
        if (!cancelled) setPaypalConfigLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    // Load VAT settings from backend on mount
    loadVATSettings()
  }, [loadVATSettings])

  const stripeUrlParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null

  const stripePathTableId =
    typeof window !== "undefined"
      ? (window.location.pathname.match(/\/table\/(\d+)/)?.[1] ?? null)
      : null

  const stripeResolvedTableIdRaw =
    tableInfo?.table_id ??
    stripeUrlParams?.get("table") ??
    stripeUrlParams?.get("table_id") ??
    stripeUrlParams?.get("table_no") ??
    stripePathTableId ??
    null

  const stripeResolvedDisplayTableRaw =
    (tableInfo as any)?.table_no ??
    stripeUrlParams?.get("table_no") ??
    stripeUrlParams?.get("table") ??
    stripeUrlParams?.get("table_id") ??
    tableInfo?.table_id ??
    stripePathTableId ??
    null

  const stripeResolvedTableNumber =
    stripeResolvedDisplayTableRaw !== null &&
    stripeResolvedDisplayTableRaw !== undefined &&
    String(stripeResolvedDisplayTableRaw).trim() !== "" &&
    !Number.isNaN(Number(stripeResolvedDisplayTableRaw))
      ? Number(stripeResolvedDisplayTableRaw)
      : null

  const stripeResolvedTableName =
    tableInfo?.table_name && String(tableInfo.table_name).trim() !== ""
      ? String(tableInfo.table_name)
      : (stripeResolvedTableNumber ? `Table ${stripeResolvedTableNumber}` : "Delivery")

  const stripeResolvedLocationId = Number(tableInfo?.location_id || 1)

  const stripeResolvedRestaurantId = String(
    tableInfo?.location_id ??
    (tableInfo as any)?.merchant_id ??
    merchantSettings?.accountId ??
    "default"
  )

  const selectedMethod = findPaymentMethod(visiblePaymentMethods, selectedPaymentMethod)
  const selectedProviderCode = getPaymentMethodProviderCode(selectedMethod)

  const stripePaymentData = {
    amount: resolveSubmittedPaymentAmount(),
    currency: (stripeConfig?.currency || merchantSettings?.currency || "EUR"),
    items: itemsToPay.map((item: any) => ({
      id: String(item.item.id),
      name: item.item.name,
      price: item.price,
      quantity: item.quantity || 1,
      restaurantId: stripeResolvedRestaurantId,
    })),
    customerInfo: {
      name: paymentFormData.cardholderName || "",
      email: paymentFormData.email || "",
      phone: paymentFormData.phone || "",
    },
    restaurantId: stripeResolvedRestaurantId,
    tableNumber: stripeResolvedTableNumber || 0,
  }

  const startHostedRedirectCheckout = async () => {
    if (!selectedMethod || !["card", "wero", "paypal", "apple_pay", "google_pay"].includes(selectedMethod.code)) return
    if (!(resolveSubmittedPaymentAmount() > 0)) {
      setProviderInlineError("Order total is still updating. Please reopen My Order.")
      toast({
        title: "Order total unavailable",
        description: "Order total is still updating. Please reopen My Order.",
        variant: "destructive",
      })
      return
    }
    const existingSubmittedOrderIdForGuard =
      checkoutStep === "payment" && !pendingSummary
        ? resolveSubmittedPaymentOrderId()
        : null

    if (checkoutStep === "payment" && !pendingSummary && !existingSubmittedOrderIdForGuard && hasUnsubmittedPaymentDraft()) {
      setProviderInlineError("Please submit the table order first, then start payment.")
      toast({
        title: "Submit order first",
        description: "Please submit the table order first, then start payment.",
        variant: "destructive",
      })
      return
    }

    setProviderInlineError(null)
    setIsLoading(true)
    let shouldFallbackFromWero = false
    try {
      let existingOrderStart: any = null
      const existingSubmittedOrderId =
        checkoutStep === "payment" && !pendingSummary
          ? resolveSubmittedPaymentOrderId()
          : null
      if (existingSubmittedOrderId) {
        existingOrderStart = await apiClient.startExistingOrderPayment({
          order_id: Number(existingSubmittedOrderId),
          payment_method: String(selectedMethod.code),
          provider: String((selectedMethod as any)?.provider_code || ""),
          guest_session_id: ensureGuestSession(),
          table_id: tableInfo?.table_id ? String(tableInfo.table_id) : null,
          table_no: tableInfo?.table_no ? String(tableInfo.table_no) : null,
          source: "menu_existing_submitted",
        })
      }
      const selectedProviderCodeForCheckout = String((selectedMethod as any)?.provider_code || "").toLowerCase()
      const providerCode = selectedMethod.code === "wero"
        ? (selectedProviderCodeForCheckout === "worldline" ? "worldline" : (selectedProviderCodeForCheckout === "vr_payment" ? "vr_payment" : "stripe"))
        : (selectedProviderCodeForCheckout || "unknown")
      const providerReturnCode = providerCode === "worldline" ? "worldline" : (providerCode === "vr_payment" ? "vr_payment" : "wero")
      const merchantReference = `PMD-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      const returnUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}${window.location.search ? `${window.location.search}&` : "?"}payment_return_provider=${encodeURIComponent(providerReturnCode)}`
          : "/menu"
      const cancelUrl =
        typeof window !== "undefined"
          ? window.location.href
          : "/menu"

      const vrEndpointByMethod: Record<string, string> = {
        card: "/api/v1/payments/vr-payment/card/create-session",
        paypal: "/api/v1/payments/vr-payment/paypal/create-session",
        wero: "/api/v1/payments/vr-payment/wero/create-session",
        apple_pay: "/api/v1/payments/vr-payment/apple-pay/create-session",
        google_pay: "/api/v1/payments/vr-payment/google-pay/create-session",
      }
      const checkoutEndpoint = providerCode === "vr_payment"
        ? (vrEndpointByMethod[selectedMethod.code] || "/api/v1/payments/vr-payment/card/create-session")
        : selectedMethod.code === "wero"
          ? (selectedProviderCodeForCheckout === "worldline"
            ? "/api/v1/payments/worldline/wero/create-session"
            : "/api/v1/payments/wero/create-session")
          : "/api/v1/payments/card/create-session"
      console.info("[PMD_CHECKOUT_FLOW_TRACE]", {
        selected_method: selectedMethod.code,
        backend_selected_provider: providerCode,
        endpoint: checkoutEndpoint,
        flow_mode: "primary",
      })
      const res = await fetch(checkoutEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(existingOrderStart?.amount || resolveSubmittedPaymentAmount()),
          currency: String(existingOrderStart?.currency || merchantSettings?.currency || "EUR"),
          return_url: returnUrl,
          cancel_url: cancelUrl,
          customer_email: paymentFormData.email || "",
          merchant_reference: merchantReference,
          order_id: existingSubmittedOrderId ? Number(existingSubmittedOrderId) : undefined,
          items: itemsToPay.map((item: any) => ({
            id: String(item.item.id),
            name: item.item.name,
            quantity: Number(item.quantity || 1),
            price: Number(item.price || 0),
          })),
        }),
      })

      const rawBody = await res.text()
      let json: any = null
      try {
        json = rawBody ? JSON.parse(rawBody) : null
      } catch {
        json = null
      }

      if (!res.ok || !json?.success || !json?.redirect_url) {
        const providerLabel = providerCode === "worldline"
          ? "Worldline"
          : providerCode === "vr_payment"
            ? "VR Payment"
            : providerCode === "sumup"
              ? "SumUp"
              : providerCode === "square"
                ? "Square"
                : "Stripe"
        const resolvedErrorCode = String(json?.resolved_error_code || json?.error_code || "").toLowerCase()
        const fallbackAllowedByCode = [
          "worldline_invalid_credentials_or_entitlement",
          "worldline_session_unavailable",
        ].includes(resolvedErrorCode)
        const fallbackAllowed = Boolean(json?.allow_fallback) || fallbackAllowedByCode
        const normalizedErrorMessage = json?.error
          || (rawBody && rawBody.length < 1000 ? rawBody : "")
          || `${providerLabel} checkout failed with HTTP ${res.status}`

        if (
          selectedMethod.code === "wero" &&
          (json?.error_code === "wero_not_supported" || json?.error_code === "wero_unavailable")
        ) {
          shouldFallbackFromWero = true
          throw new Error("Wero is currently unavailable. Please choose another payment method.")
        }
        if (selectedMethod.code === "wero") {
          if (providerCode === "worldline" && fallbackAllowed) {
            const fallbackReturnUrl = returnUrl.includes("payment_return_provider=")
              ? returnUrl.replace(/payment_return_provider=[^&]*/i, "payment_return_provider=wero")
              : `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}payment_return_provider=wero`
            const fallbackRes = await fetch("/api/v1/payments/wero/create-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amount: resolveSubmittedPaymentAmount(),
                currency: (merchantSettings?.currency || "EUR"),
                return_url: fallbackReturnUrl,
                cancel_url: cancelUrl,
                customer_email: paymentFormData.email || "",
                fallback_method: "ideal",
                fallback_from_worldline: true,
                items: itemsToPay.map((item: any) => ({
                  id: String(item.item.id),
                  name: item.item.name,
                  quantity: Number(item.quantity || 1),
                  price: Number(item.price || 0),
                })),
              }),
            })
            const fallbackRawBody = await fallbackRes.text()
            let fallbackJson: any = null
            try {
              fallbackJson = fallbackRawBody ? JSON.parse(fallbackRawBody) : null
            } catch {
              fallbackJson = null
            }

            if (fallbackRes.ok && fallbackJson?.success && fallbackJson?.redirect_url) {
              console.info("[PMD_CHECKOUT_FLOW_TRACE]", {
                selected_method: "wero",
                original_provider: "worldline",
                backend_selected_provider: String(fallbackJson?.provider || "stripe"),
                fallback_provider: String(fallbackJson?.fallback_provider || "stripe"),
                fallback_method: String(fallbackJson?.fallback_method || "ideal"),
                resolved_error_code: resolvedErrorCode,
                endpoint: "/api/v1/payments/wero/create-session",
                flow_mode: "fallback",
                redirect_url_type: typeof fallbackJson?.redirect_url,
                has_session_id: Boolean(fallbackJson?.session_id),
              })
              if (typeof window !== "undefined" && fallbackJson?.session_id) {
                localStorage.setItem("pmd_wero_pending_checkout", JSON.stringify({
                  session_id: String(fallbackJson.session_id),
                  method_code: "wero",
                  provider_code: "stripe",
                  created_at: Date.now(),
                }))
              }
              if (typeof window !== "undefined") {
                window.location.href = String(fallbackJson.redirect_url)
              }
              return
            }
          }

          throw new Error(
            `${providerLabel} Wero error${resolvedErrorCode ? ` (${resolvedErrorCode})` : ""}: ${normalizedErrorMessage}`
          )
        }
        throw new Error(normalizedErrorMessage || "Unable to start hosted checkout")
      }

      if (typeof window !== "undefined") {
        if (providerCode === "worldline" && json?.hosted_checkout_id) {
          localStorage.setItem("pmd_worldline_pending_checkout", JSON.stringify({
            hosted_checkout_id: String(json.hosted_checkout_id),
            method_code: selectedMethod.code,
            provider_code: providerCode,
            created_at: Date.now(),
          }))
        }
        if (providerCode === "sumup" && json?.checkout_id) {
          localStorage.setItem("pmd_sumup_pending_checkout", JSON.stringify({
            checkout_id: String(json.checkout_id),
            created_at: Date.now(),
          }))
        }
        if (providerCode === "square" && json?.payment_link_id) {
          localStorage.setItem("pmd_square_pending_checkout", JSON.stringify({
            payment_link_id: String(json.payment_link_id),
            order_id: json?.order_id ? String(json.order_id) : null,
            created_at: Date.now(),
          }))
        }
        if (providerCode === "stripe" && json?.session_id) {
          localStorage.setItem("pmd_wero_pending_checkout", JSON.stringify({
            session_id: String(json.session_id),
            method_code: selectedMethod.code,
            provider_code: providerCode,
            created_at: Date.now(),
          }))
        }
        if (providerCode === "vr_payment" && json?.session_id) {
          localStorage.setItem("pmd_vr_payment_pending_checkout", JSON.stringify({
            session_id: String(json.session_id),
            merchant_reference: merchantReference,
            method_code: selectedMethod.code,
            provider_code: "vr_payment",
            created_at: Date.now(),
          }))
        }
      }

      if (typeof window !== "undefined") {
        console.info("[PMD_CHECKOUT_FLOW_TRACE]", {
          selected_method: selectedMethod.code,
          backend_selected_provider: String(json?.provider || providerCode),
          endpoint: checkoutEndpoint,
          flow_mode: Boolean(json?.fallback) ? "fallback" : "primary",
          redirect_url_type: typeof json?.redirect_url,
          has_session_id: Boolean(json?.session_id),
          has_hosted_checkout_id: Boolean(json?.hosted_checkout_id),
        })
        window.location.href = json.redirect_url
      }
    } catch (error) {
      if (shouldFallbackFromWero) {
        setSelectedPaymentMethod(null)
      }
      setIsLoading(false)
      setProviderInlineError(error instanceof Error ? error.message : "Unable to start checkout")
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Unable to start checkout",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    const run = async () => {
      if (typeof window === "undefined") return
      const params = new URLSearchParams(window.location.search)
      const provider = params.get("payment_return_provider")
      if (!["worldline", "sumup", "square", "wero", "vr_payment"].includes(provider || "")) return

      const pendingKey = provider === "worldline"
        ? "pmd_worldline_pending_checkout"
        : provider === "sumup"
          ? "pmd_sumup_pending_checkout"
          : provider === "square"
            ? "pmd_square_pending_checkout"
            : provider === "vr_payment"
              ? "pmd_vr_payment_pending_checkout"
              : "pmd_wero_pending_checkout"
      const pendingRaw = localStorage.getItem(pendingKey)
      if (!pendingRaw) return
      let pending: any = null
      try {
        pending = JSON.parse(pendingRaw)
      } catch {
        return
      }

      const verificationPayload = provider === "worldline"
        ? { hosted_checkout_id: String(pending?.hosted_checkout_id || "") }
        : provider === "sumup"
          ? { checkout_id: String(pending?.checkout_id || params.get("checkout_id") || "") }
          : provider === "square"
            ? { payment_link_id: String(pending?.payment_link_id || "") }
            : provider === "vr_payment"
              ? {
                  session_id: String(pending?.session_id || params.get("session_id") || ""),
                  transaction_id: String(params.get("transaction_id") || ""),
                  provider_reference: String(params.get("provider_reference") || ""),
                  merchant_reference: String(pending?.merchant_reference || ""),
                }
            : { session_id: String(pending?.session_id || params.get("session_id") || "") }
      const verificationUrl = provider === "worldline"
        ? "/api/v1/payments/worldline/checkout-status"
        : provider === "sumup"
          ? "/api/v1/payments/sumup/checkout-status"
          : provider === "square"
            ? "/api/v1/payments/square/checkout-status"
            : provider === "vr_payment"
              ? "/api/v1/payments/vr-payment/return-status"
            : "/api/v1/payments/wero/checkout-status"

      const hasReference = Object.values(verificationPayload).some((value) => String(value || "").trim() !== "")
      if (!hasReference) return

      try {
        const res = await fetch(verificationUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(verificationPayload),
        })
        const json = await res.json()
      pmdForceKazenFrontendThemePayload(json);
        if (res.ok && json?.success && json?.is_paid) {
          localStorage.removeItem(pendingKey)
          const fallbackReference = String(
            (verificationPayload as any)?.session_id
            || (verificationPayload as any)?.transaction_id
            || (verificationPayload as any)?.provider_reference
            || ""
          )
          const txId = String(
            json?.payment_intent_id
            || json?.payment_id
            || json?.transaction_code
            || json?.order_id
            || fallbackReference
          )
          const forcedMethodCode = pending?.method_code
            ? String(pending.method_code)
            : (provider === "wero" ? "wero" : "card")
          const forcedProviderCode = pending?.provider_code
            ? String(pending.provider_code)
            : String(json?.provider || (provider === "wero" ? "stripe" : provider))
          await handlePayment(txId, {
            method_code: forcedMethodCode,
            provider_code: forcedProviderCode,
          })
          params.delete("payment_return_provider")
          const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`
          window.history.replaceState({}, "", next)
          return
        }

        if (res.ok && json?.success && json?.status === "pending") {
          setProviderInlineError("Your payment is still pending confirmation. Please refresh in a moment.")
          return
        }

        if (res.ok && json?.success && (json?.status === "cancelled" || json?.status === "expired")) {
          localStorage.removeItem(pendingKey)
          setProviderInlineError("Payment was cancelled. Please choose another method to continue.")
          return
        }

        toast({
          title: "Payment Not Confirmed",
          description: `${provider} payment is not confirmed yet. Please check your payment status and retry.`,
          variant: "destructive",
        })
      } catch {
        toast({
          title: "Payment Verification Failed",
          description: `Could not verify ${provider} payment status.`,
          variant: "destructive",
        })
      }
    }

    void run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  const renderPaymentForm = () => {
    try {
      if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
        (window as any).__PMD_WALLET_POST({
          level: "info",
          message: "PMD_RENDER_PAYMENT_FORM_STATE",
          data: {
            selectedPaymentMethod,
            selectedMethod: selectedMethod ? {
              code: (selectedMethod as any).code,
              name: (selectedMethod as any).name,
            } : null,
            stripePromise: !!stripePromise,
            hasStripeConfig: !!stripeConfig,
            stripeCurrency: stripeConfig?.currency || null,
            stripeCountryCode: stripeConfig?.countryCode || null,
          }
        });
      }
    } catch {}

    if (!selectedMethod) return null

    if (checkoutStep === "payment" && hasUnsubmittedPaymentDraft()) {
      return (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold">Submit order first</div>
          <div className="mt-1">Please send the table order to the kitchen first. Payment starts only after the backend creates a real order ID.</div>
          <Button
            type="button"
            onClick={() => setCheckoutStep("review")}
            className="mt-3 w-full rounded-xl bg-amber-700 text-white hover:bg-amber-800"
          >
            Back to order review
          </Button>
        </div>
      )
    }

    switch (selectedMethod.code) {
      case "card":
        if (selectedProviderCode === "paypal") {
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-4">
                <Button variant="ghost" size="sm" onClick={handleBackToMethods} className="p-2 h-9 w-9 pmd-v2-action-circle">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-paydine-elegant-gray" />
                  <span className="font-semibold text-paydine-elegant-gray">Card (via PayPal)</span>
                </div>
              </div>

              {paypalConfigLoading ? (
                <div className="rounded-xl p-4 border text-sm text-gray-600">
                  Loading PayPal...
                </div>
              ) : !effectivePayPalClientId ? (
                <div className="rounded-xl p-4 border text-sm text-gray-600">
                  PayPal card checkout is not configured for this restaurant.
                </div>
              ) : (
                <PayPalScriptProvider
                  options={{
                    clientId: effectivePayPalClientId,
                    currency: effectivePayPalCurrency,
                    intent: "capture",
                    components: "buttons",
                    disableFunding: "sepa",
                  }}
                >
                  <PayPalForm
                    paypalFundingSource="card"
                    paymentData={{
                      amount: resolveSubmittedPaymentAmount(),
                      payment_method: "card",
                      currency: effectivePayPalCurrency.toLowerCase(),
                      items: itemsToPay.map((item: any) => ({
                        id: String(item.item.id),
                        name: item.item.name,
                        price: item.price,
                        quantity: item.quantity || 1,
                        restaurantId: stripeResolvedRestaurantId,
                      })),
                      customerInfo: {
                        name: (paymentFormData as any)?.cardholderName || "",
                        email: (paymentFormData as any)?.email || "",
                        phone: (paymentFormData as any)?.phone || "",
                      },
                      restaurantId: stripeResolvedRestaurantId,
                      tableNumber: stripeResolvedTableNumber,
                    } as any}
                    onPaymentComplete={(result: any) => {
                      if (result?.success && result?.transactionId) {
                        handlePayment(result.transactionId)
                      }
                    }}
                    onPaymentError={(message: string) => {
                      toast({
                        title: "Payment Failed",
                        description: message,
                        variant: "destructive",
                      })
                    }}
                  />
                </PayPalScriptProvider>
              )}
            </motion.div>
          )
        }

        if (selectedProviderCode && selectedProviderCode !== "stripe") {
          if (selectedProviderCode === "worldline") {
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="mb-2">
                  <span className="font-semibold text-paydine-elegant-gray">Worldline card payment</span>
                </div>
                <WorldlineInlineCardForm
                  paymentData={{
                    amount: resolveSubmittedPaymentAmount(),
                    payment_method: "card",
                    currency: (merchantSettings?.currency || "EUR"),
                    items: itemsToPay.map((item: any) => ({
                      id: String(item.item.id),
                      name: item.item.name,
                      price: item.price,
                      quantity: item.quantity || 1,
                      restaurantId: stripeResolvedRestaurantId,
                    })),
                    customerInfo: {
                      name: (paymentFormData as any)?.cardholderName || "",
                      email: (paymentFormData as any)?.email || "",
                      phone: (paymentFormData as any)?.phone || "",
                    },
                    restaurantId: stripeResolvedRestaurantId,
                    tableNumber: stripeResolvedTableNumber,
                  } as any}
                  currency={(merchantSettings?.currency || "EUR")}
                  countryCode={(stripeConfig?.countryCode || "DE")}
                  onPaymentComplete={(result: any) => {
                    if (result?.success && result?.transactionId) {
                      handlePayment(result.transactionId)
                    }
                  }}
                  onPaymentError={(message: string) => {
                    toast({
                      title: "Worldline Payment Failed",
                      description: message,
                      variant: "destructive",
                    })
                  }}
                />
              </motion.div>
            )
          }
          if (selectedProviderCode === "sumup") {
            const sumupReturnUrl = typeof window !== "undefined"
              ? `${window.location.origin}/payment/sumup/complete`
              : "/payment/sumup/complete"
            const sumupCancelUrl = typeof window !== "undefined" ? window.location.href : "/menu"
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <SumUpHostedCheckout
                  amount={payableTotal}
                  currency={merchantSettings?.currency || "EUR"}
                  description="PayMyDine SumUp checkout"
                  successUrl={sumupReturnUrl}
                  cancelUrl={sumupCancelUrl}
                  className="w-full"
                />
                {providerInlineError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200">
                    {providerInlineError}
                  </div>
                )}
              </motion.div>
            )
          }
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3 overflow-hidden"
            >
              <div className="mb-2">
                <span className="font-semibold text-paydine-elegant-gray">{selectedMethod?.name || "Card Payment"}</span>
              </div>
              <div className="rounded-xl border p-3 text-sm text-paydine-elegant-gray/80">
                {selectedProviderCode === "vr_payment"
                  ? "You will be redirected to a secure VR Payment checkout page."
                  : `Your card details will be completed in a secure embedded ${selectedProviderCode.toUpperCase()} frame.`}
              </div>
              <Button
                type="button"
                onClick={startHostedRedirectCheckout}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
              >
                {isLoading ? "Opening secure form..." : `Pay with ${selectedProviderCode === "vr_payment" ? "VR Payment" : selectedProviderCode.toUpperCase()}`}
              </Button>
              {providerInlineError && (
                <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200">
                  {providerInlineError}
                </div>
              )}
            </motion.div>
          )
        }

        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <StripeCardPaymentSection
              methodName={selectedMethod?.name}
              stripeConfigError={stripeConfigError}
              stripePromise={stripePromise}
              cardEnabled={stripeConfig?.methods?.card !== false}
              paymentData={stripePaymentData}
              onPaymentSuccess={handlePayment}
              onPaymentError={(message: string) => {
                toast({
                  title: "Payment Failed",
                  description: message,
                  variant: "destructive",
                })
              }}
            />
          </motion.div>
        )

      case "paypal":
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >


            {selectedProviderCode === "vr_payment" ? (
              <>
                <div className="rounded-xl border p-3 text-sm text-paydine-elegant-gray/80">
                  You will be redirected to a secure VR Payment PayPal checkout page.
                </div>
                <Button
                  type="button"
                  onClick={startHostedRedirectCheckout}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
                >
                  {isLoading ? "Opening PayPal..." : "Pay with PayPal"}
                </Button>
                {providerInlineError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200">
                    {providerInlineError}
                  </div>
                )}
              </>
            ) : paypalConfigLoading ? (
              <div className="rounded-xl p-4 border text-sm text-gray-600">
                Loading PayPal...
              </div>
            ) : !effectivePayPalClientId ? (
              <div className="rounded-xl p-4 border text-sm text-gray-600">
                PayPal is not configured for this restaurant.
              </div>
            ) : (
                <PayPalScriptProvider
                  options={{
                    clientId: effectivePayPalClientId,
                    currency: effectivePayPalCurrency,
                    intent: "capture",
                    components: "buttons",
                    disableFunding: "card,sepa",
                  }}
                >
                  <PayPalForm
                    paypalFundingSource="paypal"
                    paymentData={{
                      amount: resolveSubmittedPaymentAmount(),
                      payment_method: "paypal",
                      currency: effectivePayPalCurrency.toLowerCase(),
                    items: itemsToPay.map((item: any) => ({
                      id: String(item.item.id),
                      name: item.item.name,
                      price: item.price,
                      quantity: item.quantity || 1,
                      restaurantId: stripeResolvedRestaurantId,
                    })),
                    customerInfo: {
                      name: (paymentFormData as any)?.cardholderName || "",
                      email: (paymentFormData as any)?.email || "",
                      phone: (paymentFormData as any)?.phone || "",
                    },
                    restaurantId: stripeResolvedRestaurantId,
                    tableNumber: stripeResolvedTableNumber,
                  } as any}
                  onPaymentComplete={(result: any) => {
                    if (result?.success && result?.transactionId) {
                      handlePayment(result.transactionId)
                    }
                  }}
                  onPaymentError={(message: string) => {
                    toast({
                      title: "Payment Failed",
                      description: message,
                      variant: "destructive",
                    })
                  }}
                />
              </PayPalScriptProvider>
            )}
          </motion.div>
        )

      case "apple_pay":
      case "google_pay":
        if (!selectedPaymentMethod) return null
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >


            {selectedProviderCode === "vr_payment" ? (
              <>
                <div className="rounded-xl border p-3 text-sm text-paydine-elegant-gray/80">
                  You will be redirected to a secure VR Payment checkout page.
                </div>
                <Button
                  type="button"
                  onClick={startHostedRedirectCheckout}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
                >
                  {isLoading ? "Opening wallet..." : `Pay with ${selectedPaymentMethod === "apple_pay" ? "Apple Pay" : "Google Pay"}`}
                </Button>
                {providerInlineError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200">
                    {providerInlineError}
                  </div>
                )}
              </>
            ) : stripeConfig?.methods?.[selectedPaymentMethod as "apple_pay" | "google_pay"] ? (
              stripePromise ? (
                <Elements stripe={stripePromise}>
                  <WalletStripePay
                    method={selectedPaymentMethod as "apple_pay" | "google_pay"}
                    amount={payableTotal}
                    currency={(stripeConfig?.currency || merchantSettings?.currency || "EUR")}
                    countryCode={(stripeConfig?.countryCode || "DE")}
                    restaurantId={stripeResolvedRestaurantId || "1"}
                    cartId={(stripePaymentData as any)?.cartId || null}
                    userId={(stripePaymentData as any)?.userId || null}
                    items={(stripePaymentData as any)?.items || []}
                    customerInfo={(stripePaymentData as any)?.customerInfo || {}}
                    tableNumber={(stripePaymentData as any)?.tableNumber || null}
                    onSuccess={(piId: string) => {
                      handlePayment(piId)
                    }}
                    onError={(message: string) => {
                      toast({
                        title: "Payment Failed",
                        description: message,
                        variant: "destructive",
                      })
                    }}
                  />
                </Elements>
              ) : (
                <div className="rounded-xl border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800">
                  Stripe is still loading. Please wait a few seconds and try again.
                </div>
              )
            ) : (
              <div className="rounded-xl border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800">
                {selectedPaymentMethod === "apple_pay"
                  ? "Apple Pay is not enabled for this restaurant."
                  : "Google Pay is not enabled for this restaurant."}
              </div>
            )}
          </motion.div>
        )

      case "wero":
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >

            <div className="rounded-xl border p-3 text-sm text-paydine-elegant-gray/80">
              {selectedProviderCode === "worldline"
                ? "You will be redirected to a secure Wero checkout powered by Worldline."
                : selectedProviderCode === "vr_payment"
                  ? "You will be redirected to a secure Wero checkout powered by VR Payment."
                  : "You will be redirected to a secure Wero checkout powered by Stripe."}
            </div>
            <Button
              type="button"
              onClick={startHostedRedirectCheckout}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-paydine-champagne to-paydine-rose-beige hover:from-paydine-champagne/90 hover:to-paydine-rose-beige/90 text-paydine-elegant-gray font-bold py-3 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl"
            >
              {isLoading ? "Opening Wero..." : "Pay with Wero"}
            </Button>
            {providerInlineError && (
              <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-3 text-sm text-red-200">
                {providerInlineError}
              </div>
            )}
          </motion.div>
        )

case "cod":
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3 overflow-hidden"
          >


            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-sm font-medium text-paydine-elegant-gray mb-2">Total due</div>
                <div className="text-lg font-bold text-paydine-elegant-gray">
                  {formatCurrency(checkoutStep === "payment" ? payableTotal : finalTotal)}
                </div>
              </div>
              <Button
                type="button"
                disabled={isLoading}
                onClick={async () => {
                  setCashCollectionConfirmed(true)
                  await handlePayment(undefined, { method_code: "cod", provider_code: null })
                }}
                className="w-full"
                style={modalPrimaryBtnStyle}
              >
                {isLoading ? "Submitting..." : "Confirm cash payment"}
              </Button>
              {cashCollectionConfirmed && (
                <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "var(--theme-border)", color: "var(--theme-text-primary)", background: "var(--theme-surface)" }}>
                  Please have the exact amount ready when the waiter comes to collect payment.
                </div>
              )}
            </div>
          </motion.div>
        )

      default:
        return null
    }
  }

  const tableDisplayName = tableDraft?.table_name || tableInfo?.table_name || (tableDraft?.table_no || tableInfo?.table_no ? `Table ${tableDraft?.table_no || tableInfo?.table_no}` : "Delivery")
  const isTableContext = Boolean(tableInfo?.table_id || tableInfo?.table_no || tableDraft?.table_id || tableDraft?.table_no)
  const orderContextLabel = isTableContext ? "Table" : "Order type"
  const orderContextValue = isTableContext ? tableDisplayName : "Delivery"
  const submittedContextLabel = submittedSnapshot?.tableNumber || isTableContext ? "Table" : "Order type"
  const submittedContextValue = submittedSnapshot?.tableNumber ? `Table ${submittedSnapshot.tableNumber}` : orderContextValue

  // PMD_FINAL_REVIEW_INVOICE_ACTIONS_20260605
  const activeReviewSharePlatforms = useMemo(() => {
    const platformMeta: Array<{ id: PmdSocialPlatformId; label: string; icon: typeof Star }> = [
      { id: "trustpilot", label: "Trustpilot", icon: Star },
      { id: "instagram", label: "Instagram", icon: Link2 },
      { id: "google", label: "Google Reviews", icon: QrCode },
      { id: "website", label: "Website", icon: Link2 },
      { id: "reviews", label: "Reviews page", icon: MessageSquare },
    ]

    return platformMeta.filter(({ id }) => {
      const platform = merchantSettings.reviewSocial?.platforms?.[id]
      return Boolean(platform?.enabled && platform?.url)
    })
  }, [merchantSettings.reviewSocial])

  const canSubmitReview = reviewRating > 0 || reviewComment.trim().length > 0

  const handleSubmitReview = async () => {
    if (!canSubmitReview || reviewSubmitStatus === "loading") return
    setReviewSubmitStatus("loading")
    setReviewSubmitMessage("")
    try {
      const orderId = submittedSnapshot?.orderId || submittedSnapshot?.order_id || initialSubmittedOrder?.orderId || existingOrderId || null
      await apiClient.submitReview({ order_id: orderId, rating: reviewRating, review: reviewComment.trim(), public_share_consent: null })
      setReviewSubmitStatus("success")
      setReviewSubmitMessage("Thank you — your review was sent to the restaurant.")
    } catch (error) {
      setReviewSubmitStatus("error")
      setReviewSubmitMessage(error instanceof Error ? error.message : "Could not submit your review. Please try again.")
    }
  }

  const handleDownloadBusinessInvoice = async () => {
    const orderId = submittedSnapshot?.orderId || submittedSnapshot?.order_id || initialSubmittedOrder?.orderId || existingOrderId || null
    if (!orderId || invoiceDownloadStatus === "loading") {
      setInvoiceDownloadStatus("error")
      setInvoiceDownloadMessage("Order number is not available yet.")
      return
    }
    setInvoiceDownloadStatus("loading")
    setInvoiceDownloadMessage("")
    try {
      const blob = await apiClient.downloadBusinessInvoice(orderId)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = objectUrl
      link.download = `business-invoice-${orderId}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      setInvoiceDownloadStatus("idle")
    } catch (error) {
      setInvoiceDownloadStatus("error")
      setInvoiceDownloadMessage(error instanceof Error ? error.message : "Could not download the business invoice.")
    }
  }


  const checkoutTitle: Record<CheckoutStep, string> = {
    review: "My Order",
    submitted: "Order Status",
    split: "Split bill",
    "split-items": "Assign items",
    "split-shares": "Set shares",
    "split-review": "Review split",
    payment: "Payment",
    paid: "Order complete",
  }
    // PMD_FORCE_PERSONAL_CART_REVIEW_WHEN_CHECKOUT_HAS_ITEMS
  useEffect(() => {
    if (!isOpen) return

    // If the customer has just added new items and pressed Checkout,
    // the modal must show the personal review card first.
    // Existing table/order status must not steal this flow.
    if (shouldForcePersonalReview({ hasPersonalItems, initialCheckoutStep, currentStep: checkoutStep })) {
      setCheckoutStep("review")
    }
  }, [isOpen, hasPersonalItems, initialCheckoutStep, checkoutStep])

// PMD_FREEZE_MODAL_TEXT_BUTTONS_FIRST_PAINT
useLayoutEffect(() => {
  if (!isOpen || typeof document === "undefined") return

  let cleanupTimer: number | undefined
  let retryTimer: number | undefined

  const applyFreeze = () => {
    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
    if (!root) return false

    root.setAttribute("data-pmd-step-freeze", "1")

    cleanupTimer = window.setTimeout(() => {
      root.setAttribute("data-pmd-step-freeze", "0")
      root.removeAttribute("data-pmd-step-freeze")
    }, 850)

    return true
  }

  if (!applyFreeze()) {
    retryTimer = window.setTimeout(applyFreeze, 16)
  }

  return () => {
    if (cleanupTimer) window.clearTimeout(cleanupTimer)
    if (retryTimer) window.clearTimeout(retryTimer)
  }
}, [isOpen, checkoutStep])


  // PMD_SUBMITTED_TABLE_DRAFT_SHOULD_SHOW_STATUS
  const isSubmittedTableDraftForStatus = Boolean(
    tableDraft?.order_id ||
    tableDraft?.orderId ||
    ["submitted", "submitted_unpaid", "partially_paid", "paid"].includes(String(tableDraft?.status || "").toLowerCase())
  )
  const checkoutListViewKey = `${checkoutStep}:${hasPersonalItems ? "personal" : "shared"}:${isSubmittedTableDraftForStatus ? "status" : "draft"}`

  useLayoutEffect(() => {
    if (!isOpen || typeof window === "undefined" || typeof document === "undefined") return

    const resetCheckoutScrollPositions = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (root) root.scrollTop = 0
      document.querySelectorAll<HTMLElement>('.pmd-checkout-list-scroll').forEach((list) => {
        list.scrollTop = 0
      })
    }

    resetCheckoutScrollPositions()
    const raf = window.requestAnimationFrame(resetCheckoutScrollPositions)
    return () => window.cancelAnimationFrame(raf)
  }, [isOpen, checkoutListViewKey])


  // PMD_DIRECT_ORDER_STATUS_AFTER_SEND_20260603
  useEffect(() => {
    if (!isOpen) return
    if (checkoutStep !== "review") return
    if (hasPersonalItems || preferPersonalReview) return
    if (!isSubmittedTableDraftForStatus) return

    if (tableDraft) {
      const normalizedTableDraftSnapshot = createSubmittedTableOrderSnapshot(tableDraft, tableInfo, taxSettings?.percentage || 0)
      setSubmittedSnapshot((prev: any) => {
        const prevOrderId = Number(prev?.orderId || prev?.order_id || 0)
        const nextOrderId = Number(normalizedTableDraftSnapshot.orderId || 0)
        return !prev || prevOrderId !== nextOrderId ? normalizedTableDraftSnapshot : { ...prev, ...normalizedTableDraftSnapshot }
      })
    }

    setCheckoutStep(getCheckoutStepAfterDraftSubmit())
  }, [
    isOpen,
    checkoutStep,
    hasPersonalItems,
    preferPersonalReview,
    isSubmittedTableDraftForStatus,
    tableDraft,
    tableInfo?.table_no,
    tableInfo?.table_id,
  ])

const modalTitle = checkoutStep === "review" && tableDraft?.success && tableDraft.status && tableDraft.status !== "empty" && !hasPersonalItems && !preferPersonalReview
    ? "Table Order"
    : checkoutTitle[checkoutStep]

  const startSplitFlow = (method: SplitMethod = splitMethod) => {
    const isStartingSplit = !isSplitting && !selectedSplitPersonId
    if (isStartingSplit) {
      setSplitGuestCount(suggestedSplitGuestCount)
      setSharePercents(buildEvenSharePercents(suggestedSplitGuestCount))
    }
    setIsSplitting(true)
    setSplitMethod(method)
    setSelectedPaymentMethod(null)
    setSelectedSplitPersonId(null)
    setCheckoutStep(getCheckoutStepForSplitMethod(method))
  }

  const chooseSplitMethod = (method: SplitMethod) => {
    setSplitMethod(method)
    startSplitFlow(method)
  }

  const goToSplitReview = () => {
    if (!canConfirmSplitMethod) return
    setIsSplitting(true)
    setSelectedSplitPersonId((current) => current || activeSplitPeople[0]?.id || null)
    setCheckoutStep("split-review")
  }

  const renderPaymentButton = () => {
    if (!selectedMethod) return null

    // IMPORTANT:
    // For Stripe-like methods, do NOT allow the fixed bottom button
    // to submit/place the order directly.
    // Payment must happen only through StripeCardForm:
    // create-intent -> confirmCardPayment -> onPaymentComplete -> handlePayment(transactionId)
    if (["card", "wero", "paypal"].includes(selectedMethod.code)) {
      return null
    }

    const isFormValid = () => {
      switch (selectedMethod.code) {
        case "card":
          return true
        case "paypal":
          return paymentFormData.email
        case "apple_pay":
        case "google_pay":
          return true
        case "cod":
          return true
        default:
          return false
      }
    }

    const getButtonText = () => {
      switch (selectedMethod.code) {
        case "card":
  return `Pay ${formatCurrency(checkoutStep === "payment" ? payableTotal : finalTotal)}`
        case "paypal":
          return "Pay with PayPal"
        case "apple_pay":
        case "google_pay":
          return `Pay with ${selectedMethod.name}`
        case "cod":
          return "Confirm Cash Payment"
        default:
          return "Pay"
      }
    }

    if (selectedPaymentMethod === "apple_pay" || selectedPaymentMethod === "google_pay" || selectedPaymentMethod === "wero") {
      return null
    }

    return (
      <ThemedButton
        type="button"
        onClick={handlePayment}
        disabled={isLoading || !isFormValid()}
        variant="primary"
        fullWidth
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            {getButtonText()}
          </div>
        )}
      </ThemedButton>
    )
  }

  const modernGreenTableDraftItems = groupOrderDisplayItems(Array.isArray(tableDraft?.items) ? tableDraft.items : [])
  const modernGreenTableDraftTotal = Number(
    tableDraft?.totals?.total ??
    tableDraft?.totals?.orderTotal ??
    tableDraft?.total ??
    tableOrderTotalByCode(tableDraft, "total") ??
    tableOrderTotalByCode(tableDraft, "subtotal") ??
    0
  )
  const modernGreenSubmittedItems = groupOrderDisplayItems(Array.isArray(submittedSnapshot?.submittedItems) ? submittedSnapshot.submittedItems : [])
  const modernGreenPersonalItems = personalReviewItems.map((cartItem: any) => {
    const optionKey = String(cartItem.__pmdOptionKey || cartItem.item.id)
    const selectedForUnit = selectedOptions[optionKey] || {}
    const optionDetails: Array<{ name: string; price: number }> = []

    Object.entries(selectedForUnit).forEach(([optionName, optionId]) => {
      const option = (cartItem.item.options || []).find((candidate: any) => String(candidate.name) === String(optionName))
      const value = option?.values?.find((candidate: any) => String(candidate.id) === String(optionId))
      if (value) optionDetails.push({ name: String(value.value || value.name || ''), price: Number(adjustPriceForVAT(Number(value.price || 0))) })
    })

    const baseName = cartItem.item.nameKey ? t(cartItem.item.nameKey as TranslationKey) : cartItem.item.name
    const optionSummary = optionDetails.map((option) => option.name).filter(Boolean).join(', ')
    const displayName = optionSummary ? `${baseName} — ${optionSummary}` : String(cartItem.__pmdUnitLabel || baseName)
    const unitPrice = Number(adjustPriceForVAT(cartItem.item.price || 0)) + optionDetails.reduce((sum, option) => sum + Number(option.price || 0), 0)
    const quantity = Number(cartItem.quantity || 1)

    return {
      ...cartItem,
      quantity,
      __pmdDisplayName: displayName,
      __pmdDisplaySubtotal: unitPrice * quantity,
    }
  })

  const handleModernGreenApplyCoupon = async () => {
    if (!couponCode.trim()) return
    if (selectedSplitPerson) {
      setCouponError("Coupon validation for split payments is coming soon.")
      return
    }
    setCouponLoading(true)
    setCouponError(null)
    try {
      const result = await validateCoupon(couponCode.trim(), paymentBaseAmount)
      if (!result.success) setCouponError(result.message || "Coupon will be checked at payment.")
      else {
        setCouponCode("")
        toast({ title: "Coupon applied", description: "Your coupon was added to this payment." })
      }
    } catch {
      setCouponError("Coupon validation coming soon.")
    } finally {
      setCouponLoading(false)
    }
  }

  const handleModernGreenRemoveCoupon = () => {
    removeCoupon()
    setCouponCode("")
    setCouponError(null)
  }

  if (!isOpen) return null


  if (isKazenJapaneseCheckoutVisual) {
    return (
      <KazenJapaneseCheckoutShell
        checkoutStep={checkoutStep}
        onClose={onClose}
        hasPersonalItems={hasPersonalItems || preferPersonalReview}
        personalItems={modernGreenPersonalItems}
        tableDraft={tableDraft}
        tableDraftItems={modernGreenTableDraftItems}
        tableDraftTotal={modernGreenTableDraftTotal}
        submittedSnapshot={submittedSnapshot}
        submittedItems={modernGreenSubmittedItems}
        estimatedMinutes={estimatedMinutes}
        subtotal={subtotal}
        finalTotal={finalTotal}
        payableTotal={payableTotal}
        paymentBaseAmount={paymentBaseAmount}
        paymentPayableTotal={paymentPayableTotal}
        paymentTipAmount={paymentTipAmount}
        paymentCouponDiscount={paymentCouponDiscount}
        paymentTipPercentage={paymentTipPercentage}
        paymentCustomTip={paymentCustomTip}
        tipPercentages={tipSettings.percentages || [5, 10]}
        tipEnabled={Boolean(tipSettings.enabled)}
        couponCode={couponCode}
        setCouponCode={(value: string) => { setCouponCode(value); setCouponError(null) }}
        appliedCoupon={appliedCoupon}
        couponError={couponError}
        couponLoading={couponLoading}
        onApplyCoupon={handleModernGreenApplyCoupon}
        onRemoveCoupon={handleModernGreenRemoveCoupon}
        visiblePaymentMethods={visiblePaymentMethods}
        loadingPayments={loadingPayments}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodSelect={handlePaymentMethodSelect}
        renderPaymentForm={renderPaymentForm}
        renderPaymentButton={renderPaymentButton}
        handleConfirmMyItems={handleConfirmMyItems}
        handleSubmitTableDraft={handleSubmitTableDraft}
        handlePayment={handlePayment}
        setCheckoutStep={setCheckoutStep}
        startSplitFlow={startSplitFlow}
        chooseSplitMethod={chooseSplitMethod}
        goToSplitReview={goToSplitReview}
        splitGuestCount={splitGuestCount}
        addSplitGuest={addSplitGuest}
        removeSplitGuest={removeSplitGuest}
        splitMethod={splitMethod}
        splitGuestProfiles={splitGuestProfiles}
        equalSplitPeople={equalSplitPeople || []}
        activeSplitPeople={activeSplitPeople}
        selectedSplitPersonId={selectedSplitPersonId}
        setSelectedSplitPersonId={setSelectedSplitPersonId}
        selectedSplitPerson={selectedSplitPerson}
        splitSourceItems={splitSourceItems}
        itemAssignments={itemAssignments}
        setItemAssignments={setItemAssignments}
        sharePercents={sharePercents}
        setSharePercents={setSharePercents}
        sharePercentTotal={sharePercentTotal}
        canConfirmSplitMethod={canConfirmSplitMethod}
        splitGrandTotal={splitGrandTotal}
        updatePaymentTipPercentage={updatePaymentTipPercentage}
        updatePaymentCustomTip={updatePaymentCustomTip}
        onPaymentLinks={() => toast({ title: "Payment links ready", description: "Share links can be generated by the payment API when multi-device checkout is enabled." })}
        onQrShare={() => toast({ title: "QR share", description: "Ask guests to scan the table QR to pay their own share." })}
        isDarkTheme={isDarkTheme}
      />
    )
  }

  if (isModernGreenCheckoutVisual) {
    return (
      <ModernGreenCheckoutShell
        checkoutStep={checkoutStep}
        onClose={onClose}
        hasPersonalItems={hasPersonalItems || preferPersonalReview}
        personalItems={modernGreenPersonalItems}
        tableDraft={tableDraft}
        tableDraftItems={modernGreenTableDraftItems}
        tableDraftTotal={modernGreenTableDraftTotal}
        submittedSnapshot={submittedSnapshot}
        submittedItems={modernGreenSubmittedItems}
        estimatedMinutes={estimatedMinutes}
        subtotal={subtotal}
        finalTotal={finalTotal}
        payableTotal={payableTotal}
        paymentBaseAmount={paymentBaseAmount}
        paymentPayableTotal={paymentPayableTotal}
        paymentTipAmount={paymentTipAmount}
        paymentCouponDiscount={paymentCouponDiscount}
        paymentTipPercentage={paymentTipPercentage}
        paymentCustomTip={paymentCustomTip}
        tipPercentages={tipSettings.percentages || [5, 10]}
        tipEnabled={Boolean(tipSettings.enabled)}
        couponCode={couponCode}
        setCouponCode={(value) => { setCouponCode(value); setCouponError(null) }}
        appliedCoupon={appliedCoupon}
        couponError={couponError}
        couponLoading={couponLoading}
        onApplyCoupon={handleModernGreenApplyCoupon}
        onRemoveCoupon={handleModernGreenRemoveCoupon}
        visiblePaymentMethods={visiblePaymentMethods}
        loadingPayments={loadingPayments}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodSelect={handlePaymentMethodSelect}
        renderPaymentForm={renderPaymentForm}
        renderPaymentButton={renderPaymentButton}
        handleConfirmMyItems={handleConfirmMyItems}
        handleSubmitTableDraft={handleSubmitTableDraft}
        handlePayment={handlePayment}
        setCheckoutStep={setCheckoutStep}
        startSplitFlow={startSplitFlow}
        chooseSplitMethod={chooseSplitMethod}
        goToSplitReview={goToSplitReview}
        splitGuestCount={splitGuestCount}
        addSplitGuest={addSplitGuest}
        removeSplitGuest={removeSplitGuest}
        splitMethod={splitMethod}
        splitGuestProfiles={splitGuestProfiles}
        equalSplitPeople={equalSplitPeople || []}
        activeSplitPeople={activeSplitPeople}
        selectedSplitPersonId={selectedSplitPersonId}
        setSelectedSplitPersonId={setSelectedSplitPersonId}
        selectedSplitPerson={selectedSplitPerson}
        splitSourceItems={splitSourceItems}
        itemAssignments={itemAssignments}
        setItemAssignments={setItemAssignments}
        sharePercents={sharePercents}
        setSharePercents={setSharePercents}
        sharePercentTotal={sharePercentTotal}
        canConfirmSplitMethod={canConfirmSplitMethod}
        splitGrandTotal={splitGrandTotal}
        updatePaymentTipPercentage={updatePaymentTipPercentage}
        updatePaymentCustomTip={updatePaymentCustomTip}
        onPaymentLinks={() => toast({ title: "Payment links ready", description: "Share links can be generated by the payment API when multi-device checkout is enabled." })}
        onQrShare={() => toast({ title: "QR share", description: "Ask guests to scan the table QR to pay their own share." })}
        isDarkTheme={isDarkTheme}
      />
    )
  }

  return (
    <div data-pmd-kazen-checkout-overlay={isKazenJapaneseCheckoutVisual ? "1" : undefined} className={cn("fixed inset-0 z-50 flex items-center justify-center", isModernGreenCheckoutVisual ? "bg-transparent backdrop-blur-md" : "bg-black/30")}>
      {/* PMD_KAZEN_SKIN_GOLD_CHECKOUT_RENDER_20260612 */}
      {/* PMD_KAZEN_INLINE_CHECKOUT_SKINS_DISABLED_20260612 */}
      {isOrganicCheckoutVisual && <OrganicCheckoutScopedStyles />}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-pmd-checkout-theme-root="1"
        data-pmd-checkout-theme={checkoutVisualTheme}
        data-pmd-checkout-design-system="1"
        data-pmd-checkout-visual-theme={checkoutVisualTheme}
        data-pmd-checkout-kazen-skin={isKazenJapaneseCheckoutVisual ? "1" : undefined}
        className="pmd-checkout-modal w-full max-w-md surface rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        style={isOrganicCheckoutVisual ? organicCheckoutModalStyle : undefined}
      >
        {/* Header with close button */}
        <div className="p-4 pb-2 surface-sub flex justify-between items-center rounded-2xl" style={isOrganicCheckoutVisual ? organicCheckoutHeaderStyle : undefined}>
          <Button
              data-pmd-order-status-back="1"
            variant="ghost"
            size="sm"
            onClick={() => {
              const previousStep = getCheckoutStepAfterBack(checkoutStep, Boolean(selectedSplitPersonId))
              if (previousStep) setCheckoutStep(previousStep)
              else onClose()
            }}

              className={iconBackBtn}
              style={{
                background: "#062F2A",
                backgroundColor: "#062F2A",
                color: "#FFFFFF",
                WebkitTextFillColor: "#FFFFFF",
                borderColor: "#062F2A",
                outlineColor: "#062F2A",
                textDecoration: "none",
              }}
            >
            <ArrowLeft className="h-5 w-5" style={{ color: "#FFFFFF", stroke: "#FFFFFF", WebkitTextFillColor: "#FFFFFF" }} />
          </Button>
          <h2 className="pmd-checkout-modal-title">{modalTitle}</h2>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        {/* Order Summary (prices incl. VAT) & Payment - Scrollable Content */}
        <div data-pmd-checkout-scroll="1" className="pmd-checkout-body p-4 pb-8 space-y-4 overflow-y-auto flex-1" style={isOrganicCheckoutVisual ? organicCheckoutBodyStyle : undefined}>
          {false && checkoutStep === "payment" && pendingSummary && (
            <div className="pmd-checkout-flat-section rounded-2xl p-3 text-xs">
              <div className="flex justify-between">
                <span className="muted">Total</span>
                <span className="font-semibold">{formatCurrency(pendingSummary.orderTotal || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="muted">Already paid</span>
                <span className="font-semibold">{formatCurrency(pendingSummary.settledAmount || 0)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="muted">Remaining</span>
                <span className="font-semibold">{formatCurrency(pendingSummary.remainingAmount || 0)}</span>
              </div>
            </div>
          )}
          {/* Split Bill Toggle */}
          {false && checkoutStep === "payment" && <div className="flex items-center justify-between p-3 surface-sub rounded-2xl">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" style={{ color: 'var(--theme-secondary)' }} />
              <span className="text-xs muted">{t("splitBill")}</span>
            </div>
            <Button
              variant={isSplitting ? "default" : "outline"}
              size="sm"
              onClick={() => setIsSplitting(!isSplitting)}
              className={clsx(
                "text-xs",
                isSplitting
                  ? "icon-btn--accent"
                  : "icon-btn"
              )}
            >
              {isSplitting ? "ON" : "OFF"}
            </Button>
          </div>}

          {/* Items List */}
          {false && (checkoutStep === "review" || checkoutStep === "payment") && (isSplitting && checkoutStep === "payment" ? (
            <div className="pmd-checkout-flat-section rounded-2xl p-3 overflow-hidden">
              <h3 className="mb-2 text-xs">{t("selectItemsToPay")}</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {allItemInstances.map((instance) => (
                  <div
                    key={instance.key}
                    className="flex justify-between items-center text-xs p-2 rounded-lg cursor-pointer hover:opacity-90"
                    onClick={() => toggleItemSelection(instance)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all",
                          selectedItems[instance.key] ? "icon-btn--accent" : "icon-btn",
                        )}
                      >
                        {selectedItems[instance.key] && <Check className="w-3 h-3" />}
                      </div>
                      <span>
                        {instance.item.nameKey ? t(instance.item.nameKey as TranslationKey) : instance.item.name}
                      </span>
                    </div>
                    <span className="font-semibold">
            {formatCurrency(instance.price ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pmd-checkout-flat-section rounded-2xl p-3">
              <div className="mb-2"><h3 className="text-xs font-semibold">{vatLabels.summary}</h3>{vatLabels.includedNote && <p className="mt-0.5 text-[11px] font-medium opacity-70">{vatLabels.includedNote}</p>}</div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {allItems.map((cartItem) => (
                  <OrderItemWithOptions
                    key={cartItem.item.id}
                    cartItem={cartItem}
                    addToCart={addToCart}
                    t={t}
                    onOptionsChange={handleOptionsChange}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Tip Section */}
          {false && checkoutStep === "payment" && tipSettings.enabled && (
            <div className="pmd-checkout-flat-section rounded-2xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="relative h-4 w-4 flex items-center justify-center">
                  <svg
                    className="absolute h-4 w-4"
                    style={{ color: 'var(--theme-secondary)' }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  <DollarSign className="h-2.5 w-2.5 absolute" style={{ color: 'var(--theme-background)' }} strokeWidth="3" />
                </div>
                <h3 className="text-xs">{t("addTip")}</h3>
              </div>
              <div className="flex gap-2">
                {tipSettings.percentages.map((p) => (
                  <Button
                    key={p}
                    variant={tipPercentage === p && !customTip ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setTipPercentage(p)
                      setCustomTip("")
                    }}
                    className={clsx(
                      "text-xs",
                      tipPercentage === p && !customTip
                        ? "tip-pill--active"
                        : "tip-pill"
                    )}
                  >
                    {p}%
                  </Button>
                ))}
                <div className="relative flex-grow">
                  <Input
                    type="number"
                    placeholder={t("custom")}
                    value={customTip}
                    onChange={(e) => {
                      setCustomTip(e.target.value)
                      setTipPercentage(0)
                    }}
                    className="pl-6 text-xs h-8"
                    style={{ borderColor: 'var(--theme-border)' }}
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 muted text-xs">€</span>
                </div>
              </div>
            </div>
          )}

          {/* Coupon Code Input */}
          {false && checkoutStep === "payment" && <div className="pmd-checkout-flat-section rounded-2xl p-3 space-y-2">
            {!appliedCoupon ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase())
                    setCouponError(null)
                  }}
                  placeholder={t("couponCode") || "Coupon Code"}
                  className="flex-1 px-3 py-2 border rounded-lg text-xs"
                  style={{ borderColor: 'var(--theme-border)' }}
                  disabled={couponLoading}
                />
                <Button
                  onClick={async () => {
                    if (!couponCode.trim()) {
                      setCouponError("Please enter a coupon code")
                      return
                    }
                    setCouponLoading(true)
                    setCouponError(null)
                    const result = await validateCoupon(couponCode.trim(), subtotal)
                    if (!result.success) {
                      setCouponError(result.message || "Invalid coupon code")
                    } else {
                      setCouponCode("")
                      // Wait a bit for state to update, then show toast
                      setTimeout(() => {
                        const { appliedCoupon: currentCoupon } = useCmsStore.getState()
                        toast({
                          title: "Coupon Applied",
                          description: `${currentCoupon?.name || 'Coupon'} applied successfully!`,
                        })
                      }, 100)
                    }
                    setCouponLoading(false)
                  }}
                  disabled={couponLoading || !couponCode.trim()}
                  size="sm"
                  className="icon-btn--accent text-xs"
                >
                  {couponLoading ? "..." : t("apply") || "Apply"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">
                    {appliedCoupon.name} ({appliedCoupon.code})
                  </span>
                  <span className="text-xs text-green-600 dark:text-green-500">
                    -{formatCurrency(couponDiscount)}
                  </span>
                </div>
                <Button
                  onClick={() => {
                    removeCoupon()
                    setCouponCode("")
                    setCouponError(null)
                  }}
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-base font-bold"
                >
                  ✕
                </Button>
              </div>
            )}
            {couponError && (
              <p className="text-xs text-red-600 dark:text-red-400">{couponError}</p>
            )}
          </div>}


          <AnimatePresence mode="wait" initial={false}>
          {checkoutStep === "review" && tableDraft?.success && tableDraft.status && tableDraft.status !== "empty" && !isSubmittedTableDraftForStatus && !hasPersonalItems && !preferPersonalReview && (
            <motion.div key="table-order-draft" layout initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16, ease: "easeOut" }} className="surface-sub rounded-2xl p-4 space-y-4" style={{ background: "var(--theme-surface)", color: "var(--theme-text-primary)" }}>

              <div className="pmd-checkout-list-scroll space-y-3 max-h-64 overflow-y-auto pr-1">
                {(tableDraft.groups && tableDraft.groups.length > 0 ? tableDraft.groups : [{ guest_session_id: null, items: tableDraft.items || [], subtotal: tableDraft.totals?.subtotal || 0 }]).map((group: any, groupIndex: number) => (
                  <div key={`${group.guest_session_id || 'table'}-${groupIndex}`} className="rounded-2xl border p-3" style={{ borderColor: "var(--theme-border)" }}>
                    {(tableDraft.groups || []).length > 1 && (
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                      <span>{group.guest_session_id ? `Guest ${groupIndex + 1}` : "Table"}</span>
                      <span>{formatCurrency(Number(group.subtotal || 0))}</span>
                    </div>
                    )}
                    <div className="space-y-1">
                      {groupOrderDisplayItems(group.items || []).map((item: any, idx: number) => (
                        <motion.div layout key={`${item.id || item.order_menu_id || item.menu_id || item.name}-${idx}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16, ease: "easeOut" }} className="pmd-checkout-item-row pmd-table-order-item-row flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-medium">{Number(item.quantity || 1)}x {String(item.name || `Item ${idx + 1}`)}</span>
                          <span className="font-semibold">{formatCurrency(Number(item.subtotal ?? (Number(item.price || 0) * Number(item.quantity || 1))))}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="pmd-checkout-meta-row flex items-center justify-between rounded-2xl border px-3 py-2 text-xs" style={{ borderColor: "var(--theme-border)",
                    background: "transparent",
                    backgroundColor: "transparent",
                    boxShadow: "none",}}>
                <span className="muted">{orderContextLabel}</span>
                <span className="font-semibold">{orderContextValue}</span>
              </div>
              {isTableContext && <p className="pmd-checkout-helper-text text-xs muted">Shared table order</p>}
              {Number(tableDraft.totals?.tax ?? tableOrderTotalByCode(tableDraft, 'tax') ?? 0) > 0 && (
                <div className="space-y-1 border-t pt-3 text-sm" style={{ borderColor: "var(--theme-border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="muted">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(Number(tableDraft.totals?.subtotal ?? tableOrderTotalByCode(tableDraft, 'subtotal') ?? 0))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="muted">VAT {tableOrderVatPercentage(tableDraft, taxSettings?.percentage || 0)}%</span>
                    <span className="font-semibold">{formatCurrency(Number(tableDraft.totals?.tax ?? tableOrderTotalByCode(tableDraft, 'tax') ?? 0))}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-3 text-sm" style={{ borderColor: "var(--theme-border)" }}>
                <span className="font-semibold">Order Total</span>
                <span className="text-base font-bold">{formatCurrency(Number(tableDraft.totals?.orderTotal || tableDraft.totals?.total || 0))}</span>
              </div>
              {tableDraft.status === "draft" ? (
                <div className="space-y-3" data-pmd-clean-table-actions="1">
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      type="button"
                      disabled={submitDraftLoading || draftLoading || Number(tableDraft.totals?.total || 0) <= 0}
                      onClick={handleSubmitTableDraft}
                      whileHover={{ y: submitDraftLoading ? 0 : -1 }}
                      whileTap={{ scale: submitDraftLoading ? 1 : 0.985 }}
                      aria-label="Send order to kitchen"
                      data-pmd-clean-send-kitchen="1"
                      className="min-h-12 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                      style={{
                        background: "#062F2A",
                        backgroundColor: "#062F2A",
                        backgroundImage: "none",
                        color: "#FFFFFF",
                        WebkitTextFillColor: "#FFFFFF",
                        border: "1px solid #062F2A",
                        boxShadow: "0 10px 22px rgba(0, 0, 0, 0.24)",
                        textShadow: "none",
                      }}
                    >
                      <span
                        style={{
                          color: "#FFFFFF",
                          WebkitTextFillColor: "#FFFFFF",
                          textShadow: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {submitDraftLoading ? "Sending..." : "Send to kitchen"}
                      </span>
                    </motion.button>

                    <motion.button
                      type="button"
                      onClick={onClose}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.985 }}
                      data-pmd-clean-continue-ordering="1"
                      className="min-h-12 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-95 active:scale-[0.99] border border-[color:var(--theme-border)] text-[color:var(--theme-text-primary)] bg-transparent"
                    >
                      Continue ordering
                    </motion.button>
                  </div>
                </div>
              ) : tableDraft.order_id ? (
                <button type="button" onClick={() => { setSubmittedSnapshot(createSubmittedTableOrderSnapshot(tableDraft, tableInfo, taxSettings?.percentage || 0)); setCheckoutStep(getCheckoutStepAfterDraftSubmit()) }} className={modalSecondaryBtn}>
                  View order status
                </button>
              ) : null}
            </motion.div>
          )}

{checkoutStep === "review" && hasPersonalItems && (<motion.div key="personal-cart-review" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0 }} className="space-y-4"><div className="pmd-checkout-flat-section rounded-2xl p-3 space-y-3">{/* PMD_REMOVED_YOUR_ITEMS_TITLE_20260604 */}<div className="pmd-checkout-list-scroll space-y-2 max-h-56 overflow-y-auto pr-1">{personalReviewItems.map((cartItem: any, idx) => (<OrderItemWithOptions key={String((cartItem as any).__pmdOptionKey || `${cartItem.item.id}-${idx}`)} cartItem={cartItem} optionKey={String((cartItem as any).__pmdOptionKey || cartItem.item.id)} unitLabel={(cartItem as any).__pmdUnitLabel} addToCart={addToCart as any} t={t} onOptionsChange={handleOptionsChange} />))}</div></div>

          {/* Totals */}
          {checkoutStep === "review" && hasPersonalItems && <div className="pmd-checkout-flat-section rounded-2xl p-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span>{vatLabels.subtotal}</span>
          <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            {taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 1 && (
            <div className="flex justify-between text-xs">
                <span>{t("tax")} {taxSettings.percentage}%</span>
                <span className="font-semibold">{formatCurrency(taxAmount)}</span>
            </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between text-xs">
                <span>{t("tip")}</span>
          <span className="font-semibold">{formatCurrency(tipAmount)}</span>
              </div>
            )}
            {appliedCoupon && couponDiscount > 0 && (
              <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                <span>{t("coupon") || "Coupon"} ({appliedCoupon.code})</span>
                <span className="font-semibold">-{formatCurrency(couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center divider pt-2 mt-2">
              <span className="text-base">{vatLabels.total}</span>
          <span className="text-base font-bold">{formatCurrency(checkoutStep === "payment" ? payableTotal : finalTotal)}</span>
            </div>
          </div>}

          {checkoutStep === "review" && hasPersonalItems && (
            <div className="mt-3 space-y-3">
              <div className="pmd-checkout-meta-row flex items-center justify-between rounded-2xl border px-3 py-2 text-xs" style={{ borderColor: "var(--theme-border)",
                    background: "transparent",
                    backgroundColor: "transparent",
                    boxShadow: "none",}}>
                <span className="muted">{orderContextLabel}</span>
                <span className="font-semibold">{orderContextValue}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  data-pmd-review-submit="true"
                  aria-label="Confirm items"
                  disabled={isLoading || allItems.length === 0}
                  onClick={handleConfirmMyItems}
                  className={modalPrimaryBtn} style={modalPrimaryBtnStyle}
                >
                  {isLoading ? "Confirming..." : "Confirm"}
                </button>

                <button
                  type="button"
                  data-pmd-review-continue="true"
                  onClick={onClose}
                  className={modalSecondaryBtn}
                >
                  Continue ordering
                </button>
              </div>
            </div>
          )}
          </motion.div>)}
          </AnimatePresence>

          {isSplitCheckoutStep(checkoutStep) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <SplitBillPanel className="pmd-checkout-flat-section rounded-3xl">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs muted">Share {formatCurrency(splitGrandTotal)} your way.</p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    ["equal", "Split equally"],
                    ["items", "By order items"],
                    ["shares", "By shares"],
                  ] as Array<[SplitMethod, string]>).map(([method, label]) => (
                    <button
                      data-pmd-split-method-real={method}
                      data-pmd-active={splitMethod === method ? "1" : "0"}
                      data-pmd-split-method-polished="1"
                      key={method}
                      type="button"
                      onClick={() => chooseSplitMethod(method)}
                      className={cn(
                        "group rounded-full border px-2 py-1.5 text-[11px] font-semibold transition-colors duration-150 focus:outline-none",
                        splitMethod === method ? "text-white" : ""
                      )}
                      style={{
                        boxShadow: "none",
                        outline: "none",
                      }}
                    >
                      <span
                        data-pmd-split-label="1"
                        className="inline-block transition-transform duration-150 ease-out"
                        style={{ willChange: "transform" }}
                      >
                        {label === "By order items" ? <>By order<br />items</> : label}
                      </span>
                    </button>
                  ))}
                </div>
              </SplitBillPanel>

              {checkoutStep !== "split-review" && (
                <div className="pmd-checkout-flat-section rounded-3xl p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold">People</span>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-[11px] muted">Split across {splitGuestCount} guests{suggestedSplitGuestCount > 2 ? ` · ${suggestedSplitGuestCount} detected` : ""}.</p>

                          <div
                            data-pmd-split-guest-stepper="1"
                            className="inline-flex shrink-0 items-center gap-1 rounded-full"
                          >
                            <button
                              type="button"
                              data-pmd-split-guest-count-control="remove"
                              aria-label="Remove guest"
                              disabled={splitGuestCount <= 2}
                              onClick={removeSplitGuest}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-35"
                              style={{ background: "#062F2A", color: "#FFFFFF" }}
                            >
                              <Minus className="h-3.5 w-3.5" style={{ color: "#FFFFFF", stroke: "#FFFFFF", WebkitTextFillColor: "#FFFFFF" }} />
                            </button>

                            <span
                              className="min-w-5 text-center text-sm font-semibold"
                              style={{ color: "var(--theme-text-primary)" }}
                              aria-label={`${splitGuestCount} guests`}
                            >
                              {splitGuestCount}
                            </span>

                            <button
                              type="button"
                              data-pmd-split-guest-count-control="add"
                              aria-label="Add guest"
                              disabled={splitGuestCount >= 10}
                              onClick={addSplitGuest}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-35"
                              style={{ background: "#062F2A", color: "#FFFFFF" }}
                            >
                              <Plus className="h-3.5 w-3.5" style={{ color: "#FFFFFF", stroke: "#FFFFFF", WebkitTextFillColor: "#FFFFFF" }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {splitGuestProfiles.map((guest, idx) => (
                      <span key={`${guest.name}-${idx}`} className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold" style={{ borderColor: "color-mix(in srgb, #b88940 32%, var(--theme-border) 68%)", background: "color-mix(in srgb, #b88940 9%, var(--theme-surface) 91%)", color: "#062F2A" }}>
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]" style={{ background: "color-mix(in srgb, #b88940 24%, var(--theme-surface) 76%)" }}>{guest.avatar}</span>
                        {guest.name}
                      </span>
                    ))}
                  </div>

                  {splitMethod === "equal" && (
                    <div className="space-y-2">
                      {equalSplitPeople.map((person, idx) => (
                        <div key={person.id} className="flex items-center justify-between rounded-2xl border p-3" style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)" }}>
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)", color: "#062F2A", border: "1px solid color-mix(in srgb, #b88940 35%, var(--theme-border) 65%)" }}>{person.avatar}</span>
                            <span className="truncate text-sm font-medium">{person.name}{idx === 0 ? " (rounding)" : ""}</span>
                          </div>
                          <span className="shrink-0 font-semibold">{formatCurrency(person.total)}</span>
                        </div>
                      ))}
                      <p className="rounded-full px-3 py-2 text-[11px] muted" style={{ background: "color-mix(in srgb, #b88940 12%, var(--theme-surface) 88%)" }}>Odd cents go to the first payer so totals match exactly.</p>
                    </div>
                  )}

                  {splitMethod === "items" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="muted">Tap items to assign guests.</span>
                        <span className={cn("rounded-full px-2 py-1 font-semibold", unassignedSplitItems > 0 ? "text-red-700" : "") } style={{ background: unassignedSplitItems > 0 ? "#FEE2E2" : "color-mix(in srgb, #062F2A 12%, var(--theme-surface) 88%)" }}>{unassignedSplitItems} unassigned</span>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {splitSourceItems.map((item: SplitSourceItem) => {
                          const assignedIndex = itemAssignments[item.key]
                          const nextLabel = assignedIndex === undefined || assignedIndex === null ? "Unassigned" : splitGuestNames[assignedIndex]
                          return (
                            <button key={item.key} type="button" className="flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left shadow-sm" style={{ border: "1px solid color-mix(in srgb, var(--theme-border) 70%, transparent)", background: "var(--theme-surface)" }} onClick={() => setItemAssignments((prev) => ({ ...prev, [item.key]: assignedIndex === undefined || assignedIndex === null ? 0 : assignedIndex >= splitGuestCount - 1 ? null : assignedIndex + 1 }))}>
                              <span className="truncate text-sm font-medium">{item.name}</span>
                              <span className="shrink-0 text-right text-xs"><span className="font-semibold">{formatCurrency(item.amount)}</span><br /><span className={assignedIndex === undefined || assignedIndex === null ? "text-red-700" : "muted"}>{nextLabel}</span></span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {splitMethod === "shares" && (
                    <div className="space-y-3">
                      {sharePercents.slice(0, splitGuestCount).map((percent, idx) => (
                        <div key={idx} className="rounded-2xl p-3 shadow-sm" style={{ border: "1px solid color-mix(in srgb, var(--theme-border) 70%, transparent)", background: "var(--theme-surface)" }}>
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span className="flex min-w-0 items-center gap-2 font-medium"><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)", color: "#062F2A", border: "1px solid color-mix(in srgb, #b88940 35%, var(--theme-border) 65%)" }}>{getSplitGuestAvatar(idx)}</span><span className="truncate">{splitGuestNames[idx]}</span></span>

                            <div
                              data-pmd-share-edit-group="1"
                              className="flex shrink-0 items-center gap-1.5"
                            >
                              <label className="sr-only" htmlFor={`share-percent-${idx}`}>Share percentage for {splitGuestNames[idx]}</label>
                              <div className="relative">
                                <input
                                  id={`share-percent-${idx}`}
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={Math.round(Number(percent || 0))}
                                  onChange={(event) => {
                                    const nextPercent = Math.max(0, Math.min(100, Number(event.target.value || 0)))
                                    setSharePercents((prev) => prev.map((value, valueIdx) => valueIdx === idx ? nextPercent : value))
                                  }}
                                  className="pmd-share-manual-input pmd-share-percent-input"
                                  inputMode="decimal"
                                />
                                <span className="pmd-share-input-suffix">%</span>
                              </div>

                              <span className="pmd-share-dot">·</span>

                              <label className="sr-only" htmlFor={`share-amount-${idx}`}>Share amount for {splitGuestNames[idx]}</label>
                              <div className="relative">
                                <span className="pmd-share-input-prefix">€</span>
                                <input
                                  id={`share-amount-${idx}`}
                                  type="number"
                                  min={0}
                                  max={Math.max(0, Number(splitGrandTotal || 0))}
                                  step={0.01}
                                  value={(splitGrandTotal * (Number(percent || 0) / 100)).toFixed(2)}
                                  onChange={(event) => {
                                    const nextAmount = Math.max(0, Number(event.target.value || 0))
                                    const nextPercent = Number(splitGrandTotal || 0) > 0 ? Math.max(0, Math.min(100, (nextAmount / Number(splitGrandTotal || 0)) * 100)) : 0
                                    setSharePercents((prev) => prev.map((value, valueIdx) => valueIdx === idx ? Math.round(nextPercent) : value))
                                  }}
                                  className="pmd-share-manual-input pmd-share-amount-input"
                                  inputMode="decimal"
                                />
                              </div>
                            </div>
                          </div>
                          <input type="range" min="0" max="100" step="1" value={percent} onChange={(event) => setSharePercents((prev) => prev.map((value, valueIdx) => valueIdx === idx ? Number(event.target.value) : value))} className="pmd-split-slider w-full" />
                        </div>
                      ))}
                      <div className="flex justify-center">
                        <span className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", sharePercentTotal === 100 ? "" : "text-red-700")} style={{ background: sharePercentTotal === 100 ? "color-mix(in srgb, #062F2A 12%, var(--theme-surface) 88%)" : "#FEF2F2", border: `1px solid ${sharePercentTotal === 100 ? "color-mix(in srgb, #062F2A 18%, var(--theme-border) 82%)" : "#FCA5A5"}` }}>
                          {sharePercentTotal === 100 ? "100% ready" : sharePercentTotal < 100 ? `${100 - sharePercentTotal}% remaining` : `Over by ${sharePercentTotal - 100}%`}
                        </span>
                      </div>
                    </div>
                  )}

                  <ThemedButton type="button" disabled={!canConfirmSplitMethod} onClick={goToSplitReview} variant="primary" fullWidth className={cn(!canConfirmSplitMethod && "cursor-not-allowed")}>
                    Review split
                  </ThemedButton>
                </div>
              )}

              {checkoutStep === "split-review" && (
                <div className="space-y-3">
                  {activeSplitPeople.map((person) => (
                    <div key={person.id} className="rounded-3xl p-3 space-y-2 shadow-sm" style={{ border: `1px solid ${selectedSplitPersonId === person.id ? "#b88940" : "color-mix(in srgb, var(--theme-border) 70%, transparent)"}`, background: "var(--theme-surface)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)", color: "#062F2A", border: "1px solid color-mix(in srgb, #b88940 35%, var(--theme-border) 65%)" }}>{person.avatar}</span>
                          <h4 className="truncate font-semibold">{person.name}</h4>
                        </div>
                        <span className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold" style={{ background: person.status === "Paid" ? "#DCFCE7" : "color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)", color: person.status === "Paid" ? "#166534" : "#5A3512" }}>{person.status}</span>
                      </div>
                      <div className="space-y-1 text-xs muted">
                        {person.items.map((item, idx) => <div key={`${person.id}-${idx}`} className="flex justify-between gap-2"><span className="truncate">{item.name}</span><span>{formatCurrency(item.amount)}</span></div>)}
                        {person.tax > 0 && <div className="flex justify-between"><span>Proportional service/tax</span><span>{formatCurrency(person.tax)}</span></div>}
                      </div>
                      <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--theme-border)" }}><span className="font-semibold">Total</span><span className="font-bold">{formatCurrency(person.total)}</span></div>
                      {selectedSplitPersonId === person.id ? (
                        <ThemedButton type="button" onClick={() => setCheckoutStep("payment")} variant="primary" fullWidth>Pay my share</ThemedButton>
                      ) : (
                        <ThemedButton type="button" onClick={() => setSelectedSplitPersonId(person.id)} variant="secondary" fullWidth>Select payer</ThemedButton>
                      )}
                    </div>
                  ))}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => toast({ title: "Payment links ready", description: "Share links can be generated by the payment API when multi-device checkout is enabled." })} className={modalSecondaryBtn}><Link2 className="h-4 w-4" /> Send payment link to others</button>
                    <button type="button" onClick={() => toast({ title: "QR share", description: "Ask guests to scan the table QR to pay their own share." })} className={modalSecondaryBtn}><QrCode className="h-4 w-4" /> Show QR/share link</button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {(checkoutStep === "submitted" || checkoutStep === "paid") && submittedSnapshot && (
            <motion.div
              data-pmd-order-status-card="1"
              className="relative mt-7 space-y-3"
            >
              <OrderStatusCard className="pt-7 space-y-3">
              {(submittedSnapshot?.showCustomerEta ?? true) && (
                <div
                  data-pmd-floating-eta-circle="1"
                  className="absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                  aria-label={`Estimated time ${estimatedMinutes} minutes`}
                  style={{
                    width: "4.45rem",
                    height: "4.45rem",
                    background: "#062F2A",
                    backgroundColor: "#062F2A",
                    border: "2px solid #b88940",
                    boxShadow: "0 16px 34px rgba(6, 47, 42, 0.24)",
                    color: "#FFFFFF",
                    WebkitTextFillColor: "#FFFFFF",
                  }}
                >
                  <div className="flex flex-col items-center justify-center leading-none">
                    <span
                      className="font-extrabold tracking-tight"
                      style={{
                        color: "#FFFFFF",
                        WebkitTextFillColor: "#FFFFFF",
                        fontSize: "1.45rem",
                        lineHeight: 1,
                      }}
                    >
                      {Math.max(1, Math.round(Number(estimatedMinutes) || 0))}
                    </span>
                    <span
                      className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{
                        color: "rgba(255,255,255,0.92)",
                        WebkitTextFillColor: "rgba(255,255,255,0.92)",
                      }}
                    >
                      mins
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <CheckoutIconFrame
                  data-pmd-order-received-icon="1"
                  className="pmd-order-received-icon rounded-full"
                >
                  <Check className="h-5 w-5" strokeWidth={3} />
                </CheckoutIconFrame>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="pmd-checkout-status-title text-base font-semibold">{checkoutStep === "paid" ? "Payment confirmed" : "We received your order"}</p>

                  </div>
                  {checkoutStep === "paid" && <p className="text-xs muted">Your order is confirmed and being prepared.</p>}
                </div>
              </div>

              <div className="pmd-checkout-total-card surface-sub rounded-2xl p-3 space-y-2 text-sm" style={{ background: "var(--theme-surface)", color: "var(--theme-text-primary)", border: "1px solid var(--theme-border)" }}>
                {submittedSnapshot?.orderId && (
                  <div className="flex items-center justify-between">
                    <span className="muted font-medium">Order Number:</span>
                    <span className="font-semibold text-[15px]">{submittedSnapshot.orderId}</span>
                  </div>
                )}
                {Number(submittedSnapshot?.vatAmount ?? 0) > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="muted font-medium">Subtotal:</span>
                      <span className="font-semibold text-[15px]">{formatCurrency(Number(submittedSnapshot?.subtotal ?? 0))}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="muted font-medium">VAT {Number(submittedSnapshot?.vatPercentage ?? taxSettings?.percentage ?? 0)}%:</span>
                      <span className="font-semibold text-[15px]">{formatCurrency(Number(submittedSnapshot?.vatAmount ?? 0))}</span>
                    </div>
                  </>
                )}
                {(paidTipAmount > 0 || paidCouponDiscount > 0) && (
                  <div className="flex items-center justify-between">
                    <span className="muted font-medium">Items total:</span>
                    <span className="font-semibold text-[15px]">{formatCurrency(submittedBaseTotal || Number(submittedSnapshot?.total ?? 0))}</span>
                  </div>
                )}
                {paidTipAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="muted font-medium">Tip:</span>
                    <span className="font-semibold text-[15px]">{formatCurrency(paidTipAmount)}</span>
                  </div>
                )}
                {paidCouponDiscount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="muted font-medium">Coupon {String(submittedSnapshot?.paidCouponCode || appliedCoupon?.code || "") ? `(${String(submittedSnapshot?.paidCouponCode || appliedCoupon?.code)})` : ""}:</span>
                    <span className="font-semibold text-[15px]" style={{ color: "#166534" }}>-{formatCurrency(paidCouponDiscount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="muted font-medium">{checkoutStep === "paid" && (paidTipAmount > 0 || paidCouponDiscount > 0) ? "Amount paid:" : "Order Total:"}</span>
                  <span className="font-semibold text-[15px]">{formatCurrency(checkoutStep === "paid" && (paidTipAmount > 0 || paidCouponDiscount > 0) ? paidAmountTotal : orderStatusTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="muted font-medium">{submittedContextLabel}:</span>
                  <span className="font-semibold text-[15px]">{submittedContextValue}</span>
                </div>
                {vatLabels.includedNote && (
                  <div className="flex items-center justify-between pt-1 text-xs opacity-75">
                    <span className="muted font-medium">VAT:</span>
                    <span className="font-medium">{vatLabels.includedNote}</span>
                  </div>
                )}
              </div>

              <div className="pmd-checkout-flat-section rounded-2xl p-3">
                <h3 className="mb-2 text-sm font-semibold">{vatLabels.summary}</h3>
                <div className="pmd-checkout-list-scroll space-y-2 max-h-56 overflow-y-auto pr-1">
                  {groupOrderDisplayItems(submittedSnapshot?.submittedItems || []).map((item: any, idx: number) => (
                    <motion.div layout key={`${item?.menu_id || item?.order_menu_id || item?.name || idx}-${idx}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16, ease: "easeOut" }} className="pmd-checkout-item-row flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{Number(item?.quantity || 1)}x {String(item?.name || `Item ${idx + 1}`)}</span>
                      <span className="font-semibold text-[15px]">{formatCurrency(Number(item?.subtotal ?? (Number(item?.price || 0) * Number(item?.quantity || 1))))}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {checkoutStep !== "paid" && <div className="space-y-3">
                {checkoutStep === "submitted" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <motion.button
                      type="button"
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => { setIsSplitting(false); setSelectedSplitPersonId(null); setCheckoutStep('payment') }}
                      className="group flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-md transition" style={modalPrimaryBtnStyle}
                    >
                      Pay in full <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: "#FFFFFF", stroke: "#FFFFFF" }} />
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.985 }}
                      data-pmd-split-bill-stable="1"
                      onClick={() => startSplitFlow("equal")}
                      className="pmd-split-bill-stable-button group flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition"
                      style={{
                        border: "1.5px solid #D8B982",
                        borderColor: "#D8B982",
                        color: "#10201D",
                        WebkitTextFillColor: "#10201D",
                        background: "rgba(255, 255, 255, 0.74)",
                        backgroundColor: "rgba(255, 255, 255, 0.74)",
                        backgroundImage: "none",
                        boxShadow: "0 8px 18px rgba(17, 24, 39, 0.04)",
                        textShadow: "none",
                        opacity: 1,
                        transition: "none",
                      }}
                    >
                      <Users className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: "#b88940", stroke: "#b88940" }} /> Split bill
                    </motion.button>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onOpenOrderUpdate?.(submittedSnapshot || initialSubmittedOrder || null)
                    onClose()
                  }}
                  className={modalSecondaryBtn}
                >
                  Continue ordering
                </button>
              </div>}
              {checkoutStep === "paid" && (
                <div className="pmd-order-complete-content space-y-3">
                  <div className="rounded-2xl border p-3 space-y-3" style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)" }}>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" style={{ color: "#b88940" }} />
                      <h3 className="text-sm font-semibold">Rate your visit</h3>
                    </div>
                    <p className="text-xs muted">Thank you — a quick note for the restaurant.</p>
                    <div className="flex gap-1" aria-label="Restaurant rating">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" aria-label={`${star} star${star > 1 ? "s" : ""}`} onClick={() => { setReviewRating(star); if (reviewSubmitStatus !== "loading") setReviewSubmitStatus("idle") }} className="rounded-full p-1">
                          <Star className="h-6 w-6" style={{ color: "#b88940", fill: reviewRating >= star ? "#b88940" : "transparent" }} />
                        </button>
                      ))}
                    </div>
                    <Textarea value={reviewComment} onChange={(event) => { setReviewComment(event.target.value); if (reviewSubmitStatus !== "loading") setReviewSubmitStatus("idle") }} placeholder="Optional comment for the restaurant" className="min-h-[78px] rounded-2xl" />
                    {/* PMD_FINAL_REVIEW_SUBMIT_BUTTON_20260605 */}
                    <button
                      type="button"
                      data-pmd-submit-review="1"
                      disabled={!canSubmitReview || reviewSubmitStatus === "loading" || reviewSubmitStatus === "success"}
                      onClick={handleSubmitReview}
                      className="min-h-11 w-full rounded-full px-4 py-2 text-sm font-semibold transition"
                      style={{ border: "1px solid #062F2A", background: canSubmitReview && reviewSubmitStatus !== "success" ? "#062F2A" : "rgba(6, 47, 42, 0.18)", color: "#FFFFFF", WebkitTextFillColor: "#FFFFFF", boxShadow: canSubmitReview ? "0 14px 28px rgba(0, 0, 0, 0.24)" : "none", opacity: !canSubmitReview || reviewSubmitStatus === "success" ? 0.72 : 1 }}
                    >
                      {reviewSubmitStatus === "loading" ? "Submitting..." : reviewSubmitStatus === "success" ? "Review submitted" : "Submit review"}
                    </button>
                    {reviewSubmitMessage && <p className="text-xs" style={{ color: reviewSubmitStatus === "error" ? "#B42318" : "#166534" }}>{reviewSubmitMessage}</p>}
                    {reviewSubmitStatus === "success" && merchantSettings.reviewSocial?.sharePromptEnabled && activeReviewSharePlatforms.length > 0 && (
                      <div className="rounded-2xl border p-3" style={{ borderColor: "rgba(216, 185, 130, 0.42)", background: "rgba(255, 249, 239, 0.78)" }}>
                        <p className="mb-2 text-xs font-semibold" style={{ color: "#10201D" }}>Would you like to share your review publicly?</p>
                        <div className="flex flex-wrap gap-2">
                          {activeReviewSharePlatforms.map(({ id, label, icon: Icon }) => (
                            <a key={id} href={merchantSettings.reviewSocial.platforms[id].url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: "rgba(6, 47, 42, 0.18)", color: "#062F2A", background: "rgba(255,255,255,0.72)" }}>
                              <Icon className="h-3.5 w-3.5" /> {label}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <button type="button" onClick={handleDownloadBusinessInvoice} disabled={invoiceDownloadStatus === "loading"} className="min-h-10 w-full max-w-[280px] rounded-full border px-4 py-2 text-xs font-semibold" style={{ borderColor: "color-mix(in srgb, #b88940 48%, var(--theme-border) 52%)", color: "#062F2A", background: "transparent", opacity: invoiceDownloadStatus === "loading" ? 0.72 : 1 }}>{invoiceDownloadStatus === "loading" ? "Preparing invoice..." : "Download business invoice"}</button>
                  </div>
                  {invoiceDownloadMessage && <p className="text-center text-xs" style={{ color: "#B42318" }}>{invoiceDownloadMessage}</p>}
                  <div className="flex justify-center pt-1">
                    <img src="/assets/media/uploads/Paymydinelogo.png" alt="PayMyDine" className="max-h-7 max-w-[120px] opacity-70" />
                  </div>
                  <button type="button" onClick={onClose} className={modalSecondaryBtn}>Back to menu</button>
                </div>
              )}
              </OrderStatusCard>
            </motion.div>
          )}

          {checkoutStep === "payment" && (
            <>
              <motion.div key="payment-card-header" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: "easeOut" }} className="space-y-3">
                <PaymentCardFrame className="pmd-checkout-payment-card surface-sub">
                <div
                  data-pmd-payment-header-copy-row="1"
                  className="flex items-center gap-3 rounded-2xl p-4"
                  style={{
                    background: "var(--theme-surface)",
                    color: "var(--theme-text-primary)",
                    border: "1px solid var(--theme-border)",
                  }}
                >
                  <CheckoutIconFrame
                    data-pmd-payment-header-icon="1"
                    className="rounded-full"
                  >
                    <CreditCard className="h-5 w-5" />
                  </CheckoutIconFrame>
                  <p
                    className="text-sm font-semibold leading-snug"
                    style={{
                      color: "var(--theme-text-muted)",
                      WebkitTextFillColor: "var(--theme-text-muted)",
                    }}
                  >
                    Ready to pay?
                  </p>
                </div>
                {selectedSplitPerson && (
                  <CheckoutStepCard variant="subtle" className="flex items-center justify-between p-3">
                    <div className="flex items-center space-x-2"><span className="pmd-checkout-avatar-frame inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold">{selectedSplitPerson.avatar}</span><span className="text-xs font-semibold">{selectedSplitPerson.name}'s share</span></div>
                    <span className="text-sm font-bold">{formatCurrency(selectedSplitPerson.total)}</span>
                  </CheckoutStepCard>
                )}
                </PaymentCardFrame>
              </motion.div>
              {pendingSummary && (
                <div className="pmd-checkout-flat-section rounded-2xl p-3 text-xs">
                  <div className="flex justify-between"><span className="muted">Total</span><span className="font-semibold">{formatCurrency(pendingSummary.orderTotal || 0)}</span></div>
                  <div className="flex justify-between"><span className="muted">Already paid</span><span className="font-semibold">{formatCurrency(pendingSummary.settledAmount || 0)}</span></div>
                  <div className="flex justify-between mt-1"><span className="muted">Remaining</span><span className="font-semibold">{formatCurrency(pendingSummary.remainingAmount || 0)}</span></div>
                </div>
              )}
              <motion.div className="space-y-3">
                <CheckoutSummaryCard className="pmd-checkout-total-card space-y-3">
                <div className="pmd-checkout-meta-row flex items-center justify-between rounded-2xl border px-3 py-2 text-xs" style={{ borderColor: "var(--theme-border)",
                    background: "transparent",
                    backgroundColor: "transparent",
                    boxShadow: "none",}}>
                  <span className="muted">{orderContextLabel}</span>
                  <span className="font-semibold">{orderContextValue}</span>
                </div>
                <div className="space-y-1 text-sm">
                  {paymentVatAmount > 0 && !selectedSplitPerson && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="muted">Subtotal</span>
                        <span className="font-semibold">{formatCurrency(paymentSubtotalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="muted">VAT {paymentVatPercentage}%</span>
                        <span className="font-semibold">{formatCurrency(paymentVatAmount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="muted">{selectedSplitPerson ? "Share amount" : "Items total"}</span>
                    <span className="font-semibold">{formatCurrency(paymentBaseAmount)}</span>
                  </div>
                  {paymentTipAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="muted">Tip</span>
                      <span className="font-semibold">{formatCurrency(paymentTipAmount)}</span>
                    </div>
                  )}
                  {paymentCouponDiscount > 0 && appliedCoupon && (
                    <div className="flex items-center justify-between">
                      <span className="muted">Coupon {appliedCoupon.code ? `(${appliedCoupon.code})` : ""}</span>
                      <span className="font-semibold" style={{ color: "#166534" }}>-{formatCurrency(paymentCouponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--theme-border)" }}>
                    <span className="font-semibold">Payable total</span>
                    <span className="text-base font-bold" style={{ color: "#b88940" }}>{formatCurrency(paymentPayableTotal)}</span>
                  </div>
                </div>
                {tipSettings.enabled && (
                  <TipCouponPanel data-pmd-payment-real-panel="tip-coupon">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{selectedSplitPerson ? `${selectedSplitPerson.name}'s tip` : "Add tip"}</span>
                      {paymentTipAmount > 0 && <span className="text-xs font-semibold" style={{ color: "#b88940" }}>{formatCurrency(paymentTipAmount)}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(tipSettings.percentages || []).map((p) => (
                        <SplitMethodButton key={p} selected={paymentTipPercentage === p && !paymentCustomTip} onClick={() => updatePaymentTipPercentage(p)}>{p}%</SplitMethodButton>
                      ))}
                      <div className="relative min-w-[96px] flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs muted">€</span>
                        <ThemedInput
                    data-pmd-custom-tip-shows-selected-amount="1"
                    step="0.01"
                    value={customTip || (Number(tipAmount) > 0 ? Number(tipAmount).toFixed(2) : "")} type="number" min="0" onChange={(event) => updatePaymentCustomTip(event.target.value)} placeholder="Custom" className="h-9 w-full pl-7 pr-3 text-xs font-semibold" />
                      </div>
                    </div>
                  </TipCouponPanel>
                )}
                <TipCouponPanel>
                  {!appliedCoupon || selectedSplitPerson ? (
                    <div className="flex gap-2">
                      <ThemedInput type="text" value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setCouponError(null) }} placeholder="Coupon code" className="h-9 min-w-0 flex-1 px-3 text-xs font-semibold" disabled={couponLoading} />
                      <ThemedButton type="button" disabled={couponLoading || !couponCode.trim()} onClick={async () => {
                        if (!couponCode.trim()) return
                        if (selectedSplitPerson) {
                          setCouponError("Coupon validation for split payments is coming soon.")
                          return
                        }
                        setCouponLoading(true)
                        setCouponError(null)
                        try {
                          const result = await validateCoupon(couponCode.trim(), paymentBaseAmount)
                          if (!result.success) setCouponError(result.message || "Coupon will be checked at payment.")
                          else {
                            setCouponCode("")
                            toast({ title: "Coupon applied", description: "Your coupon was added to this payment." })
                          }
                        } catch {
                          setCouponError("Coupon validation coming soon.")
                        } finally {
                          setCouponLoading(false)
                        }
                      }} className="h-9 px-4 text-xs font-semibold disabled:opacity-50" variant="secondary">{couponLoading ? "Checking..." : "Apply"}</ThemedButton>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 rounded-full px-3 py-2 text-xs" style={{ background: "color-mix(in srgb, #062F2A 10%, var(--theme-surface) 90%)" }}>
                      <span className="font-semibold">{appliedCoupon.name || "Coupon"} {appliedCoupon.code ? `(${appliedCoupon.code})` : ""}</span>
                      <button type="button" onClick={() => { removeCoupon(); setCouponCode(""); setCouponError(null) }} className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition" style={{ borderColor: "color-mix(in srgb, #b88940 45%, var(--theme-border) 55%)", color: "#062F2A", background: "var(--theme-surface)" }}>Remove</button>
                    </div>
                  )}
                  {couponError && <p className="text-xs text-red-700">{couponError}</p>}
                </TipCouponPanel>
                </CheckoutSummaryCard>
              </motion.div>
          {/* Payment Methods */}
          <AnimatePresence initial={false} mode="wait">
            {checkoutStep === "payment" ? (
              <motion.div
                key="payment-methods"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3 pt-2"
              >
                <PaymentCardFrame className="pmd-checkout-payment-methods-card">
                <h3 className="text-center text-sm">{t("paymentMethods")}</h3>
                <div className="flex justify-center items-center gap-3 flex-wrap">
                  {loadingPayments ? (
                    <div className="text-sm muted">Loading payment methods...</div>
                  ) : visiblePaymentMethods.length === 0 ? (
                    <div className="text-sm muted">No payment methods available</div>
                  ) : (
                    visiblePaymentMethods.map((method) => (
                      <motion.div key={method.code}>
                        <PaymentMethodTile
                          label={method.name}
                          selected={selectedPaymentMethod === method.code}
                          onClick={() => {
                            try {
                              if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
                                (window as any).__PMD_WALLET_POST({
                                  level: "info",
                                  message: "PMD_PAYMENT_METHOD_CLICK",
                                  data: {
                                    clickedCode: method.code,
                                    clickedName: method.name,
                                    selectedPaymentMethodBefore: selectedPaymentMethod ?? null,
                                    selectedMethodBefore: selectedMethod ? {
                                      code: (selectedMethod as any).code,
                                      name: (selectedMethod as any).name,
                                    } : null,
                                    stripePromise: !!stripePromise,
                                    stripeConfig: stripeConfig ? {
                                      currency: stripeConfig?.currency || null,
                                      countryCode: stripeConfig?.countryCode || null,
                                      applePayEnabled: (stripeConfig as any)?.applePayEnabled ?? null,
                                      googlePayEnabled: (stripeConfig as any)?.googlePayEnabled ?? null,
                                    } : null,
                                    ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
                                  }
                                });
                              }
                            } catch {}
                            handlePaymentMethodSelect(method.code)
                          }}
                        >
                          {method.code === "card" ? (
                            <img
                              src={isDarkTheme ? "/images/payments/card-dark.svg" : "/images/payments/card-light.svg"}
                              alt={method.name}
                              width={40}
                              height={22}
                              className="object-contain"
                            />
                          ) : (
                            <img
                              src={
                                method.code === "paypal"
                                  ? "/images/payments/paypal.png"
                                  : method.code === "google_pay"
                                    ? "/images/payments/google_pay.png"
                                    : iconForPayment(method.code)
                              }
                              alt={method.name}
                              width={method.code === "wero" ? 50 : method.code === "cod" ? 30 : method.code === "paypal" ? 30 : method.code === "apple_pay" || method.code === "google_pay" ? 50 : 42}
                              height={method.code === "wero" ? 29 : method.code === "apple_pay" || method.code === "google_pay" ? 28 : 24}
                              className="object-contain"
                            />
                          )}
                        </PaymentMethodTile>
                      </motion.div>
                    ))
                  )}
                </div>
                {canRenderPaymentMethodDetail(selectedPaymentMethod) && (
                  <div data-pmd-payment-selected-detail="1" className="pmd-checkout-payment-detail pt-2">
                    {renderPaymentForm()}
                  </div>
                )}
                </PaymentCardFrame>
              </motion.div>
            ) : null}
          </AnimatePresence>
            </>
          )}
</div>
      </motion.div>
    </div>
  )
}

function ExpandingToolbarMenuItemCard({ item, onSelect, onFirstAdd, prioritizeImage = false, highlightSettings = defaultMenuHighlightSettings }: { item: MenuItem; onSelect: (item: MenuItem) => void; onFirstAdd: () => void; prioritizeImage?: boolean; highlightSettings?: MenuHighlightSettings }) {
  const addToCart = useCartStore((state) => state.addToCart)
  const { items } = useCartStore()
  const { t } = useLanguageStore()

  // NOTE: item.price from filteredItems is already adjusted, so we don't adjust again

  // Get current quantity for this item
  const currentItem = items.find(cartItem => cartItem.item.id === item.id)
  const quantity = currentItem?.quantity || 0

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    // IMPORTANT: item from filteredItems has adjusted price, but cart needs ORIGINAL price
    // So we need to revert the price adjustment before adding to cart
    const { taxSettings } = useCmsStore.getState()
    let itemToAdd = { ...item }

    if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
      // Revert the adjustment: divide by (1 + VAT%)
      itemToAdd.price = item.price / (1 + taxSettings.percentage / 100)
      // Also revert option prices
      if (itemToAdd.options) {
        itemToAdd.options = itemToAdd.options.map(option => ({
          ...option,
          values: option.values.map(value => ({
            ...value,
            price: value.price / (1 + taxSettings.percentage / 100)
          }))
        }))
      }
    }

    addToCart(itemToAdd)
    if (quantity === 0) {
      onFirstAdd()
    }
  }

  const itemName = item.nameKey && t(item.nameKey as TranslationKey) ? t(item.nameKey as TranslationKey) : item.name
  const itemDescription = item.descriptionKey && t(item.descriptionKey as TranslationKey) ? t(item.descriptionKey as TranslationKey) : item.description
  const truncatedDescription = truncateText(itemDescription || '', 66)

  return (
    <div
      className="flex items-center space-x-4 group cursor-pointer"
      onClick={() => onSelect(item)}
    >
      <div className="relative w-28 h-28 md:w-36 md:h-36 flex-shrink-0">
        {highlightSettings.badge_position !== 'title_inline' && highlightSettings.badge_position !== 'hidden' && (
          <div className={`absolute top-1 z-10 ${highlightSettings.badge_position === 'image_top_right' ? 'right-1' : 'left-1'}`}>
            <MenuRecommendationBadges item={item} compact settings={highlightSettings} placement="card" />
          </div>
        )}
        <OptimizedImage
          src={item.image || (Array.isArray((item as any).images) ? (item as any).images[0] : "") || "/placeholder.svg"}
          alt={itemName}
          fill
          priority={prioritizeImage}
          className="object-contain transition-transform duration-700 ease-in-out group-hover:scale-110"
        />
      </div>
      <div className="flex-grow">
        <div className="flex flex-wrap items-center gap-2">
          <h3 dir={getTextDirection(itemName)} className={`text-lg font-bold text-paydine-elegant-gray ${getTextAlignClass(itemName)}`}>{itemName}</h3>
          {highlightSettings.badge_position === 'title_inline' && (
            <MenuRecommendationBadges item={item} compact settings={highlightSettings} placement="card" />
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <FoodAttributeTags
            halal={item.halal}
            vegetarian={item.vegetarian}
            vegan={item.vegan}
            allergens={item.allergens}
            allergyTags={item.allergy_tags}
            compact
          />
          <FoodItemColorDot color={item.color} label={`${itemName} color`} />
          <FoodNutritionSummary
            calories={item.calories}
            protein={item.protein}
            carbs={item.carbs}
            fat={item.fat}
            sugar={item.sugar}
            servingSize={item.serving_size}
            compact
          />
        </div>
        <p dir={getTextDirection(truncatedDescription)} className={`text-sm text-gray-500 mt-1 line-clamp-2 ${getTextAlignClass(truncatedDescription)}`}>{truncatedDescription}</p>
        <div className="flex justify-between items-center mt-2">
        <p className="text-lg font-semibold menu-item-price">{formatCurrency(item.price || 0)}</p>
          {/* PMD_MENU_ITEM_MINUS_AFTER_ADD_20260605 */}
          <div className="relative flex items-center gap-2">
            {quantity > 0 && (
              <button
                type="button"
                className="quantity-btn pmd-v2-action-circle w-10 h-10 font-bold text-lg"
                onClick={(e) => {
                  e.stopPropagation()
                  addToCart(currentItem?.item || item, -1)
                }}
                aria-label="Remove one item"
              >
                <Minus className="h-5 w-5" style={{ color: "#FFFFFF", stroke: "#FFFFFF", WebkitTextFillColor: "#FFFFFF" }} />
              </button>
            )}
            <button
              className="quantity-btn pmd-v2-action-circle w-12 h-12 font-bold text-lg"
              onClick={handleAdd}
              aria-label="Add to cart"
            >
              {quantity > 0 ? (
                <span className="text-lg font-bold">{quantity}</span>
              ) : (
                <span data-pmd-menu-plus-text="1" aria-hidden="true" style={{ color: "#FFFFFF", WebkitTextFillColor: "#FFFFFF", fontWeight: 900, fontSize: "28px", lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", transform: "translateY(-1px)" }}>+</span>
              )}
              <span className="sr-only">Add to cart</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ExpandingBottomToolbar({
  toolbarState,
  setToolbarState,
  showBillArrow,
  items,
  totalPrice,
  subtotalPrice = 0,
  taxAmount = 0,
  taxPercentage = 0,
  t,
  onCartClick,
  onWaiterClick,
  onNoteClick,
  onOrderClick,
  orderCount = 0,
  waiterDisabled = false,
  noteDisabled = false,
  totalItems,
  themeBackgroundColor,
}: ExpandingBottomToolbarProps) {
  const { taxSettings } = useCmsStore()
  const themeMenuActions = useThemeMenuActions()
  const toolbarVatLabel = taxPercentage > 0 ? `VAT ${Number(taxPercentage).toLocaleString(undefined, { maximumFractionDigits: 2 })}%` : "VAT"

  // Helper to adjust price if VAT is included
  const adjustPrice = (price: number): number => {
    if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
      return price * (1 + taxSettings.percentage / 100)
    }
    return price
  }
  // Heights for each state
  const collapsedHeight = 76
  const previewHeight = 180
  const expandedHeight = 420
  const hasToolbarContent = items.length > 0
  const showOrderAction = typeof onOrderClick === "function"
  const toolbarIconBtnStyle: React.CSSProperties = {
    background: "color-mix(in srgb, var(--theme-surface) 92%, #f5fff8 8%)",
    border: "1px solid var(--theme-border)",
    color: "var(--theme-text-primary)",
    boxShadow: "0 6px 16px rgba(17,24,39,0.08)",
    borderRadius: "9999px",
  }
  const effectiveToolbarState = hasToolbarContent ? toolbarState : "collapsed"

  let height = collapsedHeight
  if (effectiveToolbarState === "preview") height = previewHeight
  if (effectiveToolbarState === "expanded") height = expandedHeight

  // Safety net: Ensure toolbar background is applied correctly
  useEffect(() => {
    const applyToolbarBackground = () => {
      const toolbarElement = document.querySelector('.toolbar-inner-fixed') ||
                            document.querySelector('div[class*=""][class*="rounded-[2.5rem]"]')

      if (toolbarElement) {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'clean-light'
        const themeColors = {
          'clean-light': 'var(--theme-background, #FAFAFA)',
          'modern-dark': 'var(--theme-background, #0A0E12)',
          'gold-luxury': 'var(--theme-background, #FAF9F4)',
          'vibrant-colors': 'var(--theme-background, #E2CEB1)',
          'minimal': 'var(--theme-background, #CFEBF7)'
        }

        const bgColor = themeColors[currentTheme as keyof typeof themeColors] || themeColors['clean-light']

        // Apply theme-aware background
        const htmlElement = toolbarElement as HTMLElement
        htmlElement.style.background = bgColor
        htmlElement.style.backgroundColor = bgColor
        htmlElement.style.opacity = '1'

        // Add ID for future targeting
        toolbarElement.id = 'toolbar-inner-fixed'
      }
    }

    // Apply immediately
    applyToolbarBackground()

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          setTimeout(applyToolbarBackground, 100)
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })

    // Cleanup
    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <motion.div
      className="fixed bottom-[1.35rem] left-1/2 -translate-x-1/2 w-full max-w-[23.04rem] z-40 px-2"
      animate={
        toolbarState === "expanded"
          ? { height: "auto" }
          : { height }
      }
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{ pointerEvents: "auto" }}
    >
      <div
        className="
          relative flex flex-col w-full h-full

          rounded-[2.5rem] shadow-2xl border border-white/30 ring-1 ring-paydine-champagne/10
        "
        style={{
          minHeight: 76,
          height: "100%",
          background: "var(--pmd-v2-page-bg, var(--theme-background))",
          backgroundColor: "var(--pmd-v2-page-bg, var(--theme-background))",
          opacity: 1
        }}
      >
        {/* Arrow for expanding/collapsing bill */}
        {showBillArrow && (
          <button
            type="button"
            data-pmd-show-bill-toggle="1"
            ref={(el) => {
              if (!el) return

              const applyPmdShowBillToggle = () => {
                el.style.setProperty("width", "36px", "important")
                el.style.setProperty("height", "36px", "important")
                el.style.setProperty("min-width", "36px", "important")
                el.style.setProperty("min-height", "36px", "important")
                el.style.setProperty("background", "#062F2A", "important")
                el.style.setProperty("background-color", "#062F2A", "important")
                el.style.setProperty("background-image", "none", "important")
                el.style.setProperty("color", "#FFFFFF", "important")
                el.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
                el.style.setProperty("border", "1px solid #062F2A", "important")
                el.style.setProperty("border-color", "#062F2A", "important")
                el.style.setProperty("outline-color", "#062F2A", "important")
                el.style.setProperty("box-shadow", "0 8px 18px rgba(6, 47, 42, 0.22)", "important")
                el.style.setProperty("opacity", "1", "important")
                el.style.setProperty("filter", "none", "important")
                el.style.setProperty("transform", "translateX(-50%)", "important")

                el.querySelectorAll("svg, svg *").forEach((node) => {
                  const svgEl = node as HTMLElement
                  svgEl.style.setProperty("width", "16px", "important")
                  svgEl.style.setProperty("height", "16px", "important")
                  svgEl.style.setProperty("color", "#FFFFFF", "important")
                  svgEl.style.setProperty("stroke", "#FFFFFF", "important")
                  svgEl.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
                  svgEl.style.setProperty("fill", "none", "important")
                })
              }

              applyPmdShowBillToggle()

              if (el.dataset.pmdShowBillToggleLock !== "1") {
                el.dataset.pmdShowBillToggleLock = "1"

                let busy = false
                const observer = new MutationObserver(() => {
                  if (busy) return
                  busy = true
                  requestAnimationFrame(() => {
                    applyPmdShowBillToggle()
                    busy = false
                  })
                })

                observer.observe(el, {
                  attributes: true,
                  childList: true,
                  subtree: true,
                  attributeFilter: ["style", "class", "aria-label"],
                })

                ;[0, 16, 80, 220, 650, 1200].forEach((delay) => {
                  window.setTimeout(applyPmdShowBillToggle, delay)
                })
              }
            }}
            onClick={() => setToolbarState(toolbarState === "expanded" ? "preview" : "expanded")}
            className="absolute left-1/2 -top-4 z-10 flex items-center justify-center rounded-full shadow border transition-all pmd-show-bill-toggle-button"
            aria-label={toolbarState === "expanded" ? "Hide bill" : "Show bill"}
          >
            {toolbarState === "expanded" ? (
              <ChevronDown className="w-4 h-4 text-white pmd-show-bill-toggle-icon" />
            ) : (
              <ChevronUp className="w-4 h-4 text-white pmd-show-bill-toggle-icon" />
            )}
          </button>
        )}

        {/* Bill preview/expanded */}
        <AnimatePresence initial={false} mode="popLayout">
          {hasToolbarContent && (effectiveToolbarState === "preview" || effectiveToolbarState === "expanded") && (
            <motion.div
              key="bill"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full px-6 pt-8 pb-2 scrollbar-hide"
              style={{
                maxHeight: effectiveToolbarState === "expanded" ? 320 : 90,
                overflowY: effectiveToolbarState === "expanded" ? "auto" : "visible",
                height: effectiveToolbarState === "expanded" ? "auto" : undefined,
                msOverflowStyle: "none",
                scrollbarWidth: "none",
              }}
            >
              <div className="flex flex-col">
                <div className="space-y-2">
                  <AnimatePresence initial={false} mode="popLayout">
                    {items.slice(effectiveToolbarState === "preview" ? -1 : 0).map((item: CartItem) => (
                      <motion.div
                        key={item.item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          transition: { duration: 0.25 }
                        }}
                        exit={{
                          opacity: 0,
                          scale: 0.95,
                          transition: { duration: 0.18 }
                        }}
                        className="flex items-center justify-between py-2 bottom-toolbar-item-border"
                      >
                        <div className="flex items-center space-x-3">
                          <motion.div
                            className="relative w-12 h-12"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                          >
                <OptimizedImage
                              src={item.item.image || "/placeholder.svg"}
                              alt={item.item.name}
                              fill
                              className="rounded-xl object-cover"
                            />
                          </motion.div>
                          <div>
                            <motion.div
                              className="font-medium text-paydine-elegant-gray text-base"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              {(item as any).__pmdDisplayName || item.item.name}
                            </motion.div>
                            <motion.div
                              className="text-sm text-gray-500"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
          {formatCurrency(Number((item as any).__pmdDisplayUnitPrice ?? adjustPrice(item.item.price || 0)))} × {item.quantity}
                            </motion.div>
                          </div>
                        </div>
                        <motion.div
                          className="font-semibold menu-item-price pmd-customer-price text-lg"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                        >
          {formatCurrency(Number((item as any).__pmdDisplaySubtotal ?? (adjustPrice(item.item.price || 0) * item.quantity)))}
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                {/* Show total only in expanded */}
                {effectiveToolbarState === "expanded" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 rounded-2xl p-4"
                    style={{ background: "color-mix(in srgb, var(--theme-surface) 88%, #f5fff8af0 12%)", border: "1px solid color-mix(in srgb, #b88940 22%, var(--theme-border) 78%)", boxShadow: "0 8px 18px rgba(6, 47, 42, 0.06)" }}
                  >
                    {taxAmount > 0 && (
                      <div className="mb-2 space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-paydine-elegant-gray/70">Subtotal</span><span className="font-semibold">{formatCurrency(subtotalPrice)}</span></div>
                        <div className="flex justify-between"><span className="text-paydine-elegant-gray/70">{toolbarVatLabel}</span><span className="font-semibold">{formatCurrency(taxAmount)}</span></div>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <motion.span
                        className="font-bold text-paydine-elegant-gray text-lg"
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                      >
                        Total
                      </motion.span>
                      <motion.span
                        className="font-bold text-2xl pmd-customer-price"
                        initial={{ x: 10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                      >
        {formatCurrency(totalPrice)}
                      </motion.span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toolbar buttons (always visible at the bottom) */}
        <div
          className="flex items-center justify-between gap-5 px-6 py-4"
          style={{
            minHeight: 76,
            borderBottomLeftRadius: "2.5rem",
            borderBottomRightRadius: "2.5rem",
            background: "transparent",
            marginTop: "auto",
          }}
        >
          <ActionTooltip label="Call waiter">
          <GoldWaiterButton
            actions={themeMenuActions ?? {
              onAddItem: () => undefined,
              onOpenCheckout: onCartClick,
              onOpenTableOrder: onOrderClick ?? (() => undefined),
              onCallWaiter: onWaiterClick ?? (() => undefined),
              onOpenNote: onNoteClick ?? (() => undefined),
              onOpenValet: () => undefined,
              cartCount: totalItems,
              tableOrderCount: orderCount || 0,
              showTableOrder: Boolean(onOrderClick),
            }}
            as={motion.button}
            {...({ whileTap: { scale: waiterDisabled ? 1 : 0.92 }, whileHover: { scale: waiterDisabled ? 1 : 1.12 } })}
            className={`h-12 w-12 rounded-full flex items-center justify-center focus:outline-none transition-all ${waiterDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{
              background: "color-mix(in srgb, var(--theme-surface) 92%, #f5fff8 8%)",
              border: "1px solid var(--theme-border)",
              color: "var(--theme-text-primary)",
              boxShadow: "0 6px 16px rgba(17,24,39,0.08)",
              borderRadius: "9999px",
            }}
            disabled={waiterDisabled}
            aria-label={t("callWaiter")}
          >
            <HandPlatter className="h-7 w-7" style={{ color: waiterDisabled ? "#9CA3AF" : "var(--theme-text-primary)" }} />
          </GoldWaiterButton>
          </ActionTooltip>
          <ActionTooltip label="Add note">
          <GoldNoteButton
            actions={themeMenuActions ?? {
              onAddItem: () => undefined,
              onOpenCheckout: onCartClick,
              onOpenTableOrder: onOrderClick ?? (() => undefined),
              onCallWaiter: onWaiterClick ?? (() => undefined),
              onOpenNote: onNoteClick ?? (() => undefined),
              onOpenValet: () => undefined,
              cartCount: totalItems,
              tableOrderCount: orderCount || 0,
              showTableOrder: Boolean(onOrderClick),
            }}
            as={motion.button}
            {...({ whileTap: { scale: noteDisabled ? 1 : 0.92 }, whileHover: { scale: noteDisabled ? 1 : 1.12 } })}
            className={`h-12 w-12 rounded-full flex items-center justify-center focus:outline-none transition-all ${noteDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{
              background: "color-mix(in srgb, var(--theme-surface) 92%, #f5fff8 8%)",
              border: "1px solid var(--theme-border)",
              color: "var(--theme-text-primary)",
              boxShadow: "0 6px 16px rgba(17,24,39,0.08)",
              borderRadius: "9999px",
            }}
            disabled={noteDisabled}
            aria-label={t("leaveNote")}
          >
            <NotebookPen className="h-7 w-7" style={{ color: noteDisabled ? "#9CA3AF" : "var(--theme-text-primary)" }} />
          </GoldNoteButton>
          </ActionTooltip>

          <ActionTooltip label="Checkout">
          <GoldCheckoutButton
            actions={themeMenuActions ?? {
              onAddItem: () => undefined,
              onOpenCheckout: onCartClick,
              onOpenTableOrder: onOrderClick ?? (() => undefined),
              onCallWaiter: onWaiterClick ?? (() => undefined),
              onOpenNote: onNoteClick ?? (() => undefined),
              onOpenValet: () => undefined,
              cartCount: totalItems,
              tableOrderCount: orderCount || 0,
              showTableOrder: Boolean(onOrderClick),
            }}
            as={motion.button}
            {...({ whileTap: { scale: 0.92 }, whileHover: { scale: 1.12 } })}
            className="h-12 w-12 rounded-full flex items-center justify-center relative focus:outline-none transition-all"
            style={{
              background: "color-mix(in srgb, var(--theme-surface) 92%, #f5fff8 8%)",
              border: "1px solid var(--theme-border)",
              color: "var(--theme-text-primary)",
              boxShadow: "0 6px 16px rgba(17,24,39,0.08)",
              borderRadius: "9999px",
            }}
            aria-label={t("viewCart")}
          >
            <ShoppingCart className="h-7 w-7" style={{ color: "#FFFFFF", stroke: "#FFFFFF", WebkitTextFillColor: "#FFFFFF" }} />
            {totalItems > 0 && (
              <span
                data-pmd-menu-cart-badge="1"
                ref={(el) => {
                  if (!el) return

                  const applyPmdBadgeColor = () => {
                    el.style.setProperty("background", "#b88940", "important")
                    el.style.setProperty("background-color", "#b88940", "important")
                    el.style.setProperty("background-image", "none", "important")
                    el.style.setProperty("color", "#FFFFFF", "important")
                    el.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
                    el.style.setProperty("border", "1px solid #b88940", "important")
                    el.style.setProperty("border-color", "#b88940", "important")
                    el.style.setProperty("outline-color", "#b88940", "important")
                    el.style.setProperty("box-shadow", "0 2px 8px rgba(0, 0, 0, 0.15)", "important")
                    el.style.setProperty("filter", "none", "important")
                    el.style.setProperty("text-shadow", "none", "important")
                  }

                  applyPmdBadgeColor()

                  if (el.dataset.pmdBadgeColorLock !== "1") {
                    el.dataset.pmdBadgeColorLock = "1"

                    let busy = false
                    const observer = new MutationObserver(() => {
                      if (busy) return
                      busy = true
                      requestAnimationFrame(() => {
                        applyPmdBadgeColor()
                        busy = false
                      })
                    })

                    observer.observe(el, {
                      attributes: true,
                      attributeFilter: ["style", "class"],
                    })

                    ;[0, 16, 80, 220, 650, 1200].forEach((delay) => {
                      window.setTimeout(applyPmdBadgeColor, delay)
                    })
                  }
                }}
                className="cart-badge pmd-v2-badge absolute -top-2 -right-2 font-bold rounded-full h-7 w-7 flex items-center justify-center shadow-md"
                style={{
                  background: "#b88940",
                  backgroundColor: "#b88940",
                  backgroundImage: "none",
                  color: "#FFFFFF",
                  WebkitTextFillColor: "#FFFFFF",
                  border: "1px solid #b88940",
                  borderColor: "#b88940",
                  outlineColor: "#b88940",
                  zIndex: 9999999,
                }}>
                {totalItems}
              </span>
            )}
          </GoldCheckoutButton>
          </ActionTooltip>
          <AnimatePresence initial={false}>
          {showOrderAction && (
          <ActionTooltip label="Table order">
          <GoldTableOrderButton
            key="table-order-action"
            actions={themeMenuActions ?? {
              onAddItem: () => undefined,
              onOpenCheckout: onCartClick,
              onOpenTableOrder: onOrderClick ?? (() => undefined),
              onCallWaiter: onWaiterClick ?? (() => undefined),
              onOpenNote: onNoteClick ?? (() => undefined),
              onOpenValet: () => undefined,
              cartCount: totalItems,
              tableOrderCount: orderCount || 0,
              showTableOrder: Boolean(onOrderClick),
            }}
            as={motion.button}
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 8 }}
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.12 }}
            className="h-12 w-12 flex items-center justify-center relative focus:outline-none transition-all"
            data-pmd-bottom-table-order="1"
            ref={(el: HTMLButtonElement | null) => {
              if (!el) return

              const cleanTableOrderButton = () => {
                /*
                 * Keep this button visually like the other bottom actions:
                 * - no green active circle
                 * - no inner text
                 * - dark icon
                 * - gold badge
                 * IMPORTANT: do NOT touch transform, so Framer hover still works.
                 */
                el.style.setProperty("background", "transparent", "important")
                el.style.setProperty("background-color", "transparent", "important")
                el.style.setProperty("background-image", "none", "important")
                el.style.setProperty("border", "1px solid transparent", "important")
                el.style.setProperty("border-color", "transparent", "important")
                el.style.setProperty("box-shadow", "none", "important")
                el.style.setProperty("outline", "0", "important")
                el.style.setProperty("color", "#0D1B1E", "important")
                el.style.setProperty("-webkit-text-fill-color", "#0D1B1E", "important")

                el.querySelectorAll("svg, svg *, path").forEach((node: Element) => {
                  const svgNode = node as HTMLElement
                  svgNode.style.setProperty("color", "#0D1B1E", "important")
                  svgNode.style.setProperty("stroke", "#0D1B1E", "important")
                  svgNode.style.setProperty("-webkit-text-fill-color", "#0D1B1E", "important")
                  svgNode.style.setProperty("background", "transparent", "important")
                  svgNode.style.setProperty("background-color", "transparent", "important")
                  svgNode.style.setProperty("box-shadow", "none", "important")
                })

                const badge = el.querySelector("span.absolute") as HTMLElement | null
                if (badge) {
                  badge.style.setProperty("background", "#b88940", "important")
                  badge.style.setProperty("background-color", "#b88940", "important")
                  badge.style.setProperty("color", "#FFFFFF", "important")
                  badge.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
                  badge.style.setProperty("border", "1px solid #b88940", "important")
                  badge.style.setProperty("border-radius", "9999px", "important")
                }
              }

              cleanTableOrderButton()

              if (el.dataset.pmdTableOrderCleanLock !== "1") {
                el.dataset.pmdTableOrderCleanLock = "1"

                const observer = new MutationObserver(() => {
                  requestAnimationFrame(cleanTableOrderButton)
                })

                observer.observe(el, {
                  attributes: true,
                  attributeFilter: ["style", "class"],
                  subtree: true,
                })

                ;[0, 16, 80, 180, 400, 900, 1600].forEach((delay) => {
                  window.setTimeout(cleanTableOrderButton, delay)
                })
              }
            }}
            style={{
              background: "transparent",
              backgroundColor: "transparent",
              backgroundImage: "none",
              border: "1px solid transparent",
              color: "#FFFFFF",
              WebkitTextFillColor: "#FFFFFF",
              boxShadow: "none",
            }}
            aria-label="Table order"
          >
            <ReceiptText
              className="h-7 w-7"
              style={{
                color: "#FFFFFF",
                stroke: "#0D1B1E",
                WebkitTextFillColor: "#FFFFFF",
              }}
            />
            {orderCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[1.15rem] h-[1.15rem] px-1 rounded-full text-[10px] leading-none font-semibold inline-flex items-center justify-center shadow-md"
                style={{
                  background: "#b88940",
                  backgroundColor: "#b88940",
                  color: "#FFFFFF",
                  WebkitTextFillColor: "#FFFFFF",
                  border: "1px solid #b88940",
                  borderRadius: "9999px",
                }}
              >
                {orderCount}
              </span>
            )}
          </GoldTableOrderButton>
          </ActionTooltip>
          )}
          </AnimatePresence>

        </div>
      </div>
    </motion.div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-paydine-champagne border-t-transparent rounded-full animate-spin"></div>
    </div>
  )
}


// Organic Botanical Paper modal/card components are intentionally local to this menu page.
// They avoid shared Dialog/global CSS so Gold Luxury and other themes keep their existing modal behavior.
const organicModalCardStyle = {
  // PMD_ORGANIC_MODAL_BG_LAYER_FIX_20260609
  "--pmd-paper-soft": "#f5fff8af0",
  "--pmd-paper": "#f6efe2",
  "--pmd-line": "#ded2ba",
  "--pmd-ink": "#343529",
  "--pmd-muted": "#746f61",
  "--pmd-primary": "#747d55",
  "--pmd-primary-dark": "#5f6746",
  "--pmd-accent": "#b88940",
  background: "transparent",
  backgroundColor: "transparent",
  color: "#343529",
  border: "1px solid #ded2ba",
  opacity: 1,
  isolation: "isolate",
  filter: "none",
  mixBlendMode: "normal",
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
  boxShadow: "0 -10px 50px -12px rgba(60,53,41,0.5), inset 0 1px 0 rgba(255,255,255,0.72)",
} as React.CSSProperties

const organicModalGrainStyle = {
  display: "none",
} as React.CSSProperties

const organicPrimaryButtonStyle: React.CSSProperties = {
  background: "#747d55",
  backgroundColor: "#747d55",
  borderColor: "#747d55",
  color: "#f5fff8af0",
  WebkitTextFillColor: "#f5fff8af0",
  boxShadow: "0 12px 24px -14px rgba(60,53,41,.72)",
}

const organicSecondaryButtonStyle: React.CSSProperties = {
  background: "#f5fff8af0",
  backgroundColor: "#f5fff8af0",
  borderColor: "#ded2ba",
  color: "#343529",
  WebkitTextFillColor: "#343529",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.72)",
}



const OrganicBotanicalValetFeature = () => {
  // PMD_ORGANIC_INLINE_VALET_CARD_20260609
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle")
  const [formData, setFormData] = useState({
    name: "",
    plate: "",
    car: "",
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    const params = new URLSearchParams(window.location.search)
    if (params.get("valet") === "1" || params.get("openValet") === "1") {
      setIsOpen(true)
      params.delete("valet")
      params.delete("openValet")
      const nextQuery = params.toString()
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash || ""}`
      window.history.replaceState(null, "", nextUrl)
    }
  }, [])

  // PMD_ORGANIC_VALET_IFRAME_MESSAGE_LISTENER_20260609
  useEffect(() => {
    if (typeof window === "undefined") return

    const openValet = () => {
      setStatus("idle")
      setIsOpen(true)
    }

    const onMessage = (event: MessageEvent) => {
      const data = event.data

      if (
        data === "pmd-open-organic-valet" ||
        data?.type === "pmd-open-organic-valet" ||
        data?.action === "pmd-open-organic-valet"
      ) {
        openValet()
      }
    }

    window.addEventListener("message", onMessage)
    window.addEventListener("pmd-open-organic-valet", openValet)

    return () => {
      window.removeEventListener("message", onMessage)
      window.removeEventListener("pmd-open-organic-valet", openValet)
    }
  }, [])

  // PMD_ORGANIC_VALET_DIRECT_OPEN_LISTENER_20260609
  useEffect(() => {
    if (typeof window === "undefined") return

    const openValet = () => {
      setStatus("idle")
      setIsOpen(true)
    }

    const onMessage = (event: MessageEvent) => {
      const data = event.data

      if (
        data === "pmd-open-organic-valet" ||
        data?.type === "pmd-open-organic-valet" ||
        data?.action === "pmd-open-organic-valet"
      ) {
        openValet()
      }
    }

    const onDirectEvent = () => openValet()

    window.addEventListener("message", onMessage)
    window.addEventListener("pmd-open-organic-valet", onDirectEvent)
    document.addEventListener("pmd-open-organic-valet", onDirectEvent)

    return () => {
      window.removeEventListener("message", onMessage)
      window.removeEventListener("pmd-open-organic-valet", onDirectEvent)
      document.removeEventListener("pmd-open-organic-valet", onDirectEvent)
    }
  }, [])

  const resetAndClose = () => {
    setIsOpen(false)
    setStatus("idle")
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formData.name.trim() || !formData.plate.trim()) return

    setStatus("submitting")

    try {
      window.localStorage.setItem(
        "pmd-organic-valet-last-request",
        JSON.stringify({
          ...formData,
          createdAt: new Date().toISOString(),
          source: "organic-inline-menu-card",
        })
      )
    } catch (error) {}

    await new Promise((resolve) => window.setTimeout(resolve, 650))
    setStatus("success")
  }

  return (
    <>
      <style
        data-pmd-organic-valet-card-style="1"
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes pmdOrganicValetIn {
              from { opacity: 0; transform: translateY(18px) scale(.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }

            
            /* PMD_HIDE_PARENT_FLOATING_VALET_BUTTON_20260609 */
            [data-pmd-organic-valet-button="1"] {
              display: none !important;
              visibility: hidden !important;
              pointer-events: none !important;
            }

            @keyframes pmdOrganicValetBackdrop {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `,
        }}
      />

      <button
        hidden
        type="button"
        data-pmd-organic-valet-button="1"
        aria-label="Valet Parking Service"
        onClick={() => {
          setStatus("idle")
          setIsOpen(true)
        }}
        className="fixed left-4 top-4 z-[85] inline-flex h-12 w-12 items-center justify-center rounded-full border shadow-lg transition active:scale-[0.98]"
        style={{
          backgroundColor: "#f5fff8af0",
          borderColor: "#ded2ba",
          color: "#747d55",
          boxShadow: "0 16px 34px -22px rgba(60,53,41,.82), inset 0 1px 0 rgba(255,255,255,.72)",
        }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "#747d55", stroke: "#747d55" }}
        >
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <path d="M9 17h6" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      </button>

      {isOpen ? (
        <div
          data-pmd-organic-valet-modal="1"
          className="fixed inset-0 z-[95] flex items-center justify-center px-4 py-8"
          style={{
            background: "rgba(35,31,26,.46)",
            backdropFilter: "blur(8px) saturate(.95)",
            WebkitBackdropFilter: "blur(8px) saturate(.95)",
            animation: "pmdOrganicValetBackdrop .18s ease-out",
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) resetAndClose()
          }}
        >
          <div
            className="relative w-full max-w-[27rem] overflow-hidden rounded-[2rem] border p-6 sm:p-7"
            style={{
              backgroundColor: "transparent",
              borderColor: "#ded2ba",
              color: "#343529",
              boxShadow: "0 24px 70px -20px rgba(60,53,41,.52), inset 0 1px 0 rgba(255,255,255,.72)",
              animation: "pmdOrganicValetIn .22s ease-out",
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-[2rem]"
              style={{
                backgroundColor: "#f5fff8af0",
                backgroundImage:
                  "linear-gradient(180deg, rgba(255,255,255,.42), rgba(255,255,255,0)), radial-gradient(circle at 1px 1px, rgba(116,125,85,.085) 1px, transparent 0)",
                backgroundSize: "100% 100%, 16px 16px",
                backgroundRepeat: "no-repeat, repeat",
                zIndex: 0,
              }}
            />

            <div className="relative z-[1]">
              <div className="mb-6 flex items-center gap-3">
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border"
                  style={{
                    backgroundColor: "#f5fff8af0",
                    borderColor: "#ded2ba",
                    color: "#747d55",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,.72)",
                  }}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: "#747d55", stroke: "#747d55" }}
                  >
                    <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                    <circle cx="7" cy="17" r="2" />
                    <path d="M9 17h6" />
                    <circle cx="17" cy="17" r="2" />
                  </svg>
                </span>
                <div>
                  <h2 className="text-xl font-semibold" style={{ color: "#343529" }}>
                    Valet Parking Service
                  </h2>
                  <p className="text-xs" style={{ color: "#746f61" }}>
                    Request valet without leaving the menu.
                  </p>
                </div>
              </div>

              {status === "success" ? (
                <div className="space-y-5 text-center">
                  <div
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border"
                    style={{
                      backgroundColor: "#747d55",
                      borderColor: "#747d55",
                      color: "#f5fff8af0",
                    }}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      width="26"
                      height="26"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: "#343529" }}>
                      Valet request received
                    </h3>
                    <p className="mt-2 text-sm" style={{ color: "#746f61" }}>
                      Please keep your ticket ready when retrieving your vehicle.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="min-h-11 w-full rounded-full px-4 text-sm font-semibold"
                    style={{
                      backgroundColor: "#747d55",
                      color: "#f5fff8af0",
                      border: "1px solid #747d55",
                    }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="organic-valet-name" className="text-sm font-semibold" style={{ color: "#343529" }}>
                      Enter your name *
                    </label>
                    <input
                      id="organic-valet-name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Enter your name"
                      className="h-11 w-full rounded-2xl border px-4 text-sm outline-none"
                      style={{
                        backgroundColor: "#f5fff8af0",
                        borderColor: "#ded2ba",
                        color: "#343529",
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="organic-valet-plate" className="text-sm font-semibold" style={{ color: "#343529" }}>
                      License Plate *
                    </label>
                    <input
                      id="organic-valet-plate"
                      name="plate"
                      value={formData.plate}
                      onChange={handleChange}
                      required
                      placeholder="Enter license plate number"
                      className="h-11 w-full rounded-2xl border px-4 text-sm outline-none"
                      style={{
                        backgroundColor: "#f5fff8af0",
                        borderColor: "#ded2ba",
                        color: "#343529",
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="organic-valet-car" className="flex items-center gap-2 text-sm font-semibold" style={{ color: "#343529" }}>
                      Car Details
                      <span className="text-xs font-normal" style={{ color: "#746f61" }}>
                        (optional)
                      </span>
                    </label>
                    <input
                      id="organic-valet-car"
                      name="car"
                      value={formData.car}
                      onChange={handleChange}
                      placeholder="Make, model, and color"
                      className="h-11 w-full rounded-2xl border px-4 text-sm outline-none"
                      style={{
                        backgroundColor: "#f5fff8af0",
                        borderColor: "#ded2ba",
                        color: "#343529",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className="min-h-11 w-full rounded-full px-4 text-sm font-semibold transition disabled:opacity-70"
                    style={{
                      backgroundColor: "#747d55",
                      color: "#f5fff8af0",
                      border: "1px solid #747d55",
                    }}
                  >
                    {status === "submitting" ? "Submitting..." : "Request Valet Service"}
                  </button>

                  <div
                    className="rounded-2xl border p-4 text-sm"
                    style={{
                      backgroundColor: "#f6efe2",
                      borderColor: "#ded2ba",
                      color: "#746f61",
                    }}
                  >
                    <p className="mb-2">Our valet service is available during restaurant hours.</p>
                    <p>Please have your ticket ready when retrieving your vehicle.</p>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}


const OrganicBotanicalCheckoutScopedStyles = () => (
  <style
    data-pmd-organic-checkout-style="1"
    dangerouslySetInnerHTML={{
      __html: `
        /* PMD_ORGANIC_CHECKOUT_EXACT_SELECTORS_20260609 */

        html[data-pmd-organic-botanical-active="1"] [data-pmd-checkout-design-system="1"].pmd-checkout-modal,
        html[data-pmd-organic-botanical-active="1"] .pmd-checkout-modal[data-pmd-checkout-design-system="1"] {
          background-color: #f5fff8af0 !important;
          background-image:
            linear-gradient(180deg, rgba(255,255,255,.42), rgba(255,255,255,0)),
            radial-gradient(circle at 1px 1px, rgba(116,125,85,.085) 1px, transparent 0) !important;
          background-size: 100% 100%, 16px 16px !important;
          background-repeat: no-repeat, repeat !important;
          border: 1px solid #ded2ba !important;
          color: #343529 !important;
          box-shadow: 0 24px 70px -20px rgba(60,53,41,.52), inset 0 1px 0 rgba(255,255,255,.72) !important;
        }

        html[data-pmd-organic-botanical-active="1"] [data-pmd-checkout-scroll="1"],
        html[data-pmd-organic-botanical-active="1"] .pmd-checkout-body {
          background-color: #f6efe2 !important;
          background-image: radial-gradient(circle at 1px 1px, rgba(116,125,85,.075) 1px, transparent 0) !important;
          background-size: 16px 16px !important;
          color: #343529 !important;
        }

        html[data-pmd-organic-botanical-active="1"] [data-pmd-checkout-design-system="1"] .pmd-checkout-flat-section,
        html[data-pmd-organic-botanical-active="1"] [data-pmd-checkout-design-system="1"] .pmd-checkout-item-card,
        html[data-pmd-organic-botanical-active="1"] [data-pmd-checkout-design-system="1"] .pmd-checkout-total-card,
        html[data-pmd-organic-botanical-active="1"] [data-pmd-checkout-design-system="1"] .pmd-checkout-payment-card,
        html[data-pmd-organic-botanical-active="1"] [data-pmd-checkout-design-system="1"] .pmd-checkout-meta-row {
          background-color: #f5fff8af0 !important;
          background-image: radial-gradient(circle at 1px 1px, rgba(116,125,85,.065) 1px, transparent 0) !important;
          background-size: 16px 16px !important;
          border-color: #ded2ba !important;
          color: #343529 !important;
          box-shadow: 0 10px 24px rgba(60,53,41,.06) !important;
        }

        html[data-pmd-organic-botanical-active="1"] button[data-pmd-organic-action="primary"] {
          background: #747d55 !important;
          background-color: #747d55 !important;
          border-color: #747d55 !important;
          color: #f5fff8af0 !important;
          -webkit-text-fill-color: #f5fff8af0 !important;
        }

        html[data-pmd-organic-botanical-active="1"] button[data-pmd-organic-action="secondary"] {
          background: #f5fff8af0 !important;
          background-color: #f5fff8af0 !important;
          border-color: #ded2ba !important;
          color: #343529 !important;
          -webkit-text-fill-color: #343529 !important;
        }
      `,
    }}
  />
)


const OrganicBotanicalModalShell = ({
  isOpen,
  modalName,
  children,
}: {
  isOpen: boolean
  modalName: string
  children: React.ReactNode
}) => (
  <AnimatePresence initial={false}>
    {isOpen && (
      <motion.div
        data-pmd-organic-modal={modalName}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28 }}
        className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8"
        style={{
          background: "rgba(35, 31, 26, 0.48)",
          backdropFilter: "blur(6px) saturate(0.92)",
          WebkitBackdropFilter: "blur(6px) saturate(0.92)",
        }}
        style={{
          background: "rgba(35, 31, 26, 0.46)",
          backdropFilter: "blur(8px) saturate(0.95)",
          WebkitBackdropFilter: "blur(8px) saturate(0.95)",
        }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 18 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 18 }}
          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          className="pmd-organic-modal-card relative w-full max-w-[25rem] overflow-hidden rounded-[2rem] border p-7 text-center sm:p-8"
          style={organicModalCardStyle}
        >
          <div
            aria-hidden="true"
            data-pmd-organic-modal-bg="1"
            className="pointer-events-none absolute inset-0 rounded-[2rem]"
            style={{
              backgroundColor: "#f5fff8af0",
              backgroundImage:
                "linear-gradient(180deg, rgba(255,255,255,0.42), rgba(255,255,255,0)), radial-gradient(circle at 1px 1px, rgba(116,125,85,0.09) 1px, transparent 0)",
              backgroundSize: "100% 100%, 16px 16px",
              backgroundRepeat: "no-repeat, repeat",
              opacity: 1,
              zIndex: 0,
            }}
          />
          <div className="pointer-events-none absolute inset-0" style={organicModalGrainStyle} />
          <div className="relative z-10">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
)

const OrganicBotanicalIconBadge = ({ children }: { children: React.ReactNode }) => (
  <div
    className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border shadow-inner"
    style={{
      background: "rgba(255, 250, 240, 0.96)",
      borderColor: "#DED2BA",
      color: "#747D55",
      boxShadow: "0 12px 28px -18px rgba(60,53,41,.72), inset 0 1px 0 rgba(255,255,255,.72)",
    }}
  >
    {children}
  </div>
)

const OrganicBotanicalWaiterDialog = ({
  isOpen,
  onOpenChange,
  tableId,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  tableId: string
}) => {
  const { t } = useLanguageStore()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isConfirmed, setIsConfirmed] = useState(false)

  const handleClose = () => {
    if (isSubmitting) return
    onOpenChange(false)
    setIsConfirmed(false)
  }

  const handleConfirm = async () => {
    if (isSubmitting) return
    const msg = '.'
    const resolvedTableId = tableId || 'delivery'
    setIsSubmitting(true)
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[waiter-call] payload', { tableId: resolvedTableId, msg, source: tableId ? 'table' : 'delivery_menu' })
    }
    try {
      await apiClient.callWaiter(String(resolvedTableId), msg)
      toast({ title: 'Waiter Called', description: tableId ? 'We are on the way!' : 'We received your assistance request.' })
      setIsConfirmed(true)
      window.setTimeout(() => {
        setIsConfirmed(false)
        onOpenChange(false)
      }, 1200)
    } catch (e: any) {
      toast({ title: 'Error', description: (e?.message || 'Failed to call waiter'), variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <OrganicBotanicalModalShell isOpen={isOpen} modalName="waiter">
      {isConfirmed ? (
        <>
          <OrganicBotanicalIconBadge><CheckCircle className="h-8 w-8" /></OrganicBotanicalIconBadge>
          <h3 className="mb-2 font-serif text-2xl font-bold tracking-[0.01em] text-[#343529]">{t('waiterComing')}</h3>
          <p className="text-base leading-relaxed text-[#5f584b]">{tableId ? 'We are on the way!' : 'We received your assistance request.'}</p>
        </>
      ) : (
        <>
          <OrganicBotanicalIconBadge><HandPlatter className="h-8 w-8" /></OrganicBotanicalIconBadge>
          <h3 className="mb-3 font-serif text-2xl font-bold tracking-[0.01em] text-[#343529]">{t('callWaiter')}</h3>
          <p className="mx-auto mb-7 max-w-[18rem] text-base font-medium leading-relaxed text-[#5f584b]">{t('callWaiterConfirm')}</p>
          <div className="flex gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl border px-5 py-3 text-sm font-semibold transition-opacity disabled:opacity-60"
              data-pmd-organic-action="secondary" style={organicSecondaryButtonStyle}
            >
              {t('no')}
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl border px-5 py-3 text-sm font-semibold shadow-[0_12px_24px_rgba(115,122,85,0.22)] transition-opacity disabled:opacity-70"
              data-pmd-organic-action="primary" style={organicPrimaryButtonStyle}
            >
              {isSubmitting ? 'Calling…' : t('yes')}
            </motion.button>
          </div>
        </>
      )}
    </OrganicBotanicalModalShell>
  )
}

const OrganicBotanicalNoteDialog = ({
  isOpen,
  onOpenChange,
  note,
  setNote,
  onSend,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  note: string
  setNote: (note: string) => void
  onSend: () => void
}) => {
  const { t } = useLanguageStore()

  return (
    <OrganicBotanicalModalShell isOpen={isOpen} modalName="note">
      <OrganicBotanicalIconBadge><NotebookPen className="h-8 w-8" /></OrganicBotanicalIconBadge>
      <h3 className="mb-3 font-serif text-2xl font-bold tracking-[0.01em] text-[#343529]">{t('leaveNoteTitle')}</h3>
      <p className="mx-auto mb-5 max-w-[19rem] text-base leading-relaxed text-[#5f584b]">{t('leaveNoteDesc')}</p>
      <Textarea
        placeholder={t('notePlaceholder')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mb-5 min-h-[118px] w-full rounded-[1.35rem] border px-4 py-3 text-left text-base shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-[#737A55]/35"
        style={{ background: '#FFFDF7', borderColor: 'var(--pmd-line, #D8CBAF)', color: '#352F28' }}
      />
      <div className="flex gap-3">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onOpenChange(false)}
          className="flex-1 rounded-2xl border px-5 py-3 text-sm font-semibold"
          data-pmd-organic-action="secondary" style={organicSecondaryButtonStyle}
        >
          {t('cancel')}
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSend}
          className="flex-1 rounded-2xl border px-5 py-3 text-sm font-semibold shadow-[0_12px_24px_rgba(115,122,85,0.22)]"
          data-pmd-organic-action="primary" style={organicPrimaryButtonStyle}
        >
          {t('sendNote')}
        </motion.button>
      </div>
    </OrganicBotanicalModalShell>
  )
}

// Enhanced Waiter Dialog Component
const EnhancedWaiterDialog = ({
  isOpen,
  onOpenChange,
  tableId,
  tableName,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  tableId: string
  tableName?: string
}) => {
  const { t } = useLanguageStore()
  const { toast } = useToast()
  const [dialogState, setDialogState] = useState<"confirming" | "confirmed" | "closing">("confirming")
  const [showSuccess, setShowSuccess] = useState(false)

  const handleConfirm = async () => {
    // Backend needs a non-empty string; use "." when user leaves it blank
    const msg = '.';
    const resolvedTableId = tableId || "delivery";
    if (process.env.NODE_ENV !== "production") {
      console.debug('[waiter-call] payload', { tableId: resolvedTableId, msg, source: tableId ? "table" : "delivery_menu" });
    }
    try {
      await apiClient.callWaiter(String(resolvedTableId), msg);
      toast({ title: 'Waiter Called', description: tableId ? 'We are on the way!' : 'We received your assistance request.' });
    } catch (e: any) {
      toast({ title: 'Error', description: (e?.message || 'Failed to call waiter'), variant: 'destructive' });
      throw e;
    }

    setDialogState("confirmed")
    setShowSuccess(true)

    await new Promise(resolve => setTimeout(resolve, 800))
    await new Promise(resolve => setTimeout(resolve, 2000))
    setShowSuccess(false)
    await new Promise(resolve => setTimeout(resolve, 300))
    onOpenChange(false)
    setDialogState("confirming")
  }

  const handleClose = async () => {
    setDialogState("closing")
    await new Promise(resolve => setTimeout(resolve, 300))
    onOpenChange(false)
    setDialogState("confirming")
  }

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{
              scale: dialogState === "closing" ? 0.95 : 1,
              opacity: dialogState === "closing" ? 0 : 1,
              y: dialogState === "closing" ? 20 : 0
            }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
          >
            {/* Success State */}
            <AnimatePresence initial={false} mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="p-8 text-center"
                >
                  <div className="mx-auto w-16 h-16 bg-paydine-rose-beige/50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-paydine-elegant-gray" />
                  </div>
                  <h3 className="text-2xl font-semibold text-paydine-elegant-gray mb-2">
                    {t("waiterComing")}
                  </h3>
                </motion.div>
              ) : (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8"
                >
                  <div className="text-center mb-6">
                    <div className="mx-auto w-16 h-16 bg-paydine-rose-beige/50 hover:bg-paydine-champagne rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                      <HandPlatter className="w-8 h-8 text-paydine-elegant-gray" />
                    </div>
                    <h3 className="text-2xl font-semibold text-paydine-elegant-gray mb-2">
                      {t("callWaiter")}
                    </h3>
                    <p className="text-paydine-elegant-gray/80">
                      {t("callWaiterConfirm")}
                    </p>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleClose}
                      className="flex-1 py-3 px-6 rounded-xl bg-gray-100 text-paydine-elegant-gray font-medium hover:bg-gray-200 transition-colors"
                    >
                      {t("no")}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleConfirm}
                      className="flex-1 py-3 px-6 rounded-xl bg-paydine-rose-beige/50 hover:bg-paydine-champagne text-paydine-elegant-gray font-medium transition-all duration-300"
                    >
                      {t("yes")}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Enhanced Note Dialog Component
const EnhancedNoteDialog = ({
  isOpen,
  onOpenChange,
  note,
  setNote,
  onSend,
  tableId,
  tableName,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  note: string
  setNote: (note: string) => void
  onSend: () => void
  tableId: string
  tableName?: string
}) => {
  const { t } = useLanguageStore()
  const [dialogState, setDialogState] = useState<"editing" | "confirmed" | "closing">("editing")
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSend = async () => {
    if (!note.trim()) return

    setDialogState("confirmed")
    setShowSuccess(true)

    // Show success state
    await new Promise(resolve => setTimeout(resolve, 800))
    await new Promise(resolve => setTimeout(resolve, 2000))

    setShowSuccess(false)
    await new Promise(resolve => setTimeout(resolve, 300))

    onSend()
    onOpenChange(false)
    setDialogState("editing")
  }

  const handleClose = async () => {
    setDialogState("closing")
    await new Promise(resolve => setTimeout(resolve, 300))
    onOpenChange(false)
    setDialogState("editing")
  }

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{
              scale: dialogState === "closing" ? 0.95 : 1,
              opacity: dialogState === "closing" ? 0 : 1,
              y: dialogState === "closing" ? 20 : 0
            }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
          >
            <AnimatePresence initial={false} mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="p-8 text-center"
                >
                  <div className="mx-auto w-16 h-16 bg-paydine-rose-beige/50 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-paydine-elegant-gray" />
                  </div>
                  <h3 className="text-2xl font-semibold text-paydine-elegant-gray mb-2">
                    {t("messageReceived")}
                  </h3>
                </motion.div>
              ) : (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-8"
                >
                  <div className="text-center mb-6">
                    <div className="mx-auto w-16 h-16 bg-paydine-rose-beige/50 hover:bg-paydine-champagne rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                      <NotebookPen className="w-8 h-8 text-paydine-elegant-gray" />
                    </div>
                    <h3 className="text-2xl font-semibold text-paydine-elegant-gray mb-2">
                      {t("leaveNoteTitle")}
                    </h3>
                    <p className="text-paydine-elegant-gray/80">
                      {t("leaveNoteDesc")}
                    </p>
                  </div>

                  <Textarea
                    placeholder={t("notePlaceholder")}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="bg-white border-paydine-champagne/30 rounded-xl min-h-[100px] w-full mb-4"
                  />

                  <div className="flex gap-3 justify-center">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleClose}
                      className="flex-1 py-3 px-6 rounded-xl bg-gray-100 text-paydine-elegant-gray font-medium hover:bg-gray-200 transition-colors"
                    >
                      {t("cancel")}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSend}
                      className="flex-1 py-3 px-6 rounded-xl bg-paydine-rose-beige/50 hover:bg-paydine-champagne text-paydine-elegant-gray font-medium transition-all duration-300"
                    >
                      {t("sendNote")}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Create a component that uses useSearchParams
function MenuContent() {
  const searchParams = useSearchParams()
  const [isClient, setIsClient] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>("All") // Initialize with "All"
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [toolbarState, setToolbarState] = useState<ToolbarState>("collapsed")
  const [lastInteractedItem, setLastInteractedItem] = useState<CartItem | null>(null)
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentModalInitialStep, setPaymentModalInitialStep] = useState<CheckoutStep>('review')
  const [paymentModalPreferPersonalReview, setPaymentModalPreferPersonalReview] = useState(false)

  // PMD_CHECKOUT_CLICK_PREFERS_PERSONAL_REVIEW
  useEffect(() => {
    if (typeof document === "undefined") return

    const onCheckoutIntentCapture = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const button = target?.closest?.("button") as HTMLElement | null
      if (!button) return

      const txt = (button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase()
      const aria = (button.getAttribute("aria-label") || "").toLowerCase()
      const tableMarker = button.getAttribute("data-pmd-bottom-table-order") === "1"

      const isTableOrderButton =
        tableMarker ||
        aria.includes("table order") ||
        txt.includes("table order")

      const isCheckoutButton =
        !isTableOrderButton &&
        (
          aria.includes("checkout") ||
          txt.includes("checkout")
        )

      if (isCheckoutButton) {
        setPaymentModalPreferPersonalReview(true)
        setPaymentModalInitialStep("review")
      }

      if (isTableOrderButton) {
        setPaymentModalPreferPersonalReview(false)
        setPaymentModalInitialStep("review")
      }
    }

    document.addEventListener("click", onCheckoutIntentCapture, true)
    return () => document.removeEventListener("click", onCheckoutIntentCapture, true)
  }, [])

  const [isLoading, setIsLoading] = useState(true)
  const [isFrontendConfigured, setIsFrontendConfigured] = useState(true)
  const [apiMenuItems, setApiMenuItems] = useState<MenuItem[]>([])
  const [menuHighlightSettings, setMenuHighlightSettings] = useState<MenuHighlightSettings>(defaultMenuHighlightSettings)
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([])
  const { menuItems, taxSettings, loadVATSettings, settings: cmsSettings, merchantSettings } = useCmsStore()

  const { items, toggleCart, addToCart, setTableInfo, clearTableContext, clearCart } = useCartStore()
  const themeBackgroundColor = useThemeBackgroundColor()
  const { themeId: currentFrontendTheme, isResolved: isFrontendThemeResolved } = useCurrentFrontendTheme()
  const [forceModernGreenTheme, setForceModernGreenTheme] = useState(false)
  const isOrganicBotanicalTheme = currentFrontendTheme === ORGANIC_BOTANICAL_THEME_KEY
  const isModernGreenTheme = currentFrontendTheme === MODERN_GREEN_THEME_KEY || forceModernGreenTheme
  const isKazenJapaneseTheme = currentFrontendTheme === KAZEN_JAPANESE_THEME_KEY

  // PMD_FIX_KAZEN_REMOVE_BAD_HEADER_MARKER_FROM_ITEMS_20260612
  useEffect(() => {
    if (!isKazenJapaneseTheme || typeof document === "undefined" || typeof window === "undefined") return

    const cleanupKazenItemMarkers = () => {
      document.querySelectorAll<HTMLElement>('.kazen-item [data-pmd-kazen-old-header-control="1"]').forEach((el) => {
        el.removeAttribute("data-pmd-kazen-old-header-control")
        el.style.setProperty("opacity", "1", "important")
        el.style.setProperty("visibility", "visible", "important")
      })

      document.querySelectorAll<HTMLElement>(".kazen-items, .kazen-menu-list, .kazen-category-content, .kazen-category-items, .kazen-section-content").forEach((el) => {
        el.style.setProperty("overflow", "visible", "important")
        el.style.setProperty("max-height", "none", "important")
        el.style.setProperty("height", "auto", "important")
      })
    }

    cleanupKazenItemMarkers()

    const events = ["scroll", "click", "resize", "touchend"]
    const scheduleCleanup = () => window.setTimeout(cleanupKazenItemMarkers, 0)

    events.forEach((eventName) => {
      window.addEventListener(eventName, scheduleCleanup, { passive: true })
    })

    const timer = window.setInterval(cleanupKazenItemMarkers, 900)

    return () => {
      window.clearInterval(timer)
      events.forEach((eventName) => {
        window.removeEventListener(eventName, scheduleCleanup)
      })
    }
  }, [isKazenJapaneseTheme])

  // PMD_FIX_KAZEN_EXPAND_VISIBLE_ITEM_ANCESTORS_20260612
  useEffect(() => {
    if (!isKazenJapaneseTheme || typeof document === "undefined" || typeof window === "undefined") return

    const expandVisibleKazenItemAncestors = () => {
      document.querySelectorAll<HTMLElement>(".kazen-item").forEach((item) => {
        const rect = item.getBoundingClientRect()
        if (!(rect.width > 0 && rect.height > 0)) return

        item.style.setProperty("overflow", "visible", "important")
        item.style.setProperty("max-height", "none", "important")
        item.style.setProperty("height", "auto", "important")
        item.style.setProperty("contain", "none", "important")

        let el = item.parentElement
        let depth = 0

        while (el && depth < 8) {
          if (
            el.matches("[data-pmd-checkout-theme-root='1']") ||
            el.classList.contains("kazen-modal") ||
            el.classList.contains("kazen-solid-modal-overlay") ||
            el.classList.contains("kazen-solid-modal-panel") ||
            el.classList.contains("pmd-checkout-modal")
          ) {
            break
          }

          const className = String(el.className || "")

          if (
            className.includes("kazen") ||
            className.includes("overflow-hidden") ||
            el.style.maxHeight ||
            el.style.height ||
            el.style.overflow
          ) {
            el.style.setProperty("overflow", "visible", "important")
            el.style.setProperty("max-height", "none", "important")
            el.style.setProperty("height", "auto", "important")
            el.style.setProperty("contain", "none", "important")
          }

          el = el.parentElement
          depth += 1
        }
      })
    }

    expandVisibleKazenItemAncestors()

    const schedule = () => window.setTimeout(expandVisibleKazenItemAncestors, 0)
    const events = ["load", "scroll", "click", "resize", "touchend"]

    events.forEach((eventName) => {
      window.addEventListener(eventName, schedule, { passive: true })
    })

    const timer = window.setInterval(expandVisibleKazenItemAncestors, 700)

    return () => {
      window.clearInterval(timer)
      events.forEach((eventName) => {
        window.removeEventListener(eventName, schedule)
      })
    }
  }, [isKazenJapaneseTheme])

  const shouldHoldThemeRender = !isFrontendThemeResolved && !forceModernGreenTheme
  const { t } = useLanguageStore()
  const { toast } = useToast()
  const [isNoteModalOpen, setNoteModalOpen] = useState(false)
  const [isWaiterConfirmOpen, setWaiterConfirmOpen] = useState(false)
  const [note, setNote] = useState("")
  const [tableInfo, setTableInfoState] = useState<any>(null)
  const [existingOrderId, setExistingOrderId] = useState<number | null>(null)
  const [pendingSettlementSummary, setPendingSettlementSummary] = useState<{ orderTotal: number; settledAmount: number; remainingAmount: number } | null>(null)
  const [toolbarPricingSnapshot, setToolbarPricingSnapshot] = useState<PmdToolbarPricingSnapshot | null>(null)
  const [hasLocalOpenOrder, setHasLocalOpenOrder] = useState(false)
  const [localOpenOrder, setLocalOpenOrder] = useState<any | null>(null)
  const sharedTableOrderQr = searchParams?.get("qr") || null
  const sharedTableOrderContext = useMemo(() => buildTableOrderDraftContext(tableInfo, sharedTableOrderQr), [tableInfo?.table_id, tableInfo?.table_no, tableInfo?.qr_code, sharedTableOrderQr])
  const { tableDraft: sharedTableOrder, setTableDraft: setSharedTableOrder } = useTableOrderDraft({
    context: sharedTableOrderContext,
    enabled: Boolean(tableInfo?.table_id || tableInfo?.table_no),
    pollIntervalMs: 12000,
  })
  const hydratedPendingOrderRef = useRef<number | null>(null)
  const isRecentPaidTableOrder = localOpenOrder?.paymentStatus === "paid" || localOpenOrder?.status === "paid"
  const hasDraftTableOrderWithoutRealOrder = Boolean(
    isVisibleTableOrderDraft(sharedTableOrder) &&
    (sharedTableOrder as any)?.draft_id &&
    !(sharedTableOrder as any)?.order_id &&
    !(sharedTableOrder as any)?.orderId
  )
  const activeExistingOrderId = hasDraftTableOrderWithoutRealOrder
    ? null
    : (isRecentPaidTableOrder && paymentModalInitialStep === "review" ? null : existingOrderId)
  const activePendingSummary = hasDraftTableOrderWithoutRealOrder
    ? null
    : (isRecentPaidTableOrder && paymentModalInitialStep === "review" ? null : pendingSettlementSummary)
  const activeSubmittedOrder = hasDraftTableOrderWithoutRealOrder
    ? null
    : (isRecentPaidTableOrder && paymentModalInitialStep === "review" && items.length > 0 ? null : localOpenOrder)
  const shouldHideCartSheet = !!activeExistingOrderId

  useEffect(() => {
    if (!isVisibleTableOrderDraft(sharedTableOrder)) return

    if ((sharedTableOrder as any)?.draft_id && !(sharedTableOrder as any)?.order_id && !(sharedTableOrder as any)?.orderId) {
      setExistingOrderId(null)
      setPendingSettlementSummary(null)
      setLocalOpenOrder(null)
      setHasLocalOpenOrder(false)
      return
    }

    if (!sharedTableOrder.order_id) return

    setExistingOrderId(Number(sharedTableOrder.order_id))
    setPendingSettlementSummary({
      orderTotal: Number(sharedTableOrder.totals?.orderTotal || sharedTableOrder.totals?.total || 0),
      settledAmount: Number(sharedTableOrder.totals?.settledAmount || 0),
      remainingAmount: Number(sharedTableOrder.totals?.remainingAmount || sharedTableOrder.totals?.total || 0),
    })
    setLocalOpenOrder((prev: any) => {
      const latestSnapshot = createSubmittedTableOrderSnapshot(sharedTableOrder, tableInfo, 0)
      return !prev || String(prev?.orderId || "") !== String(sharedTableOrder.order_id || "") ? latestSnapshot : { ...prev, ...latestSnapshot }
    })
    setHasLocalOpenOrder(true)
  }, [sharedTableOrder, tableInfo?.table_id, tableInfo?.table_no])

  // close side cart for pending QR
  useEffect(() => {
    if (!existingOrderId) return
    try {
      const state = useCartStore.getState() as any
      if (state?.isCartOpen === true) {
        useCartStore.setState({ isCartOpen: false })
      }
    } catch (e) {
      console.error('[PMD] close side cart for pending QR failed', e)
    }
  }, [existingOrderId])


  const MENU_CACHE_TTL_MS = 5 * 60 * 1000
  const getMenuCacheKey = () => {
    if (typeof window === "undefined") return ""
    return `pmd-menu-cache:${window.location.host}:${window.location.pathname}?${window.location.search}`
  }

  useEffect(() => {
    __pmdWalletDebugInstallOnce()
    __pmdRemoteConsoleInstallOnce()
  }, [])

  // PMD visual guard: keep menu action circles/icons white in every click/active state.
  // Some legacy theme code can apply inline black text-fill to small quantity buttons.
  useEffect(() => {
    if (typeof window === "undefined") return

    const applyMenuActionCircleColors = () => {
      const nodes = document.querySelectorAll<HTMLElement>([
        ".page--menu .pmd-v2-action-circle",
        ".page--menu button[aria-label='Increase quantity']",
        ".page--menu button[aria-label='Decrease quantity']",
        ".page--menu button[aria-label*='Back' i]",
        ".page--menu button[aria-label*='back' i]"
      ].join(","))

      nodes.forEach((node) => {
        node.style.setProperty("color", "#FFFFFF", "important")
        node.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")

        node.querySelectorAll("*").forEach((child) => {
          const el = child as HTMLElement
          el.style.setProperty("color", "#FFFFFF", "important")
          el.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
          el.style.setProperty("stroke", "#FFFFFF", "important")
        })
      })
    }

    applyMenuActionCircleColors()

    const events = ["pointerdown", "mousedown", "touchstart", "click", "focusin"]
    events.forEach((eventName) => {
      document.addEventListener(eventName, applyMenuActionCircleColors, true)
    })

    const observer = new MutationObserver(applyMenuActionCircleColors)
    // PMD_PERF_FIX: body MutationObserver disabled to prevent Payment/Order modal freeze.

    const timer = window.setTimeout(applyMenuActionCircleColors, 0)

    return () => {
      window.clearTimeout(timer)
      observer.disconnect()
      events.forEach((eventName) => {
        document.removeEventListener(eventName, applyMenuActionCircleColors, true)
      })
    }
  }, [])

  // Read raw search params (Next app router)

  // PMD_FORCE_MODERN_GREEN_FROM_SIMPLE_THEME_20260610
  useEffect(() => {
    if (typeof window === "undefined") return

    let cancelled = false

    async function checkModernGreenTheme() {
      try {
        const res = await fetch(`/simple-theme?forceModernGreen=${Date.now()}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        })
        const data = await res.json()
      pmdForceKazenFrontendThemePayload(data);
        const normalizedThemePayload = pmdForceKazenFrontendThemePayload(data)
        const themeId = String(normalizedThemePayload?.data?.theme_id || normalizedThemePayload?.theme_id || normalizedThemePayload?.frontend_theme || normalizedThemePayload?.admin_theme || "").trim()

        if (!cancelled) {
          setForceModernGreenTheme(themeId === "modern_green")
        }
      } catch (error) {
        if (!cancelled) setForceModernGreenTheme(false)
      }
    }

    checkModernGreenTheme()

    return () => {
      cancelled = true
    }
  }, [])


  const spTableNo = searchParams?.get('table_no') ?? null;
  const spTableId = searchParams?.get('table_id') ?? null;
  const isRootDeliveryMode = !spTableNo && !spTableId;

  useEffect(() => {
    // ROOT_DELIVERY_MODE_CLEANUP
    if (isRootDeliveryMode) {
      setTableInfoState(null)
    }
  }, [isRootDeliveryMode, clearTableContext]);
  const spQr = searchParams?.get('qr') ?? null;

  // After you fetch tableInfo:
  const tableNo = (tableInfo?.table_no ?? spTableNo) ?? null;
  const tableId = (tableInfo?.table_id ?? spTableId) ?? null;

  // Use explicit cashier check
  const isCashier = (tableNo === 0) || (tableInfo?.table_name?.toLowerCase() === 'cashier');

  // Single source of truth for table id
  const tableIdString = String(tableId ?? '').trim();
  const tableName = tableInfo?.table_name ?? undefined;

  const displayTableNumber =
    (tableInfo?.table_no ?? spTableNo ?? tableInfo?.table_id ?? spTableId ?? null);


  // Force "All" category selection on mount
  useEffect(() => {
    // Always set "All" as default when component mounts
    setSelectedCategory("All");
  }, []); // Empty dependency array - runs only once on mount

  // Also force it when data loads
  useEffect(() => {
    if (apiMenuItems.length > 0) {
      setSelectedCategory("All");
    }
  }, [apiMenuItems]);

  // Load VAT settings on mount


useEffect(() => {
    loadVATSettings()
  }, [loadVATSettings])

  // Load menu data from API on component mount
  useEffect(() => {
    async function loadMenuData() {
      try {
        setIsLoading(true)
        console.log('Loading menu data...')
        const cacheKey = getMenuCacheKey()
        if (cacheKey) {
          try {
            const rawCache = localStorage.getItem(cacheKey)
            if (rawCache) {
              const parsed = JSON.parse(rawCache)
              const isFresh = parsed?.timestamp && (Date.now() - Number(parsed.timestamp) < MENU_CACHE_TTL_MS)
              if (isFresh) {
                setApiMenuItems(Array.isArray(parsed.items) ? parsed.items : [])
                setDynamicCategories(Array.isArray(parsed.categories) ? parsed.categories : [])
                if (parsed.menuHighlightSettings) setMenuHighlightSettings({ ...defaultMenuHighlightSettings, ...parsed.menuHighlightSettings })
                console.info("PMD_MENU_CACHE_HIT")
              } else {
                console.info("PMD_MENU_CACHE_MISS")
              }
            } else {
              console.info("PMD_MENU_CACHE_MISS")
            }
          } catch {
            console.info("PMD_MENU_CACHE_MISS")
          }
        }

        // Check if we have table parameters - prefer table_no
        const table_id = searchParams.get("table_id")
        const table_no = searchParams.get("table_no")
        const qr = searchParams.get("qr")

        // Use table_no if available, otherwise fall back to table_id
        const tableParam = table_no || table_id;

        if (tableParam) {
          // Fetch table information - send as table_no if we have it, otherwise as table_id
          try {
            const useTableNo = !!table_no; // Use table_no if we have it from URL params
            const tableResult = await apiClient.getTableInfo(tableParam, qr || undefined, useTableNo)
            if (tableResult.success) {
              setTableInfoState(tableResult.data)
              setTableInfo(prev => ({
                ...prev,
                table_id: tableResult.data.table_id,
                table_name: tableResult.data.table_name,
                location_id: tableResult.data.location_id,
                qr_code: tableResult.data.qr_code,
                table_no: prev?.table_no ?? tableResult.data.table_no ?? null
              }))

              const pendingQr = await apiClient.getPendingQrOrderByTable(String(tableResult.data.table_id), { tableNo: tableResult.data?.table_no ?? table_no ?? null, qr: qr || null })
              if (pendingQr?.success && pendingQr.data?.order_id) {
                const pendingId = Number(pendingQr.data.order_id)
                setExistingOrderId(pendingId)
                setPendingSettlementSummary({
                  orderTotal: Number((pendingQr.data as any).order_total || 0),
                  settledAmount: Number((pendingQr.data as any).settled_amount || 0),
                  remainingAmount: Number((pendingQr.data as any).remaining_amount || 0),
                })
                setLocalOpenOrder({
                  orderId: pendingId,
                  status: "submitted_unpaid",
                  paymentStatus: "unpaid",
                  tableNumber: tableResult.data?.table_no ?? table_no ?? null,
                  total: Number((pendingQr.data as any).order_total || 0),
                  orderTotal: Number((pendingQr.data as any).order_total || 0),
                  settledAmount: Number((pendingQr.data as any).settled_amount || 0),
                  remainingAmount: Number((pendingQr.data as any).remaining_amount || 0),
                  submittedItems: pendingQr.data.items || [],
                  payment: "qr_pay_later",
                })
                setHasLocalOpenOrder(true)

                if (hydratedPendingOrderRef.current !== pendingId) {
                  hydratedPendingOrderRef.current = pendingId
                  try {
                    const state = useCartStore.getState() as any
                    if (state?.isCartOpen === true) useCartStore.setState({ isCartOpen: false })
                  } catch (e) {
                    console.error('[PMD] close drawer after table order sync failed', e)
                  }
                }
              } else {
                const hadPendingContext =
                  hydratedPendingOrderRef.current !== null || existingOrderId !== null

                setExistingOrderId(null)
                setPendingSettlementSummary(null)
                hydratedPendingOrderRef.current = null

                if (hadPendingContext) {
                  console.info('[PMD QR fallback] No pending QR order, restoring normal menu flow', {
                    table_id: tableResult?.data?.table_id ?? null,
                    table_no: tableResult?.data?.table_no ?? null,
                  })

                  // Clear stale split-payment cart hydration from previous pending order
                  clearCart()

                  try {
                    const state = useCartStore.getState() as any
                    if (state?.isCartOpen === true) {
                      useCartStore.setState({ isCartOpen: false })
                    }
                  } catch (e) {
                    console.error('[PMD QR fallback] close drawer failed', e)
                  }

                  // Ensure pending payment modal is closed when falling back to normal menu flow
                  setPaymentModalOpen(false)
                }
              }
            }
          } catch (error) {
            console.error('Failed to fetch table info:', error)
          }
        }

        // Load menu data
        const menuResult = await getMenuData()

        setApiMenuItems(menuResult.menuItems)
        setDynamicCategories(menuResult.categoryNames)
        setIsFrontendConfigured(menuResult.isFrontendConfigured ?? true)
        setMenuHighlightSettings(menuResult.menuHighlightSettings || defaultMenuHighlightSettings)
        if (cacheKey) {
          localStorage.setItem(cacheKey, JSON.stringify({
            categories: menuResult.categoryNames,
            items: menuResult.menuItems,
            timestamp: Date.now(),
            menuHighlightSettings: menuResult.menuHighlightSettings,
            menuCacheVersion: menuResult.menuCacheVersion,
          }))
          console.info("PMD_MENU_CACHE_REFRESHED")
        }

      } catch (error) {
        console.error('Failed to load menu data:', error)
        setApiMenuItems(menuData)
        setDynamicCategories(categories)
        setSelectedCategory("All") // Even on error, set "All"
      } finally {
        setIsLoading(false)
      }
    }

    loadMenuData()
  }, [searchParams, setTableInfo, clearCart, addToCart])

  // Add "All" to categories - FIXED VERSION
  const allCategories = useMemo(() => {
    const categoryList = dynamicCategories;
    return ["All", ...categoryList];
  }, [dynamicCategories]);

  // Adjust menu item prices if VAT is included in prices (vat_menu_price = 0)
  const adjustPriceForVAT = (price: number): number => {
    if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
      // VAT is included in prices - increase price by VAT percentage
      return price * (1 + taxSettings.percentage / 100)
    }
    return price
  }

  // Update filteredItems logic with price adjustment
  const filteredItems = useMemo(() => {
    // Use API data if available, otherwise fallback to CMS store or static data
    const availableItems = apiMenuItems.length ? apiMenuItems : (menuItems.length ? menuItems : menuData);

    // Adjust prices if VAT is included in menu prices
    const itemsWithAdjustedPrices = availableItems.map(item => ({
      ...item,
      price: adjustPriceForVAT(item.price),
      // Also adjust option prices if they exist
      options: item.options?.map(option => ({
        ...option,
        values: option.values.map(value => ({
          ...value,
          price: adjustPriceForVAT(value.price)
        }))
      }))
    }))

    // Always default to showing all items if no category is selected
    const currentCategory = selectedCategory || "All";

    // If "All" is selected, show all items
    if (currentCategory === "All") {
      return itemsWithAdjustedPrices;
    }

    // Otherwise, filter by selected category
    return itemsWithAdjustedPrices.filter((item) => item.category === currentCategory);
  }, [apiMenuItems, menuItems, selectedCategory, taxSettings.enabled, taxSettings.percentage, taxSettings.menuPrice]);

  const highlightSourceItems = useMemo(() => {
    const availableItems = apiMenuItems.length ? apiMenuItems : (menuItems.length ? menuItems : menuData)
    return availableItems.map(item => ({
      ...item,
      price: adjustPriceForVAT(item.price),
      options: item.options?.map(option => ({
        ...option,
        values: option.values.map(value => ({ ...value, price: adjustPriceForVAT(value.price) }))
      }))
    }))
  }, [apiMenuItems, menuItems, taxSettings.enabled, taxSettings.percentage, taxSettings.menuPrice])

  const chefRecommendationItems = useMemo(() => {
    if (!menuHighlightSettings.chef_section_enabled || menuHighlightSettings.section_placement === 'hidden') return []
    return highlightSourceItems.filter((item) => Boolean((item as any).is_chef_recommended)).slice(0, menuHighlightSettings.max_chef_items)
  }, [highlightSourceItems, menuHighlightSettings])

  const bestsellerItems = useMemo(() => {
    if (!menuHighlightSettings.bestseller_section_enabled || menuHighlightSettings.section_placement === 'hidden') return []
    return highlightSourceItems.filter((item) => Boolean((item as any).is_bestseller)).slice(0, menuHighlightSettings.max_bestseller_items)
  }, [highlightSourceItems, menuHighlightSettings])

  const showVirtualHighlightSections = (selectedCategory || "All") === "All" && menuHighlightSettings.section_placement !== 'hidden'

  // Initialize with "All" category when data loads
  useEffect(() => {
    if (apiMenuItems.length > 0 && !selectedCategory) {
      setSelectedCategory("All");
    }
  }, [apiMenuItems, selectedCategory]);

  // Calculate total items and price
  const cartPricingSummary = calculateCartPricingSummary(items, taxSettings)
  const totalItems = cartPricingSummary.totalItems
  const rawSubtotalPrice = cartPricingSummary.subtotal
  const rawTaxAmount = cartPricingSummary.tax
  const toolbarSubtotalPrice = toolbarPricingSnapshot?.subtotal ?? rawSubtotalPrice
  const toolbarTaxAmount = toolbarPricingSnapshot?.tax ?? rawTaxAmount
  const totalPrice = toolbarPricingSnapshot?.total ?? (rawSubtotalPrice + rawTaxAmount)

  // Show arrow if at least one item and not collapsed
  useEffect(() => {
    if (items.length === 0 && toolbarPricingSnapshot) setToolbarPricingSnapshot(null)
  }, [items.length, toolbarPricingSnapshot])

  const showBillArrow = totalItems > 0 && toolbarState !== "collapsed"
  // PMD_TABLE_ORDER_ACTIVE_DERIVED_STATE_20260613
  const localOpenOrderStatusForAction = String(localOpenOrder?.status || "").toLowerCase()
  const localOpenOrderPaymentStatusForAction = String(localOpenOrder?.paymentStatus || localOpenOrder?.payment_status || "").toLowerCase()
  const localOpenOrderRemainingForAction = Number(
    localOpenOrder?.remainingAmount ??
    localOpenOrder?.remaining_amount ??
    localOpenOrder?.totals?.remainingAmount ??
    Number.NaN
  )
  const localOpenOrderTotalForAction = Number(localOpenOrder?.orderTotal ?? localOpenOrder?.total ?? localOpenOrder?.subtotal ?? 0)

  const hasActiveLocalOpenOrder = Boolean(
    hasLocalOpenOrder &&
    localOpenOrder &&
    !["paid", "completed", "complete", "delivered", "cancelled", "canceled"].includes(localOpenOrderStatusForAction) &&
    !["paid", "settled"].includes(localOpenOrderPaymentStatusForAction) &&
    (
      (Number.isFinite(localOpenOrderRemainingForAction) && localOpenOrderRemainingForAction > 0) ||
      (!Number.isFinite(localOpenOrderRemainingForAction) && localOpenOrderTotalForAction > 0)
    )
  )

  const shouldShowTableOrderAction = isVisibleTableOrderDraft(sharedTableOrder) || hasActiveLocalOpenOrder

  const tableOrderActionCount = Number(
    tableOrderItemCount(sharedTableOrder) ||
    (
      hasActiveLocalOpenOrder
        ? localOpenOrder?.submittedItems?.reduce?.((sum: number, item: any) => sum + Number(item?.quantity || 1), 0)
        : 0
    ) ||
    0
  )


  // Get display items for the toolbar
  const getDisplayItems = () => {
    const pricedItems = toolbarPricingSnapshot?.items ?? items
    if (toolbarState === "preview" && lastInteractedItem) {
      const pricedLast = pricedItems.find((candidate: any) => candidate.item.id === lastInteractedItem.item.id)
      return [pricedLast || lastInteractedItem]
    }
    return pricedItems
  }

  // Update last interacted item whenever an item is added or selected
  const handleItemInteraction = (item: MenuItem) => {
    const cartItem = items.find(i => i.item.id === item.id)
    if (cartItem) {
      setLastInteractedItem(cartItem)
    }
  }

  // On first add, if toolbar is collapsed, go to preview
  const handleFirstAdd = (item: MenuItem) => {
    if (toolbarState === "collapsed") setToolbarState("preview")
    // Always set lastInteractedItem to the just-added item
    const cartItem = items.find(i => i.item.id === item.id)
    if (cartItem) setLastInteractedItem(cartItem)
  }

  const handleOrganicAdd = (item: MenuItem, event: React.MouseEvent) => {
    event.stopPropagation()
    let itemToAdd = { ...item }
    if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
      itemToAdd.price = item.price / (1 + taxSettings.percentage / 100)
      if (itemToAdd.options) {
        itemToAdd.options = itemToAdd.options.map(option => ({
          ...option,
          values: option.values.map(value => ({
            ...value,
            price: value.price / (1 + taxSettings.percentage / 100)
          }))
        }))
      }
    }
    const currentQuantity = items.find(cartItem => cartItem.item.id === item.id)?.quantity || 0
    addToCart(itemToAdd)
    if (currentQuantity === 0) handleFirstAdd(item)
  }


  const handleItemSelect = (item: MenuItem) => {
    setSelectedItem(item)
    const cartItem = items.find(i => i.item.id === item.id)
    if (cartItem) setLastInteractedItem(cartItem)
  }

  // Handlers for assistant buttons
  const handleWaiterClick = () => setWaiterConfirmOpen(true)
  const handleNoteClick = () => setNoteModalOpen(true)
  const handleCartClick = () => {
    if (items.length > 0) {
      setPaymentModalInitialStep('review')
      setPaymentModalOpen(true)
    }
  }

  const themeMenuActions = createThemeMenuActions({
    onAddItem: (item, quantity = 1) => {
      addToCart(item, quantity)
      handleFirstAdd(item)
    },
    onOpenCheckout: handleCartClick,
    onOpenTableOrder: () => {
      setPaymentModalInitialStep(sharedTableOrder?.status === "draft" ? "review" : (sharedTableOrder?.status === "paid" ? "paid" : "submitted"))
      setPaymentModalOpen(true)
    },
    onCallWaiter: handleWaiterClick,
    onOpenNote: handleNoteClick,
    onOpenValet: () => {
      const currentSearch = typeof window !== "undefined" ? window.location.search || "" : ""
      if (tableIdString) {
        window.location.href = `/table/${tableIdString}/valet${currentSearch}`
      } else {
        window.location.href = `/valet${currentSearch}`
      }
    },
    cartCount: totalItems,
    tableOrderCount: tableOrderActionCount,
    showTableOrder: shouldShowTableOrderAction,
    tableNumber: displayTableNumber,
    currentLocale: language,
    language,
  })

  // Phase 3C can begin moving low-risk native theme buttons (valet entry, waiter call, note,
  // and checkout open) to consume ThemeMenuActions through the no-op boundary below.
  // Existing handlers remain the source of truth until theme components are migrated.

  // PMD_BOTANICAL_V0_PARENT_BRIDGE_20260607
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleBotanicalMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      const msg = event.data
      if (!msg || typeof msg !== "object") return

      const type = String((msg as any).type || "")
      if (!type.startsWith("PMD_BOTANICAL_")) return

      if (type === "PMD_BOTANICAL_ADD_ITEM") {
        const id = String((msg as any).itemId || "")
        const quantity = Math.max(1, Number((msg as any).quantity || 1))

        const sourceItems = apiMenuItems.length ? apiMenuItems : (menuItems.length ? menuItems : menuData)
        const found = sourceItems.find((candidate: any) => {
          return String(candidate?.id ?? candidate?.menu_id ?? candidate?.menuId ?? "") === id
        })

        if (!found) {
          console.warn("[PMD botanical bridge] item not found", { id })
          toast({
            title: "Item not found",
            description: "Please refresh the menu and try again.",
            variant: "destructive",
          })
          return
        }

        let itemToAdd: MenuItem = { ...(found as MenuItem) }

        // Keep same VAT behavior as current organic/gold logic.
        if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
          itemToAdd.price = Number(itemToAdd.price || 0) / (1 + taxSettings.percentage / 100)
          if (itemToAdd.options) {
            itemToAdd.options = itemToAdd.options.map((option: any) => ({
              ...option,
              values: (option.values || []).map((value: any) => ({
                ...value,
                price: Number(value.price || 0) / (1 + taxSettings.percentage / 100),
              })),
            }))
          }
        }

        for (let i = 0; i < quantity; i++) {
          addToCart(itemToAdd)
        }

        handleFirstAdd(found as MenuItem)
        toast({
          title: "Added to order",
          description: String((found as any).name || (found as any).menu_name || "Item added"),
        })
        return
      }

      if (
        type === "PMD_BOTANICAL_CALL_WAITER" ||
        type === "pmd:call-waiter"
      ) {
        handleWaiterClick()
        return
      }

      if (
        type === "PMD_BOTANICAL_ADD_NOTE" ||
        type === "pmd:add-note"
      ) {
        handleNoteClick()
        return
      }

      if (
        type === "PMD_BOTANICAL_CHECKOUT" ||
        type === "pmd:checkout"
      ) {
        handleCartClick()
        return
      }

      if (
        type === "PMD_BOTANICAL_TABLE_ORDER" ||
        type === "pmd:table-order"
      ) {
        handleCartClick()
        return
      }


      if (type === "PMD_BOTANICAL_GO_VALET") {
        const incomingPath = String((msg as any).parentPath || window.location.pathname || "/menu")
        const incomingSearch = String((msg as any).parentSearch || window.location.search || "")

        let targetPath = "/valet"

        if (/\/table\/[^/]+\/menu\/?$/.test(incomingPath)) {
          targetPath = incomingPath.replace(/\/menu\/?$/, "/valet")
        } else if (/\/menu\/?$/.test(incomingPath)) {
          targetPath = "/valet"
        } else if (/\/menu\/table-[^/]+\/?$/.test(incomingPath)) {
          targetPath = "/valet"
        }

        window.location.href = `${targetPath}${incomingSearch || ""}`
        return
      }

      if (type === "PMD_BOTANICAL_LANGUAGE") {
        toast({
          title: "Language",
          description: "Language switch is still handled by the PayMyDine shell.",
        })
      }
    }

    window.addEventListener("message", handleBotanicalMessage)
    return () => window.removeEventListener("message", handleBotanicalMessage)
  }, [
    apiMenuItems,
    menuItems,
    items.length,
    taxSettings.enabled,
    taxSettings.percentage,
    taxSettings.menuPrice,
    addToCart,
    toast,
  ])
  const handleSendNote = async () => {
    const trimmedNote = (note ?? '').trim();
    if (!trimmedNote) {
      toast({
        title: "Error",
        description: "Please enter a note before sending.",
        variant: "destructive"
      });
      return;
    }

    // optional: cap length if your backend enforces it (e.g., 1000 chars)
    if (trimmedNote.length > 1000) {
      toast({
        title: "Error",
        description: "Note is too long. Please keep it under 1000 characters.",
        variant: "destructive"
      });
      return;
    }

    const resolvedTableId = tableIdString || "delivery"
    if (process.env.NODE_ENV !== "production") {
      console.debug('[table-note] payload', { tableId: resolvedTableId, note: trimmedNote, source: tableIdString ? "table" : "delivery_menu" });
    }
    try {
      await apiClient.callTableNote(String(resolvedTableId), trimmedNote, new Date().toISOString());
      setNote("")
      setNoteModalOpen(false)
      toast({
        title: "Note Sent",
        description: "Your note has been sent to the staff!"
      })
    } catch (error) {
      console.error('Failed to send note:', error)
      toast({
        title: "Note Failed",
        description: `Failed to send note: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (hasDraftTableOrderWithoutRealOrder) {
      setExistingOrderId(null)
      setHasLocalOpenOrder(false)
      setLocalOpenOrder(null)
      return
    }
    const tenant = window.location.host
    const tableKey = String(tableInfo?.table_id || tableInfo?.table_no || searchParams?.get("table") || searchParams?.get("table_id") || searchParams?.get("table_no") || (window.location.pathname.match(/\/table\/(\d+)/)?.[1] ?? "delivery"))
    const guestSessionId = localStorage.getItem('pmd_guest_session_id') || `g_${Date.now()}_${Math.random().toString(36).slice(2,10)}`
    localStorage.setItem('pmd_guest_session_id', guestSessionId)
    const key = `pmd_open_order:${tenant}:${tableKey}:${guestSessionId}`
    const legacyKey = `pmd_open_order:${tenant}:${tableKey}`
    try {
      let raw = localStorage.getItem(key)
      let restoredFromLegacy = false
      if (!raw) {
        const legacyRaw = localStorage.getItem(legacyKey)
        if (legacyRaw) {
          try {
            const legacy = JSON.parse(legacyRaw)
            const hasValidCore = Number(legacy?.orderId || 0) > 0 && Number(legacy?.total || 0) > 0
            const isPaid = legacy?.paymentStatus === "paid" || legacy?.status === "paid"
            const tenantConflict = legacy?.tenant != null && String(legacy.tenant) !== tenant
            const tableConflict = legacy?.tableKey != null && String(legacy.tableKey) !== tableKey
            if (!hasValidCore || isPaid || tenantConflict || tableConflict) {
              localStorage.removeItem(legacyKey)
            } else {
              const migrated = { ...legacy, guestSessionId, tenant, tableKey }
              localStorage.setItem(key, JSON.stringify(migrated))
              localStorage.removeItem(legacyKey)
              raw = JSON.stringify(migrated)
              restoredFromLegacy = true
            }
          } catch {}
        }
      }
      if (!raw) { setHasLocalOpenOrder(false); setLocalOpenOrder(null); return }
      const parsed = JSON.parse(raw)
      const hasValidCore =
        parsed &&
        typeof parsed === "object" &&
        Number(parsed?.total || 0) > 0 &&
        Number(parsed?.orderId || 0) > 0
      const matchesContext =
        String(parsed?.guestSessionId || "") === guestSessionId &&
        String(parsed?.tenant || "") === tenant &&
        String(parsed?.tableKey || "") === tableKey
      if (!hasValidCore || (!restoredFromLegacy && !matchesContext)) {
        localStorage.removeItem(key)
        setHasLocalOpenOrder(false)
        setLocalOpenOrder(null)
        return
      }
      setHasLocalOpenOrder(!!parsed?.orderId)
      setLocalOpenOrder(parsed)
      if (!existingOrderId && parsed?.orderId) setExistingOrderId(Number(parsed.orderId))
    } catch { setHasLocalOpenOrder(false); setLocalOpenOrder(null) }
  }, [tableInfo, searchParams, existingOrderId, hasDraftTableOrderWithoutRealOrder])



  // PMD_ORGANIC_SCOPED_BODY_MARKER_20260609
  useLayoutEffect(() => {
    if (typeof document === "undefined") return

    if (!isOrganicBotanicalTheme) {
      document.body.removeAttribute("data-pmd-organic-botanical-active")
      document.documentElement.removeAttribute("data-pmd-organic-botanical-active")
      return
    }

    document.body.setAttribute("data-pmd-organic-botanical-active", "1")
    document.documentElement.setAttribute("data-pmd-organic-botanical-active", "1")

    return () => {
      document.body.removeAttribute("data-pmd-organic-botanical-active")
      document.documentElement.removeAttribute("data-pmd-organic-botanical-active")
    }
  }, [isOrganicBotanicalTheme])



  // PMD_ORGANIC_CHECKOUT_DOM_POLISH_20260609
  useLayoutEffect(() => {
    if (typeof document === "undefined") return
    if (!isOrganicBotanicalTheme) return
    if (hasCheckoutThemeRoot()) return

    document.documentElement.setAttribute("data-pmd-organic-botanical-active", "1")
    document.body.setAttribute("data-pmd-organic-botanical-active", "1")

    const setImp = (el: Element, prop: string, value: string) => {
      const htmlEl = el as HTMLElement
      htmlEl.style.setProperty(prop, value, "important")
    }

    const paintOrganicPanel = (el: Element) => {
      el.setAttribute("data-pmd-organic-checkout-polished", "1")
      setImp(el, "background-color", "#f5fff8af0")
      setImp(
        el,
        "background-image",
        "linear-gradient(180deg, rgba(255,255,255,.42), rgba(255,255,255,0)), radial-gradient(circle at 1px 1px, rgba(116,125,85,.085) 1px, transparent 0)"
      )
      setImp(el, "background-size", "100% 100%, 16px 16px")
      setImp(el, "background-repeat", "no-repeat, repeat")
      setImp(el, "border-color", "#ded2ba")
      setImp(el, "color", "#343529")
      setImp(el, "-webkit-text-fill-color", "#343529")
      setImp(el, "box-shadow", "0 24px 70px -20px rgba(60,53,41,.52), inset 0 1px 0 rgba(255,255,255,.72)")
      setImp(el, "backdrop-filter", "none")
      setImp(el, "-webkit-backdrop-filter", "none")
    }

    const paintPrimary = (btn: Element) => {
      setImp(btn, "background", "#747d55")
      setImp(btn, "background-color", "#747d55")
      setImp(btn, "border-color", "#747d55")
      setImp(btn, "color", "#f5fff8af0")
      setImp(btn, "-webkit-text-fill-color", "#f5fff8af0")
      setImp(btn, "box-shadow", "0 12px 24px -14px rgba(60,53,41,.72)")
      btn.querySelectorAll("svg, svg *, span").forEach((child) => {
        setImp(child, "color", "#f5fff8af0")
        setImp(child, "-webkit-text-fill-color", "#f5fff8af0")
        setImp(child, "stroke", "#f5fff8af0")
      })
    }

    const paintSecondary = (btn: Element) => {
      setImp(btn, "background", "#f5fff8af0")
      setImp(btn, "background-color", "#f5fff8af0")
      setImp(btn, "border-color", "#ded2ba")
      setImp(btn, "color", "#343529")
      setImp(btn, "-webkit-text-fill-color", "#343529")
      setImp(btn, "box-shadow", "inset 0 1px 0 rgba(255,255,255,.72)")
    }

    const applyOrganicCheckoutPolish = () => {
      const roots = Array.from(
        document.querySelectorAll(
          [
            '[data-pmd-checkout-design-system="1"].pmd-checkout-modal',
            '.pmd-checkout-modal[data-pmd-checkout-design-system="1"]',
            '[data-pmd-payment-real-panel]',
            '[data-pmd-split-method-real-panel]',
            '[data-pmd-order-status-modal]',
            '[data-pmd-table-draft-modal]',
          ].join(",")
        )
      )

      roots.forEach((root) => {
        paintOrganicPanel(root)

        root
          .querySelectorAll(".pmd-checkout-body, [data-pmd-checkout-scroll='1']")
          .forEach((el) => {
            setImp(el, "background-color", "#f6efe2")
            setImp(el, "background-image", "radial-gradient(circle at 1px 1px, rgba(116,125,85,.075) 1px, transparent 0)")
            setImp(el, "background-size", "16px 16px")
            setImp(el, "color", "#343529")
            setImp(el, "-webkit-text-fill-color", "#343529")
          })

        root
          .querySelectorAll(
            ".surface-sub, .pmd-checkout-flat-section, .pmd-checkout-item-card, .pmd-checkout-total-card, .pmd-checkout-payment-card, .pmd-checkout-meta-row, .pmd-checkout-item-row"
          )
          .forEach((el) => {
            setImp(el, "background-color", "#f5fff8af0")
            setImp(el, "background-image", "radial-gradient(circle at 1px 1px, rgba(116,125,85,.055) 1px, transparent 0)")
            setImp(el, "background-size", "16px 16px")
            setImp(el, "border-color", "#ded2ba")
            setImp(el, "color", "#343529")
            setImp(el, "-webkit-text-fill-color", "#343529")
          })

        root.querySelectorAll("button").forEach((btn) => {
          const label = `${btn.textContent || ""} ${btn.getAttribute("aria-label") || ""}`.toLowerCase()
          const isCircle =
            btn.matches(".pmd-v2-action-circle, .quantity-btn, [data-pmd-show-bill-toggle='1'], [data-pmd-order-status-back='1']")
          const isSecondary = /continue ordering|cancel/.test(label)
          const isPrimary = /confirm|send to kitchen|pay|pay in full|review split|view order|yes|apply/.test(label)

          if (isCircle || isPrimary) paintPrimary(btn)
          if (isSecondary) paintSecondary(btn)
        })
      })

      document
        .querySelectorAll('button[data-pmd-organic-action="primary"]')
        .forEach(paintPrimary)

      document
        .querySelectorAll('button[data-pmd-organic-action="secondary"]')
        .forEach(paintSecondary)
    }

    let scheduled = false
    const schedule = () => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(() => {
        scheduled = false
        applyOrganicCheckoutPolish()
      })
    }

    applyOrganicCheckoutPolish()

    const fastTimers = [0, 16, 40, 90, 180, 360, 720, 1200].map((ms) =>
      window.setTimeout(applyOrganicCheckoutPolish, ms)
    )

    const observer = new MutationObserver(schedule)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-pmd-checkout-design-system"],
    })

    return () => {
      fastTimers.forEach((timer) => window.clearTimeout(timer))
      observer.disconnect()
    }
  }, [isOrganicBotanicalTheme])


  // PMD_ORGANIC_CHECKOUT_TOTAL_DISPLAY_REPAIR_20260609
  useLayoutEffect(() => {
    if (typeof document === "undefined") return
    if (!isOrganicBotanicalTheme) return
    if (hasCheckoutThemeRoot()) return

    const parseMoney = (text: string | null | undefined) => {
      const raw = String(text || "").replace(/[^\d,.-]/g, "").replace(",", ".")
      const num = Number.parseFloat(raw)
      return Number.isFinite(num) ? num : 0
    }

    const formatMoney = (amount: number) => `€${amount.toFixed(2)}`

    const setRowAmount = (root: Element, label: string, amount: number) => {
      const nodes = Array.from(root.querySelectorAll("span, div"))
      const labelNode = nodes.find((node) => (node.textContent || "").trim().toLowerCase() === label.toLowerCase())
      const parent = labelNode?.parentElement
      if (!parent) return

      const valueNodes = Array.from(parent.querySelectorAll("span, div"))
        .filter((node) => node !== labelNode)
        .filter((node) => /€\s*[\d,.]+/.test(node.textContent || ""))

      const target = valueNodes[valueNodes.length - 1]
      if (target) {
        target.textContent = formatMoney(amount)
      }
    }

    const repairTotals = () => {
      const roots = Array.from(
        document.querySelectorAll('[data-pmd-checkout-design-system="1"].pmd-checkout-modal')
      )

      roots.forEach((root) => {
        const itemPrices = Array.from(root.querySelectorAll(".pmd-checkout-item-price"))
          .map((el) => parseMoney(el.textContent))
          .filter((value) => value > 0)

        const subtotal = itemPrices.reduce((sum, value) => sum + value, 0)
        if (subtotal <= 0) return

        const fullText = root.textContent || ""
        const hasWrongZero =
          /subtotal\s*€0\.00/i.test(fullText) ||
          /total\s*€0\.00/i.test(fullText)

        if (!hasWrongZero) return

        root.setAttribute("data-pmd-organic-total-repaired", "1")
        setRowAmount(root, "Subtotal", subtotal)
        setRowAmount(root, "Total", subtotal)
      })
    }

    repairTotals()

    const timers = [0, 16, 40, 90, 180, 360, 720, 1200, 1800].map((ms) =>
      window.setTimeout(repairTotals, ms)
    )

    const observer = new MutationObserver(repairTotals)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      observer.disconnect()
    }
  }, [isOrganicBotanicalTheme])


  // PMD_ORGANIC_BUTTON_ICON_FINAL_POLISH_20260609
  useLayoutEffect(() => {
    if (typeof document === "undefined") return
    if (!isOrganicBotanicalTheme) return
    if (hasCheckoutThemeRoot()) return

    const GREEN = "#747d55"
    const GREEN_DARK = "#5f6746"
    const PAPER = "#f5fff8af0"
    const PAPER_SOFT = "#f6efe2"
    const LINE = "#ded2ba"
    const INK = "#343529"
    const MUTED = "#746f61"

    const setImp = (el: Element, prop: string, value: string) => {
      ;(el as HTMLElement).style.setProperty(prop, value, "important")
    }

    const paintPrimary = (el: Element) => {
      setImp(el, "background", GREEN)
      setImp(el, "background-color", GREEN)
      setImp(el, "border-color", GREEN)
      setImp(el, "outline-color", GREEN)
      setImp(el, "color", PAPER)
      setImp(el, "-webkit-text-fill-color", PAPER)
      setImp(el, "box-shadow", "0 12px 24px -14px rgba(60,53,41,.72)")
      el.querySelectorAll("svg, svg *, span").forEach((child) => {
        setImp(child, "color", PAPER)
        setImp(child, "-webkit-text-fill-color", PAPER)
        setImp(child, "stroke", PAPER)
      })
    }

    const paintSecondary = (el: Element) => {
      setImp(el, "background", PAPER)
      setImp(el, "background-color", PAPER)
      setImp(el, "border-color", LINE)
      setImp(el, "outline-color", LINE)
      setImp(el, "color", INK)
      setImp(el, "-webkit-text-fill-color", INK)
      setImp(el, "box-shadow", "inset 0 1px 0 rgba(255,255,255,.72)")
      el.querySelectorAll("svg, svg *, span").forEach((child) => {
        setImp(child, "color", INK)
        setImp(child, "-webkit-text-fill-color", INK)
        setImp(child, "stroke", INK)
      })
    }

    const paintIconBadge = (el: Element) => {
      setImp(el, "background", PAPER)
      setImp(el, "background-color", PAPER)
      setImp(el, "border-color", LINE)
      setImp(el, "color", GREEN)
      setImp(el, "-webkit-text-fill-color", GREEN)
      setImp(el, "box-shadow", "inset 0 1px 0 rgba(255,255,255,.72), 0 12px 28px -18px rgba(60,53,41,.72)")
      el.querySelectorAll("svg, svg *").forEach((child) => {
        setImp(child, "color", GREEN)
        setImp(child, "stroke", GREEN)
        setImp(child, "-webkit-text-fill-color", GREEN)
      })
    }

    const paintText = (root: Element) => {
      root.querySelectorAll("h1, h2, h3, h4, strong").forEach((el) => {
        setImp(el, "color", INK)
        setImp(el, "-webkit-text-fill-color", INK)
      })
      root.querySelectorAll("p, span, label, div").forEach((el) => {
        const txt = (el.textContent || "").trim()
        if (!txt) return
        const isPrice = /€|\$|\d+[,.]\d{2}/.test(txt)
        setImp(el, "color", isPrice ? INK : MUTED)
        setImp(el, "-webkit-text-fill-color", isPrice ? INK : MUTED)
      })
    }

    const paintOrganicWaiterNote = () => {
      document.querySelectorAll(".pmd-organic-modal-card").forEach((card) => {
        card.setAttribute("data-pmd-organic-button-polished", "1")
        paintText(card)

        card.querySelectorAll('[data-pmd-organic-action="primary"]').forEach(paintPrimary)
        card.querySelectorAll('[data-pmd-organic-action="secondary"]').forEach(paintSecondary)

        card.querySelectorAll(".mx-auto.mb-5.flex.h-16.w-16, .mx-auto.mb-5").forEach((el) => {
          if (el.querySelector("svg")) paintIconBadge(el)
        })

        card.querySelectorAll("svg").forEach((svg) => {
          const insideButton = svg.closest("button")
          const insideBadge = svg.closest(".mx-auto")
          if (!insideButton && !insideBadge) {
            setImp(svg, "color", GREEN)
            setImp(svg, "stroke", GREEN)
          }
        })
      })
    }

    const paintCheckout = () => {
      const roots = Array.from(
        document.querySelectorAll(
          '[data-pmd-checkout-design-system="1"].pmd-checkout-modal, .pmd-checkout-modal[data-pmd-checkout-design-system="1"]'
        )
      )

      roots.forEach((root) => {
        root.setAttribute("data-pmd-organic-buttons-polished", "1")

        setImp(root, "background-color", PAPER)
        setImp(root, "background-image", "linear-gradient(180deg, rgba(255,255,255,.42), rgba(255,255,255,0)), radial-gradient(circle at 1px 1px, rgba(116,125,85,.085) 1px, transparent 0)")
        setImp(root, "background-size", "100% 100%, 16px 16px")
        setImp(root, "background-repeat", "no-repeat, repeat")
        setImp(root, "border-color", LINE)
        setImp(root, "color", INK)
        setImp(root, "-webkit-text-fill-color", INK)

        root.querySelectorAll(".pmd-checkout-body, [data-pmd-checkout-scroll='1']").forEach((el) => {
          setImp(el, "background-color", PAPER_SOFT)
          setImp(el, "background-image", "radial-gradient(circle at 1px 1px, rgba(116,125,85,.075) 1px, transparent 0)")
          setImp(el, "background-size", "16px 16px")
          setImp(el, "color", INK)
          setImp(el, "-webkit-text-fill-color", INK)
        })

        root
          .querySelectorAll(".surface-sub, .pmd-checkout-flat-section, .pmd-checkout-item-card, .pmd-checkout-item-row, .pmd-checkout-meta-row")
          .forEach((el) => {
            setImp(el, "background-color", PAPER)
            setImp(el, "background-image", "radial-gradient(circle at 1px 1px, rgba(116,125,85,.055) 1px, transparent 0)")
            setImp(el, "background-size", "16px 16px")
            setImp(el, "border-color", LINE)
            setImp(el, "color", INK)
            setImp(el, "-webkit-text-fill-color", INK)
          })

        paintText(root)

        root.querySelectorAll("button").forEach((btn) => {
          const label = `${btn.textContent || ""} ${btn.getAttribute("aria-label") || ""}`.trim().toLowerCase()

          const isCircle =
            btn.matches(".pmd-v2-action-circle, .quantity-btn, [data-pmd-show-bill-toggle='1'], [data-pmd-order-status-back='1']")

          const isPrimary =
            /^(confirm|send to kitchen|pay|pay in full|review split|view order|apply|yes)$/.test(label)

          const isSecondary =
            /^(continue ordering|cancel|no|split bill|back)$/.test(label)

          if (isCircle || isPrimary) paintPrimary(btn)
          else if (isSecondary) paintSecondary(btn)
          else {
            setImp(btn, "border-color", LINE)
          }
        })

        root.querySelectorAll("[data-pmd-force-qty-symbol]").forEach((el) => {
          setImp(el, "color", PAPER)
          setImp(el, "-webkit-text-fill-color", PAPER)
        })
      })
    }

    const run = () => {
      paintOrganicWaiterNote()
      paintCheckout()
    }

    let scheduled = false
    const schedule = () => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(() => {
        scheduled = false
        run()
      })
    }

    run()

    const timers = [0, 16, 40, 90, 180, 360, 720, 1200, 1800].map((ms) =>
      window.setTimeout(run, ms)
    )

    const observer = new MutationObserver(schedule)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-pmd-checkout-design-system"],
    })

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      observer.disconnect()
    }
  }, [isOrganicBotanicalTheme])

  // PMD_ORGANIC_V0_PARENT_MESSAGE_BRIDGE_FINAL_20260607
  React.useEffect(() => {
    if (!isOrganicBotanicalTheme || typeof window === "undefined") return

    function handleBotanicalV0Message(event: MessageEvent) {
      if (event.origin !== window.location.origin) return

      const data: any = event.data || {}
      const type = String(data.type || "")

      if (type === "pmd:call-waiter") {
        handleWaiterClick()
        return
      }

      if (type === "pmd:add-note") {
        handleNoteClick()
        return
      }

      if (type === "pmd:checkout") {
        handleCartClick()
        return
      }

      if (type === "pmd:table-order") {
        if (!shouldShowTableOrderAction) return
        setPaymentModalInitialStep(
          sharedTableOrder?.status === "draft"
            ? "review"
            : sharedTableOrder?.status === "paid"
              ? "paid"
              : "submitted"
        )
        setPaymentModalOpen(true)
        return
      }

      if (type === "pmd:add-item" && data.item) {
        const itemToAdd = data.item as MenuItem
        const quantity = Math.max(1, Number(data.quantity || 1))

        for (let i = 0; i < quantity; i++) {
          addToCart(itemToAdd)
        }

        handleFirstAdd(itemToAdd)
        toast({
          title: "Added to order",
          description: String((itemToAdd as any).name || (itemToAdd as any).menu_name || "Item added"),
        })
        return
      }

      if (type === "pmd:open-valet") {
        const currentSearch = window.location.search || ""
        if (tableIdString) {
          window.location.href = `/table/${tableIdString}/valet${currentSearch}`
        } else {
          window.location.href = `/valet${currentSearch}`
        }
        return
      }
    }

    window.addEventListener("message", handleBotanicalV0Message)
    return () => window.removeEventListener("message", handleBotanicalV0Message)
  }, [isOrganicBotanicalTheme, tableIdString])


  // PMD_ORGANIC_DOCK_DELEGATED_ACTIONS_20260608
  React.useEffect(() => {
    if (!isOrganicBotanicalTheme || typeof document === "undefined") return

    let lastActionAt = 0

    function runOrganicDockAction(action: string) {
      if (action === "waiter") {
        handleWaiterClick()
        return
      }

      if (action === "note") {
        handleNoteClick()
        return
      }

      if (action === "checkout") {
        handleCartClick()
        return
      }

      if (action === "table-order") {
        if (!shouldShowTableOrderAction) return
        setPaymentModalInitialStep(
          sharedTableOrder?.status === "draft"
            ? "review"
            : sharedTableOrder?.status === "paid"
              ? "paid"
              : "submitted"
        )
        setPaymentModalOpen(true)
        return
      }
    }

    function onOrganicDockPress(event: Event) {
      const target = event.target as HTMLElement | null
      const button = target?.closest?.("[data-pmd-organic-dock-action]") as HTMLElement | null
      if (!button) return

      const now = Date.now()
      if (now - lastActionAt < 350) return
      lastActionAt = now

      event.preventDefault()
      event.stopPropagation()
      ;(event as any).stopImmediatePropagation?.()

      const action = String(button.getAttribute("data-pmd-organic-dock-action") || "")
      console.info("PMD_ORGANIC_DOCK_CLICK", action)
      runOrganicDockAction(action)
    }

    document.addEventListener("pointerdown", onOrganicDockPress, true)
    document.addEventListener("click", onOrganicDockPress, true)

    return () => {
      document.removeEventListener("pointerdown", onOrganicDockPress, true)
      document.removeEventListener("click", onOrganicDockPress, true)
    }
  }, [isOrganicBotanicalTheme, sharedTableOrder?.status])


  // PMD_ORGANIC_BODY_MODAL_STYLE_MARKER_20260608
  React.useEffect(() => {
    if (typeof document === "undefined") return

  
  if (isOrganicBotanicalTheme) {
      document.body.setAttribute("data-pmd-organic-botanical-active", "1")
      document.documentElement.setAttribute("data-pmd-organic-botanical-active", "1")
    } else {
      document.body.removeAttribute("data-pmd-organic-botanical-active")
      document.documentElement.removeAttribute("data-pmd-organic-botanical-active")
    }

    return () => {
      document.body.removeAttribute("data-pmd-organic-botanical-active")
      document.documentElement.removeAttribute("data-pmd-organic-botanical-active")
    }
  }, [isOrganicBotanicalTheme])

  if (!isClient) {
    return <LoadingSpinner />
  }

  const restaurantDisplayName = merchantSettings?.businessName || cmsSettings?.appName || 'PayMyDine'
  const heroItem = highlightSourceItems.find((item) => item.image || (Array.isArray((item as any).images) && (item as any).images.length)) || highlightSourceItems[0] || null

  if (shouldHoldThemeRender) {
    return (
      <div
        className="pmd-customer-page page--menu relative min-h-screen w-full"
        data-pmd-theme-loading="1"
        style={{ background: "#f5fff8af0", color: "#343529" }}
      >
        <LoadingSpinner />
      </div>
    )
  }



  const normalizeModernGreenLogoUrl = (value: unknown) => {
    const raw = String(value || "").trim()
    if (!raw || raw === "undefined" || raw === "null") return ""

    if (/^https?:\/\//i.test(raw)) return raw

    const clean = raw.replace(/^\/+/, "")
    const filename = clean.split("/").filter(Boolean).pop() || clean

    if (clean.startsWith("assets/media/uploads/")) return `/${clean}`
    if (clean.startsWith("/assets/media/uploads/")) return clean
    if (clean.startsWith("uploads/")) return `/assets/media/${clean}`

    // Backend sometimes sends only the uploaded file name.
    if (!clean.includes("/")) return `/assets/media/uploads/${filename}`

    // If it was saved as /assets/media/<file>, normalize to uploads because that is where the file exists.
    if (clean.startsWith("assets/media/")) return `/assets/media/uploads/${filename}`

    return `/${clean}`
  }


  // PMD_KAZEN_JAPANESE_THEME_RETURN_20260611
  if (isKazenJapaneseTheme) {
    const kazenSrc =
      typeof window !== "undefined"
        ? `/themes/kazen-japanese/?embedded=1&from=pmd&${window.location.search.replace(/^\?/, "")}`
        : "/themes/kazen-japanese/?embedded=1&from=pmd"

    const kazenSourceItems = apiMenuItems.length ? apiMenuItems : (menuItems.length ? menuItems : menuData)
    const kazenBridgeCategories = pmdBuildKazenParentCategories(allCategories, kazenSourceItems)
    const kazenTableNumber = tableInfo?.table_no ?? tableInfo?.table_id ?? displayTableNumber ?? tableIdString ?? null
    // PMD_KAZEN_ADMIN_LOGO_SAME_AS_HOMEPAGE_20260611
    const kazenLogoCandidates = [
      (cmsSettings as any)?.effectiveLogoUrl,
      (cmsSettings as any)?.logoUrl,
      (cmsSettings as any)?.logo_url,
      (cmsSettings as any)?.logo,
      (cmsSettings as any)?.restaurantLogoUrl,
      (cmsSettings as any)?.restaurant_logo,
      (cmsSettings as any)?.site_logo,
      (cmsSettings as any)?.header_logo,
      (cmsSettings as any)?.frontend_logo,
      (cmsSettings as any)?.business_logo,
      (cmsSettings as any)?.brand_logo,
      (cmsSettings as any)?.data?.effectiveLogoUrl,
      (cmsSettings as any)?.data?.logoUrl,
      (cmsSettings as any)?.data?.logo_url,
      (cmsSettings as any)?.data?.logo,
      (cmsSettings as any)?.data?.restaurant_logo,
      (merchantSettings as any)?.effectiveLogoUrl,
      (merchantSettings as any)?.logoUrl,
      (merchantSettings as any)?.logo_url,
      (merchantSettings as any)?.logo,
      (merchantSettings as any)?.restaurantLogoUrl,
      (merchantSettings as any)?.restaurant_logo,
      (merchantSettings as any)?.site_logo,
      (merchantSettings as any)?.header_logo,
      (merchantSettings as any)?.frontend_logo,
      (merchantSettings as any)?.business_logo,
      (merchantSettings as any)?.brand_logo,
      (merchantSettings as any)?.data?.effectiveLogoUrl,
      (merchantSettings as any)?.data?.logoUrl,
      (merchantSettings as any)?.data?.logo_url,
      (merchantSettings as any)?.data?.logo,
      (merchantSettings as any)?.data?.restaurant_logo,
    ]

    const kazenLogoUrl = normalizeModernGreenLogoUrl(
      kazenLogoCandidates.find((value) => String(value || "").trim()) || ""
    )

    const handleKazenAdd = (item: MenuItem, quantity = 1) => {
      let itemToAdd = { ...item }
      if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
        itemToAdd.price = item.price / (1 + taxSettings.percentage / 100)
        if (itemToAdd.options) {
          itemToAdd.options = itemToAdd.options.map(option => ({
            ...option,
            values: option.values.map(value => ({
              ...value,
              price: value.price / (1 + taxSettings.percentage / 100)
            }))
          }))
        }
      }
      const currentQuantity = items.find(cartItem => cartItem.item.id === item.id)?.quantity || 0
      addToCart(itemToAdd, quantity)
      if (currentQuantity === 0) handleFirstAdd(item)
    }

    const handleKazenWaiter = async () => {
      const resolvedTableId = tableInfo?.table_id || tableInfo?.table_no || tableIdString || "delivery"
      try {
        await apiClient.callWaiter(String(resolvedTableId), ".")
        toast({ title: "Waiter called", description: "The team has been notified." })
      } catch (error: any) {
        toast({ title: "Waiter call failed", description: error?.message || "Failed to call waiter.", variant: "destructive" })
      }
    }

    const handleKazenNote = async (rawNote = "") => {
      const resolvedTableId = tableInfo?.table_id || tableInfo?.table_no || tableIdString || "delivery"
      const trimmedNote = String(rawNote || "").trim()
      if (!trimmedNote) {
        setNoteModalOpen(true)
        return
      }
      try {
        await apiClient.callTableNote(String(resolvedTableId), trimmedNote, new Date().toISOString())
        toast({ title: "Note sent", description: "Your note was sent to the team." })
      } catch (error: any) {
        toast({ title: "Note failed", description: error?.message || "Failed to send note.", variant: "destructive" })
      }
    }

    const handleKazenValet = async (values: any = {}) => {
      const name = String(values?.name || "Guest").trim() || "Guest"
      const licensePlate = String(values?.licensePlate || values?.license_plate || "Not provided").trim() || "Not provided"
      const carModel = String(values?.carModel || values?.car_make || "Not provided").trim() || "Not provided"

      try {
        await apiClient.createValetRequest({
          name,
          license_plate: licensePlate,
          car_make: carModel,
          table_id: tableIdString || undefined,
          table_no: kazenTableNumber ? String(kazenTableNumber) : undefined,
          qr: tableInfo?.qr_code ? String(tableInfo.qr_code) : undefined,
        })
        toast({ title: "Valet requested", description: "Your valet request has been sent." })
      } catch (error: any) {
        toast({ title: "Valet request failed", description: error?.message || "Failed to submit valet request.", variant: "destructive" })
      }
    }

    return (
      <ThemeActionBoundary actions={themeMenuActions}>
        <KazenJapaneseBridgeTheme
          src={kazenSrc}
          sourceItems={kazenSourceItems}
          cartItems={items}
          totalItems={totalItems}
          totalPrice={totalPrice}
          lastInteractedItem={lastInteractedItem}
          categories={kazenBridgeCategories}
          restaurantName={restaurantDisplayName}
          logoUrl={kazenLogoUrl}
          tableNumber={kazenTableNumber}
          onAddItem={handleKazenAdd}
          onOpenItem={(item) => handleItemSelect(item as MenuItem)}
          onCheckout={handleCartClick}
          onCallWaiter={handleKazenWaiter}
          onOpenNote={handleKazenNote}
          onOpenValet={handleKazenValet}
          onTableOrder={() => {
            if (!shouldShowTableOrderAction) return
            setPaymentModalInitialStep(
              sharedTableOrder?.status === "draft"
                ? "review"
                : sharedTableOrder?.status === "paid"
                  ? "paid"
                  : "submitted"
            )
            setPaymentModalPreferPersonalReview(false)
            setPaymentModalOpen(true)
          }}
          showTableOrder={shouldShowTableOrderAction}
          tableOrderCount={tableOrderActionCount}
        >
          <KazenBottomDock {...themeMenuActions} />
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => { setPaymentModalOpen(false); setPaymentModalPreferPersonalReview(false) }}
            items={items}
            tableInfo={tableInfo}
            existingOrderId={activeExistingOrderId}
            pendingSummary={activePendingSummary}
            initialSubmittedOrder={activeSubmittedOrder}
            initialCheckoutStep={paymentModalInitialStep}
            preferPersonalReview={paymentModalPreferPersonalReview}
            checkoutVisualTheme="kazen_japanese"
            onCartPricingUpdate={setToolbarPricingSnapshot}
            onOpenOrderUpdate={(snapshot) => {
              if (snapshot?.status === "draft" || snapshot?.draft_id) {
                setSharedTableOrder(snapshot)
                return
              }
              if (snapshot?.paymentStatus === "paid" || snapshot?.status === "paid") {
                const normalizedPaid = snapshot?.orderId ? snapshot : { ...snapshot, orderId: snapshot?.order_id }
                setLocalOpenOrder(normalizedPaid)
                setHasLocalOpenOrder(!!normalizedPaid?.orderId)
                setSharedTableOrder((prev) => prev?.order_id && String(prev.order_id) === String(normalizedPaid?.orderId) ? { ...prev, status: "paid", paymentStatus: "paid" } as any : prev)
                return
              }
              if (snapshot?.orderId || snapshot?.order_id) {
                const normalized = snapshot?.orderId ? snapshot : { ...snapshot, orderId: snapshot.order_id }
                setLocalOpenOrder(normalized)
                setHasLocalOpenOrder(true)
                setSharedTableOrder((prev) => prev?.draft_id ? null : prev)
              }
            }}
          />
        </KazenJapaneseBridgeTheme>
      </ThemeActionBoundary>
    )
  }

  // PMD_MODERN_GREEN_V0_ONLY_RETURN_FINAL_20260610
  if (isModernGreenTheme) {
    const modernGreenSrc =
      typeof window !== "undefined"
        ? `/newfrontend/?embedded=1&from=pmd&${window.location.search.replace(/^\?/, "")}`
        : "/newfrontend/?embedded=1&from=pmd"

    const modernGreenSourceItems = apiMenuItems.length ? apiMenuItems : (menuItems.length ? menuItems : menuData)
    const modernGreenTableNumber = tableInfo?.table_no ?? tableInfo?.table_id ?? displayTableNumber ?? tableIdString ?? null
    const modernGreenLogoUrl = normalizeModernGreenLogoUrl(
      (cmsSettings as any)?.logoUrl ||
      (cmsSettings as any)?.logo ||
      (cmsSettings as any)?.logo_url ||
      (cmsSettings as any)?.site_logo ||
      (cmsSettings as any)?.restaurant_logo ||
      (merchantSettings as any)?.logoUrl ||
      (merchantSettings as any)?.logo ||
      (merchantSettings as any)?.logo_url ||
      (merchantSettings as any)?.site_logo ||
      (merchantSettings as any)?.restaurant_logo ||
      ""
    )

    const handleModernGreenAdd = (item: MenuItem, quantity = 1) => {
      let itemToAdd: MenuItem = { ...item }

      if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
        itemToAdd.price = Number(itemToAdd.price || 0) / (1 + taxSettings.percentage / 100)
        if (itemToAdd.options) {
          itemToAdd.options = itemToAdd.options.map((option: any) => ({
            ...option,
            values: (option.values || []).map((value: any) => ({
              ...value,
              price: Number(value.price || 0) / (1 + taxSettings.percentage / 100),
            })),
          }))
        }
      }

      for (let i = 0; i < Math.max(1, Number(quantity || 1)); i += 1) {
        addToCart(itemToAdd)
      }

      handleFirstAdd(item)
      toast({
        title: "Added to order",
        description: String((item as any).name || (item as any).menu_name || "Item added"),
      })
    }

    const handleModernGreenWaiter = async () => {
      const resolvedTableId = tableIdString || "delivery"
      try {
        await apiClient.callWaiter(String(resolvedTableId), ".")
        toast({
          title: "Waiter called",
          description: tableIdString ? "We are on the way!" : "We received your assistance request.",
        })
      } catch (error: any) {
        toast({
          title: "Waiter call failed",
          description: error?.message || "Failed to call waiter.",
          variant: "destructive",
        })
      }
    }

    const handleModernGreenNote = async (noteText = "") => {
      const trimmedNote = String(noteText || "").trim()
      if (!trimmedNote) {
        toast({
          title: "Note is empty",
          description: "Please write a note before sending it.",
          variant: "destructive",
        })
        return
      }

      const resolvedTableId = tableIdString || "delivery"
      try {
        await apiClient.callTableNote(String(resolvedTableId), trimmedNote, new Date().toISOString())
        toast({
          title: "Note sent",
          description: "Your note has been sent to the staff.",
        })
      } catch (error: any) {
        toast({
          title: "Note failed",
          description: error?.message || "Failed to send note.",
          variant: "destructive",
        })
      }
    }

    const handleModernGreenValet = async (values: any = {}) => {
      const name = String(values?.name || "Guest").trim() || "Guest"
      const licensePlate = String(values?.licensePlate || values?.license_plate || "Not provided").trim() || "Not provided"
      const carModel = String(values?.carModel || values?.car_make || "Not provided").trim() || "Not provided"

      try {
        await apiClient.createValetRequest({
          name,
          license_plate: licensePlate,
          car_make: carModel,
          table_id: tableIdString || undefined,
          table_no: modernGreenTableNumber ? String(modernGreenTableNumber) : undefined,
          qr: tableInfo?.qr_code ? String(tableInfo.qr_code) : undefined,
        })
        toast({
          title: "Valet requested",
          description: "Your valet request has been sent.",
        })
      } catch (error: any) {
        toast({
          title: "Valet request failed",
          description: error?.message || "Failed to submit valet request.",
          variant: "destructive",
        })
      }
    }

    return (
      <ThemeActionBoundary actions={themeMenuActions}>
        <ModernGreenBridgeTheme
          src={modernGreenSrc}
          sourceItems={modernGreenSourceItems}
          cartItems={items}
          totalItems={totalItems}
          totalPrice={totalPrice}
          lastInteractedItem={lastInteractedItem}
          categories={allCategories}
          restaurantName={restaurantDisplayName}
          logoUrl={modernGreenLogoUrl}
          tableNumber={modernGreenTableNumber}
          onAddItem={handleModernGreenAdd}
          onOpenItem={(item) => handleItemSelect(item as MenuItem)}
          onCheckout={handleCartClick}
          onCallWaiter={handleModernGreenWaiter}
          onOpenNote={handleModernGreenNote}
          onOpenValet={handleModernGreenValet}
          onTableOrder={() => {
            if (!shouldShowTableOrderAction) return
            setPaymentModalInitialStep(
              sharedTableOrder?.status === "draft"
                ? "review"
                : sharedTableOrder?.status === "paid"
                  ? "paid"
                  : "submitted"
            )
            setPaymentModalPreferPersonalReview(false)
            setPaymentModalOpen(true)
          }}
          showTableOrder={shouldShowTableOrderAction}
          tableOrderCount={tableOrderActionCount}
        >
          <ModernGreenBottomDock {...themeMenuActions} />
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => { setPaymentModalOpen(false); setPaymentModalPreferPersonalReview(false) }}
            items={items}
            tableInfo={tableInfo}
            existingOrderId={activeExistingOrderId}
            pendingSummary={activePendingSummary}
            initialSubmittedOrder={activeSubmittedOrder}
            initialCheckoutStep={paymentModalInitialStep}
            preferPersonalReview={paymentModalPreferPersonalReview}
            checkoutVisualTheme="modern_green"
            onCartPricingUpdate={setToolbarPricingSnapshot}
            onOpenOrderUpdate={(snapshot) => {
              if (snapshot?.status === "draft" || snapshot?.draft_id) {
                setSharedTableOrder(snapshot)
                return
              }
              if (snapshot?.paymentStatus === "paid" || snapshot?.status === "paid") {
                const normalizedPaid = snapshot?.orderId ? snapshot : { ...snapshot, orderId: snapshot?.order_id }
                setLocalOpenOrder(normalizedPaid)
                setHasLocalOpenOrder(!!normalizedPaid?.orderId)
                setSharedTableOrder((prev) => prev?.order_id && String(prev.order_id) === String(normalizedPaid?.orderId) ? { ...prev, status: "paid", paymentStatus: "paid" } as any : prev)
                return
              }
              if (snapshot?.orderId || snapshot?.order_id) {
                const normalized = snapshot?.orderId ? snapshot : { ...snapshot, orderId: snapshot.order_id }
                setLocalOpenOrder(normalized)
                setHasLocalOpenOrder(true)
                setSharedTableOrder((prev) => prev?.draft_id ? null : prev)
              }
            }}
          />
        </ModernGreenBridgeTheme>
      </ThemeActionBoundary>
    )
  }

  // PMD_ORGANIC_V0_ONLY_RETURN_FINAL_20260607
  if (isOrganicBotanicalTheme) {
    return (
      <ThemeActionBoundary actions={themeMenuActions}>
      <div className="pmd-customer-page page--menu relative min-h-screen w-full bg-[#f6efe2]">
        <OrganicExactV0Frame />

        {/* PMD_ORGANIC_USES_REAL_GOLD_TOOLBAR_FIXED_20260608 */}
        <div
          data-pmd-organic-real-toolbar="1"
          style={{
            "--theme-surface": "#f5fff8af0",
            "--theme-border": "#ded3bd",
            "--theme-text-primary": "#343529",
            "--theme-text-secondary": "#716f5e",
            "--theme-primary": "#b88940",
            "--theme-accent": "#b88940",
            "--pmd-v2-page-bg": "#f5fff8af0",
          } as React.CSSProperties}
        >
          <OrganicBottomDock {...themeMenuActions} />
        </div>
        {/* PMD_ORGANIC_USES_REAL_GOLD_TOOLBAR_FIXED_END_20260608 */}


        {!shouldHideCartSheet && (
          <CartSheet />
        )}

        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => { setPaymentModalOpen(false); setPaymentModalPreferPersonalReview(false) }}
          items={items}
          tableInfo={tableInfo}
          existingOrderId={activeExistingOrderId}
          pendingSummary={activePendingSummary}
          initialSubmittedOrder={activeSubmittedOrder}
          initialCheckoutStep={paymentModalInitialStep}
          preferPersonalReview={paymentModalPreferPersonalReview}
          checkoutVisualTheme="organic_botanical_paper"
          onCartPricingUpdate={setToolbarPricingSnapshot}
          onOpenOrderUpdate={(snapshot) => {
            if (snapshot?.status === "draft" || snapshot?.draft_id) {
              setSharedTableOrder(snapshot)
              return
            }
            if (snapshot?.paymentStatus === "paid" || snapshot?.status === "paid") {
              const normalizedPaid = snapshot?.orderId ? snapshot : { ...snapshot, orderId: snapshot?.order_id }
              setLocalOpenOrder(normalizedPaid)
              setHasLocalOpenOrder(!!normalizedPaid?.orderId)
              setSharedTableOrder((prev) => prev?.order_id && String(prev.order_id) === String(normalizedPaid?.orderId) ? { ...prev, status: "paid", paymentStatus: "paid" } as any : prev)
              return
            }
            if (snapshot?.orderId || snapshot?.order_id) {
              const normalized = snapshot?.orderId ? snapshot : { ...snapshot, orderId: snapshot.order_id }
              setLocalOpenOrder(normalized)
              setHasLocalOpenOrder(true)
              setSharedTableOrder((prev) => prev?.draft_id ? null : prev)
            }
          }}
        />

        <OrganicBotanicalWaiterDialog
          isOpen={isWaiterConfirmOpen}
          onOpenChange={setWaiterConfirmOpen}
          tableId={tableIdString}
        />

        <OrganicBotanicalNoteDialog
          isOpen={isNoteModalOpen}
          onOpenChange={setNoteModalOpen}
          note={note}
          setNote={setNote}
          onSend={handleSendNote}
        />
      </div>
      </ThemeActionBoundary>
    )
  }

  return (
    <ThemeActionBoundary actions={themeMenuActions}>
        <div className={`${isOrganicBotanicalTheme ? 'pmd-organic-menu' : ''} relative min-h-screen w-full bg-theme-background pb-32`} style={isOrganicBotanicalTheme ? organicBotanicalVars() : undefined}>
      {isOrganicBotanicalTheme ? (
        <OrganicBotanicalHero restaurantName={restaurantDisplayName} tableNumber={displayTableNumber} heroItem={heroItem} />
      ) : (
        <header className="py-8">
          <div className="max-w-4xl mx-auto px-4">
            <Logo tableNumber={displayTableNumber} />
          </div>
        </header>
      )}
      <Suspense fallback={<LoadingSpinner />}>
        <main className={`${isOrganicBotanicalTheme ? 'mx-auto max-w-4xl pt-5' : 'max-w-4xl mx-auto'}`}>
          {showVirtualHighlightSections && menuHighlightSettings.section_placement === 'top' && (
            <>
        <OrganicBotanicalCheckoutScopedStyles />
        <OrganicBotanicalValetFeature />
              <MenuHighlightSection title="Chef’s Recommendations" subtitle="Hand-picked favorites from the kitchen." items={chefRecommendationItems} settings={menuHighlightSettings} onSelect={handleItemSelect} onFirstAdd={handleFirstAdd} organic={isOrganicBotanicalTheme} onOrganicAdd={handleOrganicAdd} />
              <MenuHighlightSection title="Best Sellers" subtitle="Popular picks from recent orders." items={bestsellerItems} settings={menuHighlightSettings} onSelect={handleItemSelect} onFirstAdd={handleFirstAdd} organic={isOrganicBotanicalTheme} onOrganicAdd={handleOrganicAdd} />
            </>
          )}
          {isOrganicBotanicalTheme ? (
            <OrganicBotanicalCategoryNav
              categories={allCategories}
              selectedCategory={selectedCategory || "All"}
              onSelectCategory={(category) => {
                setSelectedCategory(category || "All");
              }}
            />
          ) : (
            <CategoryNav
              categories={allCategories}
              selectedCategory={selectedCategory || "All"} // Force "All" if no selection
              onSelectCategory={(category) => {
                setSelectedCategory(category);
                // Auto-select "All" if no category is passed
                if (!category) {
                  setSelectedCategory("All");
                }
              }}
            />
          )}
          {showVirtualHighlightSections && menuHighlightSettings.section_placement === 'after_categories' && (
            <>
              <MenuHighlightSection title="Chef’s Recommendations" subtitle="Hand-picked favorites from the kitchen." items={chefRecommendationItems} settings={menuHighlightSettings} onSelect={handleItemSelect} onFirstAdd={handleFirstAdd} organic={isOrganicBotanicalTheme} onOrganicAdd={handleOrganicAdd} />
              <MenuHighlightSection title="Best Sellers" subtitle="Popular picks from recent orders." items={bestsellerItems} settings={menuHighlightSettings} onSelect={handleItemSelect} onFirstAdd={handleFirstAdd} organic={isOrganicBotanicalTheme} onOrganicAdd={handleOrganicAdd} />
            </>
          )}
          <section className="w-full mb-12">
            {!isFrontendConfigured && filteredItems.length === 0 ? (
              <TenantSetupSplash />
            ) : (
            <>
            {isOrganicBotanicalTheme && (
              <div className="organic-menu-section-heading px-4 pb-5 text-center">
                <div className="mx-auto mb-2 flex w-fit items-center gap-2 text-[var(--organic-accent)]" aria-hidden="true"><span className="h-px w-9 bg-current" /><span className="text-lg">☘</span><span className="h-px w-9 bg-current" /></div>
                <h2 className="font-serif text-3xl uppercase tracking-[0.18em] text-[var(--organic-text)]">{selectedCategory || 'Seasonal'}</h2>
                <p className="mt-1 font-serif text-sm text-[var(--organic-muted)]">Inspired by what’s fresh right now.</p>
              </div>
            )}
            <div className={`${isOrganicBotanicalTheme ? 'grid grid-cols-1 gap-4 px-4 md:grid-cols-2' : 'grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-8 px-4'}`}>
              {filteredItems.map((item: MenuItem, index: number) => (
                isOrganicBotanicalTheme ? (
                  <OrganicBotanicalMenuCard
                    key={item.id}
                    item={item}
                    onSelect={handleItemSelect}
                    onAdd={(event) => handleOrganicAdd(item, event)}
                    highlightSettings={menuHighlightSettings}
                  />
                ) : (
                  <ExpandingToolbarMenuItemCard
                    key={item.id}
                    item={item}
                    onSelect={handleItemSelect}
                    onFirstAdd={() => handleFirstAdd(item)}
                    prioritizeImage={index < 4}
                    highlightSettings={menuHighlightSettings}
                  />
                )
              ))}
            </div>
            </>
            )}
          </section>
        </main>
      </Suspense>

      {/* Button Animation Styles */}
      <style jsx global>{`
        .pmd-organic-menu {
          background:
            radial-gradient(circle at 12% 8%, rgba(255,249,239,.95), transparent 28%),
            radial-gradient(circle at 88% 12%, rgba(184,134,75,.10), transparent 24%),
            linear-gradient(180deg, var(--organic-bg), #EFE6D5 42%, #F7F1E7 76%, var(--organic-bg));
          color: var(--organic-text);
        }
        .pmd-organic-menu:before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: .18;
          background-image: radial-gradient(rgba(74,65,46,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.38), transparent 35%, rgba(110,94,64,.08));
          background-size: 13px 13px, 100% 100%;
          z-index: 0;
        }
        .pmd-organic-menu > * { position: relative; z-index: 1; }
        .pmd-organic-menu .organic-highlight-section:before,
        .pmd-organic-menu .organic-menu-section-heading:before {
          content: "";
          display: block;
          width: min(560px, 92vw);
          height: 22px;
          margin: 0 auto 8px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(115,122,85,.16), transparent 68%);
        }
        .pmd-organic-menu .toolbar-inner-fixed,
        .pmd-organic-menu .fixed.bottom-\[1\.35rem\] > div {
          border-color: rgba(115, 122, 85, 0.20) !important;
          background: color-mix(in srgb, var(--organic-surface) 92%, transparent) !important;
          box-shadow: 0 18px 45px rgba(66,55,35,0.16) !important;
          border-radius: 1.75rem !important;
        }
        @keyframes btn-bounce {
          0% { transform: scale(1); }
          40% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .btn-animate {
          animation: btn-bounce 0.7s cubic-bezier(0.4, 2, 0.6, 1);
        }

        .btn-glow {
          box-shadow: 0 0 0 8px rgba(255, 228, 181, 0.5), 0 0 16px 4px rgba(200, 155, 108, 0.3);
        }
      `}</style>

      {/* Rest of the components */}
      <GoldBottomDock {...themeMenuActions} />
      {!shouldHideCartSheet && (
      <CartSheet />
      )}
      <MenuItemModal item={selectedItem} onClose={() => setSelectedItem(null)} highlightSettings={menuHighlightSettings} />
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => { setPaymentModalOpen(false); setPaymentModalPreferPersonalReview(false) }}
        items={items}
        tableInfo={tableInfo}
        existingOrderId={activeExistingOrderId}
        pendingSummary={activePendingSummary}
        initialSubmittedOrder={activeSubmittedOrder}
        initialCheckoutStep={paymentModalInitialStep}
        preferPersonalReview={paymentModalPreferPersonalReview}
        checkoutVisualTheme={isOrganicBotanicalTheme ? "organic_botanical_paper" : "gold-luxury"}
        onCartPricingUpdate={setToolbarPricingSnapshot}
        onOpenOrderUpdate={(snapshot) => {
          if (snapshot?.status === "draft" || snapshot?.draft_id) {
            setSharedTableOrder(snapshot)
            return
          }
          if (snapshot?.paymentStatus === "paid" || snapshot?.status === "paid") {
            const normalizedPaid = snapshot?.orderId ? snapshot : { ...snapshot, orderId: snapshot?.order_id }
            setLocalOpenOrder(normalizedPaid)
            setHasLocalOpenOrder(!!normalizedPaid?.orderId)
            setSharedTableOrder((prev) => prev?.order_id && String(prev.order_id) === String(normalizedPaid?.orderId) ? { ...prev, status: "paid", paymentStatus: "paid" } as any : prev)
            return
          }
          if (snapshot?.orderId || snapshot?.order_id) {
            const normalized = snapshot?.orderId ? snapshot : { ...snapshot, orderId: snapshot.order_id }
            setLocalOpenOrder(normalized)
            setHasLocalOpenOrder(true)
            setSharedTableOrder((prev) => prev?.draft_id ? null : prev)
          }
        }}
      />
      <EnhancedWaiterDialog
        isOpen={isWaiterConfirmOpen}
        onOpenChange={setWaiterConfirmOpen}
        tableId={tableIdString}
        tableName={tableName}
      />
      <EnhancedNoteDialog
        isOpen={isNoteModalOpen}
        onOpenChange={setNoteModalOpen}
        note={note}
        setNote={setNote}
        onSend={handleSendNote}
        tableId={tableIdString}
        tableName={tableName}
      />
    </div>
    </ThemeActionBoundary>
  )
}

// Main component with Suspense wrapper
export default function ExpandingBottomToolbarMenu() {
  // PMD_MENU_FOOTER_LOGO_RUNTIME_CALL_FINAL_20260611
  useEffect(() => {
    return pmdInstallMenuPayMyDineFooterLogo()
  }, [])

  return (
    <div className="pmd-customer-page page--menu" data-pmd-customer-page="menu">
      <Suspense fallback={<div>Loading...</div>}>
        <MenuContent />
      </Suspense>
    </div>
  )
}

// PMD_ADD_KAZEN_TABLE_ORDER_BOTTOM_BUTTON_FIXED_20260613 menu patched

// PMD_FIX_KAZEN_PARENT_DEEP_CATEGORY_EXTRACT_20260613

// PMD_FIX_KAZEN_CATEGORY_ORDER_HARD_20260613

// PMD_FIX_KAZEN_BACKEND_CATEGORIES_ONLY_20260613
