#!/usr/bin/env bash
set -euo pipefail
OPS_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$OPS_DIR/common.sh"
require_var ORACLE_BASE_URL
require_var ORACLE_ID_TOKEN
echo "URL=${ORACLE_BASE_URL}/api/v1/organizations"
run_get "${ORACLE_BASE_URL}/api/v1/organizations" "organizations"
