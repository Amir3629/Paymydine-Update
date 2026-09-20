#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-feat/quick-pos-table-guide-v38}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v38.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-table-guide-v38-$STAMP"
DEPLOY_COMPLETE=0

FILES=(
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
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
echo " PayMyDine QUICK POS TABLE GUIDE V38"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== STAGE VIEW + CSS ONLY ====="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  git show "$REF:$file" > "$STAGE/$file"
  test -s "$STAGE/$file"
  echo "STAGED $file"
done

echo
echo "===== V38 UI CONTRACT ====="
grep -q "PMD_QPOS_TABLE_GUIDE_V38" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "PMD_QPOS_TABLE_GUIDE_STYLE_V38" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "pmd-qpos-table-guide-icons" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-qpos-floor-tools" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "data-qpos-floor-map-open" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.css?v=20260920-38" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

if grep -q '<div class="pmd-qpos-panel-head">' "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"; then
  echo "ERROR: old table panel head is still present" >&2
  exit 1
fi

if grep -q '<div class="pmd-qpos-table-legend">' "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"; then
  echo "ERROR: old table status legend is still present" >&2
  exit 1
fi

echo
echo "===== PRESERVE V33-V37 ====="
grep -q "PMD_QPOS_PRODUCT_BLEND_V33" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_CARD_POLISH_V34" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_FULLSCREEN_CANONICAL_FLOOR_V36" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_TABLE_STATUS_FILL_V37" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_DIRECT_SIDE_MOVE_V37" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
echo "OK V33-V37 preserved"

echo
echo "===== PERFORMANCE GUARD ====="
grep -q 'PMD_PERF_R20_WRITE_ONLY_SHIFT_AUDIT_CONTEXT' "$ROOT/app/admin/middleware/LogUserLastSeen.php"
grep -q 'PMD_PERF_R19_FLOOR_BOOTSTRAP_MICROCACHE' "$ROOT/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_PERF_R18_REQUEST_LOCAL_LOCATION_OPTIONS' "$ROOT/app/admin/Services/PmdSharedFloorRegistryV1.php"
if [ -f "$ROOT/app/Database/PmdCachedMySqlBuilder.php" ]; then
  grep -q 'PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA' "$ROOT/app/Database/PmdCachedMySqlBuilder.php"
fi
echo "OK R17-R20 preserved"

echo
echo "===== BACKUP LIVE FILES ====="
mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$file")"
  cp -a "$ROOT/$file" "$BACKUP/$file"
  echo "BACKED UP $file"
done

echo
echo "===== DEPLOY V38 ====="
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
grep -q "PMD_QPOS_TABLE_GUIDE_V38" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "PMD_QPOS_TABLE_GUIDE_STYLE_V38" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "pmd-quick-pos-v1.css?v=20260920-38" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " QUICK POS TABLE GUIDE V38 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo " Old table title/count row removed."
echo " Old dot legend removed."
echo " Map button moved under Floor controls."
echo " New guide card explains table colors and signal icons."
echo " Direct Move V37 and fullscreen Floor remain unchanged."
echo "=============================================================="
