#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
REMOTE_BRANCH="${REMOTE_BRANCH:-fix/quick-pos-canonical-floor-v35b}"
REF="origin/${REMOTE_BRANCH}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-floor-v35b.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-canonical-floor-v35b-$STAMP"
DEPLOY_COMPLETE=0

# IMPORTANT:
# Only Quick POS-owned files are deployed.
# The shared Dashboard Floor partial/CSS/JS are deliberately NOT copied or
# chmod/chowned. POS loads the already-live canonical Floor assets in place.
FILES=(
  "app/admin/controllers/PmdQuickPosV1.php"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
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
echo " PayMyDine QUICK POS CANONICAL FLOOR V35B"
echo " Branch: $REF"
echo " Backup: $BACKUP"
echo "=============================================================="

git fetch origin "$REMOTE_BRANCH"

echo
echo "===== STAGE QUICK POS FILES ONLY ====="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  git show "$REF:$file" > "$STAGE/$file"
  test -s "$STAGE/$file"
  echo "STAGED $file"
done

echo
echo "===== CANONICAL FLOOR CONTRACT PRECHECK ====="
grep -q "PMD_QPOS_EXACT_DASHBOARD_FLOOR_V26" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "quickPosExactFloorContext" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "public function floorAjax" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
grep -q "quickPosBuildFloorDisplayTables" "$STAGE/app/admin/controllers/PmdQuickPosV1.php"

grep -q "PMD_QPOS_EXACT_DASHBOARD_FLOOR_WORKSPACE_V35B" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "admin::_partials.pmd_dashboard_lab_exact_floor_v1" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
if grep -Fq "data-qpos-floor-map-stage" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"; then
  echo "ERROR: old POS-specific Floor stage is still present" >&2
  exit 1
fi

grep -q "PMD_QPOS_EXACT_DASHBOARD_FLOOR_UI_V26" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
if grep -Fq "data-qpos-map-table" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"; then
  echo "ERROR: old POS-specific Floor table renderer is still present" >&2
  exit 1
fi

grep -q "PMD_QPOS_EXACT_DASHBOARD_FLOOR_CSS_V26" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"

echo
echo "===== KEEP FOOD CARD V33/V34 ====="
grep -q "PMD_QPOS_PRODUCT_BLEND_V33" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_CARD_POLISH_V34" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -q "PMD_QPOS_PLACEHOLDER_LOGO_V34" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_REAL_PRODUCT_BODY_V31" "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"

echo
echo "===== ASSET VERSION GUARD ====="
grep -q "pmd-quick-pos-v1.css?v=20260920-35b" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-quick-pos-v1.js?v=20260920-35b" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-dashboard-lab-exact-floor-v1.js?v=20260920-floor-v35b" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "pmd-shared-floor-multi-floor-v1.js?v=20260920-floor-v35b" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

echo
echo "===== LIVE CANONICAL FLOOR FILES: READ ONLY ====="
CANONICAL_FILES=(
  "app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php"
  "app/admin/assets/css/pmd-floor-v1.css"
  "app/admin/assets/css/pmd-floor-v1-stable-v11.css"
  "app/admin/assets/css/pmd-floor-v1-native-smart-v20.css"
  "app/admin/assets/css/pmd-reservations2-floor-canvas-v310.css"
  "app/admin/assets/css/pmd-reservations2-floor-toolbar-v316.css"
  "app/admin/assets/css/pmd-reservations2-floor-reservation-v312.css"
  "app/admin/assets/css/pmd-dashboard-lab-exact-floor-v1.css"
  "app/admin/assets/css/pmd-shared-floor-multi-floor-v1.css"
  "app/admin/assets/js/pmd-dashboard-lab-exact-floor-v1.js"
  "app/admin/assets/js/pmd-shared-floor-multi-floor-v1.js"
)
for file in "${CANONICAL_FILES[@]}"; do
  test -r "$ROOT/$file"
  echo "USING LIVE $file"
done
echo "No shared Floor file will be written."

echo
echo "===== ROUTE + PERFORMANCE GUARD ====="
grep -q "PmdQuickPosV1::class, 'floorAjax'" "$ROOT/routes/admin-quick-mode.php"
grep -q 'PMD_PERF_R20_WRITE_ONLY_SHIFT_AUDIT_CONTEXT' "$ROOT/app/admin/middleware/LogUserLastSeen.php"
grep -q 'PMD_PERF_R19_FLOOR_BOOTSTRAP_MICROCACHE' "$ROOT/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
grep -q 'PMD_PERF_R18_REQUEST_LOCAL_LOCATION_OPTIONS' "$ROOT/app/admin/Services/PmdSharedFloorRegistryV1.php"
if [ -f "$ROOT/app/Database/PmdCachedMySqlBuilder.php" ]; then
  grep -q 'PMD_PERF_R17_LAZY_SHARED_SCHEMA_METADATA' "$ROOT/app/Database/PmdCachedMySqlBuilder.php"
fi
echo "OK route + R17-R20 preserved"

echo
echo "===== SYNTAX CHECK ====="
php -l "$STAGE/app/admin/controllers/PmdQuickPosV1.php"
if command -v node >/dev/null 2>&1; then
  node --check "$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
else
  echo "INFO: node not installed; skipping optional node --check"
fi

echo
echo "===== BACKUP LIVE QUICK POS FILES ====="
mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$file")"
  cp -a "$ROOT/$file" "$BACKUP/$file"
  echo "BACKED UP $file"
done

echo
echo "===== DEPLOY QUICK POS FILES ONLY ====="
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
grep -q "quickPosExactFloorContext" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -q "PMD_QPOS_EXACT_DASHBOARD_FLOOR_WORKSPACE_V35B" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -q "PMD_QPOS_EXACT_DASHBOARD_FLOOR_UI_V26" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -q "PMD_QPOS_CARD_POLISH_V34" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"

DEPLOY_COMPLETE=1

echo
echo "=============================================================="
echo " QUICK POS CANONICAL FLOOR V35B DEPLOY COMPLETE"
echo " Backup: $BACKUP"
echo " Quick POS now embeds the already-live canonical Dashboard Floor."
echo " Shared Floor files were READ ONLY and were not modified."
echo " Food-card V33/V34 polish is preserved."
echo "=============================================================="
