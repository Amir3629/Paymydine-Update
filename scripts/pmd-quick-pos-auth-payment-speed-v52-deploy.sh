#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-fix/quick-pos-auth-payment-speed-v52}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v52.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-auth-payment-speed-v52-$STAMP"
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
echo " PayMyDine QUICK POS V52 - AUTH + PAYMENT SPEED"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== REQUIRE LIVE V50/V51 ====="
grep -q "PMD_QPOS_PAY_BACKEND_AUTHORITY_V50" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_PAYMENT_AUTHORITY_V50" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_HISTORY_TABLE_RAIL_RIGHT_V51" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
echo "OK V50 Pay + V51 History layout are live"

echo
echo "===== STAGE V52 ====="
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
echo "OK all V52 files writable"

echo
echo "===== V52 AUTH CONTRACT ====="
grep -q "PMD_QPOS_ADMIN_AUTH_USER_V52" "$STAGE/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
grep -q "AdminAuth::user()" "$STAGE/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
if grep -q "return AdminAuth::getUser();" "$STAGE/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"; then
  echo "ERROR: stale AdminAuth::getUser() path remains." >&2
  exit 1
fi
grep -q "PMD_QPOS_FLOOR_DATA_V52" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_FLOOR_DATA_ROUTE_V52" "$STAGE/routes/admin-quick-mode.php"
grep -q "'data' => '/admin/pos/floor-data'" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
echo "OK canonical admin auth + POS-local Floor refresh are present"

echo
echo "===== V52 PAYMENT SPEED CONTRACT ====="
grep -q "PMD_QPOS_PAYMENT_INSTANT_OPEN_V52" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_PAYMENT_SUMMARY_DEDUPE_V52" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_PAYMENT_PREVIEW_READY_V52" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_PAYMENT_EARLY_TAP_V52" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "pmd-quick-pos-v1.css?v=20260921-52" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260921-52" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK Payment opens interactive immediately and early taps share one summary request"

echo
echo "===== PRESERVE V39-V51 ====="
grep -q "PMD_QPOS_POST_MOVE_SELECTION_FIX_V45" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_OPERATOR_UX_V46" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_SQUARE_TERMINAL_TIP_V48" "$STAGE/app/Services/TerminalPayments/SquareTerminalProvider.php"
grep -q "PMD_QPOS_LAYOUT_PAY_TYPE_V49" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_PAY_BACKEND_AUTHORITY_V50" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_PAYMENT_AUTHORITY_V50" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_HISTORY_TABLE_RAIL_RIGHT_V51" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
echo "OK V39-V51 preserved"

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
echo "===== DEPLOY V52 ====="
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
grep -q "PMD_QPOS_ADMIN_AUTH_USER_V52" "$ROOT/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
grep -q "PMD_QPOS_FLOOR_DATA_V52" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_FLOOR_DATA_ROUTE_V52" "$ROOT/routes/admin-quick-mode.php"
grep -q "PMD_QPOS_PAYMENT_INSTANT_OPEN_V52" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_PAYMENT_EARLY_TAP_V52" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "pmd-quick-pos-v1.js?v=20260921-52" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DONE=1

echo
echo "=============================================================="
echo " QUICK POS V52 DEPLOY COMPLETE"
echo " Admin auth now resolves through AdminAuth::user()."
echo " Floor refresh uses /admin/pos/floor-data instead of a role-blocked legacy URL."
echo " Reservation busy refresh can resolve the authenticated operator."
echo " Payment summary/settle can resolve the authenticated Quick POS operator."
echo " Payment opens interactive immediately; no fake disabled flash while summary loads."
echo " An immediate Pay tap waits for the same in-flight summary and continues once."
echo " V51 History/Table layout and V50 payment authority remain preserved."
echo " No sudo was used."
echo " Backup: $BACKUP"
echo "=============================================================="
