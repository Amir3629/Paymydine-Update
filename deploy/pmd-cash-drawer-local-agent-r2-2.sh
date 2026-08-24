#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="feature/cash-drawer-local-agent-r2-2"
BASE_SCRIPT="/tmp/pmd-cash-drawer-local-agent-r2-2-base.sh"

[[ -d "$ROOT/.git" ]] || { echo "PayMyDine repo not found: $ROOT" >&2; exit 1; }

sudo -u ubuntu git -C "$ROOT" fetch origin "$BRANCH"

sudo -u ubuntu git -C "$ROOT" show \
  FETCH_HEAD:deploy/pmd-cash-drawer-local-agent-r2-1-patch.py \
  | grep -q 'PMD_CASH_DRAWER_SNAKE_ACTION_ALIASES_R22' \
  || { echo "R2.2 corrected patcher marker missing" >&2; exit 1; }

sudo -u ubuntu git -C "$ROOT" show FETCH_HEAD:deploy/pmd-cash-drawer-local-agent-r2-1.sh > "$BASE_SCRIPT"

# Reuse the reviewed R2.1 deployer but force it to fetch the R2.2 branch.
# IMPORTANT: keep uppercase R21 source-authority marker names unchanged.
# The R2.2 patcher intentionally writes those existing canonical markers and
# the verifier must check the same names. Only human-facing version labels and
# temporary/cache query keys are rewritten here.
sed -i \
  -e 's#feature/cash-drawer-local-agent-r2-1#feature/cash-drawer-local-agent-r2-2#g' \
  -e 's/R2\.1/R2.2/g' \
  -e 's/r21/r22/g' \
  "$BASE_SCRIPT"

bash -n "$BASE_SCRIPT"

# Guard specifically against the regression that caused the previous refusal.
grep -q "PMD_CASHIER_RECEIPT_TENANT_AUTHORITY_R21" "$BASE_SCRIPT" \
  || { echo "R2.2 verifier marker regression detected" >&2; exit 1; }
if grep -q "PMD_CASHIER_RECEIPT_TENANT_AUTHORITY_R22" "$BASE_SCRIPT"; then
  echo "R2.2 invalid rewritten source marker detected" >&2
  exit 1
fi

echo "============================================================"
echo "PMD CASH DRAWER + LOCAL POS AGENT R2.2"
echo "AdminController anchor + connector download action repair"
echo "Receipt marker verifier regression repaired"
echo "============================================================"

exec bash "$BASE_SCRIPT"
