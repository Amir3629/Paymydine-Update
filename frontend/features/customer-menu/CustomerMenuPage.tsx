"use client"

import { useKazenMenuDomRepairs } from "@/features/customer-menu/legacy-dom-repairs/useKazenMenuDomRepairs";
import "./customer-menu-page.css"
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

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { categories, menuData, type MenuItem, type MenuHighlightSettings, defaultMenuHighlightSettings, getMenuData } from "@/lib/data";
import { useLanguageStore } from "@/store/language-store";
import { useCmsStore } from "@/store/cms-store";
import { useCartStore, type CartItem } from "@/store/cart-store";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams } from "next/navigation";
import { useTableOrderDraft } from "@/features/table-order/use-table-order-draft";
import { useCustomerThemeActions } from "@/features/customer-menu/useCustomerThemeActions";
import { useCustomerThemeSelection } from "@/features/customer-menu/useCustomerThemeSelection";
import { useCurrentFrontendTheme } from "@/features/customer-menu/theme/useCurrentFrontendTheme";
import { ModernGreenThemeRoute } from "@/features/customer-menu/theme/ModernGreenThemeRoute";
import { OrganicThemeRoute } from "@/features/customer-menu/theme/OrganicThemeRoute";
import { KazenThemeRoute } from "@/features/customer-menu/theme/KazenThemeRoute";
import { GoldThemeRoute } from "@/features/customer-menu/theme/GoldThemeRoute";
import { useOrganicThemeEffects } from "@/features/customer-menu/theme/useOrganicThemeEffects";
import { useCustomerMenuThemeBootstrap } from "@/features/customer-menu/theme/useCustomerMenuThemeBootstrap";
import { normalizeMenuLogoUrl } from "@/features/customer-menu/theme/themeRouteShared";
import { pmdInstallMenuPayMyDineFooterLogo } from "@/features/customer-menu/legacy-dom-repairs/footerLogoInstaller";
import { LoadingSpinner } from "@/features/customer-menu/components/LoadingSpinner";
import { buildTableOrderDraftContext, createSubmittedTableOrderSnapshot, isVisibleTableOrderDraft, tableOrderItemCount } from "@/features/table-order/table-order-utils";
import { calculateCartPricingSummary } from "@/features/checkout/checkout-utils";
import type { CheckoutStep, PmdToolbarPricingSnapshot } from "@/features/checkout/types";


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

  useKazenMenuDomRepairs(isKazenJapaneseTheme)

  const shouldHoldThemeRender = !isFrontendThemeResolved && !forceModernGreenTheme
  const { t, language } = useLanguageStore()
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

  useCustomerMenuThemeBootstrap(setForceModernGreenTheme)

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
              const normalizedTableInfo = {
                table_id: String(tableResult.data.table_id ?? tableParam),
                table_name: String(tableResult.data.table_name ?? ""),
                location_id: Number(tableResult.data.location_id ?? 1),
                qr_code: tableResult.data.qr_code ?? null,
                table_no: tableResult.data.table_no != null ? Number(tableResult.data.table_no) : undefined,
              }
              setTableInfoState(normalizedTableInfo)
              setTableInfo(normalizedTableInfo)

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

  // PMD_KAZEN_JAPANESE_THEME_RETURN_20260611
  if (isKazenJapaneseTheme) {
    return (
      <KazenThemeRoute
        apiMenuItems={apiMenuItems}
        menuItems={menuItems}
        menuData={menuData}
        allCategories={allCategories}
        tableInfo={tableInfo}
        displayTableNumber={displayTableNumber}
        tableIdString={tableIdString}
        cmsSettings={cmsSettings}
        merchantSettings={merchantSettings}
        taxSettings={taxSettings}
        items={items}
        totalItems={totalItems}
        totalPrice={totalPrice}
        lastInteractedItem={lastInteractedItem}
        restaurantDisplayName={restaurantDisplayName}
        themeMenuActions={themeMenuActions}
        addToCart={addToCart}
        handleFirstAdd={handleFirstAdd}
        toast={toast}
        apiClient={apiClient}
        handleItemSelect={handleItemSelect}
        handleCartClick={handleCartClick}
        shouldShowTableOrderAction={shouldShowTableOrderAction}
        setPaymentModalInitialStep={setPaymentModalInitialStep}
        sharedTableOrder={sharedTableOrder}
        setPaymentModalPreferPersonalReview={setPaymentModalPreferPersonalReview}
        setPaymentModalOpen={setPaymentModalOpen}
        tableOrderActionCount={tableOrderActionCount}
        isPaymentModalOpen={isPaymentModalOpen}
        activeExistingOrderId={activeExistingOrderId}
        activePendingSummary={activePendingSummary}
        activeSubmittedOrder={activeSubmittedOrder}
        paymentModalInitialStep={paymentModalInitialStep}
        paymentModalPreferPersonalReview={paymentModalPreferPersonalReview}
        setToolbarPricingSnapshot={setToolbarPricingSnapshot}
        setSharedTableOrder={setSharedTableOrder}
        setLocalOpenOrder={setLocalOpenOrder}
        setHasLocalOpenOrder={setHasLocalOpenOrder}
        normalizeModernGreenLogoUrl={normalizeMenuLogoUrl}
        setNoteModalOpen={setNoteModalOpen}
      />
    )
  }

  // Native Modern Green renders inside the main frontend with live PayMyDine data.
  if (isModernGreenTheme) {
    return (
      <ModernGreenThemeRoute
        apiMenuItems={apiMenuItems}
        menuItems={menuItems}
        menuData={menuData}
        allCategories={allCategories}
        tableInfo={tableInfo}
        displayTableNumber={displayTableNumber}
        tableIdString={tableIdString}
        cmsSettings={cmsSettings}
        merchantSettings={merchantSettings}
        taxSettings={taxSettings}
        items={items}
        totalItems={totalItems}
        totalPrice={totalPrice}
        lastInteractedItem={lastInteractedItem}
        restaurantDisplayName={restaurantDisplayName}
        themeMenuActions={themeMenuActions}
        addToCart={addToCart}
        handleFirstAdd={handleFirstAdd}
        toast={toast}
        apiClient={apiClient}
        handleItemSelect={handleItemSelect}
        handleCartClick={handleCartClick}
        shouldShowTableOrderAction={shouldShowTableOrderAction}
        setPaymentModalInitialStep={setPaymentModalInitialStep}
        sharedTableOrder={sharedTableOrder}
        setPaymentModalPreferPersonalReview={setPaymentModalPreferPersonalReview}
        setPaymentModalOpen={setPaymentModalOpen}
        tableOrderActionCount={tableOrderActionCount}
        isPaymentModalOpen={isPaymentModalOpen}
        activeExistingOrderId={activeExistingOrderId}
        activePendingSummary={activePendingSummary}
        activeSubmittedOrder={activeSubmittedOrder}
        paymentModalInitialStep={paymentModalInitialStep}
        paymentModalPreferPersonalReview={paymentModalPreferPersonalReview}
        setToolbarPricingSnapshot={setToolbarPricingSnapshot}
        setSharedTableOrder={setSharedTableOrder}
        setLocalOpenOrder={setLocalOpenOrder}
        setHasLocalOpenOrder={setHasLocalOpenOrder}
        normalizeModernGreenLogoUrl={normalizeMenuLogoUrl}
      />
    )
  }

  // PMD_ORGANIC_V0_ONLY_RETURN_FINAL_20260607
  if (isOrganicBotanicalTheme) {
    return (
      <OrganicThemeRoute
        apiMenuItems={apiMenuItems}
        menuItems={menuItems}
        menuData={menuData}
        allCategories={allCategories}
        restaurantDisplayName={restaurantDisplayName}
        displayTableNumber={displayTableNumber}
        themeMenuActions={themeMenuActions}
        taxSettings={taxSettings}
        addToCart={addToCart}
        handleFirstAdd={handleFirstAdd}
        toast={toast}
        handleItemSelect={handleItemSelect}
        shouldHideCartSheet={shouldHideCartSheet}
        isPaymentModalOpen={isPaymentModalOpen}
        setPaymentModalOpen={setPaymentModalOpen}
        setPaymentModalPreferPersonalReview={setPaymentModalPreferPersonalReview}
        items={items}
        tableInfo={tableInfo}
        activeExistingOrderId={activeExistingOrderId}
        activePendingSummary={activePendingSummary}
        activeSubmittedOrder={activeSubmittedOrder}
        paymentModalInitialStep={paymentModalInitialStep}
        paymentModalPreferPersonalReview={paymentModalPreferPersonalReview}
        setToolbarPricingSnapshot={setToolbarPricingSnapshot}
        setSharedTableOrder={setSharedTableOrder}
        setLocalOpenOrder={setLocalOpenOrder}
        setHasLocalOpenOrder={setHasLocalOpenOrder}
      />
    )
  }

  return (
    <GoldThemeRoute
      themeMenuActions={themeMenuActions}
      displayTableNumber={displayTableNumber}
      showVirtualHighlightSections={showVirtualHighlightSections}
      menuHighlightSettings={menuHighlightSettings}
      chefRecommendationItems={chefRecommendationItems}
      bestsellerItems={bestsellerItems}
      handleItemSelect={handleItemSelect}
      handleFirstAdd={handleFirstAdd}
      allCategories={allCategories}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      isFrontendConfigured={isFrontendConfigured}
      filteredItems={filteredItems}
      selectedItem={selectedItem}
      setSelectedItem={setSelectedItem}
      shouldHideCartSheet={shouldHideCartSheet}
      isPaymentModalOpen={isPaymentModalOpen}
      setPaymentModalOpen={setPaymentModalOpen}
      setPaymentModalPreferPersonalReview={setPaymentModalPreferPersonalReview}
      items={items}
      tableInfo={tableInfo}
      activeExistingOrderId={activeExistingOrderId}
      activePendingSummary={activePendingSummary}
      activeSubmittedOrder={activeSubmittedOrder}
      paymentModalInitialStep={paymentModalInitialStep}
      paymentModalPreferPersonalReview={paymentModalPreferPersonalReview}
      setToolbarPricingSnapshot={setToolbarPricingSnapshot}
      setSharedTableOrder={setSharedTableOrder}
      setLocalOpenOrder={setLocalOpenOrder}
      setHasLocalOpenOrder={setHasLocalOpenOrder}
      isWaiterConfirmOpen={isWaiterConfirmOpen}
      setWaiterConfirmOpen={setWaiterConfirmOpen}
      tableIdString={tableIdString}
      tableName={tableName}
      isNoteModalOpen={isNoteModalOpen}
      setNoteModalOpen={setNoteModalOpen}
      note={note}
      setNote={setNote}
      handleSendNote={handleSendNote}
    />
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
