import type { AppliedCoupon } from "@/store/cms/types"

function firstDefined(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value
  }
  return undefined
}

function toNumber(value: any) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function buildAppliedCouponFromApiData(data: any): AppliedCoupon {
  if (!data) return null

  const source = data.coupon || data.promotion || data.discount || data

  const type = String(firstDefined(
    source.type,
    source.discount_type,
    source.discountType,
    data.type,
    data.discount_type,
    data.discountType,
  ) || "").trim()

  return {
    coupon_id: firstDefined(source.coupon_id, source.id, data.coupon_id, data.id),
    code: String(firstDefined(source.code, data.code, "") || "").toUpperCase(),
    name: firstDefined(source.name, source.title, data.name, data.title, "Coupon"),
    type,
    discount: toNumber(firstDefined(
      source.discount,
      source.amount,
      source.value,
      source.discount_amount,
      source.discountAmount,
      data.discount,
      data.amount,
      data.value,
      data.discount_amount,
      data.discountAmount,
    )),
    discount_value: toNumber(firstDefined(
      source.discount_value,
      source.percent,
      source.percentage,
      source.discount_percent,
      source.discountPercentage,
      data.discount_value,
      data.percent,
      data.percentage,
      data.discount_percent,
      data.discountPercentage,
      type.toLowerCase() === "p" || type.toLowerCase().includes("percent")
        ? firstDefined(source.discount, source.value, data.discount, data.value)
        : undefined,
    )),
    min_total: toNumber(firstDefined(
      source.min_total,
      source.minimum_total,
      source.minimum_order_total,
      source.minimumOrderTotal,
      source.minimum_order_amount,
      data.min_total,
      data.minimum_total,
      data.minimum_order_total,
      data.minimumOrderTotal,
      data.minimum_order_amount,
    )),
    ...(toNumber(firstDefined(source.discount_amount, source.discountAmount, data.discount_amount, data.discountAmount, data.coupon_discount)) !== undefined
      ? { discount_amount: toNumber(firstDefined(source.discount_amount, source.discountAmount, data.discount_amount, data.discountAmount, data.coupon_discount)) } as any
      : {}),
  } as any
}
