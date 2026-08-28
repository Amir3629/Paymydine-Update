from pathlib import Path

root = Path('frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815')


def replace_once(relative: str, old: str, new: str) -> None:
    path = root / relative
    text = path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{relative}: expected exactly one source match, got {count}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'src/runtime/components/FoodDetails.tsx',
    """function metric(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10)
}

export function FoodDetails""",
    """function metric(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10)
}

function prepTimeLabel(value: number): string {
  const rounded = Math.round(value)
  if (rounded === 10) return '5–10 min'
  if (rounded === 20) return '10–20 min'
  if (rounded === 30) return '20–30 min'
  if (rounded === 45) return '30–45 min'
  return `~${metric(value)} min`
}

export function FoodDetails""",
)
replace_once(
    'src/runtime/components/FoodDetails.tsx',
    "nutrients.push({ key: 'prep', label: copy.prep, value: `${metric(item.prepTimeMinutes)} min` })",
    "nutrients.push({ key: 'prep', label: copy.prep, value: prepTimeLabel(item.prepTimeMinutes) })",
)

replace_once(
    'src/themes/ember-steakhouse/EmberSteakhouse.tsx',
    """import styles from './EmberSteakhouse.module.css'

export default function EmberSteakhouse()""",
    """import styles from './EmberSteakhouse.module.css'

function prepTimeLabel(value: number | null | undefined): string {
  const rounded = Math.round(Number(value || 0))
  if (rounded === 10) return '5–10 min'
  if (rounded === 20) return '10–20 min'
  if (rounded === 30) return '20–30 min'
  if (rounded === 45) return '30–45 min'
  return rounded > 0 ? `~${rounded} min` : 'Fire finished'
}

export default function EmberSteakhouse()""",
)
replace_once(
    'src/themes/ember-steakhouse/EmberSteakhouse.tsx',
    "<span>{item.prepTimeMinutes ? `${item.prepTimeMinutes} min` : 'Fire finished'}</span>",
    "<span>{prepTimeLabel(item.prepTimeMinutes)}</span>",
)

replace_once(
    'src/lib/guest-order-flow-r60t.ts',
    """  paymentRequiredBeforeKitchen?: boolean
  kitchenReleased?: boolean
}""",
    """  paymentRequiredBeforeKitchen?: boolean
  kitchenReleased?: boolean
  remainingPrepMinutes?: number | null
  etaTakingLonger?: boolean
  showCustomerEta?: boolean
  kitchenPhase?: string | null
}""",
)
replace_once(
    'src/lib/guest-order-flow-r60t.ts',
    """    estimatedReadyAt: payload?.estimated_ready_at || payload?.estimatedReadyAt || payload?.ready_at || payload?.eta || null,
    createdAt: payload?.created_at || payload?.order_created_at || payload?.createdAt || null,""",
    """    estimatedReadyAt: payload?.estimated_ready_at || payload?.estimatedReadyAt || payload?.ready_at || payload?.eta || null,
    remainingPrepMinutes: payload?.remaining_prep_minutes == null ? null : Math.max(0, Number(payload.remaining_prep_minutes || 0)),
    etaTakingLonger: Boolean(payload?.etaTakingLonger || payload?.eta_taking_longer),
    showCustomerEta: payload?.show_customer_eta == null && payload?.showCustomerEta == null
      ? true
      : Boolean(payload?.show_customer_eta ?? payload?.showCustomerEta),
    kitchenPhase: payload?.kitchenPhase || payload?.kitchen_phase || null,
    createdAt: payload?.created_at || payload?.order_created_at || payload?.createdAt || null,""",
)

replace_once(
    'src/runtime/components/OrderingRuntimeOverlaysR60T.tsx',
    """function copyFor(locale: string) {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  if (lang === 'de') return { payPlace: 'Bezahlen & bestellen', preparing: 'Zahlung wird vorbereitet …' }
  if (lang === 'fa') return { payPlace: 'پرداخت و ثبت سفارش', preparing: 'در حال آماده‌سازی پرداخت…' }
  if (lang === 'tr') return { payPlace: 'Öde ve sipariş ver', preparing: 'Ödeme hazırlanıyor …' }
  if (lang === 'ja') return { payPlace: '支払って注文', preparing: '支払いを準備中 …' }
  return { payPlace: 'Pay & place order', preparing: 'Preparing payment …' }
}""",
    """function copyFor(locale: string) {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  if (lang === 'de') return { payPlace: 'Bezahlen & bestellen', preparing: 'Zahlung wird vorbereitet …', food: 'Wird zubereitet', ready: 'Bereit', longer: 'Braucht etwas länger', around: 'Voraussichtlich bereit gegen' }
  if (lang === 'fa') return { payPlace: 'پرداخت و ثبت سفارش', preparing: 'در حال آماده‌سازی پرداخت…', food: 'در حال آماده‌سازی', ready: 'آماده', longer: 'کمی بیشتر زمان می‌برد', around: 'زمان تقریبی آماده شدن' }
  if (lang === 'tr') return { payPlace: 'Öde ve sipariş ver', preparing: 'Ödeme hazırlanıyor …', food: 'Hazırlanıyor', ready: 'Hazır', longer: 'Biraz daha uzun sürüyor', around: 'Tahmini hazır olma' }
  if (lang === 'ja') return { payPlace: '支払って注文', preparing: '支払いを準備中 …', food: '調理中', ready: '準備完了', longer: 'もう少し時間がかかります', around: '準備予定' }
  return { payPlace: 'Pay & place order', preparing: 'Preparing payment …', food: 'Preparing', ready: 'Ready', longer: 'Taking a little longer', around: 'Estimated ready around' }
}""",
)
replace_once(
    'src/runtime/components/OrderingRuntimeOverlaysR60T.tsx',
    """    root.setAttribute('data-pmd-r60t-self-order', isSelfOrder ? 'true' : 'false')
    root.setAttribute('data-pmd-r60t-has-staff-shared', hasSharedStaffOrder ? 'true' : 'false')

  }, [runtime.locale, runtime.orderLoading, runtime.overlay, runtime.selectedOrder, runtime.tableOrders])""",
    """    root.setAttribute('data-pmd-r60t-self-order', isSelfOrder ? 'true' : 'false')
    root.setAttribute('data-pmd-r60t-has-staff-shared', hasSharedStaffOrder ? 'true' : 'false')

    root.querySelectorAll<HTMLElement>('article[data-pmd-order-id]').forEach((article) => {
      article.removeAttribute('data-pmd-kitchen-eta')
      const orderId = Number(article.dataset.pmdOrderId || 0)
      const order = runtime.tableOrders.find((candidate: any) => Number(candidate?.orderId || 0) === orderId) as any
      if (!order || order.showCustomerEta === false || !order.kitchenReleased) return

      const status = String(order.statusName || '').toLowerCase()
      const phase = String(order.kitchenPhase || '').toLowerCase()
      let label = ''
      if (status.includes('ready') || status.includes('delivery') || phase === 'ready') {
        label = copy.ready
      } else if (order.etaTakingLonger) {
        label = `${copy.food} · ${copy.longer}`
      } else if (order.estimatedReadyAt) {
        const due = new Date(String(order.estimatedReadyAt))
        const dueLabel = Number.isNaN(due.getTime()) ? '' : due.toLocaleTimeString(runtime.locale || undefined, { hour: '2-digit', minute: '2-digit' })
        label = dueLabel ? `${copy.food} · ${copy.around} ${dueLabel}` : copy.food
      } else if (order.remainingPrepMinutes != null) {
        label = `${copy.food} · ~${Math.max(0, Math.round(Number(order.remainingPrepMinutes || 0)))} min`
      } else {
        label = copy.food
      }
      article.setAttribute('data-pmd-kitchen-eta', label)
    })

  }, [runtime.locale, runtime.orderLoading, runtime.overlay, runtime.selectedOrder, runtime.tableOrders])""",
)
replace_once(
    'src/runtime/components/OrderingRuntimeOverlaysR60T.tsx',
    """        [data-pmd-ordering-flow="r60t"] article[data-pmd-order-id] > :last-child > button {
          width: 100%;
        }

        /* Compact self-order payment composition. The payment implementation stays untouched. */""",
    """        [data-pmd-ordering-flow="r60t"] article[data-pmd-order-id] > :last-child > button {
          width: 100%;
        }

        [data-pmd-ordering-flow="r60t"] article[data-pmd-kitchen-eta]::after {
          content: attr(data-pmd-kitchen-eta);
          display: block;
          margin-top: 0.65rem;
          padding: 0.62rem 0.75rem;
          border: 1px solid color-mix(in srgb, var(--pmd-accent, #08745c) 28%, transparent);
          border-radius: 0.75rem;
          background: color-mix(in srgb, var(--pmd-accent, #08745c) 9%, transparent);
          color: var(--pmd-text, inherit);
          font-size: 0.85rem;
          font-weight: 750;
          line-height: 1.25;
        }

        /* Compact self-order payment composition. The payment implementation stays untouched. */""",
)
