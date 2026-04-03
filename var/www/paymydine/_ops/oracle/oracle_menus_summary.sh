#!/usr/bin/env bash
set -euo pipefail
OPS_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$OPS_DIR/common.sh"
require_var ORACLE_BASE_URL
require_var ORACLE_ID_TOKEN

ORG="${1:-${ORACLE_ORG_SHORT_NAME:-}}"
LOC="${2:-${ORACLE_LOC_REF:-}}"
RVC="${3:-${ORACLE_RVC_REF:-}}"

if [ -z "$ORG" ]; then
  echo "Usage: $0 <orgShortName> [locRef] [rvcRef]"
  echo "or set ORACLE_ORG_SHORT_NAME in oracle_simphony.env"
  exit 1
fi

QS="orgShortName=${ORG}"
if [ -n "$LOC" ]; then
  QS="${QS}&locRef=${LOC}"
fi
if [ -n "$RVC" ]; then
  QS="${QS}&rvcRef=${RVC}"
fi

echo "URL=${ORACLE_BASE_URL}/api/v1/menus/summary?${QS}"
run_get "${ORACLE_BASE_URL}/api/v1/menus/summary?${QS}" "menus_summary"
