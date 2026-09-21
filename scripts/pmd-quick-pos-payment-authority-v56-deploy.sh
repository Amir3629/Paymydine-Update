#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-fix/quick-pos-payment-authority-v56}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v56.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-payment-authority-v56-$STAMP"
DONE=0

FILES=(
  "app/admin/controllers/PmdQuickPosV1.php"
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
echo " PayMyDine QUICK POS V56 - RAW PAYMENT AUTHORITY"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== REQUIRE LIVE V55 ====="
grep -q "PMD_QPOS_ROUTE_STACK_SAFE_V55" "$ROOT/routes/admin-quick-mode.php"
grep -q "PMD_QPOS_ADMIN_AUTH_HYDRATE_V53" "$ROOT/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
grep -q "PMD_QPOS_PAYMENT_INSTANT_OPEN_V52" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_HISTORY_TABLE_RAIL_RIGHT_V51" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
echo "OK V51-V55 stack is live"

echo
echo "===== STAGE V56 ====="
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
echo "OK V56 target is writable"

echo
echo "===== V56 PAYMENT AUTHORITY CONTRACT ====="
grep -q "PMD_QPOS_RAW_PAYMENT_AUTHORITY_V56" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "use Admin\\Classes\\PermissionManager;" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "getPermissions()" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PermissionManager::instance()" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"

V56_BLOCK="$(sed -n '/PMD_QPOS_RAW_PAYMENT_AUTHORITY_V56/,/return false;/p' "$STAGE/app/admin/controllers/PmdQuickPosV1.php")"
if printf '%s\n' "$V56_BLOCK" | grep -q -- "->hasPermission("; then
  echo "ERROR: route-aware hasPermission() still exists inside V56 payment authority." >&2
  exit 1
fi
echo "OK Quick POS payment authority uses raw role/permission data only"

echo
echo "===== PRESERVE QUICK POS STACK ====="
grep -q "PMD_QPOS_PAYMENT_AUTHORITY_V50" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_RESERVATION_BUSY_V53" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
echo "OK existing Quick POS controller behavior preserved"

echo
echo "===== SYNTAX CHECK ====="
php -l "$STAGE/app/admin/controllers/PmdQuickPosV1.php"

echo
echo "===== BACKUP ====="
mkdir -p "$BACKUP/app/admin/controllers"
cp -a "$ROOT/app/admin/controllers/PmdQuickPosV1.php" "$BACKUP/app/admin/controllers/PmdQuickPosV1.php"
echo "BACKED UP app/admin/controllers/PmdQuickPosV1.php"

echo
echo "===== DEPLOY V56 ====="
cp "$STAGE/app/admin/controllers/PmdQuickPosV1.php" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
cmp -s "$STAGE/app/admin/controllers/PmdQuickPosV1.php" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
echo "DEPLOYED + VERIFIED app/admin/controllers/PmdQuickPosV1.php"

if [ -f "$ROOT/artisan" ] && command -v php >/dev/null 2>&1; then
  php "$ROOT/artisan" view:clear >/dev/null 2>&1 || true
  php "$ROOT/artisan" route:clear >/dev/null 2>&1 || true
fi

echo
echo "===== LIVE VERIFY ====="
grep -q "PMD_QPOS_RAW_PAYMENT_AUTHORITY_V56" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"

DONE=1

echo
echo "=============================================================="
echo " QUICK POS V56 DEPLOY COMPLETE"
echo " Payment authorization no longer uses route-aware user->hasPermission()."
echo " Cashier/Waiter/Manager/Owner are authorized from their actual role."
echo " Custom roles are authorized from raw Admin.Payments/Admin.Orders permissions."
echo " Unrelated roles remain denied."
echo " V55 route fix, V54 Floor fix and V52 instant Payment remain untouched."
echo " No sudo was used."
echo " Backup: $BACKUP"
echo "=============================================================="
