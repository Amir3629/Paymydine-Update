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

fail() {
  echo "[worldline-security] FAIL: $1" >&2
  exit 1
}

for f in "$INLINE" "$PUBLIC_ROUTES" "$PROBE_ROUTES" "$RUNTIME" "$TERMINAL" "$HOSTED_FLOW" "$RETURN_FLOW"; do
  [[ -f "$f" ]] || fail "required Worldline runtime file is missing: $f"
done

# Merchant-owned code must never collect or transport raw card credentials.
if grep -REq 'cardNumber|\bcvv\b|securityCode|onlinepayments-sdk-client-js|encryptedCustomerInput' \
  "$INLINE" "$HOSTED_FLOW" "$PROBE_ROUTES" "$RUNTIME"; then
  fail "merchant-owned Worldline runtime contains raw-card/inline-encryption markers"
fi

# All customer Worldline methods use the provider-hosted, order-bound runtime.
grep -q '/api/v1/payments/worldline/runtime/card/create-session' "$HOSTED_FLOW" || fail "Worldline card runtime endpoint missing"
grep -q '/api/v1/payments/worldline/runtime/apple-pay/create-session' "$HOSTED_FLOW" || fail "Worldline Apple Pay runtime endpoint missing"
grep -q '/api/v1/payments/worldline/runtime/google-pay/create-session' "$HOSTED_FLOW" || fail "Worldline Google Pay runtime endpoint missing"
grep -q '/api/v1/payments/worldline/runtime/wero/create-session' "$HOSTED_FLOW" || fail "Worldline Wero runtime endpoint missing"
grep -q '/api/v1/payments/worldline/runtime/paypal/create-session' "$HOSTED_FLOW" || fail "Worldline PayPal runtime endpoint missing"
grep -q '/api/v1/payments/worldline/runtime/status' "$RETURN_FLOW" || fail "verified Worldline return endpoint missing"
grep -q 'verification_ok' "$RETURN_FLOW" || fail "Worldline return flow does not require settlement verification"

grep -q 'expected_amount_minor' "$RUNTIME" || fail "Worldline session does not bind expected amount"
grep -q 'expected_currency' "$RUNTIME" || fail "Worldline session does not bind expected currency"
grep -q 'merchant_reference' "$RUNTIME" || fail "Worldline session does not bind merchant reference"
grep -q 'payments()->get' "$RUNTIME" || fail "Worldline settlement does not retrieve authoritative payment"

# Historical raw-card probe must stay dead.
if grep -Eq "input\(['\"]cardNumber|input\(['\"]cvv" "$PROBE_ROUTES"; then
  fail "legacy raw-card Worldline probe was reintroduced"
fi

# Public webhook keeps exact-body HMAC verification and no raw dumps.
grep -q 'X-GCS-Signature' "$PUBLIC_ROUTES" || fail "Worldline webhook signature header check is missing"
grep -q 'X-GCS-KeyId' "$PUBLIC_ROUTES" || fail "Worldline webhook key-id check is missing"
grep -q "hash_hmac('sha256'" "$PUBLIC_ROUTES" || fail "Worldline webhook HMAC-SHA256 verification is missing"
grep -q 'hash_equals' "$PUBLIC_ROUTES" || fail "constant-time signature/RETURNMAC comparison is missing"
if grep -Eq 'headers->all\(|getContent\(\).*Log|payload.*request->all\(' "$PUBLIC_ROUTES"; then
  fail "Worldline public route appears to log raw webhook material"
fi

# Terminal API must use a separate bearer token and documented cloud endpoint.
grep -q 'implements TerminalPaymentProviderInterface' "$TERMINAL" || fail "Worldline terminal adapter is not active"
grep -q 'WORLDLINE_TERMINAL_API_TOKEN' "$TERMINAL" || fail "Worldline terminal adapter lacks separate Terminal API token gate"
grep -q '/payments/sync' "$TERMINAL" || fail "Worldline terminal adapter is not using the documented synchronous endpoint"
grep -q '5.1-WL1.0.0' "$TERMINAL" || fail "Worldline terminal adapter protocol version is missing"

echo "[worldline-security] PASS"
