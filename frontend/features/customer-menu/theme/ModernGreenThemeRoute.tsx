"use client"

import { ThemeActionBoundary } from "@/components/themes/shared/ThemeActionBoundary"
import { ModernGreenNativeMenu } from "@/components/themes/modern-green/ModernGreenNativeMenu"
import { ModernGreenBottomDock } from "@/components/themes/modern-green/ModernGreenBottomDock"
import { PaymentModal } from "@/features/customer-menu/checkout/CheckoutModalHost"
import type { MenuItem } from "@/lib/data"
import type { CustomerMenuThemeRouteProps } from "@/features/customer-menu/theme/themeRouteTypes"
import { createOpenOrderUpdateHandler } from "@/features/customer-menu/theme/themeRouteShared"

type ModernGreenThemeRouteProps = CustomerMenuThemeRouteProps

export function ModernGreenThemeRoute(props: ModernGreenThemeRouteProps) {
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

  const modernGreenSourceItems = apiMenuItems.length ? apiMenuItems : (menuItems.length ? menuItems : menuData)
  const modernGreenTableNumber = tableInfo?.table_no ?? tableInfo?.table_id ?? displayTableNumber ?? tableIdString ?? null
  const modernGreenLogoUrl = normalizeModernGreenLogoUrl(
    cmsSettings?.logoUrl ||
    cmsSettings?.logo ||
    cmsSettings?.logo_url ||
    cmsSettings?.site_logo ||
    cmsSettings?.restaurant_logo ||
    merchantSettings?.logoUrl ||
    merchantSettings?.logo ||
    merchantSettings?.logo_url ||
    merchantSettings?.site_logo ||
    merchantSettings?.restaurant_logo ||
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
      <ModernGreenNativeMenu
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
          onOpenOrderUpdate={handleOpenOrderUpdate}
        />
      </ModernGreenNativeMenu>
    </ThemeActionBoundary>
  )
}
