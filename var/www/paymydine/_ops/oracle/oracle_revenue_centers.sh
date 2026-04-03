#!/usr/bin/env bash
set -euo pipefail
OPS_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$OPS_DIR/common.sh"
require_var ORACLE_BASE_URL
require_var ORACLE_ID_TOKEN
ORG="${1:-${ORACLE_ORG_SHORT_NAME:-}}"
LOC="${2:-${ORACLE_LOC_REF:-}}"
if [ -z "$ORG" ] || [ -z "$LOC" ]; then
  echo "Usage: $0 <orgShortName> <locRef>"
  echo "or set ORACLE_ORG_SHORT_NAME and ORACLE_LOC_REF in oracle_simphony.env"
  exit 1
fi
echo "URL=${ORACLE_BASE_URL}/api/v1/organizations/${ORG}/locations/${LOC}/revenueCenters"
run_get "${ORACLE_BASE_URL}/api/v1/organizations/${ORG}/locations/${LOC}/revenueCenters" "rvcs_${ORG}_${LOC}"
