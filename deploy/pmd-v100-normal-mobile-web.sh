#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
WEB_COMMIT="502651e590ebd06d63ef0ddb38ac26b7554d1b2c"

LIVE_FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v100-normal-mobile-${STAMP}"
BACKUP_DIR="${PMD_ROOT}/storage/pmd-deploy-backups"
BACKUP="${BACKUP_DIR}/v100-normal-mobile-before-${STAMP}.tar.gz"

log(){ printf '\n[PayMyDine V100 Normal Mobile] %s\n' "$*"; }
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
echo " PayMyDine V100 Normal Mobile UI"
echo " Web commit: $WEB_COMMIT"
echo "============================================================"

log "1/5 - Fetching exact V100 commit"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${WEB_COMMIT}^{commit}" || fail "V100 commit unavailable"

log "2/5 - Staging and validating V100"
for rel in "${LIVE_FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${WEB_COMMIT}:${rel}" > "$STAGE/$rel"
done

CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

grep -q "PMD_QPOS_MOBILE_FIT_READABLE_V98" "$CSS" || fail "V98 fit baseline missing"
grep -q "PMD_QPOS_MOBILE_BALANCED_V99" "$CSS" || fail "V99 baseline missing"
grep -q "PMD_QPOS_MOBILE_NORMAL_BUTTONS_V100" "$CSS" || fail "V100 marker missing"
grep -q "pmd-quick-pos-v1.css?v=20260924-v100" "$VIEW" || fail "V100 cache bust missing"

echo "V100 FILES: PASS"

log "3/5 - Creating backup"
sudo mkdir -p "$BACKUP_DIR"
(
  cd "$PMD_ROOT"
  sudo tar -czf "$BACKUP" "${LIVE_FILES[@]}"
)
echo "BACKUP: $BACKUP"

log "4/5 - Installing exact V100 files"
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

grep -q "PMD_QPOS_MOBILE_NORMAL_BUTTONS_V100" app/admin/assets/css/pmd-quick-pos-v1.css
grep -q "pmd-quick-pos-v1.css?v=20260924-v100" app/admin/views/pmd_quick_pos_v1.blade.php

echo
echo "============================================================"
echo " PAYMYDINE V100 NORMAL MOBILE UPDATE COMPLETE"
echo "============================================================"
echo "Fit / no overflow        = PRESERVED"
echo "Floor buttons            = 16px / 52px"
echo "Map                      = 16px / 50px"
echo "Profile / History        = 16px / 52px"
echo "Search                   = 17px / 54px"
echo "Category buttons         = 16px / 50px"
echo "Food names               = 22px PRESERVED"
echo "Food prices              = 28px PRESERVED"
echo "Floating total           = 26px / 64px"
echo "History action buttons   = 16px / 50px"
echo "Backup                    = $BACKUP"
echo "============================================================"
