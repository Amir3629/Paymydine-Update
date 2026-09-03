#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
V2="$ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
RUNTIME="$ROOT/app/Services/Payments/SquareRuntimeService.php"
ROUTES="$ROOT/routes/square-runtime.php"
TERMINAL="$ROOT/app/Services/TerminalPayments/SquareTerminalProvider.php"
QR="$ROOT/routes/qr-pay.php"
COUNTRY="$ROOT/app/Services/Platform/CountryPlatformProfileRegistry.php"
REGISTRY="$ROOT/app/Services/Payments/ProviderCapabilityRegistry.php"
CARD="$V2/src/runtime/components/SquareInlinePayment.tsx"
DIRECT="$V2/src/runtime/components/SquareDirectMethodButton.tsx"
OVERLAYS="$V2/src/runtime/components/RuntimeOverlays.tsx"

for f in "$RUNTIME" "$ROUTES" "$TERMINAL" "$QR" "$COUNTRY" "$REGISTRY" "$CARD" "$DIRECT" "$OVERLAYS"; do
  test -s "$f" || { echo "[square-security] missing: $f"; exit 1; }
done

# PMD backend must never read raw PAN/CVV/expiry for Square.
if grep -nE "input\(['\"](pan|card_number|cardnumber|cvv|cvc|expiry|expiration)" "$ROUTES" "$RUNTIME" "$TERMINAL"; then
  echo "[square-security] FAIL: raw card input reaches PMD backend"
  exit 1
fi

# Access tokens must never be emitted into browser code.
if grep -nE "access_token|test_access_token|live_access_token" "$CARD" "$DIRECT"; then
  echo "[square-security] FAIL: Square access token referenced by frontend"
  exit 1
fi

grep -q "SQUARE_PAY_EXISTING_SERVER_VERIFIED_R1" "$QR"
grep -q "verifyPayment(" "$QR"
grep -q "x-square-hmacsha256-signature" "$ROUTES"
grep -q "hash_equals" "$ROUTES"
grep -q "settled' => false" "$ROUTES"
grep -q "payment_ids" "$TERMINAL"
grep -q "verifyPayment(" "$TERMINAL"
grep -q "SUPPORTED_SELLER_COUNTRIES" "$RUNTIME"

# Exact seller/order/provider currency is part of the payment boundary.
grep -q "configuredCurrency" "$RUNTIME"
grep -q "Square location currency" "$RUNTIME"
grep -q "request->query('currency', '')" "$ROUTES"
grep -q "currency: String(props.currency" "$CARD"
grep -q "currency: String(props.currency" "$DIRECT"

# Germany must not claim Square as a production provider in the country profile.
# Extract only the Germany top-level profile, stopping at whichever country comes
# next. This remains correct when Canada is inserted between Germany and Türkiye.
GERMANY_PROFILE="$(awk '
  /^[[:space:]]*self::GERMANY => \[/ { in_de=1; next }
  in_de && /^[[:space:]]*self::[A-Z_]+ => \[/ { exit }
  in_de { print }
' "$COUNTRY")"
if printf '%s\n' "$GERMANY_PROFILE" | grep -q "'square' =>"; then
  echo "[square-security] FAIL: Germany still advertises Square live eligibility"
  exit 1
fi

# Only the implemented wallet set is advertised; Cash App remains catalogue-only.
grep -q "self::METHOD_APPLE_PAY" "$REGISTRY"
grep -q "self::METHOD_GOOGLE_PAY" "$REGISTRY"

# Square Web Payments SDK is environment-specific and browser receives only public IDs.
grep -q "sandbox.web.squarecdn.com/v1/square.js" "$RUNTIME"
grep -q "web.squarecdn.com/v1/square.js" "$RUNTIME"
grep -q "application_id" "$CARD"
grep -q "location_id" "$CARD"
grep -q "application_id" "$DIRECT"
grep -q "location_id" "$DIRECT"

# Wallet action must stay inside the user click stack. In particular Apple Pay
# must tokenize before any split-intent/network await is started.
grep -q "const tokenResultPromise = wallet.tokenize()" "$DIRECT"
grep -q "const tokenResult = await tokenResultPromise" "$DIRECT"
grep -q "const intent = await prepareIntent()" "$DIRECT"
TOKENIZE_LINE="$(grep -n "const tokenResultPromise = wallet.tokenize()" "$DIRECT" | head -n1 | cut -d: -f1)"
INTENT_LINE="$(grep -n "const intent = await prepareIntent()" "$DIRECT" | tail -n1 | cut -d: -f1)"
if [ -z "$TOKENIZE_LINE" ] || [ -z "$INTENT_LINE" ] || [ "$TOKENIZE_LINE" -ge "$INTENT_LINE" ]; then
  echo "[square-security] FAIL: wallet tokenization no longer precedes split-intent preparation"
  exit 1
fi

# One-visible-control UX: Square wallets are owned by the single-order method tile
# and the generic lower Pay action is suppressed. The flag must stay inside
# PaymentPanel; MultiOrderPaymentPanel deliberately remains Square-disabled/fail-closed.
grep -q "SquareDirectMethodButton" "$OVERLAYS"
grep -q "selectedProvider === 'square' && selectedCode === 'card'" "$OVERLAYS"
PAYMENT_PANEL="$(sed -n '/^function PaymentPanel(/,/^type R32MultiOrderCopy =/p' "$OVERLAYS")"
MULTI_PANEL="$(sed -n '/^function MultiOrderPaymentPanel(/,/^function getSafeGuestSession(/p' "$OVERLAYS")"
printf '%s\n' "$PAYMENT_PANEL" | grep -q "const isSquareSingleAction = Boolean("
printf '%s\n' "$PAYMENT_PANEL" | grep -q "isSquareSingleAction ? null : isPayPalInline"
if printf '%s\n' "$MULTI_PANEL" | grep -q "isSquareSingleAction"; then
  echo "[square-security] FAIL: Square single-action flag leaked into MultiOrderPaymentPanel"
  exit 1
fi
if grep -q "selectedProvider === 'square' && \['card', 'apple_pay', 'google_pay'\].includes(selectedCode)" "$OVERLAYS"; then
  echo "[square-security] FAIL: old duplicate Square wallet inline gate returned"
  exit 1
fi

# Card stays inside Square's PCI iframe and uses only provider-supported styling.
grep -q "payments.card({ style: PMD_SQUARE_CARD_STYLE })" "$CARD"
grep -q "finalizeExistingOrderPayment" "$CARD"

echo "[square-security] PASS"