#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="${PMD_QUICK_POS_BRANCH:-origin/feat/quick-pos-v1}"
STAMP="$(date '+%Y%m%d_%H%M%S')"
BACKUP="$ROOT/storage/pmd-patch-backups/quick-pos-v1-$STAMP"
STAGE="$(mktemp -d /tmp/pmd-quick-pos-v1-stage.XXXXXX)"
DEPLOY_STARTED=0
DEPLOY_COMPLETE=0

FILES=(
  "app/Http/Middleware/PmdAdminRetiredPagesR77.php"
  "app/admin/ServiceProvider.php"
  "app/admin/Services/PmdDefaultStaffRoleService.php"
  "app/admin/Services/PmdRoleLandingService.php"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/js/pmd-site-access-hub-v13.js"
  "app/admin/classes/AdminController.php"
  "app/admin/controllers/PmdQuickPosV1.php"
  "app/admin/controllers/PmdWaiterTableStateV154.php"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
  "app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php"
  "app/admin/views/siteaccess/hub.blade.php"
  "app/admin/views/siteaccess/hub_v2.blade.php"
  "app/main/widgets/MediaManager.php"
  "routes/admin-quick-mode.php"
)

PHP_FILES=(
  "app/Http/Middleware/PmdAdminRetiredPagesR77.php"
  "app/admin/ServiceProvider.php"
  "app/admin/Services/PmdDefaultStaffRoleService.php"
  "app/admin/Services/PmdRoleLandingService.php"
  "app/admin/classes/AdminController.php"
  "app/admin/controllers/PmdQuickPosV1.php"
  "app/admin/controllers/PmdWaiterTableStateV154.php"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
  "app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php"
  "app/main/widgets/MediaManager.php"
  "routes/admin-quick-mode.php"
)

NEW_FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/controllers/PmdQuickPosV1.php"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

cleanup_stage() {
  if [ -d "$STAGE" ]; then
    rm -rf "$STAGE" >/dev/null 2>&1 || true
  fi
}

is_new_file() {
  local candidate="$1"
  local file
  for file in "${NEW_FILES[@]}"; do
    if [ "$file" = "$candidate" ]; then
      return 0
    fi
  done
  return 1
}

clear_runtime_caches() {
  cd "$ROOT"
  php artisan route:clear >/dev/null 2>&1 || true
  php artisan view:clear >/dev/null 2>&1 || true
}

restore_files() {
  local file
  for file in "${FILES[@]}"; do
    if [ -f "$BACKUP/$file" ]; then
      uid="$(stat -c '%u' "$BACKUP/$file")"
      gid="$(stat -c '%g' "$BACKUP/$file")"
      mode="$(stat -c '%a' "$BACKUP/$file")"
      restore_tmp="$ROOT/$file.pmd-qpos-rollback-$STAMP.tmp"

      sudo install -o "$uid" -g "$gid" -m "$mode" "$BACKUP/$file" "$restore_tmp"
      sudo mv -f "$restore_tmp" "$ROOT/$file"
      echo "RESTORED $file" >&2
    elif is_new_file "$file"; then
      sudo rm -f "$ROOT/$file"
      echo "REMOVED NEW FILE $file" >&2
    fi
  done
}

rollback_if_needed() {
  status=$?

  if [ "$DEPLOY_STARTED" -eq 1 ] && [ "$DEPLOY_COMPLETE" -ne 1 ]; then
    echo
    echo "===== QUICK POS V1 DEPLOY FAILED: ROLLING BACK =====" >&2
    restore_files
    clear_runtime_caches
    sudo systemctl reload php8.3-fpm >/dev/null 2>&1 || true
    echo "Rollback completed from: $BACKUP" >&2
  fi

  cleanup_stage
  exit "$status"
}

trap rollback_if_needed EXIT

cd "$ROOT"

echo "=============================================================="
echo " PayMyDine QUICK POS V1"
echo " Branch: $BRANCH"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin feat/quick-pos-v1

echo
echo "===== STAGE QUICK POS FILES ====="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  git show "$BRANCH:$file" > "$STAGE/$file"

  if [ ! -s "$STAGE/$file" ]; then
    echo "ERROR: staged file is empty: $file" >&2
    exit 1
  fi

  echo "STAGED $file"
done

echo
echo "===== PHP SYNTAX ====="
for file in "${PHP_FILES[@]}"; do
  php -l "$STAGE/$file"
done

echo
echo "===== JAVASCRIPT SYNTAX ====="
if command -v node >/dev/null 2>&1; then
  node --check "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
  node --check "$STAGE/app/admin/assets/js/pmd-site-access-hub-v13.js"
  echo "OK JavaScript syntax (node --check)"
else
  echo "INFO: node is not installed; skipping optional node --check"
fi

echo
echo "===== CONTRACT PRECHECK ====="
grep -q 'class PmdQuickPosV1 extends PmdWaiterPosV1'   "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD Quick POS V1"   "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD Quick POS V1"   "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "/admin/pos/bootstrap"   "$STAGE/routes/admin-quick-mode.php"
grep -q "save-off-premise"   "$STAGE/routes/admin-quick-mode.php"
grep -q "self::CASHIER => 'pos'"   "$STAGE/app/admin/Services/PmdDefaultStaffRoleService.php"
grep -q "self::WAITER => 'pos/waiter'"   "$STAGE/app/admin/Services/PmdDefaultStaffRoleService.php"
grep -q "'pmd-cashier' => 'pos'"   "$STAGE/app/admin/Services/PmdRoleLandingService.php"
grep -q "'pmd-waiter' => 'pos/waiter'"   "$STAGE/app/admin/Services/PmdRoleLandingService.php"
grep -q "PMD_QUICK_POS_TEAM_SIGNIN_POSITION_V1"   "$STAGE/app/admin/assets/js/pmd-site-access-hub-v13.js"
grep -q "PMD_QUICK_POS_FORCE_NEW_CHECK_V1"   "$STAGE/app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
grep -q "PMD_QUICK_POS_LEAN_TABLE_DATA_V2" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QUICK_POS_FAST_WRITE_V2" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QUICK_POS_FAST_SETTLE_V1" "$STAGE/app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php"
grep -q "PMD_TOUCH_NUMPAD_V1" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_TOUCH_NUMPAD_V1" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_TABLE_STATE_PREFIX_SAFE_V169" "$STAGE/app/admin/controllers/PmdWaiterTableStateV154.php"
grep -q "PMD_QPOS_STABLE_BOOT_V2" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_BOOT_CACHE_V1" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_INLINE_BOOTSTRAP_V1" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_CANONICAL_FLOORS_V1" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_PICKUP_PAYMENT_HANDOFF_V1" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "initialBootstrap" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "data-qpos-floors" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "data-qpos-pickup" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "data-qpos-clock" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "PMD_QPOS_TOUCH_VISUAL_V10" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_GREEN_STABLE_V11" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_PAYMENT_STABLE_V3" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "pmd-qpos-product-count" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "cartQuantityForMenu" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_BLITZ_ACTION_V1" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QUICK_POS_PAYMENT_HANDOFF_V1" "$STAGE/app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
grep -q "PMD_QUICK_POS_BATCH_MENU_HYDRATE_V1" "$STAGE/app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
if grep -Fq "name: 'Card'" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"; then
  echo "ERROR: ambiguous Card payment label remains in Quick POS" >&2
  exit 1
fi
if grep -Fq 'data-qpos-service=' "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"; then
  echo "ERROR: legacy Dine/Takeout/Delivery selector remains in Quick POS" >&2
  exit 1
fi
if grep -Fq 'pmd-qpos-topbar' "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"; then
  echo "ERROR: legacy Quick POS header remains in the page markup" >&2
  exit 1
fi
if grep -Fq 'data-qpos-hold' "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"; then
  echo "ERROR: Hold action remains in Quick POS" >&2
  exit 1
fi
grep -q "data-qpos-touch-keypad" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260919-11" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.css?v=20260919-11" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -Fq "\$\$('[data-cash-value]', box).forEach" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "touchKeypadTarget: 'cash'" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "background: #064e3b" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "background: #0f766e" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "'cashierlab' =>" "$STAGE/app/Http/Middleware/PmdAdminRetiredPagesR77.php"
grep -q "admin_url('pos')" "$STAGE/app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php"

# The new surface must continue to reuse the proven production authorities.
for canonical in   "app/admin/controllers/PmdWaiterPosV1.php"   "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"   "app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"   "app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php"   "app/admin/controllers/PmdWaiterTableStateV154.php"; do
  if [ ! -f "$ROOT/$canonical" ]; then
    echo "ERROR: canonical POS authority missing: $canonical" >&2
    exit 1
  fi
done

# Require the currently live R20/R19/R18/R17 performance stack.
grep -q 'PMD_PERF_R20_WRITE_ONLY_SHIFT_AUDIT_CONTEXT'   "$ROOT/app/admin/middleware/LogUserLastSeen.php"
grep -q 'PMD_PERF_R19_FLOOR_BOOTSTRAP_MICROCACHE'   "$ROOT/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_PERF_R18_REQUEST_LOCAL_LOCATION_OPTIONS'   "$ROOT/app/admin/Services/PmdSharedFloorRegistryV1.php"
if [ -f "$ROOT/app/Database/PmdCachedMySqlBuilder.php" ]; then
  grep -q 'PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA'     "$ROOT/app/Database/PmdCachedMySqlBuilder.php"
fi

echo "OK Quick POS routes, role mapping and canonical authorities verified"
echo "OK R17-R20 performance stack verified"

echo
echo "===== BACKUP CURRENT LIVE FILES ====="
mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  if [ -f "$ROOT/$file" ]; then
    mkdir -p "$BACKUP/$(dirname "$file")"
    cp -a "$ROOT/$file" "$BACKUP/$file"
    echo "BACKED UP $file"
  else
    echo "NEW FILE $file"
  fi
done

echo
echo "===== DEPLOY QUICK POS V1 ====="
DEPLOY_STARTED=1

for file in "${FILES[@]}"; do
  mkdir -p "$ROOT/$(dirname "$file")"

  if [ -f "$ROOT/$file" ]; then
    uid="$(stat -c '%u' "$ROOT/$file")"
    gid="$(stat -c '%g' "$ROOT/$file")"
    mode="$(stat -c '%a' "$ROOT/$file")"
  else
    parent_dir="$ROOT/$(dirname "$file")"
    uid="$(stat -c '%u' "$parent_dir")"
    gid="$(stat -c '%g' "$parent_dir")"
    mode="0644"
  fi

  live_tmp="$ROOT/$file.pmd-qpos-$STAMP.tmp"
  sudo install -o "$uid" -g "$gid" -m "$mode" "$STAGE/$file" "$live_tmp"
  sudo mv -f "$live_tmp" "$ROOT/$file"

  cmp -s "$STAGE/$file" "$ROOT/$file"
  echo "DEPLOYED + VERIFIED $file"
done

echo
echo "===== CLEAR ROUTE / VIEW CLASS CACHES ====="
clear_runtime_caches

echo
echo "===== LIVE PHP SYNTAX ====="
for file in "${PHP_FILES[@]}"; do
  php -l "$ROOT/$file"
done

echo
echo "===== ROUTE CONTRACT ====="
# Route registration is already part of the staged-file contract check above.
# Avoid Laravel CLI route reflection here: this application intentionally
# retains legacy global string controllers that are request-valid but not
# reliably Composer-reflectable in Artisan.
grep -q "'/admin/pos/bootstrap/{mode?}'" "$ROOT/routes/admin-quick-mode.php"
grep -q "'/admin/pos/save-off-premise'" "$ROOT/routes/admin-quick-mode.php"
grep -q "'/admin/pos/save/{table}'" "$ROOT/routes/admin-quick-mode.php"
grep -q "'/admin/pos/table/{table}'" "$ROOT/routes/admin-quick-mode.php"
grep -q "'/admin/pos/payment-summary/{order}'" "$ROOT/routes/admin-quick-mode.php"
grep -q "'/admin/pos/payment-settle/{order}'" "$ROOT/routes/admin-quick-mode.php"
grep -q "'/admin/pos/{mode?}'" "$ROOT/routes/admin-quick-mode.php"
echo "OK Quick POS route contract present"

echo
echo "===== RELOAD PHP-FPM ====="
sudo systemctl reload php8.3-fpm

echo
echo "===== HEALTH ====="
sudo systemctl is-active php8.3-fpm
sudo nginx -t

echo
echo "===== QUICK POS HTTP PROBE ====="
PMD_PROBE_HOST="${PMD_QUICK_POS_HOST:-tomo.paymydine.com}"

probe_path() {
  local path="$1"
  local code

  code="$(curl -k -sS -o /dev/null -w '%{http_code}' \
    --connect-timeout 5 \
    --max-time 15 \
    -H "Host: $PMD_PROBE_HOST" \
    "https://127.0.0.1$path" || true)"

  case "$code" in
    200|204|301|302|303|307|308|401|403)
      echo "HTTP ROUTE OK $code $path"
      ;;
    *)
      echo "ERROR: Quick POS HTTP probe failed: $code $path" >&2
      exit 1
      ;;
  esac
}

probe_path "/admin/pos"
probe_path "/admin/pos/waiter"

echo
echo "===== QUICK POS LIVE FILE MARKERS ====="
grep -q 'pmd-quick-pos-v1.css'   "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q 'pmd-quick-pos-v1.js'   "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q 'pmd-site-access-hub-v13.js'   "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " QUICK POS V1 DEPLOY COMPLETE"
echo " Cashier: /admin/pos"
echo " Waiter:  /admin/pos/waiter"
echo " Legacy fallback: /admin/orders"
echo " Backup: $BACKUP"
echo "=============================================================="
