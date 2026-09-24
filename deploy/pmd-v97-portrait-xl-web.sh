#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
WEB_COMMIT="ae29fb86b5f087654864daa2e40a3f8b23cf9214"

LIVE_FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v97-portrait-xl-${STAMP}"
BACKUP_DIR="${PMD_ROOT}/storage/pmd-deploy-backups"
BACKUP="${BACKUP_DIR}/v97-portrait-xl-before-${STAMP}.tar.gz"

log(){ printf '\n[PayMyDine V97 Portrait XL] %s\n' "$*"; }
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
echo " PayMyDine V97 Portrait XL Touch UI"
echo " Web commit: $WEB_COMMIT"
echo "============================================================"

log "1/5 - Fetching exact V97 commit"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${WEB_COMMIT}^{commit}" || fail "V97 commit unavailable"

log "2/5 - Staging and validating exact V97 files"
for rel in "${LIVE_FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${WEB_COMMIT}:${rel}" > "$STAGE/$rel"
done

CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

grep -q "PMD_QPOS_PORTRAIT_BREAKPOINT_V96" "$CSS" || fail "V96 baseline marker missing"
grep -q "PMD_QPOS_PORTRAIT_XL_TOUCH_V97" "$CSS" || fail "V97 XL marker missing"
grep -q "font-size: clamp(35px,4.6vw,42px) !important" "$CSS" || fail "V97 food-name size missing"
grep -q "font-size: clamp(42px,5.2vw,50px) !important" "$CSS" || fail "V97 price size missing"
grep -q "font-size: clamp(46px,5.8vw,54px) !important" "$CSS" || fail "V97 table-number size missing"
grep -q "min-height: 98px !important" "$CSS" || fail "V97 floor-button height missing"
grep -q "height: 116px !important" "$CSS" || fail "V97 floating-cart height missing"
grep -q "pmd-quick-pos-v1.css?v=20260924-v97" "$VIEW" || fail "V97 CSS cache bust missing"

echo "V97 FILES: PASS"

log "3/5 - Creating backup"
sudo mkdir -p "$BACKUP_DIR"
(
  cd "$PMD_ROOT"
  sudo tar -czf "$BACKUP" "${LIVE_FILES[@]}"
)
echo "BACKUP: $BACKUP"

log "4/5 - Installing exact V97 files"
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

grep -q "PMD_QPOS_PORTRAIT_XL_TOUCH_V97" app/admin/assets/css/pmd-quick-pos-v1.css
grep -q "pmd-quick-pos-v1.css?v=20260924-v97" app/admin/views/pmd_quick_pos_v1.blade.php

echo
echo "============================================================"
echo " PAYMYDINE V97 PORTRAIT XL UPDATE COMPLETE"
echo "============================================================"
echo "Activation               = PORTRAIT CLASS, NO WIDTH BREAKPOINT"
echo "Floor buttons            = ~28-32px / 98px tall"
echo "Map                      = 30px / 94px tall"
echo "Table grid               = 2 columns"
echo "Table numbers            = ~46-54px"
echo "Table status             = 25px"
echo "Profile / History        = 30px / 94px tall"
echo "Search text              = 30px / 102px tall"
echo "Category buttons         = ~26-30px / 96px tall"
echo "Food names               = ~35-42px"
echo "Food prices              = ~42-50px"
echo "Options text             = 27px"
echo "Floating total           = 48px / 116px tall"
echo "Cart / checkout text     = 23-38px"
echo "History order titles     = 30px"
echo "V96 portrait behavior    = PRESERVED"
echo "V94 floating cart safety = PRESERVED"
echo "Backup                    = $BACKUP"
echo "============================================================"
