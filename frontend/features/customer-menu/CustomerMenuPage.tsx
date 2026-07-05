// PMD_SAFETY_NOTE:
// CustomerMenuPage is currently the customer-menu controller/orchestrator.
// Theme UI has been extracted into theme route files.
// Future cleanup should extract table context, menu loading, checkout state, and guest session into hooks.

"use client"

import "./customer-menu-page.css"
/*
 * LEGACY_DOM_REPAIR_POLICY:
 * This file is the lifted customer-menu implementation from the former app/menu route.
 * Remaining MutationObserver/querySelector/style.setProperty usage is legacy checkout,
 * theme-resolution, and Kazen standalone visibility repair code; bottom dock
 * injection is not allowed and has been removed. Those remaining repairs are kept to avoid
 * changing checkout/payment/table-order behavior in this route move. Future cleanup should
 * replace them from focused files such as CustomerMenuModals, checkout theme shells,
 * and a Kazen standalone controller/CSS module.
 */

import React, { useState, useEffect, useRef, Suspense } from "react";
import { categories, menuData, type MenuItem, type MenuHighlightSettings, defaultMenuHighlightSettings } from "@/lib/data";
import { useLanguageStore } from "@/store/language-store";
import { useCmsConfigStore } from "@/store/cms/cms-config-store";
import { usePaymentSettingsStore } from "@/store/cms/payment-settings-store";
import { useTaxSettingsStore } from "@/store/cms/tax-settings-store";
import { useCartStore, type CartItem } from "@/store/cart-store";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams } from "next/navigation";
import { useTableOrderDraft } from "@/features/table-order/use-table-order-draft";
import { useCustomerThemeActions } from "@/features/customer-menu/useCustomerThemeActions";
import { useCustomerThemeSelection } from "@/features/customer-menu/useCustomerThemeSelection";
import { useCurrentFrontendTheme } from "@/features/customer-menu/theme/useCurrentFrontendTheme";
import { CustomerMenuThemeRoutes } from "@/features/customer-menu/CustomerMenuThemeRoutes";
import { useCustomerMenuDerivedData } from "@/features/customer-menu/hooks/useCustomerMenuDerivedData";
import { useCustomerLocalOpenOrderHydration } from "@/features/customer-menu/hooks/useCustomerLocalOpenOrderHydration";
import { useCustomerMenuFooterLogoVisibility } from "@/features/customer-menu/hooks/useCustomerMenuFooterLogoVisibility";
import { useCheckoutState } from "@/features/customer-menu/hooks/useCheckoutState";
import { useGuestSession } from "@/features/customer-menu/hooks/useGuestSession";
import { useMenuLoader } from "@/features/customer-menu/hooks/useMenuLoader";
import { useTableQrContext } from "@/features/customer-menu/hooks/useTableQrContext";
import { useOrganicThemeEffects } from "@/features/customer-menu/theme/useOrganicThemeEffects";
import { useCustomerMenuThemeBootstrap } from "@/features/customer-menu/theme/useCustomerMenuThemeBootstrap";
import { LoadingSpinner } from "@/features/customer-menu/components/LoadingSpinner";
import { isValetFeatureEnabled } from "@/features/valet/valet-config";

// Hook to get current theme background color
/* PMD_REMOTE_CONSOLE_INJECTED */

import { apiClient } from '@/lib/api-client'

// They avoid shared Dialog/global CSS so Gold Luxury and other themes keep their existing modal behavior.
// Create a component that uses useSearchParams
function MenuContent() {
  const searchParams = useSearchParams()
  const [isClient, setIsClient] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>("All") // Initialize with "All"
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [lastInteractedItem, setLastInteractedItem] = useState<CartItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFrontendConfigured, setIsFrontendConfigured] = useState(true)
  const [apiMenuItems, setApiMenuItems] = useState<MenuItem[]>([])
  const [menuHighlightSettings, setMenuHighlightSettings] = useState<MenuHighlightSettings>(defaultMenuHighlightSettings)
  const [dynamicCategories, setDynamicCategories] = useState<string[]>([])
  const { menuItems, settings: cmsSettings } = useCmsConfigStore()
  const { taxSettings, loadVATSettings } = useTaxSettingsStore()
  const { merchantSettings } = usePaymentSettingsStore()

  const { items, toggleCart, addToCart, setTableInfo, clearTableContext, clearCart } = useCartStore()
  const {
    isPaymentModalOpen,
    setPaymentModalOpen,
    paymentModalInitialStep,
    setPaymentModalInitialStep,
    paymentModalPreferPersonalReview,
    setPaymentModalPreferPersonalReview,
    setToolbarPricingSnapshot,
    totalItems,
    totalPrice,
  } = useCheckoutState({ items, taxSettings })
  const { themeId: currentFrontendTheme, isResolved: isFrontendThemeResolved } = useCurrentFrontendTheme()
  const [forceModernGreenTheme, setForceModernGreenTheme] = useState(false)
  const { isOrganicBotanicalTheme, isModernGreenTheme, isKazenJapaneseTheme, isVelvetTerracottaTheme } = useCustomerThemeSelection(currentFrontendTheme, forceModernGreenTheme)
  const shouldHoldThemeRender = !isFrontendThemeResolved && !forceModernGreenTheme
  const { t, language } = useLanguageStore()
  const { toast } = useToast()
  const [isNoteModalOpen, setNoteModalOpen] = useState(false)
  const [isWaiterConfirmOpen, setWaiterConfirmOpen] = useState(false)
  const [note, setNote] = useState("")
  const [tableInfo, setTableInfoState] = useState<any>(null)
  const [existingOrderId, setExistingOrderId] = useState<number | null>(null)
  const [pendingSettlementSummary, setPendingSettlementSummary] = useState<{ orderTotal: number; settledAmount: number; remainingAmount: number } | null>(null)
  const [hasLocalOpenOrder, setHasLocalOpenOrder] = useState(false)
  const [localOpenOrder, setLocalOpenOrder] = useState<any | null>(null)
  const {
    sharedTableOrderQr,
    sharedTableOrderContext,
    tableIdString,
    tableName,
    displayTableNumber,
  } = useTableQrContext({
    searchParams,
    tableInfo,
    setTableInfoState,
  })
  const { tableDraft: sharedTableOrder, setTableDraft: setSharedTableOrder } = useTableOrderDraft({
    context: sharedTableOrderContext,
    enabled: Boolean(tableInfo?.table_id || tableInfo?.table_no),
    pollIntervalMs: 12000,
  })
  const hydratedPendingOrderRef = useRef<number | null>(null)
  const {
    hasDraftTableOrderWithoutRealOrder,
    activeExistingOrderId,
    activePendingSummary,
    activeSubmittedOrder,
    shouldHideCartSheet,
    shouldShowTableOrderAction,
    tableOrderActionCount,
  } = useGuestSession({
    sharedTableOrder,
    tableInfo,
    existingOrderId,
    setExistingOrderId,
    pendingSettlementSummary,
    setPendingSettlementSummary,
    localOpenOrder,
    setLocalOpenOrder,
    hasLocalOpenOrder,
    setHasLocalOpenOrder,
    paymentModalInitialStep,
    items,
  })

  const shouldShowPayMyDineFooterLogo = useCustomerMenuFooterLogoVisibility({ isModernGreenTheme, isOrganicBotanicalTheme })
  const showValet = isValetFeatureEnabled(cmsSettings, merchantSettings, tableInfo)

  useCustomerMenuThemeBootstrap(setForceModernGreenTheme)

  useMenuLoader({
    searchParams,
    apiMenuItems,
    selectedCategory,
    setSelectedCategory,
    setIsLoading,
    setIsFrontendConfigured,
    setApiMenuItems,
    setMenuHighlightSettings,
    setDynamicCategories,
    setTableInfoState,
    setTableInfo,
    clearCart,
    setPaymentModalOpen,
    setExistingOrderId,
    setPendingSettlementSummary,
    setLocalOpenOrder,
    setHasLocalOpenOrder,
    hydratedPendingOrderRef,
    existingOrderId,
    loadVATSettings,
  })

  // Add "All" to categories - FIXED VERSION
  const {
    allCategories,
    filteredItems,
    highlightSourceItems,
    chefRecommendationItems,
    bestsellerItems,
    showVirtualHighlightSections,
  } = useCustomerMenuDerivedData({
    apiMenuItems,
    taxSettings,
    menuData,
    menuItems,
    dynamicCategories,
    selectedCategory,
    menuHighlightSettings,
  })

  const handleFirstAdd = React.useCallback((item: MenuItem) => {
    const cartItem = useCartStore.getState().items.find((entry) => entry.item.id === item.id)
    setLastInteractedItem(cartItem || { item, quantity: 1 })
  }, [])

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
    showValet,
  })

  // Native Organic Botanical handles menu actions directly; no parent frame bridge is installed.
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

  useCustomerLocalOpenOrderHydration({
    tableInfo,
    searchParams,
    existingOrderId,
    setExistingOrderId,
    hasDraftTableOrderWithoutRealOrder,
    setHasLocalOpenOrder,
    setLocalOpenOrder,
  })

  useOrganicThemeEffects({
    enabled: isOrganicBotanicalTheme,
    tableIdString,
    shouldShowTableOrderAction,
    sharedTableOrder,
    handleWaiterClick,
    handleNoteClick,
    handleCartClick,
    setPaymentModalInitialStep,
    setPaymentModalOpen,
    addToCart,
    handleFirstAdd,
    toast,
  })

  if (!isClient) {
    return <LoadingSpinner />
  }

  const restaurantDisplayName = merchantSettings?.businessName || cmsSettings?.appName || 'PayMyDine'

  if (shouldHoldThemeRender || (isLoading && apiMenuItems.length === 0 && menuItems.length === 0)) {
    return (
      <div
        className="pmd-customer-page page--menu relative min-h-screen w-full"
        data-pmd-theme-loading="1"
        data-pmd-menu-loading-skeleton="1"
        style={{ background: "#fbf8f2", color: "#343529" }}
      >
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-5 px-5 py-6 sm:px-8">
          <div className="flex items-center justify-between">
            <div className="h-10 w-32 animate-pulse rounded-full bg-black/10" />
            <div className="h-9 w-24 animate-pulse rounded-full bg-black/10" />
          </div>
          <div className="h-44 animate-pulse rounded-[2rem] bg-black/10" />
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2, 3].map((idx) => (
              <div key={idx} className="h-10 min-w-28 animate-pulse rounded-full bg-black/10" />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="h-48 animate-pulse rounded-[1.6rem] bg-black/10" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <CustomerMenuThemeRoutes
      {...{
        isKazenJapaneseTheme,
        isVelvetTerracottaTheme,
        isModernGreenTheme,
        isOrganicBotanicalTheme,
        shouldShowPayMyDineFooterLogo,
        apiMenuItems,
        menuItems,
        menuData,
        allCategories,
        tableInfo,
        displayTableNumber,
        tableIdString,
        cmsSettings,
        merchantSettings,
        taxSettings,
        items,
        totalItems,
        totalPrice,
        lastInteractedItem,
        restaurantDisplayName,
        themeMenuActions,
        addToCart,
        handleFirstAdd,
        toast,
        apiClient,
        handleItemSelect,
        handleCartClick,
        shouldShowTableOrderAction,
        setPaymentModalInitialStep,
        sharedTableOrder,
        setPaymentModalPreferPersonalReview,
        setPaymentModalOpen,
        tableOrderActionCount,
        isPaymentModalOpen,
        activeExistingOrderId,
        activePendingSummary,
        activeSubmittedOrder,
        paymentModalInitialStep,
        paymentModalPreferPersonalReview,
        setToolbarPricingSnapshot,
        setSharedTableOrder,
        setLocalOpenOrder,
        setHasLocalOpenOrder,
        setNoteModalOpen,
        showVirtualHighlightSections,
        menuHighlightSettings,
        chefRecommendationItems,
        bestsellerItems,
        selectedCategory,
        setSelectedCategory,
        isFrontendConfigured,
        filteredItems,
        selectedItem,
        setSelectedItem,
        shouldHideCartSheet,
        isWaiterConfirmOpen,
        setWaiterConfirmOpen,
        tableName,
        isNoteModalOpen,
        note,
        setNote,
        handleSendNote,
        showValet,

      }}
    />
  )
}

// Main component with Suspense wrapper
export default function PayMyDineMenuPage() {
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
