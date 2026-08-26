#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import shutil

FE = Path('/var/www/paymydine/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815')
SMART = FE / 'src/runtime/SmartMenuRuntimeContext.tsx'
MARKER = 'PMD_R62_DIRECT_SELF_PAYMENT'

if not SMART.is_file():
    raise SystemExit(f'STOP: missing {SMART}')

text = SMART.read_text(encoding='utf-8')
if MARKER in text:
    print('R62 direct self-payment patch already present')
    raise SystemExit(0)

backup = Path('/tmp') / f'SmartMenuRuntimeContext.before-r62-{datetime.now().strftime("%Y%m%d_%H%M%S")}.tsx'
shutil.copy2(SMART, backup)


def once(src: str, old: str, new: str, label: str) -> str:
    count = src.count(old)
    if count != 1:
        raise SystemExit(f'STOP {label}: expected 1 target, found {count}')
    return src.replace(old, new, 1)

text = once(
    text,
    "  const [flowLoading, setFlowLoading] = useState(false)\n",
    "  const [flowLoading, setFlowLoading] = useState(false)\n  // PMD_R62_DIRECT_SELF_PAYMENT\n  // Mount checkout only after the prepared self-order is committed as selected.\n  const [flowCheckoutOrderId, setFlowCheckoutOrderId] = useState<number | null>(null)\n",
    'checkout state',
)

anchor = "  const confirmPersonalItems = useCallback(async () => {\n"
idx = text.find(anchor)
if idx < 0:
    raise SystemExit('STOP checkout effect: confirmPersonalItems anchor missing')

effect = """  useEffect(() => {
    if (!isR60tActive || !flowCheckoutOrderId) return
    const ready = flowOrders.some((order) => order.orderId === flowCheckoutOrderId)
    if (!ready || flowSelectedOrderId !== flowCheckoutOrderId) return

    setFlowCheckoutOrderId(null)
    base.openCheckout()
    base.notify('info', base.locale.toLowerCase().startsWith('de')
      ? 'Bestellung bereit. Bezahle jetzt, damit sie an die Küche gesendet wird.'
      : 'Order ready. Pay now to place it with the kitchen.')
  }, [
    base.locale,
    base.notify,
    base.openCheckout,
    flowCheckoutOrderId,
    flowOrders,
    flowSelectedOrderId,
    isR60tActive,
  ])

"""
text = text[:idx] + effect + text[idx:]

old_open = """      base.openCheckout()
      base.notify('info', base.locale.toLowerCase().startsWith('de')
        ? 'Bestellung bereit. Bezahle jetzt, damit sie an die Küche gesendet wird.'
        : 'Order ready. Pay now to place it with the kitchen.')
      void refreshFlow()
"""
new_open = """      setFlowCheckoutOrderId(prepared.orderId)
      void refreshFlow()
"""
text = once(text, old_open, new_open, 'deferred checkout open')

# R61 expiry paths clear any queued checkout too. Do this only where the R61
# lifecycle code already exists; no failure if an older source has fewer paths.
needle = "setFlowSelectedOrderId(null)\n"
replacement = "setFlowSelectedOrderId(null)\n            setFlowCheckoutOrderId(null)\n"
if 'PMD_R61_TABLE_VISIT_LEASE' in text:
    text = text.replace("            setFlowSelectedOrderId(null)\n            base.clearCart()", "            setFlowSelectedOrderId(null)\n            setFlowCheckoutOrderId(null)\n            base.clearCart()")
    text = text.replace("        setFlowSelectedOrderId(null)\n        base.clearCart()", "        setFlowSelectedOrderId(null)\n        setFlowCheckoutOrderId(null)\n        base.clearCart()")

SMART.write_text(text, encoding='utf-8')
print('R62 direct self-payment runtime patch applied')
print('Backup:', backup)
print('Payment/provider files touched: 0')
