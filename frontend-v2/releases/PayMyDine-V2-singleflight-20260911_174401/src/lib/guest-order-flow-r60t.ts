import type { CartLine, TableContext, TableOrderState } from '@/src/domain/model'

type GuestOrderState = TableOrderState & {
  orderOrigin?: 'guest_self' | 'staff_shared'
  canSplit?: boolean
  paymentRequiredBeforeKitchen?: boolean
  kitchenReleased?: boolean
  remainingPrepMinutes?: number | null
  etaTakingLonger?: boolean
  showCustomerEta?: boolean
  kitchenPhase?: string | null
}

export type GuestOrdersState = {
  success: boolean
  selfOrders: GuestOrderState[]
  sharedStaffOrders: GuestOrderState[]
  orders: GuestOrderState[]
  updatedAt: string | null
}

// PMD_R61_TABLE_VISIT_LEASE
export class GuestTableSessionError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = 'GuestTableSessionError'
    this.code = code
    this.status = status
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false) {
    const code = String(data?.code || '')
    const message = String(data?.error || data?.message || `HTTP ${response.status}`)
    if (response.status === 409 || response.status === 410 || code === 'TABLE_SESSION_EXPIRED' || code === 'SESSION_ROTATION_REQUIRED') {
      throw new GuestTableSessionError(message, code || `HTTP_${response.status}`, response.status)
    }
    throw new Error(message)
  }
  return data as T
}

function paramsForTable(table: TableContext): URLSearchParams {
  const params = new URLSearchParams()
  if (table.id) params.set('table_id', table.id)
  if (table.number) params.set('table_no', table.number)
  if (table.qr) params.set('qr', table.qr)
  return params
}

function normalizeOrder(payload: any): GuestOrderState {
  const settlement = payload?.settlement || {}
  const totals = payload?.totals || {}
  const rawItems = Array.isArray(payload?.items) ? payload.items : []
  const items = rawItems.map((item: any) => {
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
  const groups = Array.isArray(payload?.groups) ? payload.groups.map((group: any) => ({
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
  })) : []

  return {
    success: payload?.success !== false,
    status: String(payload?.status || (remainingAmount > 0 ? 'awaiting_payment' : 'submitted')),
    draftId: null,
    orderId: Number(payload?.order_id || payload?.orderId || 0) || null,
    orderNumber: payload?.orderNumber || payload?.order_number || null,
    payment: payload?.payment || null,
    paymentStatus: String(payload?.paymentStatus || payload?.payment_status || (remainingAmount <= 0 && orderTotal > 0 ? 'paid' : settledAmount > 0 ? 'partial' : 'unpaid')),
    deliveryStatus: payload?.deliveryStatus || null,
    statusName: payload?.status_name || payload?.statusName || (payload?.kitchenReleased ? 'Received' : 'Awaiting payment'),
    invoiceAvailable: Boolean(payload?.invoiceAvailable || payload?.invoice_available),
    invoiceDownloadToken: payload?.invoiceDownloadToken || payload?.invoice_download_token || null,
    canShowToNewDevice: payload?.orderOrigin === 'staff_shared',
    hasActiveTableOrder: Boolean(payload?.order_id || payload?.orderId),
    items,
    groups,
    totals: {
      subtotal: Number(totals?.subtotal ?? items.reduce((sum: number, item: any) => sum + item.subtotal, 0)),
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
    remainingPrepMinutes: payload?.remaining_prep_minutes == null ? null : Math.max(0, Number(payload.remaining_prep_minutes || 0)),
    etaTakingLonger: Boolean(payload?.etaTakingLonger || payload?.eta_taking_longer),
    showCustomerEta: payload?.show_customer_eta == null && payload?.showCustomerEta == null
      ? true
      : Boolean(payload?.show_customer_eta ?? payload?.showCustomerEta),
    kitchenPhase: payload?.kitchenPhase || payload?.kitchen_phase || null,
    createdAt: payload?.created_at || payload?.order_created_at || payload?.createdAt || null,
    updatedAt: payload?.updatedAt || payload?.updated_at || null,
    orderOrigin: payload?.orderOrigin === 'staff_shared' ? 'staff_shared' : 'guest_self',
    canSplit: Boolean(payload?.canSplit),
    paymentRequiredBeforeKitchen: Boolean(payload?.paymentRequiredBeforeKitchen),
    kitchenReleased: Boolean(payload?.kitchenReleased),
  }
}


export async function activateGuestTableSession(table: TableContext, guestSessionId: string, scanQr: string): Promise<void> {
  await request('/api/v1/guest-orders/activate', {
    method: 'POST',
    body: JSON.stringify({
      ...Object.fromEntries(paramsForTable(table)),
      guest_session_id: guestSessionId,
      qr: scanQr,
    }),
  })
}

export async function fetchGuestOrdersState(table: TableContext, guestSessionId: string): Promise<GuestOrdersState> {
  const params = paramsForTable(table)
  params.set('guest_session_id', guestSessionId)
  const payload = await request<any>(`/api/v1/guest-orders/state?${params.toString()}`)
  if (payload?.sessionExpired) throw new GuestTableSessionError('This table visit has ended. Scan the table QR again.', 'TABLE_SESSION_EXPIRED', 410)
  const selfOrders = Array.isArray(payload?.selfOrders) ? payload.selfOrders.map(normalizeOrder) : []
  const sharedStaffOrders = Array.isArray(payload?.sharedStaffOrders) ? payload.sharedStaffOrders.map(normalizeOrder) : []
  return {
    success: payload?.success !== false,
    selfOrders,
    sharedStaffOrders,
    orders: [...sharedStaffOrders, ...selfOrders],
    updatedAt: payload?.updatedAt || payload?.updated_at || null,
  }
}

export async function prepareGuestOrder(input: {
  table: TableContext
  guestSessionId: string
  confirmationId: string
  lines: CartLine[]
}): Promise<GuestOrderState> {
  const payload = {
    ...Object.fromEntries(paramsForTable(input.table)),
    guest_session_id: input.guestSessionId,
    confirmation_id: input.confirmationId,
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
  return normalizeOrder(await request('/api/v1/guest-orders/prepare', {
    method: 'POST',
    body: JSON.stringify(payload),
  }))
}
