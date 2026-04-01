#!/usr/bin/env bash
set -euo pipefail
OPS_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$OPS_DIR/common.sh"
require_var ORACLE_BASE_URL
require_var ORACLE_ID_TOKEN
ORG="${1:-${ORACLE_ORG_SHORT_NAME:-}}"
if [ -z "$ORG" ]; then
  echo "Usage: $0 <orgShortName>"
  echo "or set ORACLE_ORG_SHORT_NAME in oracle_simphony.env"
  exit 1
fi
echo "URL=${ORACLE_BASE_URL}/api/v1/organizations/${ORG}/locations"
run_get "${ORACLE_BASE_URL}/api/v1/organizations/${ORG}/locations" "locations_${ORG}"
