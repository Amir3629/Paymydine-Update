#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INLINE="$ROOT/frontend/components/payment/secure-payment/WorldlineInlineCardForm.tsx"
PUBLIC_ROUTES="$ROOT/app/main/routes/worldline-public.php"
PROBE_ROUTES="$ROOT/routes/worldline-probe.php"
RUNTIME="$ROOT/app/Services/Payments/WorldlineConnectRuntimeService.php"
TERMINAL="$ROOT/app/Services/TerminalPayments/WorldlineTerminalProvider.php"
HOSTED_FLOW="$ROOT/frontend/features/customer-menu/checkout/paymentModalHostedCheckout.ts"
RETURN_FLOW="$ROOT/frontend/features/customer-menu/checkout/usePaymentReturnVerification.ts"
V2_ROOT="$ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
V2_CLIENT="$V2_ROOT/src/lib/client-api.ts"
V2_BOOTSTRAP="$V2_ROOT/src/server/bootstrap.ts"
V2_EMBED="$V2_ROOT/src/runtime/components/WorldlineEmbeddedCheckoutBridge.tsx"
V2_EMBED_RETURN="$V2_ROOT/app/payment/worldline-embedded-return/page.tsx"

fail() {
  echo "[worldline-security] FAIL: $1" >&2
  exit 1
}

for f in "$INLINE" "$PUBLIC_ROUTES" "$PROBE_ROUTES" "$RUNTIME" "$TERMINAL" "$HOSTED_FLOW" "$RETURN_FLOW" "$V2_CLIENT" "$V2_BOOTSTRAP" "$V2_EMBED" "$V2_EMBED_RETURN"; do
  [[ -f "$f" ]] || fail "required Worldline runtime file is missing: $f"
done

if grep -REq 'cardNumber|\bcvv\b|securityCode|onlinepayments-sdk-client-js|encryptedCustomerInput' \
  "$INLINE" "$HOSTED_FLOW" "$PROBE_ROUTES" "$RUNTIME" "$V2_CLIENT" "$V2_EMBED"; then
  fail "merchant-owned Worldline runtime contains raw-card/inline-encryption markers"
fi

grep -q '/api/v1/payments/worldline/runtime/card/create-session' "$HOSTED_FLOW" || fail "legacy Worldline card runtime endpoint missing"
grep -q '/api/v1/payments/worldline/runtime/apple-pay/create-session' "$HOSTED_FLOW" || fail "legacy Worldline Apple Pay runtime endpoint missing"
grep -q '/api/v1/payments/worldline/runtime/google-pay/create-session' "$HOSTED_FLOW" || fail "legacy Worldline Google Pay runtime endpoint missing"
grep -q '/api/v1/payments/worldline/runtime/wero/create-session' "$HOSTED_FLOW" || fail "legacy Worldline Wero runtime endpoint missing"
grep -q '/api/v1/payments/worldline/runtime/paypal/create-session' "$HOSTED_FLOW" || fail "legacy Worldline PayPal runtime endpoint missing"
grep -q '/api/v1/payments/worldline/runtime/status' "$RETURN_FLOW" || fail "legacy verified Worldline return endpoint missing"
grep -q 'verification_ok' "$RETURN_FLOW" || fail "legacy Worldline return flow does not require settlement verification"

grep -q '/api/v1/payments/worldline/runtime/' "$V2_CLIENT" || fail "Frontend V2 does not route Worldline through canonical runtime"
grep -q '/api/v1/payments/worldline/runtime/status' "$V2_CLIENT" || fail "Frontend V2 Worldline return verifier is not canonical"
grep -q '/api/v1/payments/worldline/runtime-methods' "$V2_BOOTSTRAP" || fail "Frontend V2 does not load canonical Worldline methods"

grep -q 'WorldlineEmbeddedCheckoutBridge' "$V2_EMBED" || fail "Frontend V2 embedded Worldline bridge is missing"
grep -q 'data-pmd-worldline-embedded' "$V2_EMBED" || fail "Worldline embedded checkout marker is missing"
grep -q 'allow="payment"' "$V2_EMBED" || fail "Worldline iframe does not grant the Payment Request permission"
grep -q 'sandbox="allow-scripts' "$V2_EMBED" || fail "Worldline iframe sandbox is missing"
if grep -q 'allow-popups-to-escape-sandbox' "$V2_EMBED"; then
  fail "Worldline iframe may not escape the PayMyDine payment overlay"
fi
grep -q 'worldline-solutions.com' "$V2_EMBED" || fail "Worldline iframe redirect-domain allowlist is missing"
grep -q '/payment/worldline-embedded-return' "$V2_EMBED" || fail "Worldline embedded return bridge is missing"
grep -q '/api/v1/payments/worldline/runtime/status' "$V2_EMBED" || fail "Embedded Worldline checkout does not poll verified server status"
grep -q 'verification_ok' "$V2_EMBED" || fail "Embedded Worldline checkout can settle without verification"
grep -q 'pmd-worldline-embedded-return' "$V2_EMBED_RETURN" || fail "Worldline embedded return page does not signal its parent"

grep -q 'redirect_url: null' "$V2_EMBED" || fail "Worldline embedded bridge does not suppress top-level redirect"
grep -q 'CREATE_SESSION_PATTERN' "$V2_EMBED" || fail "Worldline embedded bridge lacks method-scoped interception"

grep -q 'expected_amount_minor' "$RUNTIME" || fail "Worldline session does not bind expected amount"
grep -q 'expected_currency' "$RUNTIME" || fail "Worldline session does not bind expected currency"
grep -q 'merchant_reference' "$RUNTIME" || fail "Worldline session does not bind merchant reference"
grep -q 'payments()->get' "$RUNTIME" || fail "Worldline settlement does not retrieve authoritative payment"
grep -q 'availablePaymentProducts' "$RUNTIME" || fail "Worldline runtime does not discover merchant-configured products"
grep -q 'products()->find' "$RUNTIME" || fail "Worldline runtime does not call Get payment products"
grep -q "'partialRedirectUrl'" "$RUNTIME" || fail "Worldline partial redirect handling missing"
grep -q "https://payment\." "$RUNTIME" || fail "Worldline MyCheckout payment subdomain normalization missing"
grep -q 'payment_intent_token' "$PROBE_ROUTES" || fail "Worldline split-payment intent authority is missing"
grep -q 'settled_amount' "$PROBE_ROUTES" || fail "Worldline full-payment remaining amount authority is missing"

if grep -Eq "input\(['\"]cardNumber|input\(['\"]cvv" "$PROBE_ROUTES"; then
  fail "legacy raw-card Worldline probe was reintroduced"
fi

grep -q 'X-GCS-Webhooks-Endpoint-Verification' "$PUBLIC_ROUTES" || fail "Worldline webhook endpoint verification is missing"
grep -q 'X-GCS-Signature' "$PUBLIC_ROUTES" || fail "Worldline webhook signature header check is missing"
grep -q 'X-GCS-KeyId' "$PUBLIC_ROUTES" || fail "Worldline webhook key-id check is missing"
grep -q "hash_hmac('sha256'" "$PUBLIC_ROUTES" || fail "Worldline webhook HMAC-SHA256 verification is missing"
grep -q 'hash_equals' "$PUBLIC_ROUTES" || fail "constant-time signature/RETURNMAC comparison is missing"
if grep -Eq 'headers->all\(|getContent\(\).*Log|payload.*request->all\(' "$PUBLIC_ROUTES"; then
  fail "Worldline public route appears to log raw webhook material"
fi

grep -q 'implements TerminalPaymentProviderInterface' "$TERMINAL" || fail "Worldline terminal adapter is not active"
grep -q 'WORLDLINE_TERMINAL_API_TOKEN' "$TERMINAL" || fail "Worldline terminal adapter lacks separate Terminal API token gate"
grep -q '/payments/sync' "$TERMINAL" || fail "Worldline terminal adapter is not using the documented synchronous endpoint"
grep -q '5.1-WL1.0.0' "$TERMINAL" || fail "Worldline terminal adapter protocol version is missing"

echo "[worldline-security] PASS"