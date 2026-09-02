#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INLINE="$ROOT/frontend/components/payment/secure-payment/WorldlineInlineCardForm.tsx"
PUBLIC_ROUTES="$ROOT/app/main/routes/worldline-public.php"
PROBE_ROUTES="$ROOT/routes/worldline-probe.php"
NATIVE_ROUTES="$ROOT/routes/worldline-native-card.php"
RUNTIME="$ROOT/app/Services/Payments/WorldlineConnectRuntimeService.php"
NATIVE_SERVICE="$ROOT/app/Services/Payments/WorldlineNativeCardService.php"
TERMINAL="$ROOT/app/Services/TerminalPayments/WorldlineTerminalProvider.php"
HOSTED_FLOW="$ROOT/frontend/features/customer-menu/checkout/paymentModalHostedCheckout.ts"
RETURN_FLOW="$ROOT/frontend/features/customer-menu/checkout/usePaymentReturnVerification.ts"
V2_ROOT="$ROOT/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
V2_CLIENT="$V2_ROOT/src/lib/client-api.ts"
V2_BOOTSTRAP="$V2_ROOT/src/server/bootstrap.ts"
V2_EMBED="$V2_ROOT/src/runtime/components/WorldlineEmbeddedCheckoutBridge.tsx"
V2_NATIVE="$V2_ROOT/src/runtime/components/WorldlineNativeCardForm.tsx"
V2_EMBED_RETURN="$V2_ROOT/app/payment/worldline-embedded-return/page.tsx"
V2_PACKAGE="$V2_ROOT/package.json"

fail() {
  echo "[worldline-security] FAIL: $1" >&2
  exit 1
}

for f in "$INLINE" "$PUBLIC_ROUTES" "$PROBE_ROUTES" "$NATIVE_ROUTES" "$RUNTIME" "$NATIVE_SERVICE" "$TERMINAL" "$HOSTED_FLOW" "$RETURN_FLOW" "$V2_CLIENT" "$V2_BOOTSTRAP" "$V2_EMBED" "$V2_NATIVE" "$V2_EMBED_RETURN" "$V2_PACKAGE"; do
  [[ -f "$f" ]] || fail "required Worldline runtime file is missing: $f"
done

# Legacy/raw-card APIs must stay retired. The only merchant-owned card-entry UI
# allowed is the V2 native form below, which encrypts in-browser with Worldline.
if grep -REq 'cardNumber|\bcvv\b|securityCode|onlinepayments-sdk-client-js|encryptedCustomerInput' \
  "$INLINE" "$HOSTED_FLOW" "$PROBE_ROUTES" "$RUNTIME" "$V2_CLIENT" "$V2_EMBED"; then
  fail "legacy Worldline runtime contains raw-card/inline-encryption markers"
fi

grep -q "connect-sdk-client-js" "$V2_PACKAGE" || fail "Frontend V2 does not pin the Worldline Client SDK"
grep -q "connect-sdk-client-js" "$V2_NATIVE" || fail "Worldline native card form does not use the official Client SDK"
grep -q 'getIinDetails' "$V2_NATIVE" || fail "Worldline native card form does not perform SDK IIN discovery"
grep -q 'getPaymentProduct' "$V2_NATIVE" || fail "Worldline native card form does not load the merchant card product"
grep -q 'getEncryptor().encrypt' "$V2_NATIVE" || fail "Worldline native card form does not encrypt with the Worldline SDK"
grep -q 'encrypted_customer_input' "$V2_NATIVE" || fail "Worldline native card form does not submit encrypted customer input"
grep -q 'clearSensitiveInputs' "$V2_NATIVE" || fail "Worldline native card form does not clear sensitive inputs after encryption"

if grep -Eq 'localStorage|sessionStorage|console\.(log|debug|info|warn|error)' "$V2_NATIVE"; then
  fail "Worldline native card form may not persist or log browser card data"
fi
if grep -Eq '(cardNumber|card_number|cvv|cvc|expiryDate|expiry_date)[[:space:]]*:' "$V2_NATIVE"; then
  fail "Worldline native card form appears to send raw card fields in an object payload"
fi

# Native PHP accepts encrypted input only and explicitly rejects raw field names.
grep -q 'worldline_raw_card_forbidden' "$NATIVE_ROUTES" || fail "Worldline native routes do not reject raw card fields"
grep -q 'encrypted_customer_input' "$NATIVE_ROUTES" || fail "Worldline native submit route does not require encrypted input"
grep -q 'encryptedCustomerInput' "$NATIVE_SERVICE" || fail "Worldline native service does not map encrypted input to the Connect SDK"
grep -q 'CallContext' "$NATIVE_SERVICE" || fail "Worldline native payment creation lacks provider idempotence context"
grep -q 'payments()->create' "$NATIVE_SERVICE" || fail "Worldline native service does not create the encrypted payment server-side"
grep -q 'payments()->get' "$NATIVE_SERVICE" || fail "Worldline native settlement does not retrieve authoritative provider status"
grep -q 'expected_amount_minor' "$NATIVE_SERVICE" || fail "Worldline native session does not bind expected amount"
grep -q 'expected_currency' "$NATIVE_SERVICE" || fail "Worldline native session does not bind expected currency"
grep -q 'merchant_reference' "$NATIVE_SERVICE" || fail "Worldline native session does not bind merchant reference"
grep -q 'hash_equals' "$NATIVE_SERVICE" || fail "Worldline native RETURNMAC/reference verification is not constant-time"
if grep -Eq 'Log::(info|warning|error).*encrypted|request->all\(\).*Log' "$NATIVE_SERVICE" "$NATIVE_ROUTES"; then
  fail "Worldline native runtime appears to log encrypted/raw payment payload material"
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

grep -q 'WorldlineEmbeddedCheckoutBridge' "$V2_EMBED" || fail "Frontend V2 Worldline bridge is missing"
grep -q 'WorldlineNativeCardForm' "$V2_EMBED" || fail "Frontend V2 bridge does not mount native Worldline card entry"
grep -q 'native_client_sdk' "$V2_EMBED" || fail "Worldline card session is not switched to native Client SDK mode"
grep -q '/api/v1/payments/worldline/native/card/create-session' "$V2_EMBED" || fail "Worldline native card session endpoint is not wired"
grep -q '/api/v1/payments/worldline/native/card/status' "$V2_EMBED" || fail "Worldline native card status verification is not wired"
grep -q '/api/v1/payments/worldline/native/card/return' "$V2_EMBED" || fail "Worldline native card 3DS return verification is not wired"
grep -q 'verification_ok' "$V2_EMBED" || fail "Worldline bridge can settle without verification"
grep -q 'allow="payment"' "$V2_EMBED" || fail "Worldline hosted/3DS iframe does not grant Payment Request permission"
if grep -q 'allow-popups-to-escape-sandbox' "$V2_EMBED"; then
  fail "Worldline iframe may not escape the PayMyDine payment overlay"
fi
grep -q 'worldline-solutions.com' "$V2_EMBED" || fail "Worldline hosted checkout redirect-domain allowlist is missing"
grep -q '/payment/worldline-embedded-return' "$V2_EMBED" || fail "Worldline embedded return bridge is missing"
grep -q 'pmd-worldline-embedded-return' "$V2_EMBED_RETURN" || fail "Worldline embedded return page does not signal its parent"
grep -q 'nativeSessionId' "$V2_EMBED_RETURN" || fail "Worldline embedded return does not bind native session id"
grep -q 'returnMac' "$V2_EMBED_RETURN" || fail "Worldline embedded return does not forward RETURNMAC proof"

grep -q 'redirect_url: null' "$V2_EMBED" || fail "Worldline bridge does not suppress unwanted top-level hosted redirect"
grep -q 'CREATE_SESSION_PATTERN' "$V2_EMBED" || fail "Worldline bridge lacks method-scoped interception"

grep -q 'expected_amount_minor' "$RUNTIME" || fail "Worldline hosted session does not bind expected amount"
grep -q 'expected_currency' "$RUNTIME" || fail "Worldline hosted session does not bind expected currency"
grep -q 'merchant_reference' "$RUNTIME" || fail "Worldline hosted session does not bind merchant reference"
grep -q 'payments()->get' "$RUNTIME" || fail "Worldline hosted settlement does not retrieve authoritative payment"
grep -q 'availablePaymentProducts' "$RUNTIME" || fail "Worldline runtime does not discover merchant-configured products"
grep -q 'products()->find' "$RUNTIME" || fail "Worldline runtime does not call Get payment products"
grep -q "'partialRedirectUrl'" "$RUNTIME" || fail "Worldline partial redirect handling missing"
grep -q "https://payment\." "$RUNTIME" || fail "Worldline MyCheckout payment subdomain normalization missing"
grep -q 'payment_intent_token' "$PROBE_ROUTES" || fail "Worldline split-payment intent authority is missing"
grep -q 'settled_amount' "$PROBE_ROUTES" || fail "Worldline full-payment remaining amount authority is missing"
grep -q 'worldline-native-card.php' "$PROBE_ROUTES" || fail "Worldline native routes are not loaded"

if grep -Eq "input\(['\"]cardNumber|input\(['\"]cvv" "$PROBE_ROUTES" "$NATIVE_ROUTES"; then
  fail "raw-card Worldline server input was introduced"
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
