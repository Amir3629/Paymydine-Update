// PMD_PHASE2_STRICT_THEME_ROUTE_PROPS_20260616
// This file intentionally replaces the old `Record<string, any>` theme prop bridge.
// It is still a broad bridge type while CustomerMenuPage passes many shared props,
// but the prop names are now explicit so unknown JSX props can be caught by TypeScript.
// Next step later: split this into Gold/ModernGreen/Organic/Kazen-specific narrower interfaces.

export interface CustomerMenuThemeRouteProps {
  activeExistingOrderId?: any
  activePendingSummary?: any
  activeSubmittedOrder?: any
  addToCart?: any
  allCategories?: any
  apiClient?: any
  apiMenuItems?: any
  bestsellerItems?: any
  categories?: any
  checkoutVisualTheme?: any
  chefRecommendationItems?: any
  cmsSettings?: any
  displayTableNumber?: any
  filteredItems?: any
  handleCartClick?: any
  handleFirstAdd?: any
  handleItemSelect?: any
  handleSendNote?: any
  initialSubmittedOrder?: any
  isFrontendConfigured?: any
  isNoteModalOpen?: any
  isPaymentModalOpen?: any
  isWaiterConfirmOpen?: any
  items?: any
  lastInteractedItem?: any
  menuData?: any
  menuHighlightSettings?: any
  menuItems?: any
  merchantSettings?: any
  normalizeModernGreenLogoUrl?: any
  note?: any
  onOpenOrderUpdate?: any
  paymentModalInitialStep?: any
  paymentModalPreferPersonalReview?: any
  pendingSummary?: any
  preferPersonalReview?: any
  restaurantDisplayName?: any
  selectedCategory?: any
  selectedItem?: any
  setHasLocalOpenOrder?: any
  setIsPaymentModalOpen?: any
  setLocalOpenOrder?: any
  setNote?: any
  setNoteModalOpen?: any
  setPaymentModalInitialStep?: any
  setPaymentModalOpen?: any
  setPaymentModalPreferPersonalReview?: any
  setPreferPersonalReview?: any
  setSelectedCategory?: any
  setSelectedItem?: any
  setSharedTableOrder?: any
  setToolbarPricingSnapshot?: any
  setWaiterConfirmOpen?: any
  sharedTableOrder?: any
  shouldHideCartSheet?: any
  shouldShowTableOrderAction?: any
  showVirtualHighlightSections?: any
  tableIdString?: any
  tableInfo?: any
  tableName?: any
  tableOrderActionCount?: any
  taxSettings?: any
  themeMenuActions?: any
  toast?: any
  totalItems?: any
  totalPrice?: any
}

export type GoldThemeRouteProps = CustomerMenuThemeRouteProps
export type ModernGreenThemeRouteProps = CustomerMenuThemeRouteProps
export type OrganicThemeRouteProps = CustomerMenuThemeRouteProps
export type KazenThemeRouteProps = CustomerMenuThemeRouteProps
