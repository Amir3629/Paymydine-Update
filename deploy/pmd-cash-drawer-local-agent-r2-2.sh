#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="feature/cash-drawer-local-agent-r2-2"
BASE_SCRIPT="/tmp/pmd-cash-drawer-local-agent-r2-2-base.sh"

[[ -d "$ROOT/.git" ]] || { echo "PayMyDine repo not found: $ROOT" >&2; exit 1; }

sudo -u ubuntu git -C "$ROOT" fetch origin "$BRANCH"
sudo -u ubuntu git -C "$ROOT" show FETCH_HEAD:deploy/pmd-cash-drawer-local-agent-r2-1.sh > "$BASE_SCRIPT"

# Reuse the reviewed R2.1 deployer but force it to fetch the R2.2 branch that
# contains the corrected AdminController-aware patcher. Labels/query keys are
# updated only for clear production logs; behavior remains the same.
sed -i \
  -e 's#feature/cash-drawer-local-agent-r2-1#feature/cash-drawer-local-agent-r2-2#g' \
  -e 's/R2\.1/R2.2/g' \
  -e 's/r21/r22/g' \
  -e 's/R21/R22/g' \
  "$BASE_SCRIPT"

bash -n "$BASE_SCRIPT"

echo "============================================================"
echo "PMD CASH DRAWER + LOCAL POS AGENT R2.2"
echo "AdminController anchor repair + tenant-safe Agent API"
echo "============================================================"

exec bash "$BASE_SCRIPT"
