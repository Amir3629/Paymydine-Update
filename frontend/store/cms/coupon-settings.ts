import type { AppliedCoupon } from "@/store/cms/types"

export function buildAppliedCouponFromApiData(data: any): AppliedCoupon {
  if (!data) return null
  return {
    coupon_id: data.coupon_id,
    code: data.code,
    name: data.name,
    type: data.type,
    discount: data.discount,
    discount_value: data.discount_value,
    min_total: data.min_total,
  }
}
