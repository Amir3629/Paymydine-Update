#!/usr/bin/env bash
set -euo pipefail
OPS_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$OPS_DIR/common.sh"

require_var ORACLE_BASE_URL
require_var ORACLE_CLIENT_ID
require_var ORACLE_REFRESH_TOKEN

mkdir -p "$OPS_DIR/.tmp"
HEADERS="$OPS_DIR/.tmp/refresh_token.headers"
BODY="$OPS_DIR/.tmp/refresh_token.body"

curl -ksS -D "$HEADERS" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  -X POST \
  --data-urlencode "scope=openid" \
  --data-urlencode "grant_type=refresh_token" \
  --data-urlencode "client_id=${ORACLE_CLIENT_ID}" \
  --data-urlencode "refresh_token=${ORACLE_REFRESH_TOKEN}" \
  ${ORACLE_REDIRECT_URI:+--data-urlencode "redirect_uri=${ORACLE_REDIRECT_URI}"} \
  "${ORACLE_BASE_URL}/oidc-provider/v1/oauth2/token" \
  -o "$BODY" || true

echo "URL=${ORACLE_BASE_URL}/oidc-provider/v1/oauth2/token"
echo "--- status/header ---"
sed -n '1,30p' "$HEADERS" 2>/dev/null || true
echo "--- body ---"
python3 -m json.tool "$BODY" 2>/dev/null || cat "$BODY"
