"use client"

import { findPaymentMethod, getPaymentMethodProviderCode } from "@/features/checkout/payment-method-utils"

export function useCheckoutPaymentContext({
  tableInfo,
  merchantSettings,
  stripeConfig,
  visiblePaymentMethods,
  selectedPaymentMethod,
  itemsToPay,
  paymentFormData,
  resolveSubmittedPaymentAmount,
}: any) {
  const stripeUrlParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null

  const stripePathTableId =
    typeof window !== "undefined"
      ? (window.location.pathname.match(/\/table\/(\d+)/)?.[1] ?? null)
      : null

  const stripeResolvedTableIdRaw =
    tableInfo?.table_id ??
    stripeUrlParams?.get("table") ??
    stripeUrlParams?.get("table_id") ??
    stripeUrlParams?.get("table_no") ??
    stripePathTableId ??
    null

  const stripeResolvedDisplayTableRaw =
    tableInfo?.table_no ??
    stripeUrlParams?.get("table_no") ??
    stripeUrlParams?.get("table") ??
    stripeUrlParams?.get("table_id") ??
    tableInfo?.table_id ??
    stripePathTableId ??
    null

  const stripeResolvedTableNumber =
    stripeResolvedDisplayTableRaw !== null &&
    stripeResolvedDisplayTableRaw !== undefined &&
    String(stripeResolvedDisplayTableRaw).trim() !== "" &&
    !Number.isNaN(Number(stripeResolvedDisplayTableRaw))
      ? Number(stripeResolvedDisplayTableRaw)
      : null

  const stripeResolvedTableName =
    tableInfo?.table_name && String(tableInfo.table_name).trim() !== ""
      ? String(tableInfo.table_name)
      : stripeResolvedTableNumber
        ? `Table ${stripeResolvedTableNumber}`
        : "Delivery"

  const stripeResolvedLocationId = Number(tableInfo?.location_id || 1)

  const stripeResolvedRestaurantId = String(
    tableInfo?.location_id ??
    tableInfo?.merchant_id ??
    merchantSettings?.accountId ??
    "default"
  )

  const selectedMethod = findPaymentMethod(visiblePaymentMethods, selectedPaymentMethod)
  const selectedProviderCode = getPaymentMethodProviderCode(selectedMethod)

  const stripePaymentData = {
    amount: resolveSubmittedPaymentAmount(),
    currency: stripeConfig?.currency || merchantSettings?.currency || "EUR",
    items: itemsToPay.map((item: any) => ({
      id: String(item.item.id),
      name: item.item.name,
      price: item.price,
      quantity: item.quantity || 1,
      restaurantId: stripeResolvedRestaurantId,
    })),
    customerInfo: {
      name: paymentFormData.cardholderName || "",
      email: paymentFormData.email || "",
      phone: paymentFormData.phone || "",
    },
    restaurantId: stripeResolvedRestaurantId,
    tableNumber: stripeResolvedTableNumber || 0,
  }

  return {
    stripeResolvedTableIdRaw,
    stripeResolvedTableNumber,
    stripeResolvedTableName,
    stripeResolvedLocationId,
    stripeResolvedRestaurantId,
    selectedMethod,
    selectedProviderCode,
    stripePaymentData,
  }
}
