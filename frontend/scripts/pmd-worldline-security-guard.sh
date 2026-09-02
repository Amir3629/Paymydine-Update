#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
INLINE="$ROOT/frontend/components/payment/secure-payment/WorldlineInlineCardForm.tsx"
PUBLIC_ROUTES="$ROOT/app/main/routes/worldline-public.php"
PROBE_ROUTES="$ROOT/routes/worldline-probe.php"
TERMINAL="$ROOT/app/Services/TerminalPayments/WorldlineTerminalProvider.php"

fail() {
  echo "[worldline-security] FAIL: $1" >&2
  exit 1
}

[[ -f "$INLINE" ]] || fail "Worldline checkout component is missing"
[[ -f "$PUBLIC_ROUTES" ]] || fail "Worldline public route file is missing"
[[ -f "$PROBE_ROUTES" ]] || fail "Worldline probe tombstone is missing"
[[ -f "$TERMINAL" ]] || fail "Worldline terminal adapter is missing"

# The merchant-owned frontend must never collect or debug raw card credentials.
if grep -Eq 'cardNumber|\bcvv\b|securityCode|onlinepayments-sdk-client-js|encryptedCustomerInput' "$INLINE"; then
  fail "merchant-owned Worldline UI contains raw-card/inline encryption markers"
fi

grep -q '/api/v1/payments/card/create-session' "$INLINE" \
  || fail "Worldline card UI is not using the canonical hosted-provider endpoint"

# Historical raw-card probe must stay dead.
if grep -Eq "Route::.*raw-card-probe|input\(['\"]cardNumber|input\(['\"]cvv" "$PROBE_ROUTES"; then
  fail "legacy raw-card Worldline probe was reintroduced"
fi

# Public webhook must verify the exact raw body and must not dump request bodies/headers.
grep -q 'X-GCS-Signature' "$PUBLIC_ROUTES" || fail "Worldline webhook signature header check is missing"
grep -q 'X-GCS-KeyId' "$PUBLIC_ROUTES" || fail "Worldline webhook key-id check is missing"
grep -q "hash_hmac('sha256'" "$PUBLIC_ROUTES" || fail "Worldline webhook HMAC-SHA256 verification is missing"
grep -q 'hash_equals' "$PUBLIC_ROUTES" || fail "constant-time signature/RETURNMAC comparison is missing"

if grep -Eq 'headers->all\(|getContent\(\).*Log|payload.*request->all\(' "$PUBLIC_ROUTES"; then
  fail "Worldline public route appears to log raw webhook material"
fi

# Terminal stays fail closed until Worldline supplies/certifies the concrete contract.
grep -q 'extends NullTerminalProvider' "$TERMINAL" \
  || fail "Worldline terminal adapter became active without updating the security gate"

echo "[worldline-security] PASS"
