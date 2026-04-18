#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${PMD_BASE_URL:-https://mimoza.paymydine.com}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

fail() {
  echo "[FAIL] $1"
  exit 1
}

pass() {
  echo "[PASS] $1"
}

post_json() {
  local url="$1"
  local data="$2"
  local out="$3"
  local code
  code=$(curl -sS -o "$out" -w "%{http_code}" -H 'Content-Type: application/json' -H 'Accept: application/json' -X POST "$url" -d "$data")
  echo "$code"
}

get_json() {
  local url="$1"
  local out="$2"
  local code
  code=$(curl -sS -o "$out" -w "%{http_code}" -H 'Accept: application/json' "$url")
  echo "$code"
}

PAYMENTS_OUT="$TMP_DIR/payments.json"
PAYMENTS_CODE=$(get_json "$BASE_URL/api/v1/payments" "$PAYMENTS_OUT")
[[ "$PAYMENTS_CODE" == "200" ]] || fail "GET /api/v1/payments returned HTTP $PAYMENTS_CODE"

python3 - "$PAYMENTS_OUT" <<'PY' || fail "Wero was not exposed by GET /api/v1/payments"
import json,sys
with open(sys.argv[1], 'r', encoding='utf-8') as fh:
    data = json.load(fh)
if not isinstance(data, list):
    raise SystemExit(1)
if not any((row.get('code') == 'wero' and row.get('provider_code') == 'worldline') for row in data if isinstance(row, dict)):
    raise SystemExit(1)
PY
pass "GET /api/v1/payments includes wero mapped to worldline"

WERO_OUT="$TMP_DIR/worldline_wero.json"
WERO_CODE=$(post_json "$BASE_URL/api/v1/payments/worldline/wero/create-session" '{"amount": 1.00, "currency": "EUR", "return_url": "https://mimoza.paymydine.com/payment-return-test", "cancel_url": "https://mimoza.paymydine.com/payment-cancel-test", "locale": "de_DE", "country_code": "DE"}' "$WERO_OUT")
python3 - "$WERO_CODE" "$WERO_OUT" <<'PY' || fail "Worldline Wero create-session contract validation failed"
import json,sys
code=int(sys.argv[1])
body=json.load(open(sys.argv[2], encoding='utf-8'))
if body.get('success') is True:
    if code != 200 or not body.get('redirect_url'):
        raise SystemExit(1)
else:
    # allowed non-success if provider rejects credentials/entitlement, but must be explicit
    if code not in (422, 502, 503):
        raise SystemExit(1)
    if body.get('error_code') not in {
        'wero_provider_not_authorized',
        'wero_provider_validation_failed',
        'wero_provider_configuration_invalid',
        'wero_provider_temporarily_unavailable',
        'wero_create_session_failed',
        'wero_not_supported',
        'wero_unavailable',
    }:
        raise SystemExit(1)
PY
pass "POST /api/v1/payments/worldline/wero/create-session returned valid success/error contract"

STRIPE_OUT="$TMP_DIR/stripe_wero.json"
STRIPE_CODE=$(post_json "$BASE_URL/api/v1/payments/wero/create-session" '{"amount": 1.00, "currency": "EUR", "return_url": "https://mimoza.paymydine.com/payment-return-test"}' "$STRIPE_OUT")
python3 - "$STRIPE_CODE" "$STRIPE_OUT" <<'PY' || fail "Stripe Wero safety validation failed"
import json,sys
code=int(sys.argv[1])
body=json.load(open(sys.argv[2], encoding='utf-8'))
if code != 422:
    raise SystemExit(1)
if body.get('error_code') not in {'stripe_wero_not_supported', 'wero_not_supported', None}:
    raise SystemExit(1)
if body.get('error_code') is None and 'not configured for Stripe' not in str(body.get('error', '')):
    raise SystemExit(1)
PY
pass "POST /api/v1/payments/wero/create-session no longer attempts Stripe native wero"

echo "All payment checks passed."
