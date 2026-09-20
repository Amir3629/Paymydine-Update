#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-feat/quick-pos-card-polish-v34}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-polish-v34.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-polish-v34-$STAMP"
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
echo " PayMyDine QUICK POS CARD POLISH V34"
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
echo "===== UI CONTRACT PRECHECK ====="
grep -q "PMD_QPOS_PRODUCT_BLEND_V33" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_CARD_POLISH_V34" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_PLACEHOLDER_LOGO_V34" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "pmd-qpos-product-image is-placeholder" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "url('/brand/paymydine-logo.svg')" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "pmd-quick-pos-v1.css?v=20260920-34" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260920-34" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

if command -v node >/dev/null 2>&1; then
  node --check "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
else
  echo "INFO: node not installed; skipping optional node --check"
fi

echo
echo "===== CANONICAL MENU FALLBACK GUARD ====="
grep -q "PMD_EDIT_FOOD_MONO_LOGO_V1" "$ROOT/app/admin/assets/css/pmd-menu-manager-v129.css"
grep -q "url('/brand/paymydine-logo.svg')" "$ROOT/app/admin/assets/css/pmd-menu-manager-v129.css"
echo "OK canonical Menu-page monochrome PayMyDine fallback found"

echo
echo "===== PERFORMANCE GUARD ====="
grep -q 'PMD_PERF_R20_WRITE_ONLY_SHIFT_AUDIT_CONTEXT' "$ROOT/app/admin/middleware/LogUserLastSeen.php"
grep -q 'PMD_PERF_R19_FLOOR_BOOTSTRAP_MICROCACHE' "$ROOT/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_PERF_R18_REQUEST_LOCAL_LOCATION_OPTIONS' "$ROOT/app/admin/Services/PmdSharedFloorRegistryV1.php"
if [ -f "$ROOT/app/Database/PmdCachedMySqlBuilder.php" ]; then
  grep -q 'PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA' "$ROOT/app/Database/PmdCachedMySqlBuilder.php"
fi
echo "OK R17-R20 performance stack preserved"

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

if [ -f "$ROOT/artisan" ] && command -v php >/dev/null 2>&1; then
  php "$ROOT/artisan" view:clear >/dev/null 2>&1 || true
fi

echo
echo "===== LIVE VERIFY ====="
grep -q "PMD_QPOS_CARD_POLISH_V34" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_PLACEHOLDER_LOGO_V34" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "pmd-quick-pos-v1.css?v=20260920-34" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260920-34" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " QUICK POS CARD POLISH V34 DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo " Empty previews now use the Menu-page monochrome PayMyDine mark."
echo " Selected cards keep the green quantity badge without a dark frame."
echo "=============================================================="
