#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
WEB_COMMIT="51e94ebb285f69ffe660d0e310e475f945deeb2e"

LIVE_FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v99-mobile-balanced-${STAMP}"
BACKUP_DIR="${PMD_ROOT}/storage/pmd-deploy-backups"
BACKUP="${BACKUP_DIR}/v99-mobile-balanced-before-${STAMP}.tar.gz"

log(){ printf '\n[PayMyDine V99 Mobile Balanced] %s\n' "$*"; }
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
echo " PayMyDine V99 Mobile Balanced UI"
echo " Web commit: $WEB_COMMIT"
echo "============================================================"

log "1/5 - Fetching exact V99 commit"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${WEB_COMMIT}^{commit}" || fail "V99 commit unavailable"

log "2/5 - Staging and validating V99"
for rel in "${LIVE_FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${WEB_COMMIT}:${rel}" > "$STAGE/$rel"
done

CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

grep -q "PMD_QPOS_MOBILE_FIT_READABLE_V98" "$CSS" || fail "V98 fit baseline missing"
grep -q "PMD_QPOS_MOBILE_BALANCED_V99" "$CSS" || fail "V99 balanced marker missing"
if grep -q "PMD_QPOS_PORTRAIT_XL_TOUCH_V97" "$CSS"; then
  fail "Old V97 oversized layer unexpectedly present"
fi
grep -q "font-size: 22px !important" "$CSS" || fail "V99 food-name size missing"
grep -q "font-size: 28px !important" "$CSS" || fail "V99 food-price size missing"
grep -q "height: 60px !important" "$CSS" || fail "V99 floor sizing missing"
grep -q "height: 70px !important" "$CSS" || fail "V99 floating-total sizing missing"
grep -q "pmd-quick-pos-v1.css?v=20260924-v99" "$VIEW" || fail "V99 cache bust missing"

echo "V99 FILES: PASS"

log "3/5 - Creating backup"
sudo mkdir -p "$BACKUP_DIR"
(
  cd "$PMD_ROOT"
  sudo tar -czf "$BACKUP" "${LIVE_FILES[@]}"
)
echo "BACKUP: $BACKUP"

log "4/5 - Installing exact V99 files"
for rel in "${LIVE_FILES[@]}"; do
  src="$STAGE/$rel"
  dst="$PMD_ROOT/$rel"
  mode="$(stat -c '%a' "$dst")"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  sudo install -m "$mode" -o "$uid" -g "$gid" "$src" "$dst"
  echo "UPDATED: $rel"
done

log "5/5 - Clearing views and verifying live state"
cd "$PMD_ROOT"
sudo -u www-data php artisan view:clear >/dev/null 2>&1 || php artisan view:clear >/dev/null 2>&1 || true

grep -q "PMD_QPOS_MOBILE_BALANCED_V99" app/admin/assets/css/pmd-quick-pos-v1.css
grep -q "PMD_QPOS_MOBILE_FIT_READABLE_V98" app/admin/assets/css/pmd-quick-pos-v1.css
! grep -q "PMD_QPOS_PORTRAIT_XL_TOUCH_V97" app/admin/assets/css/pmd-quick-pos-v1.css
grep -q "pmd-quick-pos-v1.css?v=20260924-v99" app/admin/views/pmd_quick_pos_v1.blade.php

echo
echo "============================================================"
echo " PAYMYDINE V99 MOBILE BALANCED UPDATE COMPLETE"
echo "============================================================"
echo "Browser zoom             = NATURAL 100%"
echo "Fit / no overflow        = PRESERVED"
echo "Floor layout             = 2 x 2"
echo "Floor text               = 18px / 60px tall"
echo "Table grid               = 2 columns"
echo "Table numbers            = 30px"
echo "Profile / History        = 18px / 58px tall"
echo "Search                   = 18px / 58px tall"
echo "Category buttons         = 17px / 56px tall"
echo "Food names               = 22px"
echo "Food prices              = 28px"
echo "Options                   = 17px"
echo "Floating total           = 28px / 70px tall"
echo "History titles           = 20px"
echo "V98 fit architecture     = PRESERVED"
echo "Backup                    = $BACKUP"
echo "============================================================"
