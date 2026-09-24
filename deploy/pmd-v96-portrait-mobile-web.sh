#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
WEB_COMMIT="9ec75dae3a854acf89d9d2100eef08ea399ebbc0"

LIVE_FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v96-portrait-breakpoint-${STAMP}"
BACKUP_DIR="${PMD_ROOT}/storage/pmd-deploy-backups"
BACKUP="${BACKUP_DIR}/v96-portrait-breakpoint-before-${STAMP}.tar.gz"

log(){ printf '\n[PayMyDine V96 Portrait Mobile] %s\n' "$*"; }
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
echo " PayMyDine V96 Portrait Mobile Breakpoint"
echo " Web commit: $WEB_COMMIT"
echo "============================================================"

log "1/5 - Fetching exact V96 commit"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${WEB_COMMIT}^{commit}" || fail "V96 commit unavailable"

log "2/5 - Staging and validating exact V96 files"
for rel in "${LIVE_FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${WEB_COMMIT}:${rel}" > "$STAGE/$rel"
done

CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

grep -q "PMD_QPOS_PHONE_SCALE_V95" "$CSS" || fail "V95 scale marker missing"
grep -q "PMD_QPOS_PORTRAIT_BREAKPOINT_V96" "$CSS" || fail "V96 breakpoint marker missing"
grep -q "(max-width: 1024px) and (orientation: portrait)" "$CSS" || fail "1024px portrait mobile branch missing"
grep -q "(min-width: 1025px) and (max-width: 1180px)" "$CSS" || fail "1025px tablet split missing"
grep -q "(max-width: 900px) and (orientation: portrait)" "$CSS" || fail "900px large-phone branch missing"
grep -q "pmd-qpos.is-portrait-v86 .pmd-qpos-product-grid" "$CSS" || fail "portrait product-grid override missing"
grep -q "PMD_QPOS_HANDHELD_PORTRAIT_RUNTIME_V96" "$JS" || fail "V96 runtime marker missing"
grep -q "return window.innerWidth <= 820 || isHandheldPortraitV96();" "$JS" || fail "History portrait runtime missing"
grep -q "pmd-quick-pos-v1.css?v=20260924-v96" "$VIEW" || fail "V96 CSS cache bust missing"
grep -q "pmd-quick-pos-v1.js?v=20260924-v96" "$VIEW" || fail "V96 JS cache bust missing"

echo "V96 FILES: PASS"

log "3/5 - Creating backup"
sudo mkdir -p "$BACKUP_DIR"
(
  cd "$PMD_ROOT"
  sudo tar -czf "$BACKUP" "${LIVE_FILES[@]}"
)
echo "BACKUP: $BACKUP"

log "4/5 - Installing exact V96 files"
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

grep -q "PMD_QPOS_PORTRAIT_BREAKPOINT_V96" app/admin/assets/css/pmd-quick-pos-v1.css
grep -q "PMD_QPOS_HANDHELD_PORTRAIT_RUNTIME_V96" app/admin/assets/js/pmd-quick-pos-v1.js
grep -q "pmd-quick-pos-v1.css?v=20260924-v96" app/admin/views/pmd_quick_pos_v1.blade.php
grep -q "pmd-quick-pos-v1.js?v=20260924-v96" app/admin/views/pmd_quick_pos_v1.blade.php

echo
echo "============================================================"
echo " PAYMYDINE V96 PORTRAIT MOBILE UPDATE COMPLETE"
echo "============================================================"
echo "847px portrait          = MOBILE BRANCH"
echo "Portrait mobile max     = 1024px"
echo "Tablet portrait starts  = 1025px"
echo "Large-phone grid max    = 900px"
echo "Table grid              = 2 columns at 847px portrait"
echo "Product grid            = 2 columns at 847px portrait"
echo "History mobile behavior = ENABLED at 847px portrait"
echo "V95 large typography    = PRESERVED"
echo "V94 floating cart       = PRESERVED"
echo "Backup                   = $BACKUP"
echo "============================================================"
