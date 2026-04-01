#!/usr/bin/env bash
set -euo pipefail
OPS_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$OPS_DIR/common.sh"
require_var ORACLE_BASE_URL
echo "URL=${ORACLE_BASE_URL}/oidc-provider/v1/.well-known/openid-configuration"
run_get_no_auth "${ORACLE_BASE_URL}/oidc-provider/v1/.well-known/openid-configuration" "openid_config"
