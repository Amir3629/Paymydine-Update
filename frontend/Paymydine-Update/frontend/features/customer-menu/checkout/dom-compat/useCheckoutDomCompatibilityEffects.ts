type UseCheckoutDomCompatibilityEffectsArgs = {
  isOpen: boolean
  checkoutStep: unknown
  selectedPaymentMethod: string | null
  couponDiscount: number
  tipPercentage: number
  customTip: string
  appliedCouponCode?: string | null
  isSplitting: boolean
  selectedSplitPersonId: string | null
  splitMethod: unknown
  splitGuestCount: number
  submittedSnapshotOrderId?: string | number | null
}

/**
 * PMD_DOM_COMPAT_REPLACED_20260617
 *
 * The old checkout compatibility hook used post-render DOM scanning,
 * inline visual mutations, and text-based panel detection after render.
 *
 * Those repairs are now owned by checkout component markup/data attributes and
 * CSS compatibility rules. Keep this hook as a tiny call-site compatibility
 * boundary while PaymentModalCore still imports it.
 */
export function useCheckoutDomCompatibilityEffects(_args: UseCheckoutDomCompatibilityEffectsArgs) {
  return
}
