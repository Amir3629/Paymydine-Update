#!/usr/bin/env bash
set -euo pipefail

OPS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ORACLE_ENV_FILE:-$OPS_DIR/oracle_simphony.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: env file not found: $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

ORACLE_BASE_URL="${ORACLE_BASE_URL:-}"
ORACLE_BASE_URL="${ORACLE_BASE_URL%/}"

require_var() {
  local name="$1"
  local value="${!name:-}"
  if [ -z "$value" ]; then
    echo "ERROR: required env var is empty: $name"
    exit 1
  fi
}

pretty_body() {
  local file="$1"
  if [ ! -f "$file" ]; then
    return 0
  fi
  python3 -m json.tool "$file" 2>/dev/null || cat "$file"
}

run_get() {
  local url="$1"
  local out_prefix="$2"

  mkdir -p "$OPS_DIR/.tmp"
  local headers="$OPS_DIR/.tmp/${out_prefix}.headers"
  local body="$OPS_DIR/.tmp/${out_prefix}.body"

  curl -ksS -D "$headers" \
    -H "Authorization: Bearer ${ORACLE_ID_TOKEN:-}" \
    -H "Accept: application/json" \
    ${ORACLE_ACCEPT_LANGUAGE:+-H "Accept-Language: ${ORACLE_ACCEPT_LANGUAGE}"} \
    "$url" -o "$body" || true

  echo "--- status/header ---"
  sed -n '1,30p' "$headers" 2>/dev/null || true
  echo "--- body ---"
  pretty_body "$body"
}

run_get_no_auth() {
  local url="$1"
  local out_prefix="$2"

  mkdir -p "$OPS_DIR/.tmp"
  local headers="$OPS_DIR/.tmp/${out_prefix}.headers"
  local body="$OPS_DIR/.tmp/${out_prefix}.body"

  curl -ksS -D "$headers" \
    -H "Accept: application/json" \
    "$url" -o "$body" || true

  echo "--- status/header ---"
  sed -n '1,30p' "$headers" 2>/dev/null || true
  echo "--- body ---"
  pretty_body "$body"
}
