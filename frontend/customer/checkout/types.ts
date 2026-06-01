import type { ReactNode } from "react"

export type CheckoutGoldStep = "review" | "submitted" | "split" | "split-items" | "split-shares" | "split-review" | "payment" | "paid"

export type CheckoutGoldItem = {
  id: string | number
  name: string
  quantity: number
  total: string
  amount?: number
  subtitle?: string
}

export type CheckoutGoldTotalRow = {
  label: string
  value: string
  strong?: boolean
}

export type CheckoutGoldSplitPerson = {
  id: string
  name: string
  avatar?: string
  status?: string
  total: string
  items?: Array<{ name: string; value: string }>
  selected?: boolean
}

export type CheckoutGoldPaymentMethod = {
  code: string
  name: string
  imageSrc?: string
  imageWidth?: number
  imageHeight?: number
}

export type CheckoutFlowGoldProps = {
  isOpen: boolean
  title: string
  step: CheckoutGoldStep
  onBack: () => void
  onClose: () => void
  onGoToPayment: () => void
  onGoToSplit: () => void
  onGoToSplitReview: () => void
  onConfirmItems: () => void | Promise<void>
  onSubmitTableDraft: () => void | Promise<void>
  onUseSubmittedOrder?: () => void
  onSelectSplitPerson: (id: string) => void
  onPaySelectedSplitPerson: () => void
  onSelectPaymentMethod: (code: string) => void
  onApplyCoupon: () => void | Promise<void>
  onRemoveCoupon: () => void
  onTipPercentage: (value: number) => void
  onCustomTipChange: (value: string) => void
  onCouponCodeChange: (value: string) => void
  onSplitMethod: (method: "equal" | "items" | "shares") => void
  onSplitGuestCountChange: (value: number) => void
  onAssignSplitItem?: (itemKey: string, guestIndex: number | null) => void
  onSharePercentChange?: (guestIndex: number, value: number) => void
  onSendPaymentLinks?: () => void
  onShowSplitQr?: () => void
  reviewMode: "personal" | "table-draft" | "table-submitted"
  isLoading?: boolean
  submitDraftLoading?: boolean
  draftLoading?: boolean
  canSubmitDraft?: boolean
  canConfirmItems?: boolean
  tableLabel: string
  contextLabel?: string
  items: CheckoutGoldItem[]
  tableGroups?: Array<{ id: string; label: string; total: string; items: CheckoutGoldItem[] }>
  totals: CheckoutGoldTotalRow[]
  orderStatus?: {
    title: string
    description?: string
    eta?: string
    orderId?: string | number | null
    paymentStatus?: string
    settlementStatus?: string
    items: CheckoutGoldItem[]
    total: string
    isPaid?: boolean
  }
  split: {
    method: "equal" | "items" | "shares"
    guestCount: number
    people: CheckoutGoldSplitPerson[]
    selectedPersonId: string | null
    canReview: boolean
    sourceItems?: Array<{ key: string; name: string; value: string; assignedGuestIndex: number | null }>
    sharePercents?: number[]
    sharePercentTotal?: number
    grandTotal: string
  }
  payment: {
    compactTitle: string
    total: string
    subtotalRows: CheckoutGoldTotalRow[]
    tipEnabled: boolean
    tipPercentages: number[]
    selectedTipPercentage: number
    customTip: string
    couponCode: string
    couponLoading: boolean
    couponError: string | null
    appliedCouponLabel?: string | null
    selectedMethod: string | null
    loadingMethods: boolean
    methods: CheckoutGoldPaymentMethod[]
    providerForm: ReactNode
    fallbackPayButton: ReactNode
  }
}
