'use client'

export type WorldlineCardPrewarmInput = {
  order_id: number
  payment_method?: string
  provider?: string
  return_url: string
  tip_amount: number
  locale: string
  amount?: number
  currency?: string
  coupon_code?: string | null
  coupon_discount?: number
  selected_items?: Array<{ order_menu_id: number; quantity: number }> | null
  payment_intent_token?: string | null
}

type CacheEntry = {
  createdAt: number
  promise: Promise<any>
}

const ENDPOINT = '/api/v1/payments/worldline/native/card/create-session'
const TTL_MS = 10 * 60 * 1000
const MAX_ENTRIES = 6
const cache = new Map<string, CacheEntry>()

function normalizedItems(value: WorldlineCardPrewarmInput['selected_items']) {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => ({
      order_menu_id: Number(entry?.order_menu_id || 0),
      quantity: Number(entry?.quantity || 0),
    }))
    .filter((entry) => entry.order_menu_id > 0 && entry.quantity > 0)
    .sort((a, b) => a.order_menu_id - b.order_menu_id || a.quantity - b.quantity)
}

function keyFor(input: WorldlineCardPrewarmInput): string {
  return JSON.stringify({
    order_id: Number(input.order_id || 0),
    amount: Number(Number(input.amount || 0).toFixed(2)),
    currency: String(input.currency || 'EUR').trim().toUpperCase(),
    tip_amount: Number(Number(input.tip_amount || 0).toFixed(4)),
    locale: String(input.locale || 'de_DE').trim().replace('-', '_'),
    coupon_code: String(input.coupon_code || '').trim(),
    coupon_discount: Number(Number(input.coupon_discount || 0).toFixed(4)),
    selected_items: normalizedItems(input.selected_items),
    payment_intent_token: String(input.payment_intent_token || '').trim(),
  })
}

function cleanup() {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now - entry.createdAt > TTL_MS) cache.delete(key)
  }
  if (cache.size <= MAX_ENTRIES) return
  const oldest = [...cache.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt)
  for (const [key] of oldest.slice(0, Math.max(0, cache.size - MAX_ENTRIES))) cache.delete(key)
}

async function createSession(input: WorldlineCardPrewarmInput): Promise<any> {
  const response = await window.fetch(ENDPOINT, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      payment_method: 'card',
      provider: 'worldline',
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false) {
    throw new Error(String(data?.error || data?.message || `HTTP ${response.status}`))
  }
  if (String(data?.flow || '').toLowerCase() !== 'native_card') {
    throw new Error('Worldline did not return a native card session.')
  }
  return data
}

export function primeWorldlineCardSession(input: WorldlineCardPrewarmInput): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Worldline card prewarm requires a browser.'))
  cleanup()
  const key = keyFor(input)
  const existing = cache.get(key)
  if (existing && Date.now() - existing.createdAt <= TTL_MS) return existing.promise

  const promise = createSession(input).catch((error) => {
    const current = cache.get(key)
    if (current?.promise === promise) cache.delete(key)
    throw error
  })
  cache.set(key, { createdAt: Date.now(), promise })
  cleanup()
  return promise
}

export async function consumeWorldlineCardSession(input: WorldlineCardPrewarmInput): Promise<any | null> {
  if (typeof window === 'undefined') return null
  cleanup()
  const key = keyFor(input)
  const entry = cache.get(key)
  if (!entry) return null
  cache.delete(key)
  try {
    return await entry.promise
  } catch {
    return null
  }
}
