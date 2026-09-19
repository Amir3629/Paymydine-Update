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
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
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
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
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
grep -q "'cashierlab' =>" "$STAGE/app/Http/Middleware/PmdAdminRetiredPagesR77.php"
grep -q "admin_url('pos')" "$STAGE/app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php"

# The new surface must continue to reuse the proven production authorities.
for canonical in   "app/admin/controllers/PmdWaiterPosV1.php"   "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"   "app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php"   "app/admin/controllers/PmdWaiterTableStateV154.php"; do
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
echo "===== ROUTE DISCOVERY ====="
# Do not use "artisan route:list" as a deploy gate in this codebase.
# Legacy string-controller routes include global classes that are valid at
# request time but are not Composer-autoloadable for Artisan's reflection
# pass (for example PmdWaiterPortalV113). That makes route:list an unrelated
# false-negative for Quick POS.
ROUTE_PROBE="$(mktemp /tmp/pmd-qpos-route-probe.XXXXXX.php)"
cat > "$ROUTE_PROBE" <<'PHP'
<?php

$root = getenv('PMD_ROOT_FOR_PROBE') ?: getcwd();

require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';

$request = Illuminate\Http\Request::create(
    '/admin/pos',
    'GET',
    [],
    [],
    [],
    [
        'HTTP_HOST' => 'localhost',
        'HTTPS' => 'on',
    ]
);
$app->instance('request', $request);

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
if (method_exists($kernel, 'bootstrap')) {
    $kernel->bootstrap();
}

$router = $app->make('router');
$wanted = [
    'admin/pos/{mode?}' => ['GET', 'HEAD'],
    'admin/pos/bootstrap/{mode?}' => ['GET', 'HEAD'],
    'admin/pos/save-off-premise' => ['POST'],
];

$found = [];

foreach ($router->getRoutes() as $route) {
    $uri = trim((string)$route->uri(), '/');
    if (!array_key_exists($uri, $wanted)) {
        continue;
    }

    $methods = array_values(array_intersect(
        array_map('strtoupper', $route->methods()),
        $wanted[$uri]
    ));

    if ($methods) {
        $found[$uri] = true;
        echo "ROUTE OK ".$uri." ".implode(',', $methods).PHP_EOL;
    }
}

$missing = array_values(array_diff(array_keys($wanted), array_keys($found)));

if ($missing) {
    fwrite(
        STDERR,
        "ERROR: Quick POS route registration missing: ".implode(', ', $missing).PHP_EOL
    );
    exit(1);
}

exit(0);
PHP

if ! PMD_ROOT_FOR_PROBE="$ROOT" php "$ROUTE_PROBE"; then
  rm -f "$ROUTE_PROBE"
  echo "ERROR: Quick POS runtime route registration failed" >&2
  exit 1
fi
rm -f "$ROUTE_PROBE"

echo
echo "===== RELOAD PHP-FPM ====="
sudo systemctl reload php8.3-fpm

echo
echo "===== HEALTH ====="
sudo systemctl is-active php8.3-fpm
sudo nginx -t

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
