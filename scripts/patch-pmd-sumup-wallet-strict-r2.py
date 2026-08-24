#!/usr/bin/env python3
from pathlib import Path
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: patch-pmd-sumup-wallet-strict-r2.py <stage-root>')

root = Path(sys.argv[1])


def read(rel):
    path = root / rel
    if not path.exists():
        raise SystemExit(f'ERROR: missing target: {rel}')
    return path, path.read_text()


def replace_once(rel, old, new, label):
    path, text = read(rel)
    if new in text:
        print(f'{label}=ALREADY_PATCHED')
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'ERROR: {label}: expected 1 anchor, found {count}: {rel}')
    path.write_text(text.replace(old, new, 1))
    print(f'{label}=PATCHED')


service_rel = 'app/Services/Payments/SumupOnlineCheckoutService.php'
routes_rel = 'app/main/routes_sumup_self_service.php'
front_rel = 'frontend-v2/src/runtime/components/SumupInlinePayment.tsx'
wallet_js_rel = 'app/admin/assets/js/pmd-sumup-inline-wallet-settings-v1.js'

# Backend receives the exact PMD method selected by the guest. Card/Wallet keeps
# the full eligible SumUp allowlist; standalone Apple Pay / Google Pay are strict.
replace_once(
    service_rel,
    "    public function createWidgetCheckout(array $payload): array\n    {\n        $config = $this->activeConfig();\n\n        $amount = round((float)($payload['amount'] ?? 0), 2);",
    "    public function createWidgetCheckout(array $payload): array\n    {\n        $config = $this->activeConfig();\n\n        // PMD_SUMUP_WALLET_STRICT_R2\n        // Carry the guest-selected PMD payment method all the way to the\n        // provider boundary. Standalone wallets may never silently fall back\n        // to card fields. The Card / Wallet row intentionally keeps the full\n        // eligible SumUp method list.\n        $requestedMethod = strtolower(trim((string)($payload['payment_method'] ?? 'card')));\n        if (!in_array($requestedMethod, self::PMD_WIDGET_METHODS, true)) {\n            throw new RuntimeException('Unsupported SumUp payment method.');\n        }\n\n        $amount = round((float)($payload['amount'] ?? 0), 2);",
    'BACKEND_REQUESTED_METHOD',
)

replace_once(
    service_rel,
    "        if ($methods === []) {\n            $methods = ['card'];\n        }\n\n        Log::channel('sumup')->info('SUMUP_WIDGET_CHECKOUT_CREATED', [",
    "        if ($requestedMethod === 'google_pay' && !($wallets['google_pay']['configured'] ?? false)) {\n            throw new RuntimeException('Google Pay is not configured for this restaurant yet. Complete Google Pay web approval, then save the Google Merchant ID and Merchant Name in PayMyDine.');\n        }\n\n        if ($requestedMethod !== 'card') {\n            if (!in_array($requestedMethod, $methods, true)) {\n                $label = $requestedMethod === 'apple_pay' ? 'Apple Pay' : 'Google Pay';\n                throw new RuntimeException($label.' is not available for this SumUp checkout. Check wallet onboarding, domain registration and the current browser/device.');\n            }\n            $methods = [$requestedMethod];\n        } elseif ($methods === []) {\n            $methods = ['card'];\n        }\n\n        Log::channel('sumup')->info('SUMUP_WIDGET_CHECKOUT_CREATED', [",
    'BACKEND_STRICT_METHOD_FILTER',
)

replace_once(
    service_rel,
    "            'currency' => $currency,\n            'available_payment_methods' => $methods,",
    "            'currency' => $currency,\n            'requested_payment_method' => $requestedMethod,\n            'available_payment_methods' => $methods,",
    'BACKEND_LOG_REQUESTED_METHOD',
)

replace_once(
    service_rel,
    "            'status' => strtolower(trim((string)($body['status'] ?? 'pending'))) ?: 'pending',\n            'available_payment_methods' => $methods,",
    "            'status' => strtolower(trim((string)($body['status'] ?? 'pending'))) ?: 'pending',\n            'requested_payment_method' => $requestedMethod,\n            'available_payment_methods' => $methods,",
    'BACKEND_RESPONSE_REQUESTED_METHOD',
)

replace_once(
    routes_rel,
    "                'return_url' => ['required', 'url', 'max:1200'],\n                'merchant_reference' => ['nullable', 'string', 'max:191'],\n                'items' => ['nullable', 'array'],",
    "                'return_url' => ['required', 'url', 'max:1200'],\n                'merchant_reference' => ['nullable', 'string', 'max:191'],\n                'payment_method' => ['nullable', 'string', 'in:card,apple_pay,google_pay'],\n                'items' => ['nullable', 'array'],",
    'ROUTE_PAYMENT_METHOD_VALIDATION',
)

# Frontend sends the selected method to the backend and independently filters the
# SumUp widget. This gives us two authorities agreeing on the same method.
front_path, front = read(front_rel)
if 'function requestedSumupMethods(methodCode: string)' not in front:
    anchor = "const DEFAULT_SDK = 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js'\nconst PMD_METHOD_ALLOWLIST = ['card', 'apple_pay', 'google_pay']\nlet sumupScriptPromise: Promise<void> | null = null"
    replacement = """const DEFAULT_SDK = 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js'
const PMD_METHOD_ALLOWLIST = ['card', 'apple_pay', 'google_pay']

function requestedSumupMethods(methodCode: string): string[] {
  const code = String(methodCode || 'card').toLowerCase()
  if (code === 'apple_pay') return ['apple_pay']
  if (code === 'google_pay') return ['google_pay']
  return PMD_METHOD_ALLOWLIST
}

let sumupScriptPromise: Promise<void> | null = null"""
    if anchor not in front:
        raise SystemExit('ERROR: frontend allowlist anchor missing')
    front = front.replace(anchor, replacement, 1)

if 'payment_method: props.methodCode,' not in front:
    anchor = "          order_id: props.orderId,\n          amount,"
    if anchor not in front:
        raise SystemExit('ERROR: frontend checkout request anchor missing')
    front = front.replace(anchor, "          order_id: props.orderId,\n          payment_method: props.methodCode,\n          amount,", 1)

old_methods = """        const methods = (checkout.widget?.allowed_payment_methods || checkout.available_payment_methods || ['card'])
          .map((value) => String(value || '').toLowerCase())
          .filter((value) => PMD_METHOD_ALLOWLIST.includes(value))
        const allowedMethods = methods.length ? Array.from(new Set(methods)) : ['card']
        setAvailableMethods(allowedMethods)
"""
new_methods = """        const requestedMethods = requestedSumupMethods(props.methodCode)
        const methods = (checkout.widget?.allowed_payment_methods || checkout.available_payment_methods || [])
          .map((value) => String(value || '').toLowerCase())
          .filter((value) => requestedMethods.includes(value))
        const allowedMethods = Array.from(new Set(methods))
        if (!allowedMethods.length) {
          const requestedLabel = props.methodCode === 'apple_pay'
            ? 'Apple Pay'
            : props.methodCode === 'google_pay'
              ? 'Google Pay'
              : 'Card / Wallet'
          throw new Error(`${requestedLabel} is not available for this SumUp checkout. Check wallet onboarding, domain eligibility and the current browser/device.`)
        }
        setAvailableMethods(allowedMethods)
"""
if old_methods in front:
    front = front.replace(old_methods, new_methods, 1)
elif 'const requestedMethods = requestedSumupMethods(props.methodCode)' not in front:
    raise SystemExit('ERROR: frontend strict method filter anchor missing')

# Make the UI visibly prove which PMD method is being rendered.
if 'data-pmd-sumup-method={props.methodCode}' not in front:
    front = front.replace(
        'data-pmd-sumup-inline-widget="r1"',
        'data-pmd-sumup-inline-widget="r1" data-pmd-sumup-method={props.methodCode}',
        1,
    )

# Standalone wallet copy should not call itself Card / Wallet.
if 'const requestedMethodTitle =' not in front:
    anchor = "  const payableAmount = preparedIntentRef.current?.payableAmount ?? props.amount\n  const methodSummary = availableMethods"
    replacement = """  const payableAmount = preparedIntentRef.current?.payableAmount ?? props.amount
  const requestedMethodTitle = props.methodCode === 'apple_pay'
    ? 'Apple Pay'
    : props.methodCode === 'google_pay'
      ? 'Google Pay'
      : copy.secure
  const methodSummary = availableMethods"""
    if anchor not in front:
        raise SystemExit('ERROR: frontend requested method title anchor missing')
    front = front.replace(anchor, replacement, 1)
    front = front.replace('{copy.secure}</div>', '{requestedMethodTitle}</div>', 1)

front_path.write_text(front)
print('FRONTEND_STRICT_WALLET_METHOD=PATCHED')

# Explain the owner workflow accurately: Apple file hosting is PMD-managed;
# Google production approval is an external Google requirement.
wallet_path, wallet_js = read(wallet_js_rel)
old_note = "Apple Pay: register every domain/subdomain that will show the Apple Pay option. Apple Pay and Google Pay domain onboarding is managed in SumUp Dashboard → Settings → For developers → Payment wallets. Wero is not part of the current SumUp online-method list and stays with its configured provider."
new_note = "Apple Pay: PayMyDine hosts the Apple verification file automatically on every PMD tenant domain; register the restaurant domain once in SumUp → Payment wallets. Google Pay production still requires Google web approval and a Google Merchant ID. Wero is not a SumUp online method."
if old_note in wallet_js:
    wallet_path.write_text(wallet_js.replace(old_note, new_note, 1))
    print('OWNER_WALLET_NOTE=PATCHED')
elif new_note in wallet_js:
    print('OWNER_WALLET_NOTE=ALREADY_PATCHED')
else:
    raise SystemExit('ERROR: wallet owner note anchor missing')

# Final contract checks.
for rel, needle in [
    (service_rel, 'PMD_SUMUP_WALLET_STRICT_R2'),
    (service_rel, "requested_payment_method' => $requestedMethod"),
    (routes_rel, "'payment_method' => ['nullable', 'string', 'in:card,apple_pay,google_pay']"),
    (front_rel, 'payment_method: props.methodCode'),
    (front_rel, 'const requestedMethods = requestedSumupMethods(props.methodCode)'),
    (front_rel, 'data-pmd-sumup-method={props.methodCode}'),
]:
    _, text = read(rel)
    if needle not in text:
        raise SystemExit(f'ERROR: final contract missing {needle}: {rel}')

print('PMD_SUMUP_WALLET_STRICT_R2=OK')
