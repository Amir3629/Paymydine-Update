#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RUNTIME="$ROOT/app/Services/Payments/SquareRuntimeService.php"
ROUTES="$ROOT/routes/square-runtime.php"
TERMINAL="$ROOT/app/Services/TerminalPayments/SquareTerminalProvider.php"
QR="$ROOT/routes/qr-pay.php"
COUNTRY="$ROOT/app/Services/Platform/CountryPlatformProfileRegistry.php"
REGISTRY="$ROOT/app/Services/Payments/ProviderCapabilityRegistry.php"
TSX="$ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815/src/runtime/components/SquareInlinePayment.tsx"

for f in "$RUNTIME" "$ROUTES" "$TERMINAL" "$QR" "$COUNTRY" "$REGISTRY" "$TSX"; do
  test -s "$f" || { echo "[square-security] missing: $f"; exit 1; }
done

# PMD backend must never read raw PAN/CVV/expiry for Square.
if grep -nE "input\(['\"](pan|card_number|cardnumber|cvv|cvc|expiry|expiration)" "$ROUTES" "$RUNTIME" "$TERMINAL"; then
  echo "[square-security] FAIL: raw card input reaches PMD backend"
  exit 1
fi

# Access tokens must never be emitted into browser code.
if grep -nE "access_token|test_access_token|live_access_token" "$TSX"; then
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

# Germany must not claim Square as a production provider in the country profile.
if sed -n '/self::GERMANY => \[/,/self::TURKEY => \[/p' "$COUNTRY" | grep -q "'square' =>"; then
  echo "[square-security] FAIL: Germany still advertises Square live eligibility"
  exit 1
fi

# Only the implemented wallet set is advertised; Cash App remains catalogue-only.
grep -q "self::METHOD_APPLE_PAY" "$REGISTRY"
grep -q "self::METHOD_GOOGLE_PAY" "$REGISTRY"

# Square Web Payments SDK is environment-specific and browser receives only public IDs.
grep -q "sandbox.web.squarecdn.com/v1/square.js" "$RUNTIME"
grep -q "web.squarecdn.com/v1/square.js" "$RUNTIME"
grep -q "application_id" "$TSX"
grep -q "location_id" "$TSX"

echo "[square-security] PASS"
