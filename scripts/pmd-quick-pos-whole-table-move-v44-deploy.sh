#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-feat/quick-pos-whole-table-move-v44}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v44.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-whole-table-move-v44-$STAMP"
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
echo " PayMyDine QUICK POS WHOLE-TABLE MOVE V44"
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
echo "===== V44 WHOLE-TABLE MOVE CONTRACT ====="
for marker in   PMD_QPOS_MOVE_SCOPE_STATE_V44   PMD_QPOS_STABLE_ACTIONS_DURING_MOVE_V44   PMD_QPOS_DIRECT_MOVE_SCOPE_LABEL_V44   PMD_QPOS_DIRECT_MOVE_SCOPE_CHOOSER_V44   PMD_QPOS_OPTIMISTIC_WHOLE_TABLE_MOVE_V44   PMD_QPOS_MOVE_SCOPE_BINDINGS_V44   PMD_QPOS_TRANSFER_BUSY_CLEAR_V44; do
  grep -q "$marker" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
done

for marker in   PMD_QPOS_FAST_WHOLE_TABLE_TRANSFER_V44   PMD_QPOS_FAST_WHOLE_TABLE_IDS_V44; do
  grep -q "$marker" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
done

grep -q "PMD_QPOS_WHOLE_TABLE_MOVE_V44" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_DIRECT_MOVE_SCOPE_CHOOSER_VIEW_V44" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.css?v=20260920-44" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260920-44" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

echo
echo "===== COLLECTION BINDING SAFETY ====="
BROKEN_SCOPE_BINDING="\$('[data-qpos-direct-move-scope]').forEach"
BROKEN_CHECK_BINDING="\$('[data-qpos-check]', box).forEach"
BROKEN_TABLE_BINDING="\$('[data-qpos-table]', box).forEach"

for broken in \
  "$BROKEN_SCOPE_BINDING" \
  "$BROKEN_CHECK_BINDING" \
  "$BROKEN_TABLE_BINDING"; do
  if grep -Fq "$broken" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"; then
    echo "ERROR: unsafe single-element selector .forEach binding found: $broken" >&2
    exit 1
  fi
done

grep -Fq "root.querySelectorAll('[data-qpos-direct-move-scope]')" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
echo "OK move-scope controls use collection-safe bindings"

echo
echo "===== PRESERVE V37-V43 ====="
grep -q "PMD_QPOS_DIRECT_SIDE_MOVE_V37" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_CLEANING_LEFT_LOCK_V40" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_IMMEDIATE_TABLE_TAP_V42" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_DIRECT_MOVE_NO_PRE_RENDER_V43" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_DIRECT_MOVE_NO_BOOTSTRAP_V43" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_TRANSFER_PAYABLE_LOCK_V43" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_GUIDE_POPOVER_V39" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK V37-V43 preserved"

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
echo "===== DEPLOY V44 ====="
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
grep -q "PMD_QPOS_DIRECT_MOVE_SCOPE_CHOOSER_V44" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_OPTIMISTIC_WHOLE_TABLE_MOVE_V44" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_FAST_WHOLE_TABLE_TRANSFER_V44" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_WHOLE_TABLE_MOVE_V44" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "pmd-quick-pos-v1.js?v=20260920-44" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " QUICK POS WHOLE-TABLE MOVE V44 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo " Multi-check tables now offer: This order / Whole table."
echo " Whole table moves every open payable check to one destination."
echo " Whole-table destination selection stays directly in the left table rail."
echo " Whole-table moves paint immediately and roll back on server error."
echo " Whole-table server validation now uses lightweight order-ID queries."
echo " Left / Move / Free keep stable colors while a move commits."
echo " V43 instant single-order Move and V42 switching performance remain preserved."
echo "=============================================================="
