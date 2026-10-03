"use client"

import { ThemeActionBoundary } from "@/components/themes/shared/ThemeActionBoundary"
import { KazenJapaneseBridgeTheme } from "@/components/themes/kazen-japanese"
import { KazenBottomDock } from "@/components/themes/kazen-japanese/KazenBottomDock"
import { PaymentModal } from "@/features/customer-menu/checkout/CheckoutModalHost"
import { pmdBuildKazenParentCategories } from "@/features/customer-menu/data/menuCategories"
import type { MenuItem } from "@/lib/data"
import type { KazenThemeRouteProps } from "@/features/customer-menu/theme/themeRouteTypes"
import { createOpenOrderUpdateHandler } from "@/features/customer-menu/theme/themeRouteShared"
import { isValetFeatureEnabled } from "@/features/valet/valet-config"
type KazenValetValues = { name?: string; licensePlate?: string; license_plate?: string; carModel?: string; car_make?: string }
const getKazenErrorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback

type KazenMenuLayoutMode = "accordion" | "tabs"

function normalizeKazenMenuLayoutMode(value: unknown): KazenMenuLayoutMode {
  const raw = String(value || "").trim().toLowerCase().replace(/[_\s-]+/g, "-")

  if ([
    "tabs",
    "tab",
    "tabbed",
    "classic",
    "normal",
    "list",
    "flat",
    "category-tabs",
    "categories-top",
    "top-categories",
    "category-tabs-full-item-list",
  ].includes(raw)) {
    return "tabs"
  }

  return "accordion"
}

function readKazenMenuLayoutMode(...sources: any[]): KazenMenuLayoutMode {
  const keys = [
    "kazen_menu_layout",
    "kazenMenuLayout",
    "menu_layout",
    "menuLayout",
    "food_display_style",
    "foodDisplayStyle",
    "category_display",
    "categoryDisplay",
  ]

  for (const source of sources) {
    if (!source || typeof source !== "object") continue

    for (const key of keys) {
      const direct = source?.[key]
      if (direct !== undefined && direct !== null && String(direct).trim()) {
        return normalizeKazenMenuLayoutMode(direct)
      }

      const data = source?.data?.[key]
      if (data !== undefined && data !== null && String(data).trim()) {
        return normalizeKazenMenuLayoutMode(data)
      }

      const settings = source?.settings?.[key]
      if (settings !== undefined && settings !== null && String(settings).trim()) {
        return normalizeKazenMenuLayoutMode(settings)
      }
    }
  }

  return "accordion"
}


export function KazenThemeRoute(props: KazenThemeRouteProps) {
  const {
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
    normalizeModernGreenLogoUrl,
  } = props

  const handleOpenOrderUpdate = createOpenOrderUpdateHandler({
    setSharedTableOrder,
    setLocalOpenOrder,
    setHasLocalOpenOrder,
  })

  const kazenSrc =
    typeof window !== "undefined"
      ? `/themes/kazen-japanese/?embedded=1&from=pmd&${window.location.search.replace(/^\?/, "")}`
      : "/themes/kazen-japanese/?embedded=1&from=pmd"

  const kazenSourceItems = apiMenuItems.length ? apiMenuItems : (menuItems.length ? menuItems : menuData)
  const kazenBridgeCategories = pmdBuildKazenParentCategories(allCategories, kazenSourceItems)
  const kazenTableNumber = tableInfo?.table_no ?? tableInfo?.table_id ?? displayTableNumber ?? tableIdString ?? null

  const kazenLogoCandidates = [
    cmsSettings?.effectiveLogoUrl,
    cmsSettings?.logoUrl,
    cmsSettings?.logo_url,
    cmsSettings?.logo,
    cmsSettings?.restaurantLogoUrl,
    cmsSettings?.restaurant_logo,
    cmsSettings?.site_logo,
    cmsSettings?.header_logo,
    cmsSettings?.frontend_logo,
    cmsSettings?.business_logo,
    cmsSettings?.brand_logo,
    cmsSettings?.data?.effectiveLogoUrl,
    cmsSettings?.data?.logoUrl,
    cmsSettings?.data?.logo_url,
    cmsSettings?.data?.logo,
    cmsSettings?.data?.restaurant_logo,
    merchantSettings?.effectiveLogoUrl,
    merchantSettings?.logoUrl,
    merchantSettings?.logo_url,
    merchantSettings?.logo,
    merchantSettings?.restaurantLogoUrl,
    merchantSettings?.restaurant_logo,
    merchantSettings?.site_logo,
    merchantSettings?.header_logo,
    merchantSettings?.frontend_logo,
    merchantSettings?.business_logo,
    merchantSettings?.brand_logo,
    merchantSettings?.data?.effectiveLogoUrl,
    merchantSettings?.data?.logoUrl,
    merchantSettings?.data?.logo_url,
    merchantSettings?.data?.logo,
    merchantSettings?.data?.restaurant_logo,
  ]

  const kazenLogoUrl = normalizeModernGreenLogoUrl(
    kazenLogoCandidates.find((value: unknown) => String(value || "").trim()) || ""
  )

  const kazenMenuLayout = readKazenMenuLayoutMode(
    cmsSettings,
    merchantSettings,
    typeof window !== "undefined" ? (window as any).__PMD_THEME_SETTINGS : null,
    typeof window !== "undefined" ? (window as any).__PMD_ADMIN_THEME_SETTINGS : null
  )
  const showValet = isValetFeatureEnabled(cmsSettings, merchantSettings, tableInfo)


  const handleKazenAdd = (item: MenuItem, quantity = 1) => {
    let itemToAdd: MenuItem = { ...item }

    if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
      itemToAdd.price = Number(item.price || 0) / (1 + taxSettings.percentage / 100)

      if (itemToAdd.options) {
        itemToAdd.options = itemToAdd.options.map((option: NonNullable<MenuItem["options"]>[number]) => ({
          ...option,
          values: (option.values || []).map((value: NonNullable<NonNullable<MenuItem["options"]>[number]["values"]>[number]) => ({
            ...value,
            price: Number(value.price || 0) / (1 + taxSettings.percentage / 100),
          })),
        }))
      }
    }

    const currentQuantity = items.find((cartItem: { item: MenuItem }) => cartItem.item.id === item.id)?.quantity || 0
    addToCart(itemToAdd, quantity)
    if (currentQuantity === 0) handleFirstAdd(item)
  }

  const handleKazenWaiter = async () => {
    const resolvedTableId = tableInfo?.table_id || tableInfo?.table_no || tableIdString || "delivery"

    try {
      await apiClient.callWaiter(String(resolvedTableId), ".")
      toast({ title: "Waiter called", description: "The team has been notified." })
    } catch (error: unknown) {
      toast({
        title: "Waiter call failed",
        description: getKazenErrorMessage(error, "Failed to call waiter."),
        variant: "destructive",
      })
    }
  }

  const handleKazenNote = async (rawNote = "") => {
    const resolvedTableId = tableInfo?.table_id || tableInfo?.table_no || tableIdString || "delivery"
    const trimmedNote = String(rawNote || "").trim()

    if (!trimmedNote) {
      props.setNoteModalOpen?.(true)
      return
    }

    try {
      await apiClient.callTableNote(String(resolvedTableId), trimmedNote, new Date().toISOString())
      toast({ title: "Note sent", description: "Your note was sent to the team." })
    } catch (error: unknown) {
      toast({
        title: "Note failed",
        description: getKazenErrorMessage(error, "Failed to send note."),
        variant: "destructive",
      })
    }
  }

  const handleKazenValet = async (values: KazenValetValues = {}) => {
    // PMD_AUDIT_PHASE2_VALET_CLIENT_GUARD
    const name = String(values?.name || "Guest").trim() || "Guest"
    const licensePlate = String(values?.licensePlate || values?.license_plate || "").trim()
    const carModel = String(values?.carModel || values?.car_make || "Not provided").trim() || "Not provided"

    if (!licensePlate) {
      toast({
        title: "Valet ticket required",
        description: "Please enter your valet ticket number or license plate before requesting your car.",
        variant: "destructive",
      })
      return
    }

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
    } catch (error: unknown) {
      toast({
        title: "Valet request failed",
        description: getKazenErrorMessage(error, "Failed to submit valet request."),
        variant: "destructive",
      })
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
        menuLayout={kazenMenuLayout} showValet={showValet}
        onAddItem={handleKazenAdd}
        onOpenItem={(item: MenuItem) => handleItemSelect(item)}
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
        {/* PMD_KAZEN_HIDE_PARENT_DOCK_USE_INNER_DOCK_20260617
            The embedded Kazen iframe has the working Japanese dock.
            Parent dock is hidden to avoid duplicate/blocked action bars. */}
        {false && <KazenBottomDock {...themeMenuActions} />}

        {/* PMD_AUDIT_PHASE4_V3_MODAL_SYNC_PROPS */}
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false)
            setPaymentModalPreferPersonalReview(false)
          }}
          items={items}
          tableInfo={tableInfo}
          existingOrderId={activeExistingOrderId}
          pendingSummary={activePendingSummary}
          initialSubmittedOrder={activeSubmittedOrder}
          initialCheckoutStep={paymentModalInitialStep}
          preferPersonalReview={paymentModalPreferPersonalReview}
          checkoutVisualTheme="kazen_japanese"
          onCartPricingUpdate={setToolbarPricingSnapshot}
          onOpenOrderUpdate={handleOpenOrderUpdate}
        />
      </KazenJapaneseBridgeTheme>
    </ThemeActionBoundary>
  )
}
