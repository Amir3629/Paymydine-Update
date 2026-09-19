#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="${PMD_R16_BRANCH:-origin/fix/platform-performance-complete-r16}"
STAMP="$(date '+%Y%m%d_%H%M%S')"
BACKUP="$ROOT/storage/pmd-patch-backups/platform-performance-complete-r16-$STAMP"
STAGE="$(mktemp -d /tmp/pmd-r16-stage.XXXXXX)"
DEPLOY_STARTED=0
DEPLOY_COMPLETE=0

FILES=(
  "app/Database/PmdCachedMySqlBuilder.php"
  "app/admin/controllers/PmdOwnerDashboardCleanV1.php"
  "app/admin/controllers/PmdWaiterDashboardV150.php"
  "app/admin/views/_layouts/default.blade.php"
  "app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php"
  "app/admin/assets/css/pmd-floor-qr-template-studio-r3.css"
  "app/admin/assets/js/pmd-floor-qr-template-studio-r3.js"
)

PHP_FILES=(
  "app/Database/PmdCachedMySqlBuilder.php"
  "app/admin/controllers/PmdOwnerDashboardCleanV1.php"
  "app/admin/controllers/PmdWaiterDashboardV150.php"
  "app/admin/views/_layouts/default.blade.php"
  "app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php"
)

cleanup_stage() {
  if [ -d "$STAGE" ]; then
    find "$STAGE" -mindepth 1 -delete >/dev/null 2>&1 || true
    rmdir "$STAGE" >/dev/null 2>&1 || true
  fi
}

rollback_if_needed() {
  status=$?

  if [ "$DEPLOY_STARTED" -eq 1 ] && [ "$DEPLOY_COMPLETE" -ne 1 ]; then
    echo
    echo "===== R16 DEPLOY FAILED: RESTORING PRE-RUN FILES =====" >&2

    for file in "${FILES[@]}"; do
      marker="$BACKUP/.state/${file//\//__}"

      if [ -f "$marker.existed" ]; then
        uid="$(stat -c '%u' "$BACKUP/$file")"
        gid="$(stat -c '%g' "$BACKUP/$file")"
        mode="$(stat -c '%a' "$BACKUP/$file")"
        restore_tmp="$ROOT/$file.pmd-r16-rollback-$STAMP.tmp"

        sudo install -o "$uid" -g "$gid" -m "$mode" "$BACKUP/$file" "$restore_tmp"
        sudo mv -f "$restore_tmp" "$ROOT/$file"
        echo "RESTORED $file" >&2
      else
        sudo rm -f "$ROOT/$file"
        echo "REMOVED NEW FILE $file" >&2
      fi
    done

    sudo systemctl reload php8.3-fpm >/dev/null 2>&1 || true
    echo "Rollback completed from: $BACKUP" >&2
  fi

  cleanup_stage
  exit "$status"
}

trap rollback_if_needed EXIT

cd "$ROOT"

echo "=============================================================="
echo " PayMyDine COMPLETE PERFORMANCE R16 DEPLOY"
echo " Branch: $BRANCH"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin fix/platform-performance-complete-r16

echo
echo "===== STAGE + VALIDATE ALL R16 FILES ====="

for file in "${FILES[@]}"; do
  staged="$STAGE/$file"
  mkdir -p "$(dirname "$staged")"
  git show "$BRANCH:$file" > "$staged"

  if [ ! -s "$staged" ]; then
    echo "ERROR: staged file is empty: $file" >&2
    exit 1
  fi

  echo "STAGED $file"
done

for file in "${PHP_FILES[@]}"; do
  php -l "$STAGE/$file"
  echo "PHP VALIDATED $file"
done

if command -v node >/dev/null 2>&1; then
  node --check "$STAGE/app/admin/assets/js/pmd-floor-qr-template-studio-r3.js"
  echo "JS VALIDATED app/admin/assets/js/pmd-floor-qr-template-studio-r3.js"
fi

echo
echo "===== R16 CONTENT PRECHECK ====="

grep -q 'PMD_PERF_R16_SCHEMA_CATALOG'   "$STAGE/app/Database/PmdCachedMySqlBuilder.php"
grep -q 'information_schema.COLUMNS'   "$STAGE/app/Database/PmdCachedMySqlBuilder.php"
grep -q 'PMD_PERF_R16_FLOOR_DUE_AGGREGATE_JOIN'   "$STAGE/app/admin/controllers/PmdOwnerDashboardCleanV1.php"
grep -q 'PMD_PERF_R16_SHARED_SCHEMA_CATALOG_BRIDGE'   "$STAGE/app/admin/controllers/PmdOwnerDashboardCleanV1.php"
grep -q 'PMD_PERF_R16_SLIM_RECENT_ORDER_SNAPSHOT'   "$STAGE/app/admin/controllers/PmdWaiterDashboardV150.php"
grep -q 'PMD_PERF_R16_ROUTE_SCOPED_LEGACY_LAYOUT_LAYERS'   "$STAGE/app/admin/views/_layouts/default.blade.php"
grep -q 'PMD_PERF_R16_CACHEABLE_QR_STUDIO_ASSETS'   "$STAGE/app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php"

waiter_wrappers="$(grep -F -c '@if($pmdR16RenderLegacyWaiterLayers)'   "$STAGE/app/admin/views/_layouts/default.blade.php" || true)"
reservation_wrappers="$(grep -F -c '@if($pmdR16RenderDashboardReservationLayers)'   "$STAGE/app/admin/views/_layouts/default.blade.php" || true)"

if [ "$waiter_wrappers" -ne 48 ]; then
  echo "ERROR: expected 48 route-scoped Waiter blocks, got $waiter_wrappers" >&2
  exit 1
fi

if [ "$reservation_wrappers" -ne 4 ]; then
  echo "ERROR: expected 4 route-scoped Reservations blocks, got $reservation_wrappers" >&2
  exit 1
fi

if grep -q '<style id="pmd-floor-qr-template-studio-r3-style">'   "$STAGE/app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php"; then
  echo "ERROR: QR Studio CSS is still inline" >&2
  exit 1
fi

if grep -q '<script id="pmd-floor-qr-template-studio-r3-runtime">'   "$STAGE/app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php"; then
  echo "ERROR: QR Studio runtime is still inline" >&2
  exit 1
fi

echo "OK R16 performance markers and route scopes present"

echo
echo "===== R16 COMPOSER/FLAME COMPATIBILITY SMOKE ====="

php <<'PHP'
<?php
require 'vendor/autoload.php';

$connection = new App\Database\PmdCachedMySqlConnection(
    static function () {
        throw new RuntimeException(
            'PDO should not be needed for compatibility smoke test.'
        );
    },
    'pmd_r16_smoke',
    '',
    ['driver' => 'mysql']
);

$query = $connection->query();

if (!($query instanceof Igniter\Flame\Database\Query\Builder)) {
    fwrite(STDERR, "ERROR: Flame query builder not preserved\n");
    exit(1);
}

if (!method_exists($query, 'flushDuplicateCache')) {
    fwrite(STDERR, "ERROR: flushDuplicateCache missing\n");
    exit(1);
}

$schema = $connection->getSchemaBuilder();

if (!($schema instanceof App\Database\PmdCachedMySqlBuilder)) {
    fwrite(STDERR, "ERROR: R16 cached schema builder not active\n");
    exit(1);
}

echo "OK Flame builder + R16 schema builder compatibility\n";
PHP

echo
echo "===== BACKUP CURRENT LIVE FILES ====="
mkdir -p "$BACKUP/.state"

for file in "${FILES[@]}"; do
  marker="$BACKUP/.state/${file//\//__}"

  if [ -f "$file" ]; then
    mkdir -p "$BACKUP/$(dirname "$file")"
    cp -a "$file" "$BACKUP/$file"
    touch "$marker.existed"
    echo "BACKED UP $file"
  else
    touch "$marker.new"
    echo "NEW FILE $file"
  fi
done

echo
echo "===== DEPLOY VALIDATED FILES ====="
DEPLOY_STARTED=1

for file in "${FILES[@]}"; do
  staged="$STAGE/$file"
  parent="$(dirname "$file")"
  live_tmp="$ROOT/$file.pmd-r16-$STAMP.tmp"

  if [ -f "$file" ]; then
    uid="$(stat -c '%u' "$file")"
    gid="$(stat -c '%g' "$file")"
    mode="$(stat -c '%a' "$file")"
  else
    uid="$(stat -c '%u' "$parent")"
    gid="$(stat -c '%g' "$parent")"
    mode="644"
  fi

  sudo install -o "$uid" -g "$gid" -m "$mode" "$staged" "$live_tmp"
  sudo mv -f "$live_tmp" "$ROOT/$file"

  if ! cmp -s "$staged" "$ROOT/$file"; then
    echo "ERROR: deployed content mismatch: $file" >&2
    exit 1
  fi

  echo "DEPLOYED + VERIFIED $file"
done

echo
echo "===== POST-DEPLOY VALIDATION ====="

for file in "${PHP_FILES[@]}"; do
  php -l "$file"
done

if command -v node >/dev/null 2>&1; then
  node --check app/admin/assets/js/pmd-floor-qr-template-studio-r3.js
fi

grep -q 'PMD_PERF_R16_SCHEMA_CATALOG'   app/Database/PmdCachedMySqlBuilder.php
grep -q 'PMD_PERF_R16_FLOOR_DUE_AGGREGATE_JOIN'   app/admin/controllers/PmdOwnerDashboardCleanV1.php
grep -q 'PMD_PERF_R16_SLIM_RECENT_ORDER_SNAPSHOT'   app/admin/controllers/PmdWaiterDashboardV150.php
grep -q 'PMD_PERF_R16_ROUTE_SCOPED_LEGACY_LAYOUT_LAYERS'   app/admin/views/_layouts/default.blade.php
grep -q 'PMD_PERF_R16_CACHEABLE_QR_STUDIO_ASSETS'   app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php

echo
echo "===== R16 CONTENT VERIFICATION ====="

for file in "${FILES[@]}"; do
  if cmp -s "$STAGE/$file" "$ROOT/$file"; then
    echo "MATCH $file"
  else
    echo "ERROR: post-deploy mismatch: $file" >&2
    exit 1
  fi
done

echo
echo "===== RELOAD PHP-FPM ====="
sudo systemctl reload php8.3-fpm

echo
echo "===== HEALTH ====="
sudo systemctl is-active php8.3-fpm
sudo nginx -t

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " R16 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo "=============================================================="
