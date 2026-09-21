#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-fix/quick-pos-auth-floor-v55-route-safe}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v55.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-auth-floor-v55-$STAMP"
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
echo " PayMyDine QUICK POS V55 - ROUTE STACK SAFE"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== REQUIRE LIVE V54 ====="
grep -q "PMD_QPOS_RESERVATION_BUSY_INLINE_OVERRIDE_V54" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "PMD_QPOS_ADMIN_AUTH_HYDRATE_V53" "$ROOT/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
grep -q "PMD_QPOS_PAYMENT_INSTANT_OPEN_V52" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
echo "OK V52/V53/V54 stack is live"

echo
echo "===== STAGE V55 ====="
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
echo "OK all V55 targets writable"

echo
echo "===== V55 ROUTE CONTRACT ====="
grep -q "PMD_QPOS_ROUTE_STACK_SAFE_V55" "$STAGE/routes/admin-quick-mode.php"
grep -Fq "Route::middleware(['web'])->group(function () {" "$STAGE/routes/admin-quick-mode.php"
if grep -Fq "Route::middleware(['web', 'AdminAuthenticate'])->group(function () {" "$STAGE/routes/admin-quick-mode.php"; then
  echo "ERROR: crash-prone Quick POS AdminAuthenticate group still present." >&2
  exit 1
fi
echo "OK Quick POS route group is back on the proven web stack"

echo
echo "===== AUTH / FLOOR / PAYMENT PRESERVE ====="
grep -q "PMD_QPOS_ADMIN_AUTH_HYDRATE_V53" "$STAGE/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
grep -q "AdminAuth::isLogged()" "$STAGE/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
grep -q "AdminAuth::getUser()" "$STAGE/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
grep -q "PMD_QPOS_RESERVATION_BUSY_V53" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_RESERVATION_BUSY_ROUTE_V53" "$STAGE/routes/admin-quick-mode.php"
grep -q "PMD_QPOS_RESERVATION_BUSY_INLINE_OVERRIDE_V54" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "PMD_QPOS_PAYMENT_INSTANT_OPEN_V52" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_PAY_BACKEND_AUTHORITY_V50" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_HISTORY_TABLE_RAIL_RIGHT_V51" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "pmd-quick-pos-v1.css?v=20260921-55" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260921-55" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK V50-V54 behavior preserved without the route-level middleware"

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
echo "===== DEPLOY V55 ====="
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
grep -q "PMD_QPOS_ROUTE_STACK_SAFE_V55" "$ROOT/routes/admin-quick-mode.php"
grep -q "PMD_QPOS_ADMIN_AUTH_HYDRATE_V53" "$ROOT/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
grep -q "PMD_QPOS_RESERVATION_BUSY_INLINE_OVERRIDE_V54" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260921-55" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DONE=1

echo
echo "=============================================================="
echo " QUICK POS V55 DEPLOY COMPLETE"
echo " /admin/pos is back on the proven web route stack."
echo " Crash-prone group-level AdminAuthenticate was removed."
echo " AdminAuth still hydrates with isLogged() before getUser()."
echo " Reservation refresh still uses /admin/pos/reservation-busy."
echo " V52 instant Payment, V51 History and V50 Pay authority are preserved."
echo " No root-owned shared partial was touched."
echo " No sudo was used."
echo " Backup: $BACKUP"
echo "=============================================================="
