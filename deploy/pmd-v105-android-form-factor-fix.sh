#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="88a5d30a24d70f9bd7bc2bb825efb3feaefbb57d"

FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

log(){ printf '\n[PayMyDine V105] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V105][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V105 Android form-factor hotfix"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" || fail "V105 commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v105-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v105-form-factor-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

for rel in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel"
done

CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

grep -Fq "PMD_QPOS_ANDROID_FORM_FACTOR_MATRIX_V105" "$CSS" || fail "V105 CSS matrix missing"
grep -Fq "PMD_QPOS_ANDROID_FORM_FACTOR_RUNTIME_V105" "$JS" || fail "V105 runtime classifier missing"
grep -Fq "PMD_QPOS_FIRST_PAINT_SCALE_V105" "$VIEW" || fail "V105 first-paint fix missing"
grep -Fq "PMD_QPOS_ANDROID_SERVER_CSS_OVERRIDE_V105" "$VIEW" || fail "V105 server CSS override missing"
grep -Fq "PMD_QPOS_ANDROID_SERVER_JS_OVERRIDE_V105" "$VIEW" || fail "V105 server JS override missing"
grep -Fq "pmd-quick-pos-v1.css?v=20260924-v105" "$VIEW" || fail "V105 CSS cache-buster missing"
grep -Fq "pmd-quick-pos-v1.js?v=20260924-v105" "$VIEW" || fail "V105 JS cache-buster missing"

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done
sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

log "Installing V105 CSS / JS / View"
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

grep -Fq "PMD_QPOS_ANDROID_FORM_FACTOR_MATRIX_V105" app/admin/assets/css/pmd-quick-pos-v1.css
grep -Fq "PMD_QPOS_ANDROID_FORM_FACTOR_RUNTIME_V105" app/admin/assets/js/pmd-quick-pos-v1.js
grep -Fq "PMD_QPOS_ANDROID_SERVER_JS_OVERRIDE_V105" app/admin/views/pmd_quick_pos_v1.blade.php

cat <<EOF

============================================================
 PAYMYDINE QUICK POS V105 FORM-FACTOR FIX COMPLETE
============================================================
Android Cashier App:
  Product identity        = TABLET (not CSS-width guessed)
  Portrait tablet matrix = FORCED
  Landscape handheld CSS = OVERRIDDEN
  Current server CSS      = INLINE AUTHORITY over APK 0.3.28 bundle
  Current server JS       = INLINE AUTHORITY over APK 0.3.28 bundle

First paint:
  viewport scale write    = SYNCHRONOUS
  delayed zoom flash      = REMOVED

After deploy:
  1. Force-stop the Cashier App.
  2. Open it again while online.
  3. Test portrait first.
  4. Rotate to landscape and back.

Backup:
  $BACKUP
============================================================
EOF
