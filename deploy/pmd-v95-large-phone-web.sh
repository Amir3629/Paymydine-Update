#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
WEB_COMMIT="e4ba8d8d750b326a7b71f0448039531171632bcf"

LIVE_FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v95-large-phone-${STAMP}"
BACKUP_DIR="${PMD_ROOT}/storage/pmd-deploy-backups"
BACKUP="${BACKUP_DIR}/v95-large-phone-before-${STAMP}.tar.gz"

log(){ printf '\n[PayMyDine V95 Large Phone UI] %s\n' "$*"; }
fail(){ printf '\n[ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "${PMD_ROOT}/.git" ]] || fail "Not a git checkout: ${PMD_ROOT}"
[[ -f "${PMD_ROOT}/artisan" ]] || fail "artisan missing"

for cmd in git tar stat grep install php; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Required command missing: $cmd"
done

sudo -n true
mkdir -p "$STAGE"
trap 'rm -rf "$STAGE"' EXIT

GIT=(git -c "safe.directory=${PMD_ROOT}" -C "${PMD_ROOT}")

echo "============================================================"
echo " PayMyDine V95 Large Phone UI"
echo " Web commit: $WEB_COMMIT"
echo "============================================================"

log "1/5 - Fetching exact web commit"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${WEB_COMMIT}^{commit}" || fail "V95 commit unavailable"

log "2/5 - Staging exact V95 files"
for rel in "${LIVE_FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${WEB_COMMIT}:${rel}" > "$STAGE/$rel"
done

grep -q "PMD_QPOS_MOBILE_TOUCH_HISTORY_V93" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css" || fail "V93 mobile history marker missing"
grep -q "PMD_QPOS_FLOATING_CART_MODAL_SAFETY_V94" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css" || fail "V94 floating cart marker missing"
grep -q "PMD_QPOS_PHONE_SCALE_V95" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css" || fail "V95 large phone marker missing"
grep -q "grid-template-columns: repeat(2,minmax(0,1fr)) !important" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css" || fail "V95 two-column phone table grid missing"
grep -q "font-size: 38px !important" "$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css" || fail "V95 table number scale missing"
grep -q "pmd-quick-pos-v1.css?v=20260924-v95" "$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php" || fail "V95 CSS cache bust missing"

echo "V95 FILES: PASS"

log "3/5 - Creating backup"
sudo mkdir -p "$BACKUP_DIR"
(
  cd "$PMD_ROOT"
  sudo tar -czf "$BACKUP" "${LIVE_FILES[@]}"
)
echo "BACKUP: $BACKUP"

log "4/5 - Installing V95 web files"
for rel in "${LIVE_FILES[@]}"; do
  src="$STAGE/$rel"
  dst="$PMD_ROOT/$rel"
  mode="$(stat -c '%a' "$dst")"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  sudo install -m "$mode" -o "$uid" -g "$gid" "$src" "$dst"
  echo "UPDATED: $rel"
done

log "5/5 - Clearing views and verifying live files"
cd "$PMD_ROOT"
sudo -u www-data php artisan view:clear >/dev/null 2>&1 || php artisan view:clear >/dev/null 2>&1 || true

grep -q "PMD_QPOS_PHONE_SCALE_V95" app/admin/assets/css/pmd-quick-pos-v1.css
grep -q "pmd-quick-pos-v1.css?v=20260924-v95" app/admin/views/pmd_quick_pos_v1.blade.php

echo
echo "============================================================"
echo " PAYMYDINE V95 LARGE PHONE UI COMPLETE"
echo "============================================================"
echo "Phone table grid       = 2 COLUMNS"
echo "Table number font      = 38px"
echo "Floor/category actions = 21-22px / 76-78px tall"
echo "Search/clock           = 80px tall"
echo "Food name              = 26-27px"
echo "Food price             = 34-35px"
echo "Floating cart total    = 36px / 94px tall"
echo "History order title    = 23px"
echo "History rows           = 124px minimum"
echo "V93 History tables     = PRESERVED"
echo "V94 floating cart      = PRESERVED"
echo "Backup                 = $BACKUP"
echo "============================================================"
