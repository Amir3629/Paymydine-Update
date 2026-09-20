#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-feat/quick-pos-card-shadow-v30}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-shadow-v30.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-shadow-v30-$STAMP"
DEPLOY_COMPLETE=0

FILES=(
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
echo " PayMyDine QUICK POS PRODUCT SHADOW V30"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== STAGE ONLY CSS + VIEW ====="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  git show "$REF:$file" > "$STAGE/$file"
  test -s "$STAGE/$file"
  echo "STAGED $file"
done

echo
echo "===== SHADOW CONTRACT PRECHECK ====="
grep -q "PMD_QPOS_PRODUCT_SHADOW_BAND_V30" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "pmd-qpos-product::after" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "rgba(15,23,42,.32)" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "pmd-quick-pos-v1.css?v=20260920-30" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

echo
echo "===== PERFORMANCE + NUMBERING GUARD ====="
grep -q 'PMD_PERF_R20_WRITE_ONLY_SHIFT_AUDIT_CONTEXT' "$ROOT/app/admin/middleware/LogUserLastSeen.php"
grep -q 'PMD_PERF_R19_FLOOR_BOOTSTRAP_MICROCACHE' "$ROOT/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_PERF_R18_REQUEST_LOCAL_LOCATION_OPTIONS' "$ROOT/app/admin/Services/PmdSharedFloorRegistryV1.php"
if [ -f "$ROOT/app/Database/PmdCachedMySqlBuilder.php" ]; then
  grep -q 'PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA' "$ROOT/app/Database/PmdCachedMySqlBuilder.php"
fi
grep -q "PMD_QPOS_FOOD_NUMBER_PUNCT_V27" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
echo "OK performance stack + food-number renderer preserved"

echo
echo "===== BACKUP LIVE FILES ====="
mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$file")"
  cp -a "$ROOT/$file" "$BACKUP/$file"
  echo "BACKED UP $file"
done

echo
echo "===== DEPLOY ====="
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
echo "===== LIVE VERIFY ====="
grep -q "PMD_QPOS_PRODUCT_SHADOW_BAND_V30" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "pmd-quick-pos-v1.css?v=20260920-30" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " QUICK POS PRODUCT SHADOW V30 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo " Dedicated shadow band is now deployed."
echo " Only CSS + Quick POS view changed."
echo "=============================================================="
