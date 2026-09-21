#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-7e47054093b7900b79958f025df797a1330aa7de}"
TARGET_COMMIT="${TARGET_COMMIT:-339783663b70057d2a3b82378a303f4e3d12c9d0}"
APK_NAME="PayMyDine-POS-Tablet-Preview-0.2.7.apk"
APK_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/${APK_NAME}"
SHA_URL="${APK_URL}.sha256"
EXPECTED_APK_SHA256="0ab9d4d2c02b33bdfe5943c90c5132ee7826620b0553dcd60901c232401c18d9"

FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/views/pmdsettings/index.blade.php"
)

log(){ printf '\n[PMD POS V14] %s\n' "$*"; }
warn(){ printf '\n[PMD POS V14][WARN] %s\n' "$*" >&2; }
fail(){ printf '\n[PMD POS V14][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"
command -v git >/dev/null 2>&1 || fail "git is required"
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Checkout: $PMD_ROOT"
log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null \
    || fail "Required commit unavailable: $ref"
done

for rel in "${FILES[@]}"; do
  [[ -f "$PMD_ROOT/$rel" ]] || fail "Live file missing: $rel"
done

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-pos-v14-stage-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-pos-v14-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-pos-preview-v14-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-pos-preview-v14-before-$STAMP.txt"

mkdir -p "$BACKUP_DIR" "$STAGE" "$CONFLICT"

log "Verifying Android POS 0.2.7 release before touching live files..."
curl -fL --retry 3 --retry-delay 2 "$APK_URL" -o "$STAGE/$APK_NAME"
curl -fL --retry 3 --retry-delay 2 "$SHA_URL" -o "$STAGE/$APK_NAME.sha256"

ACTUAL_APK_SHA256="$(sha256sum "$STAGE/$APK_NAME" | awk '{print $1}')"
SIDE_APK_SHA256="$(awk 'NF {print $1; exit}' "$STAGE/$APK_NAME.sha256" | tr '[:upper:]' '[:lower:]')"

[[ "$ACTUAL_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] \
  || fail "APK SHA-256 mismatch: expected=$EXPECTED_APK_SHA256 actual=$ACTUAL_APK_SHA256"
[[ "$SIDE_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] \
  || fail "Release checksum sidecar mismatch: expected=$EXPECTED_APK_SHA256 sidecar=$SIDE_APK_SHA256"

log "APK verified: $ACTUAL_APK_SHA256"

tar -czf "$BACKUP" "${FILES[@]}"
{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "head=$("${GIT[@]}" rev-parse HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "base=$BASE_COMMIT"
  echo "target=$TARGET_COMMIT"
  echo "apk=$APK_NAME"
  echo "apk_sha256=$ACTUAL_APK_SHA256"
  echo
  "${GIT[@]}" status --short -- "${FILES[@]}" || true
} > "$META"

log "Backup: $BACKUP"

for rel in "${FILES[@]}"; do
  mkdir -p \
    "$STAGE/base/$(dirname "$rel")" \
    "$STAGE/target/$(dirname "$rel")" \
    "$STAGE/tree/$(dirname "$rel")"

  "${GIT[@]}" show "$BASE_COMMIT:$rel" > "$STAGE/base/$rel"
  "${GIT[@]}" show "$TARGET_COMMIT:$rel" > "$STAGE/target/$rel"

  log "Three-way merging: $rel"
  set +e
  git merge-file -p --diff3 \
    -L "LIVE:$rel" \
    -L "V13_BASE:$rel" \
    -L "V14_TARGET:$rel" \
    "$PMD_ROOT/$rel" \
    "$STAGE/base/$rel" \
    "$STAGE/target/$rel" \
    > "$STAGE/tree/$rel"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/tree/$rel"; then
    mkdir -p "$CONFLICT/$(dirname "$rel")"
    cp -f "$STAGE/tree/$rel" "$CONFLICT/$rel"
    fail "Merge conflict. No live V14 files were installed. Conflict saved: $CONFLICT/$rel"
  fi
done

CSS_STAGE="$STAGE/tree/app/admin/assets/css/pmd-quick-pos-v1.css"
POS_VIEW_STAGE="$STAGE/tree/app/admin/views/pmd_quick_pos_v1.blade.php"
SETTINGS_STAGE="$STAGE/tree/app/admin/views/pmdsettings/index.blade.php"

grep -q "PMD_QPOS_ANDROID_LANDSCAPE_VIEWPORT_V47" "$CSS_STAGE" \
  || fail "V12 landscape viewport marker missing"
grep -q "PMD_QPOS_ANDROID_TOUCH_RAIL_FIT_V49" "$CSS_STAGE" \
  || fail "V14 tablet rail-fit marker missing"
grep -q "pmd-quick-pos-v1.css?v=20260921-57" "$POS_VIEW_STAGE" \
  || fail "V14 Quick POS CSS cache-bust missing"
grep -q "$APK_NAME" "$SETTINGS_STAGE" \
  || fail "Android POS 0.2.7 APK filename missing"
grep -q "POS Preview 0.2.7" "$SETTINGS_STAGE" \
  || fail "Android POS 0.2.7 label missing"

log "Installing all V14 files atomically..."
for rel in "${FILES[@]}"; do
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"
  tmp="${dst}.pmd-v14-new"

  cp -f "$STAGE/tree/$rel" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
done

for rel in "${FILES[@]}"; do
  mv -f "$PMD_ROOT/$rel.pmd-v14-new" "$PMD_ROOT/$rel"
done

log "Clearing Laravel/TastyIgniter caches..."
php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true
php artisan optimize:clear >/dev/null 2>&1 || warn "optimize:clear returned non-zero"

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Verification:"
grep -n "PMD_QPOS_ANDROID_TOUCH_RAIL_FIT_V49" "$PMD_ROOT/app/admin/assets/css/pmd-quick-pos-v1.css" | head -1
grep -n "pmd-quick-pos-v1.css?v=20260921-57" "$PMD_ROOT/app/admin/views/pmd_quick_pos_v1.blade.php" | head -1
grep -n "$APK_NAME" "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" | head -1
grep -n "POS Preview 0.2.7" "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" | head -1

cat <<EOF

============================================================
PayMyDine Android POS V14 deployed.

Why V13 clipped controls:
  Android physical pixels were being assigned directly as CSS pixels.
  On high-density tablets that made the POS root taller than the visible
  CSS viewport, pushing bottom controls below the screen.

V14 server fit:
  Bottom Check actions stay fixed in the rail.
  Pay / Send / Cleaning / Move / Free stay on-screen.
  Staff/Profile stays on-screen.
  Only the middle cart/table lists absorb height and scroll.

Android preview:
  $APK_NAME
  0.2.7-pos-shell-debug
  versionCode 11
  package com.paymydine.mobile.pospreview
  CSS-pixel viewport sizing
  Android system-bar/display-cutout safe insets

Verified APK SHA-256:
  $ACTUAL_APK_SHA256

Backup:
  $BACKUP
  $META

No git reset --hard.
No migrations.
No live dirty file was blindly overwritten.
============================================================
EOF
