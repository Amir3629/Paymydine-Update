#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-feat/quick-pos-table-colors-direct-move-v37}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v37.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-table-colors-direct-move-v37-$STAMP"
DEPLOY_COMPLETE=0

FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
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
echo " PayMyDine QUICK POS TABLE COLORS + DIRECT MOVE V37"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== STAGE QUICK POS UI FILES ONLY ====="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  git show "$REF:$file" > "$STAGE/$file"
  test -s "$STAGE/$file"
  echo "STAGED $file"
done

echo
echo "===== TABLE COLOR CONTRACT ====="
grep -q "PMD_QPOS_TABLE_STATUS_FILL_V37" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q 'background: #22c96f !important' "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q 'background: #ff3d52 !important' "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q 'background: #8b5cf6 !important' "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q 'background: #f59e0b !important' "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "pmd-qpos-table:not(.pmd-qpos-pickup)::after" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"

echo
echo "===== DIRECT SIDE MOVE CONTRACT ====="
grep -q "PMD_QPOS_DIRECT_SIDE_MOVE_V37" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "function openDirectSideMove()" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "function directMoveOrderToTable(tableId)" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "is-move-target" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "move.textContent = directMove ? 'Cancel' : 'Move'" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"

echo
echo "===== ASSET VERSION ====="
grep -q "pmd-quick-pos-v1.css?v=20260920-37" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260920-37" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

echo
echo "===== PRESERVE V33-V36 ====="
grep -q "PMD_QPOS_PRODUCT_BLEND_V33" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_CARD_POLISH_V34" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_FULLSCREEN_CANONICAL_FLOOR_V36" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_FULLSCREEN_FLOOR_REFIT_V36" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_EXACT_DASHBOARD_FLOOR_WORKSPACE_V35B" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK V33-V36 preserved"

echo
echo "===== BACKEND + PERFORMANCE GUARD ====="
grep -q "public function transfer()" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PmdQuickPosV1::class, 'transfer'" "$ROOT/routes/admin-quick-mode.php"
grep -q 'PMD_PERF_R20_WRITE_ONLY_SHIFT_AUDIT_CONTEXT' "$ROOT/app/admin/middleware/LogUserLastSeen.php"
grep -q 'PMD_PERF_R19_FLOOR_BOOTSTRAP_MICROCACHE' "$ROOT/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_PERF_R18_REQUEST_LOCAL_LOCATION_OPTIONS' "$ROOT/app/admin/Services/PmdSharedFloorRegistryV1.php"
if [ -f "$ROOT/app/Database/PmdCachedMySqlBuilder.php" ]; then
  grep -q 'PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA' "$ROOT/app/Database/PmdCachedMySqlBuilder.php"
fi
echo "OK transfer backend + R17-R20 preserved"

if command -v node >/dev/null 2>&1; then
  echo
  echo "===== JS SYNTAX CHECK ====="
  node --check "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
fi

echo
echo "===== BACKUP LIVE QUICK POS UI ====="
mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$file")"
  cp -a "$ROOT/$file" "$BACKUP/$file"
  echo "BACKED UP $file"
done

echo
echo "===== DEPLOY V37 ====="
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
grep -q "PMD_QPOS_TABLE_STATUS_FILL_V37" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_DIRECT_SIDE_MOVE_V37" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "pmd-quick-pos-v1.css?v=20260920-37" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260920-37" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " QUICK POS TABLE COLORS + DIRECT MOVE V37 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo " Table cards now use full sharp status colors; corner status dots are gone."
echo " Move now runs from the left table rail: Move -> destination table."
echo " Canonical fullscreen Floor and food-card polish remain unchanged."
echo "=============================================================="
