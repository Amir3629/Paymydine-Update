#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-perf/quick-pos-instant-check-switch-v41}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v41.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-instant-check-switch-v41-$STAMP"
DEPLOY_COMPLETE=0

FILES=(
  "app/admin/assets/js/pmd-quick-pos-v1.js"
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
echo " PayMyDine QUICK POS INSTANT TABLE/CHECK SWITCH V41"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== STAGE JS + VIEW ONLY ====="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  git show "$REF:$file" > "$STAGE/$file"
  test -s "$STAGE/$file"
  echo "STAGED $file"
done

echo
echo "===== V41 PERFORMANCE CONTRACT ====="
for marker in   PMD_QPOS_TABLE_CACHE_STATE_V41   PMD_QPOS_TABLE_CACHE_V41   PMD_QPOS_TARGETED_TABLE_HYDRATE_V41   PMD_QPOS_TABLE_HOVER_PREFETCH_V41   PMD_QPOS_INSTANT_TABLE_SWITCH_V41   PMD_QPOS_FAST_ORDER_SWITCH_V41   PMD_QPOS_CHECK_CHIP_REUSE_V41   PMD_QPOS_RENDER_CART_FAST_PATH_V41   PMD_QPOS_SINGLE_FLOOR_BIND_V41   PMD_QPOS_AUTHORITATIVE_REFRESH_V41   PMD_QPOS_TABLE_CACHE_INVALIDATE_V41; do
  grep -q "$marker" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
done

grep -q "pmd-quick-pos-v1.js?v=20260920-41" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

echo
echo "===== PRESERVE V36-V40 ====="
grep -q "PMD_QPOS_FULLSCREEN_FLOOR_REFIT_V36" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_DIRECT_SIDE_MOVE_V37" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_STABLE_TABLE_SWITCH_V39" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_CHECK_LOOP_FIX_V40" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_CLEANING_LEFT_LOCK_V40" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_CLEANING_STATUS_NOOP_V40" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_GUIDE_POPOVER_V39" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK V36-V40 preserved"

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
echo "===== DEPLOY V41 ====="
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
grep -q "PMD_QPOS_TABLE_CACHE_V41" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_FAST_ORDER_SWITCH_V41" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_SINGLE_FLOOR_BIND_V41" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "pmd-quick-pos-v1.js?v=20260920-41" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " QUICK POS INSTANT TABLE/CHECK SWITCH V41 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo " Table clicks use hover/focus prefetch + a short in-memory cache."
echo " Cached checks paint immediately, then silently revalidate."
echo " Order-number switching updates only the check area."
echo " Repeated Floor listeners no longer accumulate during renderCart()."
echo " V40 Cleaning/Left behavior remains unchanged."
echo "=============================================================="
