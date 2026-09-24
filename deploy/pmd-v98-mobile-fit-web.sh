#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
WEB_COMMIT="f2ed3f304ac925127efa4382d9fb8bae1196e9e0"

LIVE_FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v98-mobile-fit-${STAMP}"
BACKUP_DIR="${PMD_ROOT}/storage/pmd-deploy-backups"
BACKUP="${BACKUP_DIR}/v98-mobile-fit-before-${STAMP}.tar.gz"

log(){ printf '\n[PayMyDine V98 Mobile Fit] %s\n' "$*"; }
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
echo " PayMyDine V98 Mobile Fit + Readable UI"
echo " Web commit: $WEB_COMMIT"
echo "============================================================"

log "1/5 - Fetching exact V98 commit"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${WEB_COMMIT}^{commit}" || fail "V98 commit unavailable"

log "2/5 - Staging and validating V98"
for rel in "${LIVE_FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${WEB_COMMIT}:${rel}" > "$STAGE/$rel"
done

CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

grep -q "PMD_QPOS_MOBILE_FIT_READABLE_V98" "$CSS" || fail "V98 marker missing"
if grep -q "PMD_QPOS_PORTRAIT_XL_TOUCH_V97" "$CSS"; then
  fail "Old V97 XL layer still present"
fi
grep -q "max-width: 100vw !important" "$CSS" || fail "Viewport fit rule missing"
grep -q "font-size: 25px !important" "$CSS" || fail "Food-name size missing"
grep -q "font-size: 32px !important" "$CSS" || fail "Food-price size missing"
grep -q "height: 68px !important" "$CSS" || fail "Readable control sizing missing"
grep -q "height: 78px !important" "$CSS" || fail "Floating total sizing missing"
grep -q "pmd-quick-pos-v1.css?v=20260924-v98" "$VIEW" || fail "V98 cache bust missing"

echo "V98 FILES: PASS"

log "3/5 - Creating backup"
sudo mkdir -p "$BACKUP_DIR"
(
  cd "$PMD_ROOT"
  sudo tar -czf "$BACKUP" "${LIVE_FILES[@]}"
)
echo "BACKUP: $BACKUP"

log "4/5 - Installing exact V98 files"
for rel in "${LIVE_FILES[@]}"; do
  src="$STAGE/$rel"
  dst="$PMD_ROOT/$rel"
  mode="$(stat -c '%a' "$dst")"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  sudo install -m "$mode" -o "$uid" -g "$gid" "$src" "$dst"
  echo "UPDATED: $rel"
done

log "5/5 - Clearing compiled views and final verification"
cd "$PMD_ROOT"
sudo -u www-data php artisan view:clear >/dev/null 2>&1 || php artisan view:clear >/dev/null 2>&1 || true

grep -q "PMD_QPOS_MOBILE_FIT_READABLE_V98" app/admin/assets/css/pmd-quick-pos-v1.css
! grep -q "PMD_QPOS_PORTRAIT_XL_TOUCH_V97" app/admin/assets/css/pmd-quick-pos-v1.css
grep -q "pmd-quick-pos-v1.css?v=20260924-v98" app/admin/views/pmd_quick_pos_v1.blade.php

echo
echo "============================================================"
echo " PAYMYDINE V98 MOBILE FIT UPDATE COMPLETE"
echo "============================================================"
echo "Browser zoom             = NATURAL 100%"
echo "Horizontal page overflow = BLOCKED"
echo "Floor layout             = 2 x 2"
echo "Floor text               = 20px / 68px tall"
echo "Table grid               = 2 columns"
echo "Table numbers            = 34px"
echo "Profile / History        = 20px / 64px tall"
echo "Search                   = 19px / 64px tall"
echo "Category buttons         = 19px / 62px tall"
echo "Food names               = 25px"
echo "Food prices              = 32px"
echo "Options                   = 18px"
echo "Floating total           = 31px / 78px tall"
echo "History titles           = 22px"
echo "V97 oversized layer      = REMOVED"
echo "V96 portrait logic       = PRESERVED"
echo "Backup                    = $BACKUP"
echo "============================================================"
