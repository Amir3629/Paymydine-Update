#!/usr/bin/env python3
from pathlib import Path
import sys

TARGET = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    'frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/SumupInlinePayment.tsx'
)
text = TARGET.read_text()
old = "last = await requestJson('/api/v1/payments/sumup/widget/status', { checkout_id: checkoutId })"
new = "last = await requestJson('/api/v1/payments/sumup/widget/status', { checkout_id: checkoutId, order_id: props.orderId, amount, currency: String(props.currency || 'EUR').toUpperCase() })"

count = text.count(old)
if count == 0:
    if new in text:
        print(f'ALREADY_PATCHED={TARGET}')
        raise SystemExit(0)
    raise SystemExit('PATCH ERROR: SumUp widget verification request not found')
if count != 1:
    raise SystemExit(f'PATCH ERROR: expected one verification request, found {count}')

TARGET.write_text(text.replace(old, new, 1))
print(f'PATCHED={TARGET}')
print('SUMUP_VERIFY_BINDS_ORDER_AMOUNT_CURRENCY=YES')
