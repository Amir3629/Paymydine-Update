#!/usr/bin/env bash
set -Eeuo pipefail

HOST="${1:-https://mimoza.paymydine.com}"
FAIL=0

echo "[1/4] GET /api/v1/payments"
PAYMENTS_JSON="$(curl -fsS "$HOST/api/v1/payments")" || { echo "FAIL: payments endpoint unreachable"; exit 1; }
echo "$PAYMENTS_JSON" | jq '.' >/dev/null || { echo "FAIL: payments response is not valid JSON"; exit 1; }
echo "$PAYMENTS_JSON" | jq '.'

if echo "$PAYMENTS_JSON" | jq -e '.[] | select(.code=="wero")' >/dev/null; then
  echo "PASS: wero method is visible in runtime methods."
else
  echo "WARN: wero method is not visible in runtime methods."
fi

echo "[2/4] GET /api/v1/payments/debug-availability"
if ! curl -fsS "$HOST/api/v1/payments/debug-availability" | jq '.'; then
  echo "WARN: debug-availability endpoint failed (non-fatal)."
fi

echo "[3/4] POST /api/v1/payments/worldline/wero/create-session"
WORLDLINE_JSON="$(curl -fsS -X POST "$HOST/api/v1/payments/worldline/wero/create-session" \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": 10.00,
    \"currency\": \"EUR\",
    \"return_url\": \"$HOST/menu?payment_return_provider=worldline\",
    \"cancel_url\": \"$HOST/menu\",
    \"locale\": \"de_DE\",
    \"country_code\": \"DE\"
  }")" || { echo "FAIL: worldline wero create-session request failed"; exit 1; }
echo "$WORLDLINE_JSON" | jq '.'
if ! echo "$WORLDLINE_JSON" | jq -e '.success == true or (.success == false and (.error_code|type=="string"))' >/dev/null; then
  echo "FAIL: worldline response did not match expected contract"
  FAIL=1
fi

echo "[4/4] POST /api/v1/payments/wero/create-session (stripe/native route)"
STRIPE_JSON="$(curl -fsS -X POST "$HOST/api/v1/payments/wero/create-session" \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": 10.00,
    \"currency\": \"EUR\",
    \"return_url\": \"$HOST/menu?payment_return_provider=wero\",
    \"cancel_url\": \"$HOST/menu\"
  }")" || { echo "FAIL: stripe/native wero request failed"; exit 1; }
echo "$STRIPE_JSON" | jq '.'
if ! echo "$STRIPE_JSON" | jq -e '.success == false and (.error_code|type=="string")' >/dev/null; then
  echo "FAIL: stripe/native wero route should return structured non-success contract"
  FAIL=1
fi

if [[ "$FAIL" -ne 0 ]]; then
  echo "FAILED: one or more checks failed"
  exit 1
fi

echo "PASS: payment checks completed"

