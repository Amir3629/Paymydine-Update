#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="d3ac26e796bd972a7c620c065f7e17d949fa411c"

FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

log(){ printf '\n[PayMyDine V104] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V104][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required for this deploy"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V104 web hotfix"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" || fail "V104 commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v104-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v104-page-scale-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

for rel in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel"
done

CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

grep -Fq "PMD_QPOS_TABLET_PORTRAIT_SCALE_ISOLATION_V103" "$CSS" || fail "V103 tablet CSS isolation missing"
grep -Fq "PMD_QPOS_ANDROID_PAGE_SCALE_LOCK_V104" "$VIEW" || fail "V104 page-scale lock missing"
grep -Fq "maximum-scale=1" "$VIEW" || fail "V104 viewport maximum scale missing"
grep -Fq "user-scalable=no" "$VIEW" || fail "V104 viewport user scale lock missing"

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done
sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

log "Installing V104 CSS/View hotfix"
for rel in "${FILES[@]}"; do
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"
  sudo install -m "$mode" -o "$uid" -g "$gid" "$STAGE/$rel" "$dst"
  echo "UPDATED: $rel"
done

sudo -u www-data php artisan view:clear >/dev/null 2>&1 || php artisan view:clear >/dev/null 2>&1 || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1 || php artisan cache:clear >/dev/null 2>&1 || true

grep -Fq "PMD_QPOS_ANDROID_PAGE_SCALE_LOCK_V104" app/admin/views/pmd_quick_pos_v1.blade.php
grep -Fq "PMD_QPOS_TABLET_PORTRAIT_SCALE_ISOLATION_V103" app/admin/assets/css/pmd-quick-pos-v1.css

cat <<EOF

============================================================
 PAYMYDINE QUICK POS V104 PAGE-SCALE HOTFIX COMPLETE
============================================================
Current Android 0.3.28:
  Cloud HTML viewport scale = LOCKED TO 1
  Rotation viewport refresh = ACTIVE
  Server tablet CSS V103    = DEPLOYED

Important:
  Fully close the Cashier App and open it again.
  The current 0.3.28 APK still bundles its own Quick POS CSS,
  so Android 0.3.30 remains the full permanent fix.

Backup:
  $BACKUP
============================================================
EOF
