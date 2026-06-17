"use client"

import React from "react"
import { ThemeActionBoundary } from "@/components/themes/shared/ThemeActionBoundary"
import { OrganicNativeMenu } from "@/components/themes/organic-botanical-paper/OrganicNativeMenu"
import { OrganicBottomDock } from "@/components/themes/organic-botanical-paper/OrganicBottomDock"
import { CartSheet } from "@/components/cart-sheet"
import { PaymentModal } from "@/features/customer-menu/checkout/CheckoutModalHost"
import type { MenuItem } from "@/lib/data"
import type { OrganicThemeRouteProps } from "@/features/customer-menu/theme/themeRouteTypes"
import { createOpenOrderUpdateHandler } from "@/features/customer-menu/theme/themeRouteShared"
export function OrganicThemeRoute(props: OrganicThemeRouteProps) {
  const {
    apiMenuItems,
    menuItems,
    menuData,
    allCategories,
    restaurantDisplayName,
    displayTableNumber,
    themeMenuActions,
    taxSettings,
    addToCart,
    handleFirstAdd,
    toast,
    handleItemSelect,
    shouldHideCartSheet,
    isPaymentModalOpen,
    setPaymentModalOpen,
    setPaymentModalPreferPersonalReview,
    items,
    tableInfo,
    activeExistingOrderId,
    activePendingSummary,
    activeSubmittedOrder,
    paymentModalInitialStep,
    paymentModalPreferPersonalReview,
    setToolbarPricingSnapshot,
    setSharedTableOrder,
    setLocalOpenOrder,
    setHasLocalOpenOrder,
  } = props

  const handleOpenOrderUpdate = createOpenOrderUpdateHandler({
    setSharedTableOrder,
    setLocalOpenOrder,
    setHasLocalOpenOrder,
  })

  return (
    <ThemeActionBoundary actions={themeMenuActions}>
      <div className="pmd-customer-page page--menu relative min-h-screen w-full bg-[#f6efe2]">
        <OrganicNativeMenu
          sourceItems={apiMenuItems.length ? apiMenuItems : (menuItems.length ? menuItems : menuData)}
          categories={allCategories}
          restaurantName={restaurantDisplayName}
          tableNumber={displayTableNumber}
          actions={themeMenuActions}
          onAddItem={(item: MenuItem, quantity = 1) => {
            let itemToAdd: MenuItem = { ...(item as MenuItem) }

            if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
              itemToAdd.price = Number(itemToAdd.price || 0) / (1 + taxSettings.percentage / 100)

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

            for (let i = 0; i < Math.max(1, Number(quantity || 1)); i += 1) {
              addToCart(itemToAdd)
            }

            handleFirstAdd(item as MenuItem)
            toast({
              title: "Added to order",
              description: String(item.name || "Item added"),
            })
          }}
          onOpenItem={(item: MenuItem) => handleItemSelect(item as MenuItem)}
        />

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

        {!shouldHideCartSheet && <CartSheet />}

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
          checkoutVisualTheme="organic_botanical_paper"
          onCartPricingUpdate={setToolbarPricingSnapshot}
          onOpenOrderUpdate={handleOpenOrderUpdate}
        />
      </div>
    </ThemeActionBoundary>
  )
}
