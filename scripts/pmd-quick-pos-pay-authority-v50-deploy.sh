#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-fix/quick-pos-pay-authority-v50}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v50.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-pay-authority-v50-$STAMP"
DONE=0

FILES=(
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/controllers/PmdQuickPosV1.php"
  "app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
  "app/Services/TerminalPayments/TerminalPaymentService.php"
  "app/Services/TerminalPayments/SquareTerminalProvider.php"
  "app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php"
  "routes/admin-quick-mode.php"
)

cleanup() { rm -rf "$STAGE" >/dev/null 2>&1 || true; }

rollback() {
  [ "$DONE" -eq 0 ] || return 0
  [ -d "$BACKUP" ] || return 0
  echo
  echo "===== ROLLBACK ====="
  set +e
  for file in "${FILES[@]}"; do
    if [ -f "$BACKUP/$file" ]; then
      cp "$BACKUP/$file" "$ROOT/$file"
      cmp -s "$BACKUP/$file" "$ROOT/$file" && echo "RESTORED $file"
    fi
  done
  set -e
}

on_exit() {
  status="$1"
  trap - EXIT
  [ "$status" -eq 0 ] || rollback
  cleanup
  exit "$status"
}
trap 'on_exit $?' EXIT

cd "$ROOT"

echo "=============================================================="
echo " PayMyDine QUICK POS V50 - PAY AUTHORITY"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== STAGE V50 ====="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  git show "$REF:$file" > "$STAGE/$file"
  test -s "$STAGE/$file"
  echo "STAGED $file"
done

echo
echo "===== WRITABLE CHECK - NO SUDO ====="
for file in "${FILES[@]}"; do
  if [ ! -w "$ROOT/$file" ]; then
    echo "ERROR: not writable: $file" >&2
    stat -c '%U:%G %a %n' "$ROOT/$file" >&2 || true
    echo "Nothing was deployed." >&2
    exit 1
  fi
done
echo "OK all V50 files writable"

echo
echo "===== V50 PAY CONTRACT ====="
grep -q "PMD_QPOS_PAY_BACKEND_AUTHORITY_V50" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_PAYMENT_AUTHORITY_V50" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_PAYMENT_ENDPOINTS_V50" "$STAGE/routes/admin-quick-mode.php"
grep -q "'payment_coupon_url' => '/admin/pos/payment-coupon/{order}'" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "'terminal_payment_url' => '/admin/pos/terminal-payment/{order}'" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
if grep -q "canPayPermission" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"; then
  echo "ERROR: stale frontend permission guard still exists." >&2
  exit 1
fi
grep -q "pmd-quick-pos-v1.css?v=20260921-50" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260921-50" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK Pay is backend-authorized and no longer disabled by stale bootstrap permissions"

echo
echo "===== PRESERVE V39-V49 ====="
grep -q "PMD_QPOS_GUIDE_POPOVER_V39" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "PMD_QPOS_CLEANING_LEFT_LOCK_V40" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_IMMEDIATE_TABLE_TAP_V42" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_DIRECT_MOVE_NO_BOOTSTRAP_V43" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_OPTIMISTIC_WHOLE_TABLE_MOVE_V44" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_POST_MOVE_SELECTION_FIX_V45" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_OPERATOR_UX_V46" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_SQUARE_TERMINAL_TIP_V48" "$STAGE/app/Services/TerminalPayments/SquareTerminalProvider.php"
grep -q "PMD_QPOS_LAYOUT_PAY_TYPE_V49" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
echo "OK V39-V49 preserved"

echo
echo "===== PERFORMANCE GUARD ====="
grep -q 'PMD_PERF_R20_WRITE_ONLY_SHIFT_AUDIT_CONTEXT' "$ROOT/app/admin/middleware/LogUserLastSeen.php"
grep -q 'PMD_PERF_R19_FLOOR_BOOTSTRAP_MICROCACHE' "$ROOT/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_PERF_R18_REQUEST_LOCAL_LOCATION_OPTIONS' "$ROOT/app/admin/Services/PmdSharedFloorRegistryV1.php"
if [ -f "$ROOT/app/Database/PmdCachedMySqlBuilder.php" ]; then
  grep -q 'PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA' "$ROOT/app/Database/PmdCachedMySqlBuilder.php"
fi
echo "OK R17-R20 preserved"

echo
echo "===== SYNTAX CHECK ====="
php -l "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
php -l "$STAGE/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
php -l "$STAGE/app/Services/TerminalPayments/TerminalPaymentService.php"
php -l "$STAGE/app/Services/TerminalPayments/SquareTerminalProvider.php"
php -l "$STAGE/app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php"
php -l "$STAGE/routes/admin-quick-mode.php"
if command -v node >/dev/null 2>&1; then
  node --check "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
fi

echo
echo "===== BACKUP ====="
mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$file")"
  cp -a "$ROOT/$file" "$BACKUP/$file"
  echo "BACKED UP $file"
done

echo
echo "===== DEPLOY V50 ====="
for file in "${FILES[@]}"; do
  cp "$STAGE/$file" "$ROOT/$file"
  cmp -s "$STAGE/$file" "$ROOT/$file"
  echo "DEPLOYED + VERIFIED $file"
done

if [ -f "$ROOT/artisan" ] && command -v php >/dev/null 2>&1; then
  php "$ROOT/artisan" view:clear >/dev/null 2>&1 || true
  php "$ROOT/artisan" route:clear >/dev/null 2>&1 || true
fi

echo
echo "===== LIVE VERIFY ====="
grep -q "PMD_QPOS_PAY_BACKEND_AUTHORITY_V50" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_PAYMENT_AUTHORITY_V50" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_PAYMENT_ENDPOINTS_V50" "$ROOT/routes/admin-quick-mode.php"
grep -q "pmd-quick-pos-v1.js?v=20260921-50" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
if grep -q "canPayPermission" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"; then
  echo "ERROR: live JS still contains stale Pay permission guard." >&2
  exit 1
fi

DONE=1

echo
echo "=============================================================="
echo " QUICK POS V50 DEPLOY COMPLETE"
echo " Pay is no longer disabled by boot.permissions.payments."
echo " Loaded checks can open Payment immediately."
echo " Quick POS backend authorizes payment for authenticated order operators."
echo " Cash, Coupon and Terminal now use the same Quick POS payment authority."
echo " History/type fixes from V49 and terminal-tip fixes from V48 are preserved."
echo " No sudo was used."
echo " Backup: $BACKUP"
echo "=============================================================="
