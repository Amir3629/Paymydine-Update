#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-feat/quick-pos-card-overlay-v28}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-card-v28.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-card-v28-$STAMP"
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
echo " PayMyDine QUICK POS CARD OVERLAY V28"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== STAGE ONLY QUICK POS UI FILES ====="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  git show "$REF:$file" > "$STAGE/$file"
  test -s "$STAGE/$file"
  echo "STAGED $file"
done

echo
echo "===== UI CONTRACT PRECHECK ====="
grep -q "PMD_QPOS_PRODUCT_BODY_OVERLAY_V28" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_FOOD_NUMBER_PUNCT_V27" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "esc(item.menu_number) + '.</span>'" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
if grep -Fq '">#' "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"; then
  echo "ERROR: hash-prefixed food number renderer is still present" >&2
  exit 1
fi
grep -q "pmd-quick-pos-v1.css?v=20260920-28" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260920-28" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

if command -v node >/dev/null 2>&1; then
  node --check "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
else
  echo "INFO: node not installed; skipping optional node --check"
fi

echo
echo "===== PERFORMANCE GUARD ====="
grep -q 'PMD_PERF_R20_WRITE_ONLY_SHIFT_AUDIT_CONTEXT' "$ROOT/app/admin/middleware/LogUserLastSeen.php"
grep -q 'PMD_PERF_R19_FLOOR_BOOTSTRAP_MICROCACHE' "$ROOT/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_PERF_R18_REQUEST_LOCAL_LOCATION_OPTIONS' "$ROOT/app/admin/Services/PmdSharedFloorRegistryV1.php"
if [ -f "$ROOT/app/Database/PmdCachedMySqlBuilder.php" ]; then
  grep -q 'PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA' "$ROOT/app/Database/PmdCachedMySqlBuilder.php"
fi
echo "OK R17-R20 performance stack present"

echo
echo "===== BACKUP CURRENT LIVE UI FILES ====="
mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$file")"
  cp -a "$ROOT/$file" "$BACKUP/$file"
  echo "BACKED UP $file"
done

echo
echo "===== DEPLOY QUICK POS CARD V28 ====="
for file in "${FILES[@]}"; do
  cp -a "$STAGE/$file" "$ROOT/$file"
  cmp -s "$STAGE/$file" "$ROOT/$file"
  echo "DEPLOYED + VERIFIED $file"
done

echo
echo "===== CLEAR COMPILED VIEWS ====="
if [ -f "$ROOT/artisan" ] && command -v php >/dev/null 2>&1; then
  php "$ROOT/artisan" view:clear >/dev/null 2>&1 || true
fi

echo
echo "===== LIVE MARKERS ====="
grep -q "PMD_QPOS_PRODUCT_BODY_OVERLAY_V28" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_FOOD_NUMBER_PUNCT_V27" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "pmd-quick-pos-v1.css?v=20260920-28" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260920-28" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " QUICK POS CARD OVERLAY V28 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo " Only CSS, Quick POS JS label rendering, and the Quick POS view changed."
echo " R17-R20 performance authorities were verified and not replaced."
echo "=============================================================="
