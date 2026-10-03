#!/usr/bin/env python3
from pathlib import Path
import runpy

BASE = Path(__file__).resolve().parents[1]
R1 = BASE / 'scripts/pmd-square-runtime-terminal-r1.py'
RUNTIME = BASE / 'frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/RuntimeOverlays.tsx'

text = R1.read_text()
old = r'''replace_once(
    RUNTIME,
    "      ) : isStripeInline && selectedMethod && canStartPayment ? (\n",
    square_jsx + "      ) : isStripeInline && selectedMethod && canStartPayment ? (\n",
    'Square inline checkout mounted',
)
'''
new = r'''single_square_anchor = "      ) : isStripeInline && selectedMethod && canStartPayment ? (\n        <StripeInlinePayment\n          key={`r35c-${paymentMethodKey(selectedMethod)}-${order.orderId}`}\n"
single_square_replacement = square_jsx + single_square_anchor
replace_once(
    RUNTIME,
    single_square_anchor,
    single_square_replacement,
    'Square inline checkout mounted',
)
'''

if old in text:
    text = text.replace(old, new, 1)
    R1.write_text(text)
    print('PASS: Square R1 single-order checkout anchor repaired')
elif 'single_square_anchor = "      ) : isStripeInline' in text:
    print('PASS: Square R1 single-order checkout anchor already repaired')
else:
    raise SystemExit('STOP: Square R1 inline checkout patch block was not recognized')

# Confirm the target is unique before running the full patch chain.
runtime = RUNTIME.read_text()
target = "      ) : isStripeInline && selectedMethod && canStartPayment ? (\n        <StripeInlinePayment\n          key={`r35c-${paymentMethodKey(selectedMethod)}-${order.orderId}`}\n"
if 'SquareInlinePayment' not in runtime and runtime.count(target) != 1:
    raise SystemExit(f'STOP: single-order Stripe anchor expected 1 before Square patch, found {runtime.count(target)}')

runpy.run_path(str(BASE / 'scripts/pmd-square-runtime-terminal-r3.py'), run_name='__main__')

runtime = RUNTIME.read_text()
if "import { SquareInlinePayment } from './SquareInlinePayment'" not in runtime:
    raise SystemExit('STOP: SquareInlinePayment import missing after patch')
if 'const isSquareInline = Boolean(' not in runtime:
    raise SystemExit('STOP: Square inline selection gate missing after patch')
if 'key={`square-r1-${paymentMethodKey(selectedMethod)}-${order.orderId}`}' not in runtime:
    raise SystemExit('STOP: Square single-order inline component missing after patch')
if 'key={`square-r1-${paymentMethodKey(selectedMethod)}-${primaryOrderId}`}' in runtime:
    raise SystemExit('STOP: Square grouped multi-order checkout must stay disabled until server allocation support is implemented')

print('PASS: Square single-order inline checkout is mounted exactly on the canonical order flow')
print('PASS: Square grouped multi-order remains fail-closed')
print('PASS: Square R4 patch sequence complete')
