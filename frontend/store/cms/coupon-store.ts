import { useCmsStore } from "@/store/cms-store"

export function useCouponStore() {
  const appliedCoupon = useCmsStore((state) => state.appliedCoupon)
  const validateCoupon = useCmsStore((state) => state.validateCoupon)
  const removeCoupon = useCmsStore((state) => state.removeCoupon)

  return { appliedCoupon, validateCoupon, removeCoupon }
}

export function getAppliedCouponSnapshot() {
  return useCmsStore.getState().appliedCoupon
}
