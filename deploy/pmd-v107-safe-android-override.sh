#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="78d8fb75167b75a166ecb9fb993451cb8336cffe"

VIEW="app/admin/views/pmd_quick_pos_v1.blade.php"
PATCH_CSS="app/admin/assets/css/pmd-qpos-android-form-factor-v107.css"
PATCH_JS="app/admin/assets/js/pmd-qpos-android-form-factor-v107.js"
REF_CSS="app/admin/assets/css/pmd-quick-pos-v1.css"
REF_JS="app/admin/assets/js/pmd-quick-pos-v1.js"

log(){ printf '\n[PayMyDine V107] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V107][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching isolated V107 recovery assets"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" || fail "V107 commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v107-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v107-safe-override-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE/$(dirname "$VIEW")" "$STAGE/$(dirname "$PATCH_CSS")" "$STAGE/$(dirname "$PATCH_JS")"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

"${GIT[@]}" show "${SOURCE_COMMIT}:$VIEW" > "$STAGE/$VIEW"
"${GIT[@]}" show "${SOURCE_COMMIT}:$PATCH_CSS" > "$STAGE/$PATCH_CSS"
"${GIT[@]}" show "${SOURCE_COMMIT}:$PATCH_JS" > "$STAGE/$PATCH_JS"

grep -Fq "PMD_QPOS_SAFE_FIRST_PAINT_V107" "$STAGE/$VIEW" || fail "safe V107 view marker missing"
grep -Fq "pmd-qpos-android-form-factor-v107.css" "$STAGE/$VIEW" || fail "V107 CSS link missing"
grep -Fq "pmd-qpos-android-form-factor-v107.js" "$STAGE/$VIEW" || fail "V107 JS link missing"
! grep -Fq "PMD_QPOS_ANDROID_SERVER_JS_OVERRIDE_V105" "$STAGE/$VIEW" || fail "dangerous V105 inline JS still present"
! grep -Fq "file_get_contents" "$STAGE/$VIEW" || fail "view still performs runtime asset inlining"
grep -Fq "PMD_QPOS_ANDROID_SAFE_MATRIX_V107" "$STAGE/$PATCH_CSS" || fail "V107 matrix missing"
grep -Fq "PMD_QPOS_ANDROID_SAFE_RUNTIME_V107" "$STAGE/$PATCH_JS" || fail "V107 runtime missing"

EXISTING=("$VIEW")
[[ -f "$PATCH_CSS" ]] && EXISTING+=("$PATCH_CSS")
[[ -f "$PATCH_JS" ]] && EXISTING+=("$PATCH_JS")
sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

log "Installing isolated V107 view + override assets only"

view_uid="$(stat -c '%u' "$VIEW")"
view_gid="$(stat -c '%g' "$VIEW")"
view_mode="$(stat -c '%a' "$VIEW")"
sudo install -m "$view_mode" -o "$view_uid" -g "$view_gid" "$STAGE/$VIEW" "$VIEW"

css_uid="$(stat -c '%u' "$REF_CSS")"
css_gid="$(stat -c '%g' "$REF_CSS")"
js_uid="$(stat -c '%u' "$REF_JS")"
js_gid="$(stat -c '%g' "$REF_JS")"

sudo install -m 0644 -o "$css_uid" -g "$css_gid" "$STAGE/$PATCH_CSS" "$PATCH_CSS"
sudo install -m 0644 -o "$js_uid" -g "$js_gid" "$STAGE/$PATCH_JS" "$PATCH_JS"

sudo -u www-data php artisan view:clear >/dev/null 2>&1 || php artisan view:clear >/dev/null 2>&1 || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1 || php artisan cache:clear >/dev/null 2>&1 || true

grep -Fq "PMD_QPOS_SAFE_FIRST_PAINT_V107" "$VIEW"
grep -Fq "PMD_QPOS_ANDROID_SAFE_MATRIX_V107" "$PATCH_CSS"
grep -Fq "PMD_QPOS_ANDROID_SAFE_RUNTIME_V107" "$PATCH_JS"

cat <<EOF

============================================================
 PAYMYDINE V107 ISOLATED ANDROID OVERRIDE COMPLETE
============================================================
Core Quick POS CSS: NOT TOUCHED
Core Quick POS JS : NOT TOUCHED

Installed:
  safe Blade view
  24 KB Android-only CSS override
  3 KB Android-only JS class correction

Removed architecture:
  full CSS inline in Blade
  full JS inline in Blade
  pinned replacement of core frontend assets

Backup:
  $BACKUP
============================================================
EOF
