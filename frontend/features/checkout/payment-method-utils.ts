export type PaymentMethodLike = {
  code: string
  name?: string
  provider_code?: string | null
  enabled?: boolean
}

export const CHECKOUT_PAYMENT_METHOD_CODES = ["card", "apple_pay", "google_pay", "wero", "paypal", "cod"] as const
export type CheckoutPaymentMethodCode = typeof CHECKOUT_PAYMENT_METHOD_CODES[number]

export const CHECKOUT_PAYMENT_METHOD_CODE_SET = new Set<string>(CHECKOUT_PAYMENT_METHOD_CODES)

export function normalizePaymentMethodId(input: string | null | undefined): string | null {
  const normalized = String(input || "").trim().toLowerCase()
  return normalized || null
}

export function getVisiblePaymentMethods<T extends PaymentMethodLike>(paymentMethods: T[] | null | undefined): T[] {
  return (paymentMethods || []).filter((method) => CHECKOUT_PAYMENT_METHOD_CODE_SET.has(normalizePaymentMethodId(method.code) || ""))
}

export function mapPaymentMethodsByCode<T extends PaymentMethodLike>(paymentMethods: T[] | null | undefined): Map<string, T> {
  return new Map((paymentMethods || []).map((method) => [normalizePaymentMethodId(method.code) || method.code, method]))
}

export function findPaymentMethod<T extends PaymentMethodLike>(paymentMethods: T[] | null | undefined, methodId: string | null | undefined): T | null {
  const normalized = normalizePaymentMethodId(methodId)
  if (!normalized) return null
  return (paymentMethods || []).find((method) => normalizePaymentMethodId(method.code) === normalized) || null
}

export function isPaymentMethodAvailable(paymentMethods: PaymentMethodLike[] | null | undefined, methodId: string | null | undefined): boolean {
  return Boolean(findPaymentMethod(paymentMethods, methodId))
}

export function getDefaultPaymentMethod<T extends PaymentMethodLike>(paymentMethods: T[] | null | undefined): T | null {
  return getVisiblePaymentMethods(paymentMethods)[0] || null
}

export function getPaymentMethodProviderCode(method: PaymentMethodLike | null | undefined): string | null {
  return method?.provider_code || null
}

export function isStripePaymentMethodForConfig(method: PaymentMethodLike | null | undefined): boolean {
  if (!method) return false
  return method.code === "apple_pay" || method.code === "google_pay" || (method.code === "card" && method.provider_code === "stripe")
}

export function canRenderPaymentMethodDetail(methodId: string | null | undefined): boolean {
  const normalized = normalizePaymentMethodId(methodId)
  return Boolean(normalized && CHECKOUT_PAYMENT_METHOD_CODE_SET.has(normalized))
}
