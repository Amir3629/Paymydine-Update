#!/usr/bin/env python3
from pathlib import Path
import sys

TARGET = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    'frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/RuntimeOverlays.tsx'
)

text = TARGET.read_text()
original = text


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'PATCH ERROR: {label}: expected 1 match, found {count}')
    text = text.replace(old, new, 1)


replace_once(
    "import { StripeInlinePayment } from './StripeInlinePayment'\n",
    "import { StripeInlinePayment } from './StripeInlinePayment'\nimport { SumupInlinePayment } from './SumupInlinePayment'\n",
    'SumUp import',
)

replace_once(
    "  const isStripeInline = Boolean(selectedMethod && settlementMode === 'pay-existing' && selectedProvider === 'stripe' && ['card', 'apple_pay', 'google_pay'].includes(selectedCode))\n  const isPayPalInline =",
    "  const isStripeInline = Boolean(selectedMethod && settlementMode === 'pay-existing' && selectedProvider === 'stripe' && ['card', 'apple_pay', 'google_pay'].includes(selectedCode))\n  const isSumupInline = Boolean(selectedMethod && settlementMode === 'pay-existing' && selectedProvider === 'sumup' && selectedCode === 'card')\n  const isPayPalInline =",
    'single-order SumUp predicate',
)

single_stripe = """      ) : isStripeInline && selectedMethod && canStartPayment ? (\n        <StripeInlinePayment\n          key={`r35c-${paymentMethodKey(selectedMethod)}-${order.orderId}`}\n          orderId={order.orderId}\n          table={bootstrap.table}\n          methodCode={selectedMethod.code}\n          providerCode={selectedMethod.providerCode}\n          amount={payableEstimate}\n          currency={bootstrap.restaurant.currency}\n          tipAmount={tipAmountEstimate}\n          couponCode={mode === 'split' ? null : couponCode.trim() || null}\n          couponDiscount={mode === 'split' ? 0 : couponDiscount}\n          selectedItems={selectedItemsPayload}\n          payerLabel={payerLabel}\n          items={order.items.filter((item) => item.unpaidQuantity > 0).map((item) => ({ id: String(item.orderMenuId || item.menuId), name: item.name, quantity: item.unpaidQuantity, price: item.price * grossRatio }))}\n          prepareSplitIntent={mode === 'split' && splitMode !== 'full' ? prepareSplit : undefined}\n          guestSessionId={guestSessionId}\n          locale={locale}\n          onSuccess={(amount) => completePaymentLocally(amount)}\n        />\n"""

single_sumup_then_stripe = """      ) : isSumupInline && selectedMethod && canStartPayment ? (\n        <SumupInlinePayment\n          key={`sumup-r1-${paymentMethodKey(selectedMethod)}-${order.orderId}`}\n          orderId={order.orderId}\n          table={bootstrap.table}\n          methodCode={selectedMethod.code}\n          providerCode={selectedMethod.providerCode}\n          amount={payableEstimate}\n          currency={bootstrap.restaurant.currency}\n          tipAmount={tipAmountEstimate}\n          couponCode={mode === 'split' ? null : couponCode.trim() || null}\n          couponDiscount={mode === 'split' ? 0 : couponDiscount}\n          selectedItems={selectedItemsPayload}\n          payerLabel={payerLabel}\n          items={order.items.filter((item) => item.unpaidQuantity > 0).map((item) => ({ id: String(item.orderMenuId || item.menuId), name: item.name, quantity: item.unpaidQuantity, price: item.price * grossRatio }))}\n          prepareSplitIntent={mode === 'split' && splitMode !== 'full' ? prepareSplit : undefined}\n          guestSessionId={guestSessionId}\n          locale={locale}\n          onSuccess={(amount) => completePaymentLocally(amount)}\n          onError={setMessage}\n        />\n      ) : isStripeInline && selectedMethod && canStartPayment ? (\n        <StripeInlinePayment\n          key={`r35c-${paymentMethodKey(selectedMethod)}-${order.orderId}`}\n          orderId={order.orderId}\n          table={bootstrap.table}\n          methodCode={selectedMethod.code}\n          providerCode={selectedMethod.providerCode}\n          amount={payableEstimate}\n          currency={bootstrap.restaurant.currency}\n          tipAmount={tipAmountEstimate}\n          couponCode={mode === 'split' ? null : couponCode.trim() || null}\n          couponDiscount={mode === 'split' ? 0 : couponDiscount}\n          selectedItems={selectedItemsPayload}\n          payerLabel={payerLabel}\n          items={order.items.filter((item) => item.unpaidQuantity > 0).map((item) => ({ id: String(item.orderMenuId || item.menuId), name: item.name, quantity: item.unpaidQuantity, price: item.price * grossRatio }))}\n          prepareSplitIntent={mode === 'split' && splitMode !== 'full' ? prepareSplit : undefined}\n          guestSessionId={guestSessionId}\n          locale={locale}\n          onSuccess={(amount) => completePaymentLocally(amount)}\n        />\n"""
replace_once(single_stripe, single_sumup_then_stripe, 'single-order SumUp render')

replace_once(
    "  const isStripeInline = Boolean(selectedMethod && selectedProvider === 'stripe' && ['card', 'apple_pay', 'google_pay'].includes(selectedCode))\n  const isPayPalInline =",
    "  const isStripeInline = Boolean(selectedMethod && selectedProvider === 'stripe' && ['card', 'apple_pay', 'google_pay'].includes(selectedCode))\n  const isSumupInline = Boolean(selectedMethod && selectedProvider === 'sumup' && selectedCode === 'card')\n  const isPayPalInline =",
    'multi-order SumUp predicate',
)

multi_stripe = """      ) : isStripeInline && selectedMethod && canStartPayment ? (\n        <StripeInlinePayment\n          key={`r35c-${paymentMethodKey(selectedMethod)}-${primaryOrderId}`}\n          orderId={primaryOrderId}\n          orderAllocations={orderAllocations}\n          table={bootstrap.table}\n          methodCode={selectedMethod.code}\n          providerCode={selectedMethod.providerCode}\n          amount={payable}\n          currency={bootstrap.restaurant.currency}\n          tipAmount={tipAmount}\n          couponCode={couponCode.trim() || null}\n          couponDiscount={couponDiscount}\n          selectedItems={null}\n          payerLabel=\"PMD V2 multi-order\"\n          items={providerItems}\n          guestSessionId={guestSessionId}\n          locale={locale}\n          onSuccess={() => completePaymentLocally()}\n        />\n"""

multi_sumup_then_stripe = """      ) : isSumupInline && selectedMethod && canStartPayment ? (\n        <SumupInlinePayment\n          key={`sumup-r1-${paymentMethodKey(selectedMethod)}-${primaryOrderId}`}\n          orderId={primaryOrderId}\n          orderAllocations={orderAllocations}\n          table={bootstrap.table}\n          methodCode={selectedMethod.code}\n          providerCode={selectedMethod.providerCode}\n          amount={payable}\n          currency={bootstrap.restaurant.currency}\n          tipAmount={tipAmount}\n          couponCode={couponCode.trim() || null}\n          couponDiscount={couponDiscount}\n          selectedItems={null}\n          payerLabel=\"PMD V2 multi-order\"\n          items={providerItems}\n          guestSessionId={guestSessionId}\n          locale={locale}\n          onSuccess={() => completePaymentLocally()}\n          onError={setMessage}\n        />\n      ) : isStripeInline && selectedMethod && canStartPayment ? (\n        <StripeInlinePayment\n          key={`r35c-${paymentMethodKey(selectedMethod)}-${primaryOrderId}`}\n          orderId={primaryOrderId}\n          orderAllocations={orderAllocations}\n          table={bootstrap.table}\n          methodCode={selectedMethod.code}\n          providerCode={selectedMethod.providerCode}\n          amount={payable}\n          currency={bootstrap.restaurant.currency}\n          tipAmount={tipAmount}\n          couponCode={couponCode.trim() || null}\n          couponDiscount={couponDiscount}\n          selectedItems={null}\n          payerLabel=\"PMD V2 multi-order\"\n          items={providerItems}\n          guestSessionId={guestSessionId}\n          locale={locale}\n          onSuccess={() => completePaymentLocally()}\n        />\n"""
replace_once(multi_stripe, multi_sumup_then_stripe, 'multi-order SumUp render')

if text == original:
    raise SystemExit('PATCH ERROR: no changes made')

for required in [
    "import { SumupInlinePayment } from './SumupInlinePayment'",
    "selectedProvider === 'sumup' && selectedCode === 'card'",
    'data-pmd-sumup-inline-widget',
]:
    if required == 'data-pmd-sumup-inline-widget':
        continue
    if required not in text:
        raise SystemExit(f'PATCH ERROR: missing marker {required}')

TARGET.write_text(text)
print(f'PATCHED={TARGET}')
print('SUMUP_INLINE_SINGLE=YES')
print('SUMUP_INLINE_MULTI=YES')
