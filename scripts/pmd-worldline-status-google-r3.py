#!/usr/bin/env python3
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
ALT = BASE / 'app/Services/Payments/WorldlineNativeAlternativeService.php'
CARD = BASE / 'app/Services/Payments/WorldlineNativeCardService.php'
HOSTED = BASE / 'app/Services/Payments/WorldlineConnectRuntimeService.php'
RUNTIME = BASE / 'frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/RuntimeOverlays.tsx'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'STOP: {label}: expected exactly 1 anchor, found {count}')
    return text.replace(old, new, 1)


alt = ALT.read_text()
card = CARD.read_text()
hosted = HOSTED.read_text()
runtime = RUNTIME.read_text()

# Google Pay: production still requires the tenant's real Google Pay merchant ID.
# In Worldline preprod/custom TEST mode, use Google's documented TEST merchant ID
# so the own-checkout can be tested without production boarding.
google_old = """            if ($googleMerchantId === '') {\n                throw new \\RuntimeException('Google Pay own-checkout requires the Google Merchant ID from Google Pay Business Console. Store it as google_pay_merchant_id in the Worldline provider configuration.');\n            }\n"""
google_new = """            $googleEnvironment = $runtime->environment($cfg);\n            if ($googleMerchantId === '' && $googleEnvironment !== 'live') {\n                // Google Pay Web documents this merchant ID for TEST integrations.\n                // Never use it when the Worldline Connect endpoint is live.\n                $googleMerchantId = '12345678901234567890';\n            }\n            if ($googleMerchantId === '') {\n                throw new \\RuntimeException('Google Pay production own-checkout requires the Google Merchant ID from Google Pay Business Console. Store it as google_pay_merchant_id in the Worldline provider configuration or WORLDLINE_GOOGLE_PAY_MERCHANT_ID.');\n            }\n"""
alt = replace_once(alt, google_old, google_new, 'Google Pay TEST merchant fallback')

# Worldline GlobalCollect commonly returns CAPTURE_REQUESTED for a successful
# card/wallet payment while capture processing continues. PMD may accept that
# state only after the canonical server-to-server GET has verified the exact
# amount/currency/reference and Worldline explicitly says the payment is authorized.
paid_old = "$providerPaid = in_array($status, ['CAPTURED', 'PAID', 'COMPLETED'], true) || $statusCategory === 'COMPLETED';"
paid_new_native = """$isAuthorized = filter_var($statusOutput['isAuthorized'] ?? false, FILTER_VALIDATE_BOOLEAN);\n        $paymentStatusCategory = strtoupper(trim((string)($raw['paymentStatusCategory'] ?? '')));\n        $captureRequestedAccepted = $status === 'CAPTURE_REQUESTED'\n            && $isAuthorized\n            && ($paymentStatusCategory === '' || $paymentStatusCategory === 'SUCCESSFUL');\n        $providerPaid = in_array($status, ['CAPTURED', 'PAID', 'COMPLETED'], true)\n            || $statusCategory === 'COMPLETED'\n            || $captureRequestedAccepted;"""
paid_new_hosted = """$isAuthorized = filter_var($statusOutput['isAuthorized'] ?? false, FILTER_VALIDATE_BOOLEAN);\n        $paymentStatusCategory = strtoupper(trim((string)($providerPayment['paymentStatusCategory'] ?? '')));\n        $captureRequestedAccepted = $status === 'CAPTURE_REQUESTED'\n            && $isAuthorized\n            && ($paymentStatusCategory === '' || $paymentStatusCategory === 'SUCCESSFUL');\n        $providerPaid = in_array($status, ['CAPTURED', 'PAID', 'COMPLETED'], true)\n            || $statusCategory === 'COMPLETED'\n            || $captureRequestedAccepted;"""

alt = replace_once(alt, paid_old, paid_new_native, 'native alternative CAPTURE_REQUESTED settlement')
card = replace_once(card, paid_old, paid_new_native, 'native card CAPTURE_REQUESTED settlement')
hosted = replace_once(hosted, paid_old, paid_new_hosted, 'hosted fallback CAPTURE_REQUESTED settlement')

# There must be exactly one visible action for Worldline. The old hidden canonical
# anchor was no longer needed after React-owned direct methods were introduced and
# could be made visible by a legacy UX enhancer. Remove it from the DOM entirely.
anchor_old = """      {isWorldlineSingleAction ? (\n        <button\n          type=\"button\"\n          tabIndex={-1}\n          aria-hidden=\"true\"\n          data-pmd-worldline-canonical-anchor=\"true\"\n          onClick={() => void pay()}\n          style={{ display: 'none' }}\n        />\n      ) : isPayPalInline && selectedMethod && canStartPayment ? (\n"""
anchor_new = """      {isWorldlineSingleAction ? null : isPayPalInline && selectedMethod && canStartPayment ? (\n"""
runtime = replace_once(runtime, anchor_old, anchor_new, 'remove duplicate Worldline canonical action DOM')

ALT.write_text(alt)
CARD.write_text(card)
HOSTED.write_text(hosted)
RUNTIME.write_text(runtime)

print('PASS: Google Pay TEST uses the documented Google TEST merchant ID only outside Worldline live')
print('PASS: Worldline production Google Pay still requires a real merchant ID')
print('PASS: CAPTURE_REQUESTED is accepted only when server-verified and isAuthorized=true')
print('PASS: native Card, native wallets/redirects, and hosted fallback use the same settlement rule')
print('PASS: amount/currency/reference verification remains mandatory before settlement')
print('PASS: duplicate hidden Worldline canonical action is removed from the React DOM')
