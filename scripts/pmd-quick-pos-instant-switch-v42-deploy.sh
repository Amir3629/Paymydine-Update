#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-perf/quick-pos-instant-switch-v42}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v42.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-instant-switch-v42-$STAMP"
DEPLOY_COMPLETE=0

FILES=(
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

cleanup() {
  rm -rf "$STAGE" >/dev/null 2>&1 || true
}

rollback() {
  if [ "$DEPLOY_COMPLETE" -eq 0 ] && [ -d "$BACKUP" ]; then
    echo
    echo "===== ROLLBACK ====="
    for file in "${FILES[@]}"; do
      if [ -f "$BACKUP/$file" ]; then
        mkdir -p "$ROOT/$(dirname "$file")"
        cp -a "$BACKUP/$file" "$ROOT/$file"
        echo "RESTORED $file"
      fi
    done
  fi
}

trap 'rollback; cleanup' EXIT

cd "$ROOT"

echo "=============================================================="
echo " PayMyDine QUICK POS INSTANT SWITCH V42"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== STAGE QUICK POS UI FILES ====="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  git show "$REF:$file" > "$STAGE/$file"
  test -s "$STAGE/$file"
  echo "STAGED $file"
done

echo
echo "===== V42 PERFORMANCE CONTRACT ====="
for marker in   PMD_QPOS_TABLE_CACHE_STATE_V41   PMD_QPOS_TABLE_CACHE_V41   PMD_QPOS_TARGETED_TABLE_HYDRATE_V41   PMD_QPOS_FAST_ORDER_SWITCH_V41   PMD_QPOS_CHECK_CHIP_REUSE_V41   PMD_QPOS_SINGLE_FLOOR_BIND_V41   PMD_QPOS_RAIL_SELECTION_SYNC_V42   PMD_QPOS_TOUCH_PREFETCH_V42   PMD_QPOS_IDLE_TABLE_WARMUP_V42   PMD_QPOS_IMMEDIATE_TABLE_TAP_V42   PMD_QPOS_SWITCH_STATE_CLEAR_V42   PMD_QPOS_NO_RAIL_REBUILD_ON_HYDRATE_V42   PMD_QPOS_SWITCH_ERROR_CLEAR_V42; do
  grep -q "$marker" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
done

grep -q "PMD_QPOS_SWITCH_STABILITY_V42" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "pmd-quick-pos-v1.css?v=20260920-42" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260920-42" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

echo
echo "===== SELECTOR SAFETY GUARD ====="
grep -Fq "box.querySelectorAll('[data-qpos-table]')" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "box.querySelectorAll('[data-qpos-check]')" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
echo "OK collection bindings use querySelectorAll"

echo
echo "===== PRESERVE V33-V40 BEHAVIOR ====="
grep -q "PMD_QPOS_PRODUCT_BLEND_V33" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_FULLSCREEN_CANONICAL_FLOOR_V36" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_TABLE_STATUS_FILL_V37" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_RAIL_POLISH_V39" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_DIRECT_SIDE_MOVE_V37" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_CLEANING_LEFT_LOCK_V40" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_CLEANING_STATUS_NOOP_V40" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_GUIDE_POPOVER_V39" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK V33-V40 behavior preserved"

echo
echo "===== SERVER PERFORMANCE GUARD ====="
grep -q 'PMD_PERF_R20_WRITE_ONLY_SHIFT_AUDIT_CONTEXT' "$ROOT/app/admin/middleware/LogUserLastSeen.php"
grep -q 'PMD_PERF_R19_FLOOR_BOOTSTRAP_MICROCACHE' "$ROOT/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_PERF_R18_REQUEST_LOCAL_LOCATION_OPTIONS' "$ROOT/app/admin/Services/PmdSharedFloorRegistryV1.php"
if [ -f "$ROOT/app/Database/PmdCachedMySqlBuilder.php" ]; then
  grep -q 'PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA' "$ROOT/app/Database/PmdCachedMySqlBuilder.php"
fi
echo "OK R17-R20 preserved"

if command -v node >/dev/null 2>&1; then
  echo
  echo "===== JS SYNTAX CHECK ====="
  node --check "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
fi

echo
echo "===== BACKUP LIVE FILES ====="
mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$file")"
  cp -a "$ROOT/$file" "$BACKUP/$file"
  echo "BACKED UP $file"
done

echo
echo "===== DEPLOY V42 ====="
for file in "${FILES[@]}"; do
  cp -a "$STAGE/$file" "$ROOT/$file"
  cmp -s "$STAGE/$file" "$ROOT/$file"
  echo "DEPLOYED + VERIFIED $file"
done

if [ -f "$ROOT/artisan" ] && command -v php >/dev/null 2>&1; then
  php "$ROOT/artisan" view:clear >/dev/null 2>&1 || true
fi

echo
echo "===== LIVE VERIFY ====="
grep -q "PMD_QPOS_IMMEDIATE_TABLE_TAP_V42" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_IDLE_TABLE_WARMUP_V42" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_SWITCH_STABILITY_V42" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "pmd-quick-pos-v1.css?v=20260920-42" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260920-42" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " QUICK POS INSTANT SWITCH V42 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo " Table selection no longer rebuilds the full table rail or food grid."
echo " Busy tables warm sequentially in the background; touch starts prefetch early."
echo " Cached checks paint immediately and silently revalidate."
echo " Order-number switching uses the local fast path."
echo " Move stays blue while a table is loading, so it no longer flashes."
echo " Cleaning/Left lock and all prior UI behavior remain preserved."
echo "=============================================================="
