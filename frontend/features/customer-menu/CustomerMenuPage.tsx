"use client"

/*
 * LEGACY_DOM_REPAIR_POLICY:
 * This file is the lifted customer-menu implementation from the former app/menu route.
 * Remaining MutationObserver/querySelector/style.setProperty usage is legacy checkout,
 * theme-resolution, footer-logo, and Kazen standalone visibility repair code; bottom dock
 * injection is not allowed and has been removed. Those remaining repairs are kept to avoid
 * changing checkout/payment/table-order behavior in this route move. Future cleanup should
 * replace them from focused files such as CustomerMenuModals, checkout theme shells,
 * and a Kazen standalone controller/CSS module.
 */
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
import { HandPlatter, NotebookPen, ShoppingCart, ChevronDown, Plus, Wallet, Lock, Users, Check, Minus, CreditCard, ArrowLeft, CheckCircle, DollarSign, ReceiptText, ArrowRight, Star, Link2, QrCode, MessageSquare, ChefHat, Trophy } from "lucide-react";
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
import {
  OrganicCheckoutScopedStyles,
  organicCheckoutBodyStyle,
  organicCheckoutHeaderStyle,
  organicCheckoutModalStyle,
  organicCheckoutPrimaryButtonStyle,
} from "@/components/themes/organic-botanical-paper/OrganicCheckoutShell";
import { ThemeActionBoundary } from "@/components/themes/shared/ThemeActionBoundary";
import { KazenBottomDock } from "@/components/themes/kazen-japanese/KazenBottomDock";
import { ModernGreenBottomDock } from "@/components/themes/modern-green/ModernGreenBottomDock";
import { OrganicBottomDock } from "@/components/themes/organic-botanical-paper/OrganicBottomDock";
import { GoldBottomDock } from "@/components/themes/gold-luxury/GoldBottomDock";
import { CheckoutIconFrame, CheckoutStepCard, CheckoutSummaryCard, OrderStatusCard, PaymentCardFrame, PaymentMethodTile, SplitBillPanel, SplitMethodButton, ThemedButton, ThemedInput, TipCouponPanel } from "@/components/theme-ui";
import { useTableOrderDraft } from "@/features/table-order/use-table-order-draft";
import { useTableOrderActions } from "@/features/table-order/use-table-order-actions";
import { useCustomerThemeActions } from "@/features/customer-menu/useCustomerThemeActions";
import { useCustomerThemeSelection } from "@/features/customer-menu/useCustomerThemeSelection";
import { PaymentModal } from "@/features/customer-menu/checkout/CheckoutModalHost";
import { pmdBuildKazenParentCategories } from "@/features/customer-menu/data/menuCategories";
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

import { clsx } from "clsx";
import { apiClient } from '@/lib/api-client'
import { wsClient } from '@/lib/websocket-client'
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
      const isTableOrderButton =
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
  const { themeId: currentFrontendTheme, isResolved: isFrontendThemeResolved } = useCurrentFrontendTheme()
  const [forceModernGreenTheme, setForceModernGreenTheme] = useState(false)
  const { isOrganicBotanicalTheme, isModernGreenTheme, isKazenJapaneseTheme } = useCustomerThemeSelection(currentFrontendTheme, forceModernGreenTheme)

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
  const totalPrice = toolbarPricingSnapshot?.total ?? (rawSubtotalPrice + rawTaxAmount)

  // Show arrow if at least one item and not collapsed
  useEffect(() => {
    if (items.length === 0 && toolbarPricingSnapshot) setToolbarPricingSnapshot(null)
  }, [items.length, toolbarPricingSnapshot])

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

  const themeMenuActions = useCustomerThemeActions({
    addToCart,
    handleFirstAdd,
    handleCartClick,
    setPaymentModalInitialStep,
    setPaymentModalOpen,
    sharedTableOrder,
    handleWaiterClick,
    handleNoteClick,
    tableIdString,
    totalItems,
    tableOrderActionCount,
    shouldShowTableOrderAction,
    displayTableNumber,
    language,
  })


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
            btn.matches(".pmd-v2-action-circle, .quantity-btn, [data-pmd-order-status-back='1']")
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
            btn.matches(".pmd-v2-action-circle, .quantity-btn, [data-pmd-order-status-back='1']")

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
export default function PayMyDineMenuPage() {
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
