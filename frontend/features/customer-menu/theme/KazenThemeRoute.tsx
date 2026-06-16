"use client"

import { ThemeActionBoundary } from "@/components/themes/shared/ThemeActionBoundary"
import { KazenJapaneseBridgeTheme } from "@/components/themes/kazen-japanese"
import { KazenBottomDock } from "@/components/themes/kazen-japanese/KazenBottomDock"
import { PaymentModal } from "@/features/customer-menu/checkout/CheckoutModalHost"
import { pmdBuildKazenParentCategories } from "@/features/customer-menu/data/menuCategories"
import type { MenuItem } from "@/lib/data"
import type { CustomerMenuThemeRouteProps } from "@/features/customer-menu/theme/themeRouteTypes"
import { createOpenOrderUpdateHandler } from "@/features/customer-menu/theme/themeRouteShared"

type KazenThemeRouteProps = CustomerMenuThemeRouteProps

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
    kazenLogoCandidates.find((value: any) => String(value || "").trim()) || ""
  )

  const handleKazenAdd = (item: MenuItem, quantity = 1) => {
    let itemToAdd: MenuItem = { ...item }

    if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
      itemToAdd.price = Number(item.price || 0) / (1 + taxSettings.percentage / 100)

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

    const currentQuantity = items.find((cartItem: any) => cartItem.item.id === item.id)?.quantity || 0
    addToCart(itemToAdd, quantity)
    if (currentQuantity === 0) handleFirstAdd(item)
  }

  const handleKazenWaiter = async () => {
    const resolvedTableId = tableInfo?.table_id || tableInfo?.table_no || tableIdString || "delivery"

    try {
      await apiClient.callWaiter(String(resolvedTableId), ".")
      toast({ title: "Waiter called", description: "The team has been notified." })
    } catch (error: any) {
      toast({
        title: "Waiter call failed",
        description: error?.message || "Failed to call waiter.",
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
    } catch (error: any) {
      toast({
        title: "Note failed",
        description: error?.message || "Failed to send note.",
        variant: "destructive",
      })
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
      toast({
        title: "Valet request failed",
        description: error?.message || "Failed to submit valet request.",
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
        onAddItem={handleKazenAdd}
        onOpenItem={(item: any) => handleItemSelect(item as MenuItem)}
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
