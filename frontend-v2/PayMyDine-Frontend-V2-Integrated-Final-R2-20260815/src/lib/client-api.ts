import type { CartLine, TableContext, TableOrderState, TableOrdersState } from '@/src/domain/model'

type JsonObject = Record<string, unknown>

async function jsonRequest<T = JsonObject>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || (data && typeof data === 'object' && 'success' in data && data.success === false)) {
    const message = data && typeof data === 'object' ? String(data.error || data.message || '') : ''
    throw new Error(message || `HTTP ${response.status}`)
  }
  return data as T
}

function tableParams(table: TableContext): URLSearchParams {
  const params = new URLSearchParams()
  if (table.id) params.set('table_id', table.id)
  if (table.number) params.set('table_no', table.number)
  if (table.qr) params.set('qr', table.qr)
  return params
}

function normalizeTableOrder(payload: any): TableOrderState {
  const settlement = payload?.settlement || {}
  const totals = payload?.totals || {}
  const itemRows = Array.isArray(payload?.items) ? payload.items : []
  const items: TableOrderState['items'] = itemRows.map((item: any) => {
    const quantity = Math.max(1, Number(item?.quantity || 1))
    const price = Number(item?.price || 0)
    return {
      orderMenuId: Number(item?.order_menu_id || item?.id || 0) || null,
      menuId: String(item?.menu_id || item?.id || ''),
      name: String(item?.name || item?.menu_name || 'Item'),
      note: item?.note == null ? null : String(item.note),
      quantity,
      price,
      subtotal: Number(item?.subtotal ?? price * quantity),
      guestSessionId: item?.guest_session_id ? String(item.guest_session_id) : null,
      paidQuantity: Number(item?.paid_quantity || 0),
      unpaidQuantity: Number(item?.unpaid_quantity ?? quantity),
    }
  })
  const orderTotal = Number(settlement?.orderTotal ?? settlement?.order_total ?? totals?.orderTotal ?? totals?.total ?? payload?.total ?? 0)
  const settledAmount = Number(settlement?.settledAmount ?? settlement?.settled_amount ?? totals?.settledAmount ?? 0)
  const remainingAmount = Number(settlement?.remainingAmount ?? settlement?.remaining_amount ?? totals?.remainingAmount ?? Math.max(0, orderTotal - settledAmount))
  return {
    success: payload?.success !== false,
    status: String(payload?.status || 'empty'),
    draftId: Number(payload?.draft_id || 0) || null,
    orderId: Number(payload?.order_id || payload?.orderId || 0) || null,
    orderNumber: payload?.orderNumber || payload?.order_number || null,
    payment: payload?.payment || null,
    paymentStatus: String(payload?.paymentStatus || payload?.payment_status || (remainingAmount <= 0 && orderTotal > 0 ? 'paid' : settledAmount > 0 ? 'partial' : 'unpaid')),
    deliveryStatus: payload?.deliveryStatus || null,
    statusName: payload?.status_name || payload?.statusName || null,
    invoiceAvailable: Boolean(payload?.invoiceAvailable || payload?.invoice_available),
    invoiceDownloadToken: payload?.invoiceDownloadToken || payload?.invoice_download_token || null,
    canShowToNewDevice: Boolean(payload?.canShowToNewDevice),
    hasActiveTableOrder: Boolean(payload?.hasActiveTableOrder || payload?.order_id || payload?.draft_id),
    items,
    groups: Array.isArray(payload?.groups) ? payload.groups.map((group: any) => ({
      guestSessionId: group?.guest_session_id ? String(group.guest_session_id) : null,
      items: Array.isArray(group?.items) ? group.items.map((item: any) => {
        const quantity = Math.max(1, Number(item?.quantity || 1))
        const price = Number(item?.price || 0)
        return {
          orderMenuId: Number(item?.order_menu_id || item?.id || 0) || null,
          menuId: String(item?.menu_id || item?.id || ''),
          name: String(item?.name || 'Item'),
          note: item?.note == null ? null : String(item.note),
          quantity,
          price,
          subtotal: Number(item?.subtotal ?? price * quantity),
          guestSessionId: item?.guest_session_id ? String(item.guest_session_id) : null,
          paidQuantity: Number(item?.paid_quantity || 0),
          unpaidQuantity: Number(item?.unpaid_quantity ?? quantity),
        }
      }) : [],
      subtotal: Number(group?.subtotal || 0),
    })) : [],
    totals: {
      subtotal: Number(totals?.subtotal ?? items.reduce((sum, item) => sum + item.subtotal, 0)),
      tax: Number(totals?.tax || 0),
      total: Number(totals?.total ?? orderTotal),
      orderTotal,
      settledAmount,
      remainingAmount,
    },
    prepTimeMinutes: payload?.prep_time_minutes == null && payload?.preparation_time == null && payload?.estimated_prep_minutes == null && payload?.eta_minutes == null
      ? null
      : Math.max(0, Number(payload?.prep_time_minutes ?? payload?.preparation_time ?? payload?.estimated_prep_minutes ?? payload?.eta_minutes ?? 0)),
    estimatedReadyAt: payload?.estimated_ready_at || payload?.estimatedReadyAt || payload?.ready_at || payload?.eta || null,
    createdAt: payload?.created_at || payload?.order_created_at || payload?.createdAt || null,
    updatedAt: payload?.updatedAt || payload?.updated_at || null,
  }
}

export function getGuestSessionId(tenantId: string, table: TableContext): string {
  const key = `pmd-v2:guest:${tenantId}:${table.id || table.number || 'delivery'}`
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`
  window.localStorage.setItem(key, id)
  return id
}

export async function fetchTableOrder(table: TableContext): Promise<TableOrderState> {
  const params = tableParams(table)
  const data = await jsonRequest<any>(`/api/v1/table-order-draft?${params.toString()}`)
  return normalizeTableOrder(data)
}

// PMD_TABLE_ROUND_INVOICE_R27
function normalizeTableOrdersState(payload: any): TableOrdersState {
  return {
    success: payload?.success !== false,
    sessionKey: payload?.sessionKey ? String(payload.sessionKey) : null,
    draft: payload?.draft ? normalizeTableOrder(payload.draft) : null,
    orders: Array.isArray(payload?.orders) ? payload.orders.map((entry: any) => normalizeTableOrder(entry)) : [],
    updatedAt: payload?.updatedAt || payload?.updated_at || null,
  }
}

export async function fetchTableOrdersState(table: TableContext, guestSessionId = ''): Promise<TableOrdersState> {
  const params = tableParams(table)
  if (guestSessionId) params.set('guest_session_id', guestSessionId)
  const data = await jsonRequest<any>(`/api/v1/table-orders/state?${params.toString()}`)
  return normalizeTableOrdersState(data)
}

// PMD_PAID_INVOICE_ORDER_STATUS_R28
// PMD_CANONICAL_CUSTOMER_INVOICE_CLIENT_R28E
export function downloadPaidInvoice(input: { orderId: number; token: string }): string {
  if (!input.orderId || !input.token) throw new Error('Paid invoice is not available yet.')
  const params = new URLSearchParams({ token: input.token, print: '1' })
  return `/api/v1/orders/${encodeURIComponent(String(input.orderId))}/paid-invoice?${params.toString()}`
}

export async function confirmCartItems(input: {
  table: TableContext
  guestSessionId: string
  lines: CartLine[]
  confirmationId?: string
}): Promise<TableOrderState> {
  const payload = {
    ...Object.fromEntries(tableParams(input.table)),
    guest_session_id: input.guestSessionId,
    confirmation_id: input.confirmationId || `confirm-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    items: input.lines.map((line) => ({
      menu_id: Number(line.item.id) || line.item.id,
      name: line.selectedOptions.length
        ? `${line.item.name} — ${line.selectedOptions.map((option) => option.valueName).join(', ')}`
        : line.item.name,
      quantity: line.quantity,
      price: line.unitPrice,
      subtotal: line.subtotal,
      note: String(line.note || '').trim().slice(0, 500),
      guest_session_id: input.guestSessionId,
      options: Object.fromEntries(line.selectedOptions.map((option) => [option.groupName, option.valueId])),
      option_details: line.selectedOptions,
    })),
  }
  return normalizeTableOrder(await jsonRequest('/api/v1/table-orders/confirm-items', {
    method: 'POST', body: JSON.stringify(payload),
  }))
}

export async function submitTableOrder(input: {
  table: TableContext
  draftId: number | null
  guestSessionId: string
}): Promise<TableOrderState> {
  const payload = {
    ...Object.fromEntries(tableParams(input.table)),
    draft_id: input.draftId,
    guest_session_id: input.guestSessionId,
  }
  return normalizeTableOrder(await jsonRequest('/api/v1/table-orders/submit', {
    method: 'POST', body: JSON.stringify(payload),
  }))
}

export async function submitReview(input: {
  orderId: number
  rating: number
  review?: string
  customerName?: string | null
}): Promise<{ reviewId: number | null; status: string }> {
  const orderId = Math.max(0, Math.trunc(Number(input.orderId || 0)))
  const rating = Math.trunc(Number(input.rating || 0))
  if (orderId < 1) throw new Error('Order number is not available yet.')
  if (rating < 1 || rating > 5) throw new Error('Please choose a rating from 1 to 5 stars.')
  const data = await jsonRequest<any>('/api/v1/reviews', {
    method: 'POST',
    body: JSON.stringify({ order_id: orderId, customer_name: input.customerName || null, rating, review: String(input.review || '').trim().slice(0, 2000), public_share_consent: null }),
  })
  return { reviewId: Number(data?.data?.review_id || 0) || null, status: String(data?.data?.status || 'pending') }
}

export async function callWaiter(table: TableContext, message = ''): Promise<void> {
  if (!table.id && !table.number) throw new Error('A table is required.')
  await jsonRequest('/api/v1/waiter-call', { method: 'POST', body: JSON.stringify({ table_id: table.id || table.number, message, msg: message }) })
}

export async function sendTableNote(table: TableContext, note: string): Promise<void> {
  const value = note.trim()
  if (!table.id && !table.number) throw new Error('A table is required.')
  if (!value) throw new Error('A note is required.')
  if (value.length > 1000) throw new Error('Note is too long.')
  await jsonRequest('/api/v1/table-notes', { method: 'POST', body: JSON.stringify({ table_id: table.id || table.number, tableId: table.id || table.number, note: value }) })
}

export async function requestValet(table: TableContext, values: { name: string; licensePlate: string; carMake: string }): Promise<void> {
  await jsonRequest('/api/v1/valet-request', {
    method: 'POST',
    body: JSON.stringify({ table_id: table.id || table.number, table_no: table.number, qr: table.qr, name: values.name, customer_name: values.name, license_plate: values.licensePlate, car_make: values.carMake || 'Not provided' }),
  })
}

export async function validateCoupon(code: string, subtotal: number): Promise<{ discount: number; message: string }> {
  const data = await jsonRequest<any>('/validate-coupon', { method: 'POST', body: JSON.stringify({ code, subtotal, amount: subtotal }) })
  const payload = data?.data || data
  return { discount: Number(payload?.discount_amount ?? payload?.discount ?? payload?.amount ?? 0), message: String(data?.message || 'Coupon applied') }
}

export async function payExistingOrder(input: {
  orderId: number; table: TableContext; method: string; amount: number; tipAmount: number; couponCode: string | null; couponDiscount: number
  selectedItems?: Array<{ order_menu_id: number; quantity: number }> | null; payerLabel?: string | null; paymentReference?: string | null
  providerCode?: string | null; paymentIntentToken?: string | null; splitMode?: 'mine' | 'equal' | 'items' | 'shares' | null
  splitPeople?: number | null; sharePercent?: number | null; guestSessionId?: string | null
}): Promise<any> {
  return jsonRequest('/api/v1/orders/pay-existing', {
    method: 'POST',
    body: JSON.stringify({
      order_id: input.orderId, payment_method: input.method, payment_method_raw: input.method, payment_provider: input.providerCode || null,
      provider: input.providerCode || null, payment_reference: input.paymentReference || null, amount: input.amount, tip_amount: input.tipAmount,
      coupon_code: input.couponCode, coupon_discount: input.couponDiscount, selected_items: input.selectedItems || null, payer_label: input.payerLabel || null,
      payment_intent_token: input.paymentIntentToken || null, idempotency_key: input.paymentIntentToken || null, split_mode: input.splitMode || null,
      split_people: input.splitPeople || null, share_percent: input.sharePercent || null, guest_session_id: input.guestSessionId || null,
      location_id: input.table.locationId || null, table_id: input.table.id, table_no: input.table.number, qr: input.table.qr,
    }),
  })
}

export type SplitPaymentIntent = {
  token: string; orderId: number; splitMode: 'mine' | 'equal' | 'items' | 'shares'; principalAmount: number; tipAmount: number; payableAmount: number
  selectedItems: Array<{ order_menu_id: number; quantity: number }> | null; providerItems: Array<{ id: string; name: string; quantity: number; price: number }>
  payerLabel: string; splitPeople: number | null; sharePercent: number | null; expiresAt: string | null
}

export async function prepareSplitPaymentIntent(input: {
  orderId: number; table: TableContext; guestSessionId: string; splitMode: 'mine' | 'equal' | 'items' | 'shares'; splitPeople?: number | null
  sharePercent?: number | null; selectedItems?: Array<{ order_menu_id: number; quantity: number }> | null; tipPercent: number; paymentMethod: string; providerCode?: string | null
}): Promise<SplitPaymentIntent> {
  const data = await jsonRequest<any>('/api/v1/orders/split-intent', {
    method: 'POST',
    body: JSON.stringify({ order_id: input.orderId, table_id: input.table.id, table_no: input.table.number, qr: input.table.qr, guest_session_id: input.guestSessionId,
      split_mode: input.splitMode, split_people: input.splitPeople || null, share_percent: input.sharePercent || null, selected_items: input.selectedItems || null,
      tip_percent: input.tipPercent, payment_method: input.paymentMethod, provider: input.providerCode || null }),
  })
  return {
    token: String(data.intent_token || ''), orderId: Number(data.order_id || input.orderId), splitMode: String(data.split_mode || input.splitMode) as SplitPaymentIntent['splitMode'],
    principalAmount: Number(data.principal_amount || 0), tipAmount: Number(data.tip_amount || 0), payableAmount: Number(data.payable_amount || 0),
    selectedItems: Array.isArray(data.selected_items) ? data.selected_items : null, providerItems: Array.isArray(data.provider_items) ? data.provider_items : [],
    payerLabel: String(data.payer_label || `PMD R35 ${input.splitMode}`), splitPeople: data.split_people == null ? null : Number(data.split_people),
    sharePercent: data.share_percent == null ? null : Number(data.share_percent), expiresAt: data.expires_at ? String(data.expires_at) : null,
  }
}

export type ExistingOrderPaymentAllocation = {
  orderId: number; amount: number; tipAmount: number; couponDiscount: number; couponCode: string | null
  selectedItems: Array<{ order_menu_id: number; quantity: number }> | null; payerLabel: string | null; paymentIntentToken?: string | null
  splitMode?: 'mine' | 'equal' | 'items' | 'shares' | null; splitPeople?: number | null; sharePercent?: number | null; guestSessionId?: string | null
}

export type BillingGroupSummary = {
  publicId: string; tableId: string; sessionKey: string; mode: 'r36' | 'legacy_passthrough' | string; status: string; currency: string
  subtotalCents: number; serviceChargeCents: number; serviceChargeTaxCents?: number; serviceChargeTaxAddedCents?: number; discountCents: number; tipCents: number
  totalCents: number; paidCents: number; remainingCents: number; paymentStatus: string; fiscalStatus: string; invoiceAvailable?: boolean; invoiceNumber?: string | null
  invoiceDownloadToken?: string | null; invoiceDownloadUrl?: string | null; orders: Array<{ orderId: number; source?: string; snapshot?: Record<string, unknown> }>
}

export type BillingGroupPaymentReservation = {
  paymentId: string; duplicate: boolean; status: string; method: string; provider: string | null; providerReference: string | null
  principalCents: number; tipCents: number; discountCents: number; payableCents: number; currency: string; payerLabel: string | null
  allocation: Record<string, unknown>; reservedUntil: string | null; settledAt: string | null; reconciliationRequired: boolean; reconciliationReason: string | null
}

export async function fetchCurrentBillingGroup(table: TableContext, sessionKey = ''): Promise<BillingGroupSummary | null> {
  const params = tableParams(table)
  if (sessionKey) params.set('session_key', sessionKey)
  const data = await jsonRequest<any>(`/api/v1/billing-groups/current?${params.toString()}`)
  return data?.billingGroup ? data.billingGroup as BillingGroupSummary : null
}

function allocationBaseCents(entry: ExistingOrderPaymentAllocation): number {
  return Math.max(0, Math.round((Number(entry.amount || 0) - Number(entry.tipAmount || 0) + Number(entry.couponDiscount || 0)) * 100))
}

function createR36IdempotencyKey(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `r36:${prefix}:${random}`.slice(0, 190)
}

export async function reserveExistingOrderGroupPayment(input: {
  allocations: ExistingOrderPaymentAllocation[]; table: TableContext; method: string; providerCode?: string | null; idempotencyKey?: string | null
}): Promise<{ group: BillingGroupSummary; payment: BillingGroupPaymentReservation } | null> {
  const allocations = input.allocations.filter((entry) => entry.orderId > 0 && allocationBaseCents(entry) > 0)
  if (allocations.length < 2) return null
  const group = await fetchCurrentBillingGroup(input.table)
  if (!group || group.mode !== 'r36') return null
  if (group.paymentStatus === 'reconciliation_required') throw new Error('This Final Bill requires payment reconciliation before another charge can start.')

  const baseCents = allocations.map((entry) => ({ order_id: entry.orderId, base_cents: allocationBaseCents(entry), selected_items: entry.selectedItems || null }))
  const selectedBase = baseCents.reduce((sum, entry) => sum + entry.base_cents, 0)
  const serviceTotal = Math.max(0, Number(group.serviceChargeCents || 0) + Number(group.serviceChargeTaxAddedCents || 0))
  const serviceComponent = Math.abs(Number(group.remainingCents || 0) - selectedBase - serviceTotal) <= 1 ? serviceTotal : 0
  const tipCents = allocations.reduce((sum, entry) => sum + Math.max(0, Math.round(Number(entry.tipAmount || 0) * 100)), 0)
  const discountCents = allocations.reduce((sum, entry) => sum + Math.max(0, Math.round(Number(entry.couponDiscount || 0) * 100)), 0)
  const couponCodes = Array.from(new Set(allocations.map((entry) => String(entry.couponCode || '').trim()).filter(Boolean)))
  const payerLabels = Array.from(new Set(allocations.map((entry) => String(entry.payerLabel || '').trim()).filter(Boolean)))

  const data = await jsonRequest<any>(`/api/v1/billing-groups/${encodeURIComponent(group.publicId)}/payments/reserve`, {
    method: 'POST',
    body: JSON.stringify({
      table_id: group.tableId || input.table.id || input.table.number,
      idempotency_key: input.idempotencyKey || createR36IdempotencyKey(input.providerCode || input.method || 'group'),
      method: input.method, provider: input.providerCode || null, principal_cents: selectedBase + serviceComponent, service_component_cents: serviceComponent,
      tip_cents: tipCents, discount_cents: discountCents, allocations: baseCents, payer_label: payerLabels.length === 1 ? payerLabels[0] : 'PayMyDine Final Bill',
      coupon_code: couponCodes.length === 1 ? couponCodes[0] : null,
    }),
  })
  const payment = data?.payment as BillingGroupPaymentReservation | undefined
  if (!payment?.paymentId || payment.status !== 'reserved') throw new Error('Final Bill payment reservation was not created.')
  return { group, payment }
}

export async function cancelBillingGroupPayment(paymentId: string): Promise<void> {
  if (!paymentId) return
  await jsonRequest(`/api/v1/billing-group-payments/${encodeURIComponent(paymentId)}/cancel`, { method: 'POST', body: '{}' })
}

export async function settleBillingGroupPayment(input: { paymentId: string; providerReference?: string | null; providerConfirmed?: boolean; providerEvidence?: Record<string, unknown> | null }): Promise<any> {
  return jsonRequest(`/api/v1/billing-group-payments/${encodeURIComponent(input.paymentId)}/settle`, {
    method: 'POST',
    body: JSON.stringify({ provider_reference: input.providerReference || null, provider_confirmed: Boolean(input.providerConfirmed || input.providerReference), provider_evidence: input.providerEvidence || null }),
  })
}

export async function settleExistingOrderGroup(input: {
  allocations: ExistingOrderPaymentAllocation[]; table: TableContext; method: string; providerCode?: string | null; paymentReference?: string | null
  billingGroupPaymentId?: string | null; providerEvidence?: Record<string, unknown> | null
}): Promise<any[]> {
  const allocations = input.allocations.filter((entry) => entry.orderId > 0 && entry.amount > 0)
  if (allocations.length < 2) throw new Error('At least two payable orders are required for grouped settlement.')

  let paymentId = String(input.billingGroupPaymentId || '')
  if (!paymentId && typeof window !== 'undefined') paymentId = String(findPendingProviderPayment(input.providerCode || '')?.pending.billingGroupPaymentId || '')
  const group = await fetchCurrentBillingGroup(input.table).catch(() => null)
  if (group?.mode === 'r36') {
    if (!paymentId) throw new Error('Final Bill payment reservation is missing. Do not charge or retry this payment until it is reconciled.')
    const result = await settleBillingGroupPayment({ paymentId, providerReference: input.paymentReference || null, providerConfirmed: Boolean(input.paymentReference), providerEvidence: input.providerEvidence || null })
    return [result]
  }

  const results: any[] = []
  for (const allocation of allocations) {
    let settled = false
    let lastError: unknown = null
    for (let attempt = 0; attempt < 3 && !settled; attempt += 1) {
      try {
        results.push(await payExistingOrder({ orderId: allocation.orderId, table: input.table, method: input.method, providerCode: input.providerCode || null,
          paymentReference: input.paymentReference || null, amount: allocation.amount, tipAmount: allocation.tipAmount, couponCode: allocation.couponCode,
          couponDiscount: allocation.couponDiscount, selectedItems: allocation.selectedItems, payerLabel: allocation.payerLabel, paymentIntentToken: allocation.paymentIntentToken || null,
          splitMode: allocation.splitMode || null, splitPeople: allocation.splitPeople || null, sharePercent: allocation.sharePercent || null, guestSessionId: allocation.guestSessionId || null }))
        settled = true
      } catch (error) {
        lastError = error
        if (attempt < 2) await new Promise((resolve) => globalThis.setTimeout(resolve, 350 * (attempt + 1)))
      }
    }
    if (!settled) throw lastError instanceof Error ? lastError : new Error(`Order #${allocation.orderId} could not be settled.`)
  }
  return results
}

export async function startProviderPayment(input: { orderId: number; table: TableContext; method: string; provider: string | null; guestSessionId: string; returnUrl?: string | null; cancelUrl?: string | null }): Promise<any> {
  return jsonRequest('/api/v1/orders/start-payment', { method: 'POST', body: JSON.stringify({ order_id: input.orderId, payment_method: input.method, provider: input.provider,
    guest_session_id: input.guestSessionId, table_id: input.table.id, table_no: input.table.number, source: 'pmd-frontend-v2', return_url: input.returnUrl || null, cancel_url: input.cancelUrl || null }) })
}

export async function fetchOrderStatus(orderId: number): Promise<any> { return jsonRequest(`/api/v1/order-status?order_id=${encodeURIComponent(String(orderId))}`) }

export type PendingProviderPayment = {
  provider: string; settlementMode: 'pay-existing' | 'start-finalize'; methodCode: string; providerCode: string | null; orderId: number
  orderAllocations?: ExistingOrderPaymentAllocation[] | null; paymentIntentToken?: string | null; billingGroupPublicId?: string | null; billingGroupPaymentId?: string | null
  billingGroupServiceCents?: number | null; table: TableContext; returnTo: string; createdAt: string; hostedCheckoutId?: string | null; checkoutId?: string | null
  paymentLinkId?: string | null; sessionId?: string | null; paymentIntentId?: string | null; transactionId?: string | null; providerReference?: string | null
  merchantReference?: string | null; amount: number; currency: string; tipAmount: number; couponCode: string | null; couponDiscount: number
  selectedItems: Array<{ order_menu_id: number; quantity: number }> | null; payerLabel: string | null
}

export function providerPendingKey(provider: string): string { return `pmd-v2:pending-payment:${String(provider || 'provider').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_')}` }
export function savePendingProviderPayment(value: PendingProviderPayment): void { try { window.localStorage.setItem(providerPendingKey(value.provider), JSON.stringify(value)) } catch {} }
export function loadPendingProviderPayment(provider: string): PendingProviderPayment | null { try { const raw = window.localStorage.getItem(providerPendingKey(provider)); return raw ? JSON.parse(raw) as PendingProviderPayment : null } catch { return null } }
export function clearPendingProviderPayment(provider: string): void { try { window.localStorage.removeItem(providerPendingKey(provider)) } catch {} }

export function findPendingProviderPayment(preferredProvider = ''): { provider: string; pending: PendingProviderPayment } | null {
  const candidates = Array.from(new Set([String(preferredProvider || '').trim().toLowerCase().replace(/-/g, '_'), 'worldline', 'sumup', 'square', 'vr_payment', 'wero', 'stripe', 'paypal', 'card'].filter(Boolean)))
  const rows = candidates.flatMap((provider) => {
    const pending = loadPendingProviderPayment(provider); if (!pending) return []
    const createdAt = Date.parse(String(pending.createdAt || ''))
    if (Number.isFinite(createdAt) && Date.now() - createdAt > 24 * 60 * 60 * 1000) { clearPendingProviderPayment(provider); return [] }
    return [{ provider, pending, createdAt: Number.isFinite(createdAt) ? createdAt : 0 }]
  })
  if (!rows.length) return null
  const preferred = rows.find((row) => row.provider === candidates[0]); const row = preferred || rows.sort((a, b) => b.createdAt - a.createdAt)[0]
  return { provider: row.provider, pending: row.pending }
}

export async function finalizeExistingOrderPayment(payload: { orderId: number; paymentReference: string; methodCode?: string | null; providerCode?: string | null }): Promise<any> {
  return jsonRequest('/api/v1/orders/finalize-payment', { method: 'POST', body: JSON.stringify({ order_id: payload.orderId, payment_intent_id: payload.paymentReference, payment_method: payload.methodCode || null, provider: payload.providerCode || null }) })
}

export async function verifyProviderPayment(provider: string, pending: PendingProviderPayment, query: URLSearchParams): Promise<{ success: boolean; paid: boolean; pending: boolean; cancelled: boolean; reference: string | null; raw: any }> {
  const normalized = provider.trim().toLowerCase().replace(/-/g, '_'); let endpoint = ''; let payload: Record<string, string> = {}
  if (normalized === 'worldline') { endpoint = '/api/v1/payments/worldline/checkout-status'; payload = { hosted_checkout_id: String(pending.hostedCheckoutId || query.get('hosted_checkout_id') || '') } }
  else if (normalized === 'sumup') { endpoint = '/api/v1/payments/sumup/checkout-status'; payload = { checkout_id: String(pending.checkoutId || query.get('checkout_id') || '') } }
  else if (normalized === 'square') { endpoint = '/api/v1/payments/square/checkout-status'; payload = { payment_link_id: String(pending.paymentLinkId || query.get('payment_link_id') || '') } }
  else if (normalized === 'vr_payment' || normalized === 'vrpayment') { endpoint = '/api/v1/payments/vr-payment/return-status'; payload = { session_id: String(pending.sessionId || query.get('session_id') || ''), transaction_id: String(pending.transactionId || query.get('transaction_id') || ''), provider_reference: String(pending.providerReference || query.get('provider_reference') || ''), merchant_reference: String(pending.merchantReference || query.get('merchant_reference') || '') } }
  else if (normalized === 'wero' || normalized === 'stripe' || normalized === 'card') { endpoint = '/api/v1/payments/wero/checkout-status'; payload = { session_id: String(pending.sessionId || query.get('session_id') || '') } }
  if (!endpoint || !Object.values(payload).some((value) => value.trim())) return { success: false, paid: false, pending: true, cancelled: false, reference: pending.paymentIntentId || pending.transactionId || pending.providerReference || null, raw: null }
  const data = await jsonRequest<any>(endpoint, { method: 'POST', body: JSON.stringify(payload) }); const status = String(data?.status || '').toLowerCase()
  const reference = String(data?.payment_intent_id || data?.payment_id || data?.transaction_code || data?.transaction_id || data?.order_id || pending.paymentIntentId || pending.transactionId || pending.providerReference || '') || null
  return { success: data?.success !== false, paid: Boolean(data?.is_paid || status === 'paid' || status === 'successful' || status === 'completed'), pending: status === 'pending' || status === 'processing' || status === 'authorized', cancelled: status === 'cancelled' || status === 'canceled' || status === 'expired' || status === 'failed', reference, raw: data }
}

export type HostedProviderPaymentInput = { orderId: number; orderAllocations?: ExistingOrderPaymentAllocation[] | null; paymentIntentToken?: string | null; settlementMode?: 'pay-existing' | 'start-finalize'; table: TableContext; methodCode: string; providerCode: string | null; guestSessionId: string; amount: number; currency: string; tipAmount: number; couponCode: string | null; couponDiscount: number; selectedItems: Array<{ order_menu_id: number; quantity: number }> | null; payerLabel: string | null; customerEmail?: string; items?: Array<{ id: string; name: string; quantity: number; price: number }> }
export type HostedProviderPaymentResult = { provider: string; redirectUrl: string | null; immediateReference: string | null; billingGroupPaymentId?: string | null; raw: any }

function normalizeProviderCode(methodCode: string, providerCode: string | null | undefined): string { const provider = String(providerCode || '').trim().toLowerCase().replace(/[\s-]+/g, '_'); if (provider) return provider; const method = String(methodCode || '').trim().toLowerCase(); if (method === 'wero') return 'wero'; if (method === 'paypal') return 'paypal'; if (method === 'apple_pay' || method === 'google_pay' || method === 'card') return 'stripe'; return method || 'provider' }
function providerReturnCode(methodCode: string, providerCode: string): string { const provider = normalizeProviderCode(methodCode, providerCode); if (provider === 'vrpayment') return 'vr_payment'; if (['worldline', 'sumup', 'square', 'vr_payment', 'wero'].includes(provider)) return provider; if (String(methodCode).toLowerCase() === 'wero') return 'wero'; return provider }
function hostedCheckoutEndpoint(methodCode: string, providerCode: string): string { const method = String(methodCode || 'card').trim().toLowerCase(); const provider = normalizeProviderCode(method, providerCode); if (provider === 'vr_payment' || provider === 'vrpayment') { const suffix: Record<string, string> = { card: 'card', paypal: 'paypal', wero: 'wero', apple_pay: 'apple-pay', google_pay: 'google-pay' }; return `/api/v1/payments/vr-payment/${suffix[method] || 'card'}/create-session` } if (method === 'wero') return provider === 'worldline' ? '/api/v1/payments/worldline/wero/create-session' : '/api/v1/payments/wero/create-session'; return '/api/v1/payments/card/create-session' }
function providerRedirect(data: any): string | null { const direct = data?.redirect_url || data?.redirectUrl || data?.checkout_url || data?.checkoutUrl || data?.approval_url || data?.approvalUrl || data?.url; if (direct) return String(direct); const links = Array.isArray(data?.links) ? data.links : Array.isArray(data?.paypal?.links) ? data.paypal.links : []; const approval = links.find((link: any) => ['approve', 'payer-action'].includes(String(link?.rel || '').toLowerCase())); return approval?.href ? String(approval.href) : null }
function providerReference(data: any): string | null { const value = data?.payment_intent_id || data?.payment_id || data?.transaction_id || data?.transaction_code || data?.provider_reference; return value ? String(value) : null }
function pendingProviderFromResponse(methodCode: string, requestedProvider: string, data: any): string { return providerReturnCode(methodCode, String(data?.provider || data?.provider_code || data?.fallback_provider || requestedProvider || '')) }

function buildPendingProviderPayment(provider: string, merchantReference: string, input: HostedProviderPaymentInput, data: any, returnTo: string, amount: number, reservation: { group: BillingGroupSummary; payment: BillingGroupPaymentReservation } | null): PendingProviderPayment {
  return { provider, settlementMode: input.settlementMode || 'pay-existing', methodCode: input.methodCode, providerCode: input.providerCode || String(data?.provider || data?.provider_code || '') || null,
    orderId: input.orderId, orderAllocations: input.orderAllocations || null, paymentIntentToken: input.paymentIntentToken || null, billingGroupPublicId: reservation?.group.publicId || null,
    billingGroupPaymentId: reservation?.payment.paymentId || null, billingGroupServiceCents: reservation ? Math.max(0, reservation.payment.principalCents - (input.orderAllocations || []).reduce((sum, entry) => sum + allocationBaseCents(entry), 0)) : null,
    table: input.table, returnTo, createdAt: new Date().toISOString(), hostedCheckoutId: data?.hosted_checkout_id ? String(data.hosted_checkout_id) : null,
    checkoutId: data?.checkout_id ? String(data.checkout_id) : null, paymentLinkId: data?.payment_link_id ? String(data.payment_link_id) : null, sessionId: data?.session_id ? String(data.session_id) : null,
    paymentIntentId: data?.payment_intent_id ? String(data.payment_intent_id) : null, transactionId: data?.transaction_id ? String(data.transaction_id) : null,
    providerReference: data?.provider_reference ? String(data.provider_reference) : null, merchantReference, amount, currency: reservation?.payment.currency || input.currency,
    tipAmount: input.tipAmount, couponCode: input.couponCode, couponDiscount: input.couponDiscount, selectedItems: input.selectedItems, payerLabel: input.payerLabel }
}

async function createHostedSession(endpoint: string, payload: Record<string, unknown>): Promise<any> { return jsonRequest<any>(endpoint, { method: 'POST', body: JSON.stringify(payload) }) }

export async function startHostedProviderPayment(input: HostedProviderPaymentInput): Promise<HostedProviderPaymentResult> {
  if (!(input.amount > 0)) throw new Error('Payment amount is unavailable.')
  if (typeof window === 'undefined') throw new Error('Hosted payment must start in the browser.')
  const requestedProvider = normalizeProviderCode(input.methodCode, input.providerCode)
  const groupedAllocations = (input.orderAllocations || []).filter((entry) => entry.orderId > 0 && entry.amount > 0)
  const isMultiOrder = groupedAllocations.length > 1
  const returnTo = `${window.location.pathname}${window.location.search}`
  const merchantReference = `PMD-V2-${isMultiOrder ? 'MULTI-' : ''}${input.orderId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const primaryReturnProvider = providerReturnCode(input.methodCode, requestedProvider)
  const returnUrl = `${window.location.origin}/payment/return?payment_return_provider=${encodeURIComponent(primaryReturnProvider)}&return_to=${encodeURIComponent(returnTo)}`
  const cancelUrl = window.location.href

  let reservation: { group: BillingGroupSummary; payment: BillingGroupPaymentReservation } | null = null
  if (isMultiOrder) reservation = await reserveExistingOrderGroupPayment({ allocations: groupedAllocations, table: input.table, method: input.methodCode, providerCode: input.providerCode || requestedProvider, idempotencyKey: `r36:hosted:${merchantReference}` })
  const providerAmount = reservation ? reservation.payment.payableCents / 100 : input.amount
  if (reservation && Math.abs(providerAmount - input.amount) >= 0.01) {
    const serviceCents = Math.max(0, reservation.payment.principalCents - groupedAllocations.reduce((sum, entry) => sum + allocationBaseCents(entry), 0))
    const accepted = window.confirm(`Final Bill total is ${providerAmount.toFixed(2)} ${reservation.payment.currency}${serviceCents > 0 ? `, including ${(serviceCents / 100).toFixed(2)} ${reservation.payment.currency} service charge.` : '.'} Continue to payment?`)
    if (!accepted) { await cancelBillingGroupPayment(reservation.payment.paymentId).catch(() => undefined); throw new Error('Payment cancelled before provider charge.') }
  }

  const settlementMode = input.settlementMode || 'pay-existing'
  const orderStart = isMultiOrder ? { success: true, amount: providerAmount, currency: reservation?.payment.currency || input.currency, provider: requestedProvider }
    : settlementMode === 'start-finalize' ? await startProviderPayment({ orderId: input.orderId, table: input.table, method: input.methodCode, provider: input.providerCode, guestSessionId: input.guestSessionId, returnUrl, cancelUrl })
      : { success: true, order_id: input.orderId, amount: input.amount, currency: input.currency, provider: requestedProvider }

  const sessionPayload: Record<string, unknown> = { amount: Number(orderStart?.amount || providerAmount), currency: String(orderStart?.currency || input.currency || 'EUR').toUpperCase(),
    return_url: returnUrl, cancel_url: cancelUrl, customer_email: String(input.customerEmail || ''), merchant_reference: merchantReference, order_id: isMultiOrder ? undefined : input.orderId,
    order_allocations: isMultiOrder ? groupedAllocations : undefined, billing_group_public_id: reservation?.group.publicId || null, billing_group_payment_id: reservation?.payment.paymentId || null,
    payment_method: input.methodCode, provider: input.providerCode || requestedProvider, guest_session_id: input.guestSessionId, table_id: input.table.id, table_no: input.table.number,
    qr: input.table.qr, tip_amount: input.tipAmount, coupon_code: input.couponCode, coupon_discount: input.couponDiscount, selected_items: input.selectedItems,
    payer_label: input.payerLabel, payment_intent_token: input.paymentIntentToken || null, items: input.items || [] }

  const endpoint = hostedCheckoutEndpoint(input.methodCode, requestedProvider)
  let data: any
  try { data = await createHostedSession(endpoint, sessionPayload) }
  catch (error) {
    if (String(input.methodCode).toLowerCase() !== 'wero' || requestedProvider !== 'worldline') { if (reservation) await cancelBillingGroupPayment(reservation.payment.paymentId).catch(() => undefined); throw error }
    const fallbackProvider = 'wero'; const fallbackReturnUrl = `${window.location.origin}/payment/return?payment_return_provider=${fallbackProvider}&return_to=${encodeURIComponent(returnTo)}`
    try { data = await createHostedSession('/api/v1/payments/wero/create-session', { ...sessionPayload, return_url: fallbackReturnUrl, fallback_method: 'ideal', fallback_from_worldline: true }) }
    catch (fallbackError) { if (reservation) await cancelBillingGroupPayment(reservation.payment.paymentId).catch(() => undefined); throw fallbackError }
  }
  const provider = pendingProviderFromResponse(input.methodCode, requestedProvider, data)
  savePendingProviderPayment(buildPendingProviderPayment(provider, merchantReference, input, data, returnTo, providerAmount, reservation))
  return { provider, redirectUrl: providerRedirect(data), immediateReference: providerReference(data), billingGroupPaymentId: reservation?.payment.paymentId || null, raw: data }
}
