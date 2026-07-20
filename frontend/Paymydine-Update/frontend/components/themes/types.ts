import type { MenuItem } from "@/lib/data"
import type { ThemeCanonicalId } from "@/lib/theme-registry"
import type { CartItem, TableInfo } from "@/store/cart-store"
import type { CheckoutStep, PmdToolbarPricingSnapshot, SplitMethod, SplitPerson } from "@/features/checkout/types"
import type { PaymentSummary } from "@/features/checkout/payment-summary-utils"
import type { TableOrderDraft } from "@/features/table-order/types"
import type { ValetRequestInput, ValetRequestResult } from "@/features/valet/types"
import type { ThemeActionResult, ThemeMenuActions } from "@/components/themes/shared/ThemeActionContract"

export type { ThemeActionResult, ThemeMenuActions } from "@/components/themes/shared/ThemeActionContract"

export type ThemeActionLoadingState = {
  checkout?: boolean
  tableOrder?: boolean
  payment?: boolean
  waiter?: boolean
  note?: boolean
  valet?: boolean
}

export type ThemeActionErrorState = {
  checkout?: string | null
  tableOrder?: string | null
  payment?: string | null
  waiter?: string | null
  note?: string | null
  valet?: string | null
}

export type ThemeCartTotals = {
  itemCount: number
  subtotal: number
  tax: number
  total: number
  pricingSnapshot?: PmdToolbarPricingSnapshot | null
}

export type ThemeTableContext = {
  tableInfo?: TableInfo | null
  tableId?: string | number | null
  tableNo?: string | number | null
  tableName?: string | null
  qr?: string | null
}


export type ThemeCheckoutActions = {
  onConfirmOrder: () => ThemeActionResult
  onSubmitTableDraft: () => ThemeActionResult
  onStartPayment: (methodCode?: string | null) => ThemeActionResult
  onClose: () => ThemeActionResult
  onBack: () => ThemeActionResult
}

export type ThemeValetActions = {
  onOpenValet: () => ThemeActionResult
  onSubmitValetRequest: (input: ValetRequestInput) => Promise<ValetRequestResult | null>
}

export type ThemeSharedUiProps = {
  themeId: ThemeCanonicalId
  tableContext?: ThemeTableContext
  loading?: ThemeActionLoadingState
  errors?: ThemeActionErrorState
}

export type ThemeMenuUiProps = ThemeSharedUiProps & {
  items: MenuItem[]
  cartItems: CartItem[]
  cartTotals: ThemeCartTotals
  tableOrder?: TableOrderDraft | null
  actions: ThemeMenuActions
}

export type ThemeCheckoutUiProps = ThemeSharedUiProps & {
  checkoutStep: CheckoutStep
  cartItems: CartItem[]
  cartTotals: ThemeCartTotals
  tableOrder?: TableOrderDraft | null
  paymentSummary?: PaymentSummary | null
  splitMethod?: SplitMethod
  splitPeople?: SplitPerson[]
  selectedSplitPerson?: SplitPerson | null
  actions: ThemeCheckoutActions
}

export type ThemeValetUiProps = ThemeSharedUiProps & {
  actions: ThemeValetActions
}
