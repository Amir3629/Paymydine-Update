#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-fix/quick-pos-auth-floor-v54-no-root}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v54.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-auth-floor-v54-$STAMP"
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

PROTECTED_SHARED_FLOOR_PARTIAL="app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php"

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
echo " PayMyDine QUICK POS V54 - AUTH/FLOOR NO-ROOT DEPLOY"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== REQUIRE LIVE V52/V51 ====="
grep -q "PMD_QPOS_PAYMENT_INSTANT_OPEN_V52" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_PAY_BACKEND_AUTHORITY_V50" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_HISTORY_TABLE_RAIL_RIGHT_V51" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
echo "OK V50/V51/V52 stack is live"

echo
echo "===== PROTECTED ROOT-OWNED FILE GUARD ====="
for file in "${FILES[@]}"; do
  if [ "$file" = "$PROTECTED_SHARED_FLOOR_PARTIAL" ]; then
    echo "ERROR: protected shared Floor partial must never be a V54 deploy target." >&2
    exit 1
  fi
done
echo "OK root-owned shared Floor partial is NOT touched"

echo
echo "===== STAGE V54 ====="
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
echo "OK all V54 targets writable"

echo
echo "===== V54 AUTH CONTRACT ====="
grep -q "PMD_QPOS_ADMIN_AUTH_HYDRATE_V53" "$STAGE/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
grep -q "AdminAuth::isLogged()" "$STAGE/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
grep -q "AdminAuth::getUser()" "$STAGE/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
grep -q "PMD_QPOS_ADMIN_AUTH_MIDDLEWARE_V53" "$STAGE/routes/admin-quick-mode.php"
grep -Fq "Route::middleware(['web', 'AdminAuthenticate'])->group" "$STAGE/routes/admin-quick-mode.php"
echo "OK Quick POS routes hydrate and authenticate the Admin session"

echo
echo "===== V54 FLOOR CONTRACT ====="
grep -q "PMD_QPOS_RESERVATION_BUSY_V53" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_RESERVATION_BUSY_ROUTE_V53" "$STAGE/routes/admin-quick-mode.php"
grep -q "PMD_QPOS_RESERVATION_BUSY_INLINE_OVERRIDE_V54" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -Fq "'reservation_busy' => '/admin/pos/reservation-busy'" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -Fq "'/admin/pos/reservation-busy'" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK Quick POS overrides reservation refresh before Floor runtime mounts"

echo
echo "===== V52 PAYMENT SPEED PRESERVED ====="
grep -q "PMD_QPOS_PAYMENT_INSTANT_OPEN_V52" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_PAYMENT_SUMMARY_DEDUPE_V52" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_PAYMENT_PREVIEW_READY_V52" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_PAYMENT_EARLY_TAP_V52" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "pmd-quick-pos-v1.css?v=20260921-54" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260921-54" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK instant Payment behavior preserved"

echo
echo "===== PRESERVE V39-V51 ====="
grep -q "PMD_QPOS_POST_MOVE_SELECTION_FIX_V45" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_OPERATOR_UX_V46" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_SQUARE_TERMINAL_TIP_V48" "$STAGE/app/Services/TerminalPayments/SquareTerminalProvider.php"
grep -q "PMD_QPOS_LAYOUT_PAY_TYPE_V49" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
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
echo "===== DEPLOY V54 ====="
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
grep -q "PMD_QPOS_ADMIN_AUTH_HYDRATE_V53" "$ROOT/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
grep -q "PMD_QPOS_ADMIN_AUTH_MIDDLEWARE_V53" "$ROOT/routes/admin-quick-mode.php"
grep -q "PMD_QPOS_RESERVATION_BUSY_V53" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_RESERVATION_BUSY_INLINE_OVERRIDE_V54" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260921-54" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DONE=1

echo
echo "=============================================================="
echo " QUICK POS V54 DEPLOY COMPLETE"
echo " Root-owned shared Floor partial was NOT touched."
echo " AdminAuth hydrates with isLogged() before getUser()."
echo " All /admin/pos routes run through AdminAuthenticate."
echo " Reservation refresh is overridden inside Quick POS before Floor runtime mounts."
echo " Floor refresh endpoints stay inside /admin/pos."
echo " V52 instant Payment, V51 History layout and V50 payment authority remain preserved."
echo " No sudo was used."
echo " Backup: $BACKUP"
echo "=============================================================="
