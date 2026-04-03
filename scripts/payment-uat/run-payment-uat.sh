#!/usr/bin/env bash
set -euo pipefail

# Payment UAT runner for deployed server
# Requires jq and curl.
#
# Example:
#   BASE_URL="https://your-domain.com" ./scripts/payment-uat/run-payment-uat.sh smoke
#   BASE_URL="https://your-domain.com" ./scripts/payment-uat/run-payment-uat.sh stripe_card

BASE_URL="${BASE_URL:-http://127.0.0.1}"
CURL_OPTS=(--silent --show-error --fail-with-body -H "Content-Type: application/json" -H "Accept: application/json")

post_json() {
  local path="$1"
  local payload="$2"
  curl "${CURL_OPTS[@]}" -X POST "${BASE_URL}${path}" -d "${payload}"
}

get_json() {
  local path="$1"
  curl "${CURL_OPTS[@]}" "${BASE_URL}${path}"
}

check_success_key() {
  local json="$1"
  echo "$json" | jq -e '.success == true' >/dev/null
}

smoke() {
  echo "[smoke] GET /api/v1/payment-methods-admin"
  get_json "/api/v1/payment-methods-admin" | jq .
  echo "[smoke] GET /api/v1/payment-providers-admin"
  get_json "/api/v1/payment-providers-admin" | jq .
  echo "[smoke] GET /api/v1/payments"
  get_json "/api/v1/payments" | jq .
}

stripe_card() {
  echo "[stripe_card] create intent"
  local payload='{"amount":12.34,"currency":"EUR"}'
  local res
  res="$(post_json "/api/v1/payments/stripe/create-intent" "$payload")"
  echo "$res" | jq .
  check_success_key "$res"
  echo "$res" | jq -e '.clientSecret != null and .paymentIntentId != null' >/dev/null
  echo "[stripe_card] PASS: got clientSecret + paymentIntentId"
}

paypal_paypal() {
  echo "[paypal_paypal] create order"
  local payload='{"amount":12.34,"currency":"EUR"}'
  local res
  res="$(post_json "/api/v1/payments/paypal/create-order" "$payload")"
  echo "$res" | jq .
  check_success_key "$res"
  local order_id
  order_id="$(echo "$res" | jq -r '.order_id // empty')"
  if [[ -z "$order_id" ]]; then
    echo "[paypal_paypal] FAIL: no order_id" >&2
    exit 1
  fi
  echo "[paypal_paypal] NOTE: complete approval in browser, then call capture endpoint with order_id"
  echo "curl -sS -X POST \"${BASE_URL}/api/v1/payments/paypal/capture-order\" -H 'Content-Type: application/json' -d '{\"order_id\":\"${order_id}\"}' | jq ."
}

hosted_card_create() {
  local provider="$1"
  local payload
  payload="$(cat <<JSON
{"provider_code":"${provider}","amount":12.34,"currency":"EUR","return_url":"${BASE_URL}/menu?uat_return=1","cancel_url":"${BASE_URL}/menu?uat_cancel=1","customer_email":"uat@example.com","items":[{"id":"1","name":"UAT Item","quantity":1,"price":12.34}]}
JSON
)"
  local res
  res="$(post_json "/api/v1/payments/card/create-session" "$payload")"
  echo "$res" | jq .
  check_success_key "$res"
  echo "$res" | jq -e '.redirect_url != null and .provider != null' >/dev/null
}

worldline_card() {
  echo "[worldline_card] create hosted checkout"
  hosted_card_create "worldline"
  echo "[worldline_card] after paying in hosted page, call:"
  echo "curl -sS -X POST \"${BASE_URL}/api/v1/payments/worldline/checkout-status\" -H 'Content-Type: application/json' -d '{\"hosted_checkout_id\":\"<ID_FROM_CREATE_OR_RETURN_STORAGE>\"}' | jq ."
}

sumup_card() {
  echo "[sumup_card] create hosted checkout"
  hosted_card_create "sumup"
  echo "[sumup_card] after paying in hosted page, call:"
  echo "curl -sS -X POST \"${BASE_URL}/api/v1/payments/sumup/checkout-status\" -H 'Content-Type: application/json' -d '{\"checkout_id\":\"<ID_FROM_CREATE_RESPONSE>\"}' | jq ."
}

square_card() {
  echo "[square_card] create hosted checkout"
  hosted_card_create "square"
  echo "[square_card] after paying in hosted page, call:"
  echo "curl -sS -X POST \"${BASE_URL}/api/v1/payments/square/checkout-status\" -H 'Content-Type: application/json' -d '{\"payment_link_id\":\"<ID_FROM_CREATE_RESPONSE>\"}' | jq ."
}

negative_unproven_assignment() {
  echo "[negative] try assigning blocked provider/method pairs"
  local methods
  methods="$(get_json "/api/v1/payment-methods-admin" | jq '.data')"
  local patched
  patched="$(echo "$methods" | jq 'map(if .code=="card" then .provider_code="stripe" else . end)')"
  local payload
  payload="$(jq -n --argjson m "$patched" '{methods:$m}')"
  set +e
  curl "${CURL_OPTS[@]}" -X POST "${BASE_URL}/api/v1/payment-methods-admin" -d "$payload" | jq .
  local ec=$?
  set -e
  if [[ $ec -eq 0 ]]; then
    echo "[negative] request returned JSON; verify response.success=false and runtime-proven message."
  else
    echo "[negative] request failed at transport layer."
  fi
}

main() {
  local cmd="${1:-smoke}"
  case "$cmd" in
    smoke) smoke ;;
    stripe_card) stripe_card ;;
    paypal_paypal) paypal_paypal ;;
    worldline_card) worldline_card ;;
    sumup_card) sumup_card ;;
    square_card) square_card ;;
    negative_unproven_assignment) negative_unproven_assignment ;;
    *)
      echo "Unknown command: $cmd" >&2
      exit 2
      ;;
  esac
}

main "$@"
