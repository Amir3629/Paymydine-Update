// PMD_PHASE2C_THEME_ROUTE_BRIDGE_TYPES_20260617
// Per-theme route props still bridge CustomerMenuPage while Phase 4 extraction continues.
// Obvious fields use named aliases so remaining loose contracts are visible and isolated.

export type ThemeLooseBridge = ReturnType<typeof JSON.parse>
export type ThemeMenuItem = ThemeLooseBridge
export type ThemeCartItem = ThemeLooseBridge
export type ThemeCategory = ThemeLooseBridge
export type ThemeTableInfo = ThemeLooseBridge
export type ThemeOrderSnapshot = ThemeLooseBridge
export type ThemeApiClientBridge = ThemeLooseBridge
export type ThemeSettingsBridge = ThemeLooseBridge
export type ThemeMenuDataBridge = ThemeLooseBridge
export type ThemeMenuActionsBridge = ThemeLooseBridge
export type ThemeSetter<T = ThemeLooseBridge> = ThemeLooseBridge
export type ThemeToast = ThemeLooseBridge
export type ThemeAddToCart = ThemeLooseBridge
export type ThemeItemHandler = ThemeLooseBridge
export type ThemeVoidHandler = ThemeLooseBridge
export type ThemeFlag = ThemeLooseBridge
export type ThemeText = ThemeLooseBridge
export type ThemeNumber = ThemeLooseBridge
export type ThemePaymentStep = ThemeLooseBridge
export type ThemePricingSnapshot = ThemeLooseBridge
export type ThemeTaxSettings = ThemeLooseBridge
export type ThemeMenuHighlightSettings = ThemeLooseBridge

export interface CustomerMenuThemeRouteBaseProps {
  activeExistingOrderId?: ThemeText
  activePendingSummary?: ThemeOrderSnapshot
  activeSubmittedOrder?: ThemeOrderSnapshot
  addToCart?: ThemeAddToCart
  allCategories?: ThemeCategory
  apiClient?: ThemeApiClientBridge
  apiMenuItems?: ThemeMenuItem
  bestsellerItems?: ThemeMenuItem
  chefRecommendationItems?: ThemeMenuItem
  cmsSettings?: ThemeSettingsBridge
  displayTableNumber?: ThemeText
  filteredItems?: ThemeMenuItem
  handleCartClick?: ThemeVoidHandler
  handleFirstAdd?: ThemeItemHandler
  handleItemSelect?: ThemeItemHandler
  handleSendNote?: ThemeVoidHandler
  isFrontendConfigured?: ThemeFlag
  isNoteModalOpen?: ThemeFlag
  isPaymentModalOpen?: ThemeFlag
  isWaiterConfirmOpen?: ThemeFlag
  items?: ThemeCartItem
  lastInteractedItem?: ThemeCartItem
  menuData?: ThemeMenuDataBridge
  menuHighlightSettings?: ThemeMenuHighlightSettings
  menuItems?: ThemeMenuItem
  merchantSettings?: ThemeSettingsBridge
  normalizeModernGreenLogoUrl?: ThemeVoidHandler
  note?: ThemeText
  paymentModalInitialStep?: ThemePaymentStep
  paymentModalPreferPersonalReview?: ThemeFlag
  restaurantDisplayName?: ThemeText
  selectedCategory?: ThemeText
  selectedItem?: ThemeMenuItem
  setHasLocalOpenOrder?: ThemeVoidHandler
  setLocalOpenOrder?: ThemeSetter
  setNote?: ThemeSetter
  setNoteModalOpen?: ThemeVoidHandler
  setPaymentModalInitialStep?: ThemeSetter
  setPaymentModalOpen?: ThemeVoidHandler
  setPaymentModalPreferPersonalReview?: ThemeVoidHandler
  setSelectedCategory?: ThemeSetter
  setSelectedItem?: ThemeSetter
  setSharedTableOrder?: ThemeSetter
  setToolbarPricingSnapshot?: ThemeSetter
  setWaiterConfirmOpen?: ThemeVoidHandler
  sharedTableOrder?: ThemeOrderSnapshot
  shouldHideCartSheet?: ThemeFlag
  shouldShowTableOrderAction?: ThemeFlag
  showVirtualHighlightSections?: ThemeFlag
  tableIdString?: ThemeText
  tableInfo?: ThemeTableInfo | null
  tableName?: ThemeText
  tableOrderActionCount?: ThemeNumber
  taxSettings?: ThemeTaxSettings
  themeMenuActions?: ThemeMenuActionsBridge
  toast?: ThemeToast
  totalItems?: ThemeNumber
  totalPrice?: ThemeNumber
}

export interface GoldThemeRouteProps extends CustomerMenuThemeRouteBaseProps {
  activeExistingOrderId?: ThemeText
  activePendingSummary?: ThemeOrderSnapshot
  activeSubmittedOrder?: ThemeOrderSnapshot
  allCategories?: ThemeCategory
  bestsellerItems?: ThemeMenuItem
  chefRecommendationItems?: ThemeMenuItem
  displayTableNumber?: ThemeText
  filteredItems?: ThemeMenuItem
  handleFirstAdd?: ThemeItemHandler
  handleItemSelect?: ThemeItemHandler
  handleSendNote?: ThemeVoidHandler
  isFrontendConfigured?: ThemeFlag
  isNoteModalOpen?: ThemeFlag
  isPaymentModalOpen?: ThemeFlag
  isWaiterConfirmOpen?: ThemeFlag
  items?: ThemeCartItem
  menuHighlightSettings?: ThemeMenuHighlightSettings
  note?: ThemeText
  paymentModalInitialStep?: ThemePaymentStep
  paymentModalPreferPersonalReview?: ThemeFlag
  selectedCategory?: ThemeText
  selectedItem?: ThemeMenuItem
  setHasLocalOpenOrder?: ThemeVoidHandler
  setLocalOpenOrder?: ThemeSetter
  setNote?: ThemeSetter
  setNoteModalOpen?: ThemeVoidHandler
  setPaymentModalOpen?: ThemeVoidHandler
  setPaymentModalPreferPersonalReview?: ThemeVoidHandler
  setSelectedCategory?: ThemeSetter
  setSelectedItem?: ThemeSetter
  setSharedTableOrder?: ThemeSetter
  setToolbarPricingSnapshot?: ThemeSetter
  setWaiterConfirmOpen?: ThemeVoidHandler
  shouldHideCartSheet?: ThemeFlag
  showVirtualHighlightSections?: ThemeFlag
  tableIdString?: ThemeText
  tableInfo?: ThemeTableInfo | null
  tableName?: ThemeText
  themeMenuActions?: ThemeMenuActionsBridge
}

export interface ModernGreenThemeRouteProps extends CustomerMenuThemeRouteBaseProps {
  activeExistingOrderId?: ThemeText
  activePendingSummary?: ThemeOrderSnapshot
  activeSubmittedOrder?: ThemeOrderSnapshot
  addToCart?: ThemeAddToCart
  allCategories?: ThemeCategory
  apiClient?: ThemeApiClientBridge
  apiMenuItems?: ThemeMenuItem
  cmsSettings?: ThemeSettingsBridge
  displayTableNumber?: ThemeText
  handleCartClick?: ThemeVoidHandler
  handleFirstAdd?: ThemeItemHandler
  handleItemSelect?: ThemeItemHandler
  isPaymentModalOpen?: ThemeFlag
  items?: ThemeCartItem
  lastInteractedItem?: ThemeCartItem
  menuData?: ThemeMenuDataBridge
  menuItems?: ThemeMenuItem
  merchantSettings?: ThemeSettingsBridge
  normalizeModernGreenLogoUrl?: ThemeVoidHandler
  paymentModalInitialStep?: ThemePaymentStep
  paymentModalPreferPersonalReview?: ThemeFlag
  restaurantDisplayName?: ThemeText
  setHasLocalOpenOrder?: ThemeVoidHandler
  setLocalOpenOrder?: ThemeSetter
  setPaymentModalInitialStep?: ThemeSetter
  setPaymentModalOpen?: ThemeVoidHandler
  setPaymentModalPreferPersonalReview?: ThemeVoidHandler
  setSharedTableOrder?: ThemeSetter
  setToolbarPricingSnapshot?: ThemeSetter
  sharedTableOrder?: ThemeOrderSnapshot
  shouldShowTableOrderAction?: ThemeFlag
  tableIdString?: ThemeText
  tableInfo?: ThemeTableInfo | null
  tableOrderActionCount?: ThemeNumber
  taxSettings?: ThemeTaxSettings
  themeMenuActions?: ThemeMenuActionsBridge
  toast?: ThemeToast
  totalItems?: ThemeNumber
  totalPrice?: ThemeNumber
}

export interface OrganicThemeRouteProps extends CustomerMenuThemeRouteBaseProps {
  activeExistingOrderId?: ThemeText
  activePendingSummary?: ThemeOrderSnapshot
  activeSubmittedOrder?: ThemeOrderSnapshot
  addToCart?: ThemeAddToCart
  allCategories?: ThemeCategory
  apiMenuItems?: ThemeMenuItem
  displayTableNumber?: ThemeText
  handleFirstAdd?: ThemeItemHandler
  handleItemSelect?: ThemeItemHandler
  isPaymentModalOpen?: ThemeFlag
  items?: ThemeCartItem
  menuData?: ThemeMenuDataBridge
  menuItems?: ThemeMenuItem
  paymentModalInitialStep?: ThemePaymentStep
  paymentModalPreferPersonalReview?: ThemeFlag
  restaurantDisplayName?: ThemeText
  setHasLocalOpenOrder?: ThemeVoidHandler
  setLocalOpenOrder?: ThemeSetter
  setPaymentModalOpen?: ThemeVoidHandler
  setPaymentModalPreferPersonalReview?: ThemeVoidHandler
  setSharedTableOrder?: ThemeSetter
  setToolbarPricingSnapshot?: ThemeSetter
  shouldHideCartSheet?: ThemeFlag
  tableInfo?: ThemeTableInfo | null
  taxSettings?: ThemeTaxSettings
  themeMenuActions?: ThemeMenuActionsBridge
  toast?: ThemeToast
}

export interface KazenThemeRouteProps extends CustomerMenuThemeRouteBaseProps {
  activeExistingOrderId?: ThemeText
  activePendingSummary?: ThemeOrderSnapshot
  activeSubmittedOrder?: ThemeOrderSnapshot
  addToCart?: ThemeAddToCart
  allCategories?: ThemeCategory
  apiClient?: ThemeApiClientBridge
  apiMenuItems?: ThemeMenuItem
  cmsSettings?: ThemeSettingsBridge
  displayTableNumber?: ThemeText
  handleCartClick?: ThemeVoidHandler
  handleFirstAdd?: ThemeItemHandler
  handleItemSelect?: ThemeItemHandler
  isPaymentModalOpen?: ThemeFlag
  items?: ThemeCartItem
  lastInteractedItem?: ThemeCartItem
  menuData?: ThemeMenuDataBridge
  menuItems?: ThemeMenuItem
  merchantSettings?: ThemeSettingsBridge
  normalizeModernGreenLogoUrl?: ThemeVoidHandler
  paymentModalInitialStep?: ThemePaymentStep
  paymentModalPreferPersonalReview?: ThemeFlag
  restaurantDisplayName?: ThemeText
  setHasLocalOpenOrder?: ThemeVoidHandler
  setLocalOpenOrder?: ThemeSetter
  setNoteModalOpen?: ThemeVoidHandler
  setPaymentModalInitialStep?: ThemeSetter
  setPaymentModalOpen?: ThemeVoidHandler
  setPaymentModalPreferPersonalReview?: ThemeVoidHandler
  setSharedTableOrder?: ThemeSetter
  setToolbarPricingSnapshot?: ThemeSetter
  sharedTableOrder?: ThemeOrderSnapshot
  shouldShowTableOrderAction?: ThemeFlag
  tableIdString?: ThemeText
  tableInfo?: ThemeTableInfo | null
  tableOrderActionCount?: ThemeNumber
  taxSettings?: ThemeTaxSettings
  themeMenuActions?: ThemeMenuActionsBridge
  toast?: ThemeToast
  totalItems?: ThemeNumber
  totalPrice?: ThemeNumber
}

export type CustomerMenuThemeRouteProps = CustomerMenuThemeRouteBaseProps
