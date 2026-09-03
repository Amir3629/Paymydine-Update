#!/usr/bin/env python3
from pathlib import Path
import runpy

BASE = Path(__file__).resolve().parents[1]
V2 = BASE / 'frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815'
R4 = BASE / 'scripts/pmd-square-runtime-terminal-r4.py'
RUNTIME = V2 / 'src/runtime/components/RuntimeOverlays.tsx'
ROUTES = BASE / 'routes/square-runtime.php'
PAYMENTS = BASE / 'app/admin/controllers/Payments.php'


def replace_once(path: Path, old: str, new: str, label: str):
    text = path.read_text()
    if new in text:
        print(f'PASS: {label} already applied')
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP: {label}: expected exactly 1 anchor, found {count}')
    path.write_text(text.replace(old, new, 1))
    print(f'PASS: {label}')


def insert_before_once(path: Path, anchor: str, block: str, marker: str, label: str):
    text = path.read_text()
    if marker in text:
        print(f'PASS: {label} already applied')
        return
    count = text.count(anchor)
    if count != 1:
        raise SystemExit(f'STOP: {label}: expected exactly 1 anchor, found {count}')
    path.write_text(text.replace(anchor, block + anchor, 1))
    print(f'PASS: {label}')


def insert_square_single_action_guard(path: Path):
    """Suppress the generic Pay button for Square wallets in PaymentPanel only.

    RuntimeOverlays also contains MultiOrderPaymentPanel with its own PayPal branch.
    A file-global anchor search can patch that unrelated component and reference
    isSquareSingleAction outside its scope. Restrict every search/replacement to
    the canonical single-order PaymentPanel and fail closed if scope is ambiguous.

    Production has existed in three valid Worldline generations:
      1) direct PayPal chain with no Worldline guard,
      2) hidden Worldline canonical anchor before PayPal,
      3) current Worldline null-chain: isWorldlineSingleAction ? null : PayPal.
    Square must compose with whichever generation is actually live without moving
    the flag into MultiOrderPaymentPanel.
    """
    text = path.read_text()
    panel_start_marker = 'function PaymentPanel('
    panel_end_marker = '\ntype R32MultiOrderCopy ='

    if text.count(panel_start_marker) != 1 or text.count(panel_end_marker) != 1:
        raise SystemExit('STOP: Square single-action PaymentPanel scope is ambiguous')

    panel_start = text.find(panel_start_marker)
    panel_end = text.find(panel_end_marker, panel_start)
    if panel_end < 0 or panel_end <= panel_start:
        raise SystemExit('STOP: Square single-action PaymentPanel end marker not found')

    panel = text[panel_start:panel_end]
    applied_variants = [
        ') : isSquareSingleAction ? null : isPayPalInline && selectedMethod && canStartPayment ? (',
        '{isSquareSingleAction ? null : isPayPalInline && selectedMethod && canStartPayment ? (',
        '{isWorldlineSingleAction ? null : isSquareSingleAction ? null : isPayPalInline && selectedMethod && canStartPayment ? (',
    ]

    if any(applied in panel for applied in applied_variants):
        print('PASS: Square wallets suppress the duplicate generic Pay action already applied in PaymentPanel')
    else:
        # Current live Worldline removes its old hidden canonical element and starts
        # the action chain with a null guard. Compose Square immediately after that
        # guard so each provider remains single-action and PayPal stays the fallback.
        worldline_null_target = '{isWorldlineSingleAction ? null : isPayPalInline && selectedMethod && canStartPayment ? ('
        worldline_null_count = panel.count(worldline_null_target)
        if worldline_null_count == 1:
            worldline_null_replacement = '{isWorldlineSingleAction ? null : isSquareSingleAction ? null : isPayPalInline && selectedMethod && canStartPayment ? ('
            panel = panel.replace(worldline_null_target, worldline_null_replacement, 1)
            print('PASS: Square wallets suppress the duplicate generic Pay action (current Worldline null-chain)')
        elif worldline_null_count > 1:
            raise SystemExit(f'STOP: Square wallets suppress duplicate Pay action: PaymentPanel Worldline null-chain is ambiguous ({worldline_null_count})')
        else:
            # Older trees can start the canonical single-order chain directly with PayPal.
            direct_target = '{isPayPalInline && selectedMethod && canStartPayment ? ('
            direct_count = panel.count(direct_target)
            if direct_count == 1:
                direct_replacement = '{isSquareSingleAction ? null : isPayPalInline && selectedMethod && canStartPayment ? ('
                panel = panel.replace(direct_target, direct_replacement, 1)
                print('PASS: Square wallets suppress the duplicate generic Pay action (single-order direct PayPal chain)')
            elif direct_count > 1:
                raise SystemExit(f'STOP: Square wallets suppress duplicate Pay action: PaymentPanel direct PayPal anchor is ambiguous ({direct_count})')
            else:
                # Intermediate trees have Worldline's hidden canonical anchor before PayPal.
                marker = 'data-pmd-worldline-canonical-anchor="true"'
                marker_at = panel.find(marker)
                if marker_at < 0:
                    raise SystemExit('STOP: Square wallets suppress duplicate Pay action: no recognized PaymentPanel PayPal anchor found')

                worldline_target = ') : isPayPalInline && selectedMethod && canStartPayment ? ('
                target_at = panel.find(worldline_target, marker_at)
                if target_at < 0:
                    raise SystemExit('STOP: Square wallets suppress duplicate Pay action: PayPal branch after Worldline anchor not found in PaymentPanel')
                if target_at - marker_at > 1600:
                    raise SystemExit('STOP: Square wallets suppress duplicate Pay action: PaymentPanel PayPal branch is unexpectedly far from Worldline anchor')

                replacement = ') : isSquareSingleAction ? null : isPayPalInline && selectedMethod && canStartPayment ? ('
                panel = panel[:target_at] + replacement + panel[target_at + len(worldline_target):]
                print('PASS: Square wallets suppress the duplicate generic Pay action (single-order Worldline hidden-anchor chain)')

        text = text[:panel_start] + panel + text[panel_end:]
        path.write_text(text)

    # Guard against the exact regression that previously passed the patcher but
    # failed TypeScript: MultiOrderPaymentPanel must never reference this local flag.
    verified = path.read_text()
    multi_start_marker = 'function MultiOrderPaymentPanel('
    multi_end_marker = '\nfunction getSafeGuestSession('
    if verified.count(multi_start_marker) != 1 or verified.count(multi_end_marker) != 1:
        raise SystemExit('STOP: Square single-action MultiOrderPaymentPanel scope is ambiguous')
    multi_start = verified.find(multi_start_marker)
    multi_end = verified.find(multi_end_marker, multi_start)
    multi = verified[multi_start:multi_end]
    if 'isSquareSingleAction' in multi:
        raise SystemExit('STOP: isSquareSingleAction leaked into MultiOrderPaymentPanel')

    single = verified[verified.find(panel_start_marker):verified.find(panel_end_marker, verified.find(panel_start_marker))]
    if 'const isSquareSingleAction = Boolean(' not in single:
        raise SystemExit('STOP: isSquareSingleAction declaration is missing from PaymentPanel')
    if 'isSquareSingleAction ? null : isPayPalInline' not in single:
        raise SystemExit('STOP: Square duplicate generic Pay suppression is missing from PaymentPanel')
    print('PASS: Square single-action flag is scoped only to PaymentPanel')


# Start from the fully validated R4 integration. R4 is idempotent on an already
# deployed R4 tree and repairs its own single-order anchor before running R1-R3.
runpy.run_path(str(R4), run_name='__main__')

# 1) Guest runtime must use the actual checkout/order currency as a fallback when
# LocationPlatformContext has no currency for an older tenant/location record.
replace_once(
    ROUTES,
    "            $currency = $platform->currencyCode($locationId);\n",
    "            $currency = strtoupper((string)($platform->currencyCode($locationId) ?: $request->query('currency', '')));\n",
    'Square runtime config uses order currency fallback',
)

# 2) Admin connection test must not say SUCCESS for a USD Square location while
# the saved provider currency is EUR. The configured provider currency is the
# fail-closed fallback when LocationPlatformContext has no currency yet.
replace_once(
    PAYMENTS,
    "            $restaurantCurrency = strtoupper((string)($platform->currencyCode() ?? ''));\n",
    "            $restaurantCurrency = strtoupper((string)($platform->currencyCode() ?: ($data['currency'] ?? '')));\n",
    'Square saved connection test uses configured currency fallback',
)
replace_once(
    PAYMENTS,
    "            $currencyOk = $squareCurrency === '' || $restaurantCurrency === '' || hash_equals($restaurantCurrency, $squareCurrency);\n",
    "            $currencyOk = $squareCurrency !== '' && $restaurantCurrency !== '' && hash_equals($restaurantCurrency, $squareCurrency);\n",
    'Square saved connection test requires exact currency match',
)

# 3) Wallets are React-owned by their payment-method tile. No second Apple/Google
# payment button is rendered underneath the method grid.
replace_once(
    RUNTIME,
    "import { SquareInlinePayment } from './SquareInlinePayment'\n",
    "import { SquareInlinePayment } from './SquareInlinePayment'\nimport { SquareDirectMethodButton } from './SquareDirectMethodButton'\n",
    'Square direct wallet import',
)
replace_once(
    RUNTIME,
    "  const isSquareInline = Boolean(selectedMethod && settlementMode === 'pay-existing' && selectedProvider === 'square' && ['card', 'apple_pay', 'google_pay'].includes(selectedCode))\n",
    "  const isSquareInline = Boolean(selectedMethod && selectedProvider === 'square' && selectedCode === 'card')\n  const isSquareSingleAction = Boolean(selectedMethod && selectedProvider === 'square' && ['apple_pay', 'google_pay'].includes(selectedCode))\n",
    'Square card and wallet render paths separated',
)

square_direct = r'''            const directSquare = entryProvider === 'square' && ['apple_pay', 'google_pay'].includes(entryCode)
            if (directSquare) {
              return (
                <SquareDirectMethodButton
                  key={key}
                  method={entry}
                  className={`${styles.method} ${methodKey === key ? styles.methodSelected : ''}`}
                  selected={methodKey === key}
                  disabled={busy || payableEstimate <= 0 || (requiresSelectedItems && !selectedItemsPayload?.length)}
                  orderId={order.orderId!}
                  table={bootstrap.table}
                  settlementMode={settlementMode}
                  amount={payableEstimate}
                  currency={bootstrap.restaurant.currency}
                  tipAmount={tipAmountEstimate}
                  couponCode={couponDiscount > 0 ? couponCode.trim() || null : null}
                  couponDiscount={couponDiscount}
                  selectedItems={selectedItemsPayload}
                  payerLabel={payerLabel}
                  guestSessionId={guestSessionId}
                  locale={locale}
                  prepareSplitIntent={mode === 'split' && splitMode !== 'full' ? prepareSplit : undefined}
                  onSelect={() => { setMethodKey(key); setMessage('') }}
                  onSuccess={(amount) => completePaymentLocally(amount)}
                  onError={setMessage}
                />
              )
            }
'''
insert_before_once(
    RUNTIME,
    "            const directWorldline = mode === 'payment' && entryProvider === 'worldline' && ['apple_pay', 'google_pay', 'paypal', 'wero'].includes(entryCode)\n",
    square_direct,
    "const directSquare = entryProvider === 'square'",
    'Square Apple Pay and Google Pay use their method tile as the action',
)

# Square card remains an inline PCI-hosted card form, but it now works for both
# pay-existing and start-finalize settlement modes. The key makes this anchor
# unique even though PayPal/SumUp/Stripe components share the same prop names.
square_card_old = '''        <SquareInlinePayment
          key={`square-r1-${paymentMethodKey(selectedMethod)}-${order.orderId}`}
          orderId={order.orderId}
          table={bootstrap.table}
          methodCode={selectedMethod.code}
          providerCode={selectedMethod.providerCode}
          amount={payableEstimate}
'''
square_card_new = '''        <SquareInlinePayment
          key={`square-r1-${paymentMethodKey(selectedMethod)}-${order.orderId}`}
          orderId={order.orderId}
          table={bootstrap.table}
          settlementMode={settlementMode}
          methodCode={selectedMethod.code}
          providerCode={selectedMethod.providerCode}
          amount={payableEstimate}
'''
replace_once(
    RUNTIME,
    square_card_old,
    square_card_new,
    'Square card receives settlement mode',
)

insert_square_single_action_guard(RUNTIME)

runtime = RUNTIME.read_text()
required = [
    "import { SquareDirectMethodButton } from './SquareDirectMethodButton'",
    "const isSquareInline = Boolean(selectedMethod && selectedProvider === 'square' && selectedCode === 'card')",
    "const isSquareSingleAction = Boolean(selectedMethod && selectedProvider === 'square' && ['apple_pay', 'google_pay'].includes(selectedCode))",
    "const directSquare = entryProvider === 'square'",
    "key={`square-r1-${paymentMethodKey(selectedMethod)}-${order.orderId}`}\n          orderId={order.orderId}\n          table={bootstrap.table}\n          settlementMode={settlementMode}",
    "isSquareSingleAction ? null : isPayPalInline",
]
for marker in required:
    if marker not in runtime:
        raise SystemExit(f'STOP: Square R5 runtime marker missing: {marker}')

# Ensure the old R4 wallet-inline gate cannot return and recreate the second button.
if "selectedProvider === 'square' && ['card', 'apple_pay', 'google_pay'].includes(selectedCode)" in runtime:
    raise SystemExit('STOP: old Square card+wallet inline gate remains')

routes = ROUTES.read_text()
if "request->query('currency', '')" not in routes:
    raise SystemExit('STOP: Square runtime order-currency fallback missing')

payments = PAYMENTS.read_text()
if "($data['currency'] ?? '')" not in payments or "$squareCurrency !== '' && $restaurantCurrency !== ''" not in payments:
    raise SystemExit('STOP: Square admin currency fail-closed test missing')

print('PASS: Square Apple Pay is single-action on its method tile')
print('PASS: Square Google Pay is single-action on its method tile')
print('PASS: Square Card remains inline and receives settlement mode')
print('PASS: Square runtime blocks seller/order currency mismatch before wallet UI')
print('PASS: Square admin connection test blocks configured/Square currency mismatch')
print('PASS: Square R5 UI/runtime patch sequence complete')