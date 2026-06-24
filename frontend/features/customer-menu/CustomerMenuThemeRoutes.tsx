"use client"

import React from "react"
import { KazenThemeRoute } from "@/features/customer-menu/theme/KazenThemeRoute"
import { VelvetTerracottaThemeRoute } from "@/features/customer-menu/theme/VelvetTerracottaThemeRoute"
import { ModernGreenThemeRoute } from "@/features/customer-menu/theme/ModernGreenThemeRoute"
import { OrganicThemeRoute } from "@/features/customer-menu/theme/OrganicThemeRoute"
import { GoldThemeRoute } from "@/features/customer-menu/theme/GoldThemeRoute"
import { normalizeMenuLogoUrl } from "@/features/customer-menu/theme/themeRouteShared"
import { MenuPayMyDineFooterLogo } from "@/features/customer-menu/components/MenuPayMyDineFooterLogo"

type CustomerMenuThemeRoutesProps = Record<string, ReturnType<typeof JSON.parse>>

export function CustomerMenuThemeRoutes(props: CustomerMenuThemeRoutesProps) {
  const {
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

  } = props

  const renderWithFooterLogo = (content: React.ReactNode) => (
    <>
      {content}
      <MenuPayMyDineFooterLogo visible={shouldShowPayMyDineFooterLogo} />
    </>
  )

  // PMD_VELVET_TERRACOTTA_THEME_RETURN_V2
  if (isVelvetTerracottaTheme) {
    return renderWithFooterLogo(
      <VelvetTerracottaThemeRoute
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
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
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


  // PMD_KAZEN_JAPANESE_THEME_RETURN_20260611
  // PMD_VELVET_ROUTE_SAFE_V5
  const pmdPropsV5 = props as any
  const pmdThemeKeyV5 = String(
    pmdPropsV5?.isVelvetTerracottaTheme
      ? "velvet_terracotta"
      : (
          pmdPropsV5?.frontendTheme ||
          pmdPropsV5?.selectedFrontendTheme ||
          pmdPropsV5?.selectedTheme ||
          pmdPropsV5?.themeId ||
          pmdPropsV5?.adminTheme ||
          pmdPropsV5?.activeTheme ||
          pmdPropsV5?.cmsSettings?.theme_configuration ||
          pmdPropsV5?.cmsSettings?.theme_id ||
          pmdPropsV5?.cmsSettings?.frontend_theme ||
          pmdPropsV5?.merchantSettings?.theme_configuration ||
          pmdPropsV5?.merchantSettings?.theme_id ||
          pmdPropsV5?.merchantSettings?.frontend_theme ||
          ""
        )
  ).trim().toLowerCase().replace(/[\s-]+/g, "_")

  if (pmdThemeKeyV5 === "velvet_terracotta") {
    return renderWithFooterLogo(<VelvetTerracottaThemeRoute {...props} />)
  }

  if (isKazenJapaneseTheme) {
    return renderWithFooterLogo(
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
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
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
    return renderWithFooterLogo(
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
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
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
    return renderWithFooterLogo(
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
      />
    )
  }

  return renderWithFooterLogo(
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
