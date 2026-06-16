"use client"

import React, { Suspense } from "react"
import { ThemeActionBoundary } from "@/components/themes/shared/ThemeActionBoundary"
import { Logo } from "@/components/logo"
import { CategoryNav } from "@/components/category-nav"
import { CartSheet } from "@/components/cart-sheet"
import { MenuItemModal } from "@/components/menu-item-modal"
import { GoldBottomDock } from "@/components/themes/gold-luxury/GoldBottomDock"
import { PaymentModal } from "@/features/customer-menu/checkout/CheckoutModalHost"
import { MenuHighlightSection } from "@/features/customer-menu/theme/MenuHighlights"
import { ExpandingToolbarMenuItemCard } from "@/features/customer-menu/components/ExpandingToolbarMenuItemCard"
import { LoadingSpinner } from "@/features/customer-menu/components/LoadingSpinner"
import { EnhancedNoteDialog, EnhancedWaiterDialog } from "@/features/customer-menu/guest-actions/EnhancedGuestDialogs"
import { TenantSetupSplash } from "@/components/tenant-setup-splash"
import type { MenuItem } from "@/lib/data"

type GoldThemeRouteProps = Record<string, any>

export function GoldThemeRoute(props: GoldThemeRouteProps) {
  const {
    themeMenuActions,
    displayTableNumber,
    showVirtualHighlightSections,
    menuHighlightSettings,
    chefRecommendationItems,
    bestsellerItems,
    handleItemSelect,
    handleFirstAdd,
    allCategories,
    selectedCategory,
    setSelectedCategory,
    isFrontendConfigured,
    filteredItems,
    selectedItem,
    setSelectedItem,
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
    isWaiterConfirmOpen,
    setWaiterConfirmOpen,
    tableIdString,
    tableName,
    isNoteModalOpen,
    setNoteModalOpen,
    note,
    setNote,
    handleSendNote,
  } = props

  return (
    <ThemeActionBoundary actions={themeMenuActions}>
      <div className="relative min-h-screen w-full bg-theme-background pb-32">
        <header className="py-8">
          <div className="max-w-4xl mx-auto px-4">
            <Logo tableNumber={displayTableNumber} />
          </div>
        </header>

        <Suspense fallback={<LoadingSpinner />}>
          <main className="max-w-4xl mx-auto">
            {showVirtualHighlightSections && menuHighlightSettings.section_placement === "top" && (
              <>
                <MenuHighlightSection
                  title="Chef’s Recommendations"
                  subtitle="Hand-picked favorites from the kitchen."
                  items={chefRecommendationItems}
                  settings={menuHighlightSettings}
                  onSelect={handleItemSelect}
                  onFirstAdd={handleFirstAdd}
                />
                <MenuHighlightSection
                  title="Best Sellers"
                  subtitle="Popular picks from recent orders."
                  items={bestsellerItems}
                  settings={menuHighlightSettings}
                  onSelect={handleItemSelect}
                  onFirstAdd={handleFirstAdd}
                />
              </>
            )}

            <CategoryNav
              categories={allCategories}
              selectedCategory={selectedCategory || "All"}
              onSelectCategory={(category: string) => {
                setSelectedCategory(category || "All")
              }}
            />

            {showVirtualHighlightSections && menuHighlightSettings.section_placement === "after_categories" && (
              <>
                <MenuHighlightSection
                  title="Chef’s Recommendations"
                  subtitle="Hand-picked favorites from the kitchen."
                  items={chefRecommendationItems}
                  settings={menuHighlightSettings}
                  onSelect={handleItemSelect}
                  onFirstAdd={handleFirstAdd}
                />
                <MenuHighlightSection
                  title="Best Sellers"
                  subtitle="Popular picks from recent orders."
                  items={bestsellerItems}
                  settings={menuHighlightSettings}
                  onSelect={handleItemSelect}
                  onFirstAdd={handleFirstAdd}
                />
              </>
            )}

            <section className="w-full mb-12">
              {!isFrontendConfigured && filteredItems.length === 0 ? (
                <TenantSetupSplash />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-8 px-4">
                  {filteredItems.map((item: MenuItem, index: number) => (
                    <ExpandingToolbarMenuItemCard
                      key={item.id}
                      item={item}
                      onSelect={handleItemSelect}
                      onFirstAdd={() => handleFirstAdd(item)}
                      prioritizeImage={index < 4}
                      highlightSettings={menuHighlightSettings}
                    />
                  ))}
                </div>
              )}
            </section>
          </main>
        </Suspense>

        <GoldBottomDock {...themeMenuActions} />

        {!shouldHideCartSheet && <CartSheet />}

        <MenuItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          highlightSettings={menuHighlightSettings}
        />

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
          checkoutVisualTheme="gold-luxury"
          onCartPricingUpdate={setToolbarPricingSnapshot}
          onOpenOrderUpdate={(snapshot: any) => {
            if (snapshot?.status === "draft" || snapshot?.draft_id) {
              setSharedTableOrder(snapshot)
              return
            }

            if (snapshot?.paymentStatus === "paid" || snapshot?.status === "paid") {
              const normalizedPaid = snapshot?.orderId ? snapshot : { ...snapshot, orderId: snapshot?.order_id }
              setLocalOpenOrder(normalizedPaid)
              setHasLocalOpenOrder(!!normalizedPaid?.orderId)
              setSharedTableOrder((prev: any) =>
                prev?.order_id && String(prev.order_id) === String(normalizedPaid?.orderId)
                  ? ({ ...prev, status: "paid", paymentStatus: "paid" } as any)
                  : prev
              )
              return
            }

            if (snapshot?.orderId || snapshot?.order_id) {
              const normalized = snapshot?.orderId ? snapshot : { ...snapshot, orderId: snapshot.order_id }
              setLocalOpenOrder(normalized)
              setHasLocalOpenOrder(true)
              setSharedTableOrder((prev: any) => prev?.draft_id ? null : prev)
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
