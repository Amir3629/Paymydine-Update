#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-perf/quick-pos-instant-move-v43}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v43.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-instant-move-v43-$STAMP"
DEPLOY_COMPLETE=0

FILES=(
  "app/admin/controllers/PmdQuickPosV1.php"
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
echo " PayMyDine QUICK POS INSTANT MOVE V43"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== STAGE CONTROLLER + QUICK POS UI ====="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  git show "$REF:$file" > "$STAGE/$file"
  test -s "$STAGE/$file"
  echo "STAGED $file"
done

echo
echo "===== V43 DIRECT MOVE CONTRACT ====="
for marker in   PMD_QPOS_DIRECT_MOVE_NO_PRE_RENDER_V43   PMD_QPOS_OPTIMISTIC_DIRECT_MOVE_V43   PMD_QPOS_DIRECT_MOVE_NO_BOOTSTRAP_V43   PMD_QPOS_DIRECT_MOVE_ROLLBACK_V43   PMD_QPOS_TRANSFER_COMMIT_ACTION_LOCK_V43; do
  grep -q "$marker" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
done

for marker in   PMD_QPOS_FAST_ORDER_TRANSFER_V43   PMD_QPOS_TRANSFER_PAYABLE_LOCK_V43   PMD_QPOS_TRANSFER_REMAINING_COUNT_V43; do
  grep -q "$marker" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
done

grep -q "PMD_QPOS_DIRECT_MOVE_COMMIT_STABILITY_V43" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "pmd-quick-pos-v1.css?v=20260920-43" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260920-43" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

echo
echo "===== V42 + CLEANING GUARDS ====="
grep -q "PMD_QPOS_IMMEDIATE_TABLE_TAP_V42" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_NO_RAIL_REBUILD_ON_HYDRATE_V42" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_FAST_ORDER_SWITCH_V41" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_DIRECT_SIDE_MOVE_V37" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_CLEANING_LEFT_LOCK_V40" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_CLEANING_STATUS_NOOP_V40" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_GUIDE_POPOVER_V39" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK V37-V42 behavior preserved"

echo
echo "===== SERVER PERFORMANCE GUARD ====="
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
if command -v node >/dev/null 2>&1; then
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
echo "===== DEPLOY V43 ====="
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
grep -q "PMD_QPOS_OPTIMISTIC_DIRECT_MOVE_V43" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_DIRECT_MOVE_NO_BOOTSTRAP_V43" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_FAST_ORDER_TRANSFER_V43" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_DIRECT_MOVE_COMMIT_STABILITY_V43" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "pmd-quick-pos-v1.js?v=20260920-43" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " QUICK POS INSTANT MOVE V43 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo " Destination tap paints the move immediately and rolls back on server error."
echo " Direct Move no longer waits for renderAll() or a full bootstrap refresh."
echo " Server order-transfer validation no longer hydrates all order items/statuses."
echo " Destination check data revalidates in the background only."
echo " Move stays visually stable while the transaction commits."
echo " V42 table/check speed and V40 Cleaning/Left lock remain preserved."
echo "=============================================================="
