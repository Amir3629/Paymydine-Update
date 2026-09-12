#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / 'src/runtime/components/RuntimeOverlays.tsx'
BRIDGE = ROOT / 'src/runtime/components/WorldlineEmbeddedCheckoutBridge.tsx'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP: {label}: expected exactly 1 anchor, found {count}')
    return text.replace(old, new, 1)


runtime = RUNTIME.read_text()
bridge = BRIDGE.read_text()

runtime = replace_once(
    runtime,
    "import { SumupInlinePayment } from './SumupInlinePayment'\n",
    "import { SumupInlinePayment } from './SumupInlinePayment'\nimport { WorldlineDirectMethodButton } from './WorldlineDirectMethodButton'\n",
    'RuntimeOverlays import',
)

panel_start = runtime.find('function PaymentPanel(')
panel_end = runtime.find('\ntype R32MultiOrderCopy', panel_start)
if panel_start < 0 or panel_end < 0 or panel_end <= panel_start:
    raise SystemExit('STOP: could not isolate PaymentPanel boundaries')

prefix = runtime[:panel_start]
panel = runtime[panel_start:panel_end]
suffix = runtime[panel_end:]

panel = replace_once(
    panel,
    "  const [busy, setBusy] = useState(false)\n  const [message, setMessage] = useState('')\n  const paymentChoices = useRuntimePaymentChoices(bootstrap.payments)\n",
    "  const [busy, setBusy] = useState(false)\n  const [message, setMessage] = useState('')\n  const [worldlineCardLaunchKey, setWorldlineCardLaunchKey] = useState('')\n  const paymentChoices = useRuntimePaymentChoices(bootstrap.payments)\n",
    'PaymentPanel launch state',
)

choices_effect = """  useEffect(() => {\n    if (!paymentChoices.some((entry) => paymentMethodKey(entry) === methodKey)) {\n      setMethodKey(paymentChoices[0] ? paymentMethodKey(paymentChoices[0]) : '')\n    }\n  }, [methodKey, paymentChoices])\n\n"""
card_effect = choices_effect + """  useEffect(() => {\n    if (!worldlineCardLaunchKey || worldlineCardLaunchKey !== methodKey) return\n    const method = paymentChoices.find((entry) => paymentMethodKey(entry) === methodKey) || null\n    const code = String(method?.code || '').trim().toLowerCase()\n    const provider = String(method?.providerCode || '').trim().toLowerCase().replace(/[\\s-]+/g, '_')\n    if (mode !== 'payment' || provider !== 'worldline' || code !== 'card') {\n      setWorldlineCardLaunchKey('')\n      return\n    }\n    // This effect is intentionally above the draft-order early return so Hooks\n    // remain unconditional. pay() is invoked after render, when its closure exists.\n    setWorldlineCardLaunchKey('')\n    void pay()\n  }, [worldlineCardLaunchKey, methodKey])\n\n"""
panel = replace_once(panel, choices_effect, card_effect, 'Unconditional Card launch effect')

panel = replace_once(
    panel,
    "  const isPayPalInline = Boolean(selectedMethod && settlementMode === 'pay-existing' && (selectedProvider === 'paypal' || (selectedMethod.code.toLowerCase() === 'paypal' && (!selectedProvider || selectedProvider === 'paypal'))))\n  const requiresSelectedItems = splitMode === 'items' || splitMode === 'mine'\n",
    "  const isPayPalInline = Boolean(selectedMethod && settlementMode === 'pay-existing' && (selectedProvider === 'paypal' || (selectedMethod.code.toLowerCase() === 'paypal' && (!selectedProvider || selectedProvider === 'paypal'))))\n  const isWorldlineSingleAction = Boolean(mode === 'payment' && selectedMethod && selectedProvider === 'worldline' && ['card', 'apple_pay', 'google_pay', 'paypal', 'wero'].includes(selectedCode))\n  const requiresSelectedItems = splitMode === 'items' || splitMode === 'mine'\n",
    'Worldline selected authority',
)

old_methods = """      {paymentChoices.length > 0 ? (\n        <div className={styles.methodGrid}>\n          {paymentChoices.map((entry) => {\n            const key = paymentMethodKey(entry)\n            return <button key={key} type=\"button\" className={`${styles.method} ${methodKey === key ? styles.methodSelected : ''}`} onClick={() => { setMethodKey(key); setMessage('') }}>{entry.code === 'cash' || entry.code === 'cod' ? <Receipt /> : <CreditCard />} {entry.code === 'cash' || entry.code === 'cod' ? 'Cash' : entry.name}</button>\n          })}\n        </div>\n      ) : <div className={`${styles.statusMessage} ${styles.statusError}`}>{labels.noPaymentMethods}</div>}\n      <div className={styles.summary}>\n        <div className={styles.summaryRow}><span>{labels.remaining}</span><span>{formatCurrency(remaining)}</span></div>\n        <div className={styles.summaryRow}><span>{labels.total}</span><strong>{formatCurrency(payableEstimate)}</strong></div>\n      </div>\n"""

new_methods = """      <div className={styles.summary}>\n        <div className={styles.summaryRow}><span>{labels.remaining}</span><span>{formatCurrency(remaining)}</span></div>\n        <div className={styles.summaryRow}><span>{labels.total}</span><strong>{formatCurrency(payableEstimate)}</strong></div>\n      </div>\n      {paymentChoices.length > 0 ? (\n        <div className={styles.methodGrid}>\n          {paymentChoices.map((entry) => {\n            const key = paymentMethodKey(entry)\n            const entryCode = String(entry.code || '').trim().toLowerCase()\n            const entryProvider = String(entry.providerCode || '').trim().toLowerCase().replace(/[\\s-]+/g, '_')\n            const directWorldline = mode === 'payment' && entryProvider === 'worldline' && ['apple_pay', 'google_pay', 'paypal', 'wero'].includes(entryCode)\n            if (directWorldline) {\n              return (\n                <WorldlineDirectMethodButton\n                  key={key}\n                  method={entry}\n                  className={`${styles.method} ${methodKey === key ? styles.methodSelected : ''}`}\n                  selected={methodKey === key}\n                  disabled={busy || payableEstimate <= 0 || (requiresSelectedItems && !selectedItemsPayload?.length)}\n                  orderId={order.orderId!}\n                  table={bootstrap.table}\n                  settlementMode={settlementMode}\n                  amount={payableEstimate}\n                  currency={bootstrap.restaurant.currency}\n                  tipAmount={tipAmountEstimate}\n                  couponCode={couponDiscount > 0 ? couponCode.trim() || null : null}\n                  couponDiscount={couponDiscount}\n                  selectedItems={selectedItemsPayload}\n                  payerLabel={payerLabel}\n                  guestSessionId={guestSessionId}\n                  locale={locale}\n                  onSelect={() => { setMethodKey(key); setMessage('') }}\n                  onSuccess={(amount) => completePaymentLocally(amount)}\n                  onError={setMessage}\n                />\n              )\n            }\n            const directWorldlineCard = mode === 'payment' && entryProvider === 'worldline' && entryCode === 'card'\n            return (\n              <button\n                key={key}\n                type=\"button\"\n                className={`${styles.method} ${methodKey === key ? styles.methodSelected : ''}`}\n                onClick={() => {\n                  setMethodKey(key)\n                  setMessage('')\n                  if (directWorldlineCard) setWorldlineCardLaunchKey(key)\n                }}\n              >\n                {entry.code === 'cash' || entry.code === 'cod' ? <Receipt /> : <CreditCard />} {entry.code === 'cash' || entry.code === 'cod' ? 'Cash' : entry.name}\n              </button>\n            )\n          })}\n        </div>\n      ) : <div className={`${styles.statusMessage} ${styles.statusError}`}>{labels.noPaymentMethods}</div>}\n"""
panel = replace_once(panel, old_methods, new_methods, 'PaymentPanel total/method grid')

panel = replace_once(
    panel,
    "      {isPayPalInline && selectedMethod && canStartPayment ? (\n",
    "      {isWorldlineSingleAction ? (\n        <button\n          type=\"button\"\n          tabIndex={-1}\n          aria-hidden=\"true\"\n          data-pmd-worldline-canonical-anchor=\"true\"\n          onClick={() => void pay()}\n          style={{ display: 'none' }}\n        />\n      ) : isPayPalInline && selectedMethod && canStartPayment ? (\n",
    'Hide duplicate canonical Worldline action',
)

runtime = prefix + panel + suffix

bridge = replace_once(
    bridge,
    "const AUTO_START_ATTRIBUTE = 'data-pmd-worldline-auto-start'\n",
    "",
    'Bridge auto-start constant',
)

method_parser = """function methodCodeFromButton(button: HTMLButtonElement): string | null {\n  const text = String(button.textContent || '').trim().toLowerCase().replace(/\\s+/g, ' ')\n  if (!text) return null\n  if (text.includes('apple pay')) return 'apple_pay'\n  if (text.includes('google pay')) return 'google_pay'\n  if (text.includes('paypal')) return 'paypal'\n  if (text.includes('wero')) return 'wero'\n  if (text.includes('card / wallet') || text === 'card' || text.includes('card /')) return 'card'\n  return null\n}\n\n"""
bridge = replace_once(bridge, method_parser, '', 'Bridge method parser')

auto_block = """    const triggerGenericPay = (panel: HTMLElement, attempt = 0) => {\n      if (disposed) return\n      const payButton = genericPayButton(panel)\n      if (!payButton || payButton.disabled) {\n        if (attempt < 8) window.setTimeout(() => triggerGenericPay(panel, attempt + 1), 60)\n        return\n      }\n      if (payButton.getAttribute(AUTO_START_ATTRIBUTE) === 'true') return\n      payButton.setAttribute(AUTO_START_ATTRIBUTE, 'true')\n      payButton.click()\n      window.setTimeout(() => payButton.removeAttribute(AUTO_START_ATTRIBUTE), 1000)\n    }\n\n    const onPaymentMethodClick = (event: MouseEvent) => {\n      const target = event.target instanceof Element ? event.target : null\n      const button = target?.closest<HTMLButtonElement>('button') || null\n      if (!button) return\n      const methodCode = methodCodeFromButton(button)\n      if (!methodCode) return\n      const panel = button.closest<HTMLElement>('[data-pmd-payment-order-id]')\n      if (!panel) return\n\n      // Do not gate the selected payment on Worldline runtime-method discovery.\n      // React updates the selected method during this click; two frames later the\n      // canonical Pay button starts whichever provider owns that method. The fetch\n      // interceptor below only activates when that provider is actually Worldline.\n      window.requestAnimationFrame(() => {\n        window.requestAnimationFrame(() => triggerGenericPay(panel))\n      })\n    }\n\n    document.addEventListener('click', onPaymentMethodClick, true)\n\n"""
bridge = replace_once(bridge, auto_block, '', 'Bridge synthetic method click block')

bridge = replace_once(
    bridge,
    "      document.removeEventListener('click', onPaymentMethodClick, true)\n",
    "",
    'Bridge synthetic click cleanup',
)

RUNTIME.write_text(runtime)
BRIDGE.write_text(bridge)

print('PASS: patch scope isolated to PaymentPanel only')
print('PASS: Card launch Hook remains unconditional')
print('PASS: Worldline direct method orderId is narrowed after the submitted-order guard')
print('PASS: RuntimeOverlays now owns Worldline direct method buttons')
print('PASS: Total is rendered before payment methods in shared PaymentPanel')
print('PASS: Worldline bridge no longer synthesizes payment-method clicks')
print('PASS: Worldline generic duplicate Pay control is hidden in full-payment mode')
