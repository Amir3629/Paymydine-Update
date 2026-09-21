#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-cab8334a768ab88e55e8a1aacf7ed11cb1311be1}"
TARGET_COMMIT="${TARGET_COMMIT:-0f607ba9d142d3b7856f005284089393d0b2f954}"
APK_NAME="PayMyDine-POS-Tablet-Preview-0.2.4.apk"
APK_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/${APK_NAME}"
SHA_URL="${APK_URL}.sha256"
EXPECTED_APK_SHA256="844564e0e2c019a30933b480367db3de7533a9b885571cd2910fc094237befa0"

log(){ printf '\n[PMD POS V11] %s\n' "$*"; }
warn(){ printf '\n[PMD POS V11][WARN] %s\n' "$*" >&2; }
fail(){ printf '\n[PMD POS V11][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"
command -v git >/dev/null 2>&1 || fail "git is required"
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")
REL="app/admin/views/pmdsettings/index.blade.php"

log "Checkout: $PMD_ROOT"
log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null \
    || fail "Required commit unavailable: $ref"
done

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-pos-v11-stage-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-pos-v11-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-pos-preview-v11-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-pos-preview-v11-before-$STAMP.txt"

mkdir -p "$BACKUP_DIR" "$STAGE" "$CONFLICT"
[[ -f "$PMD_ROOT/$REL" ]] || fail "Live Settings view missing: $REL"

log "Verifying Android POS 0.2.4 release before touching live files..."
curl -fL --retry 3 --retry-delay 2 "$APK_URL" -o "$STAGE/$APK_NAME"
curl -fL --retry 3 --retry-delay 2 "$SHA_URL" -o "$STAGE/$APK_NAME.sha256"

ACTUAL_APK_SHA256="$(sha256sum "$STAGE/$APK_NAME" | awk '{print $1}')"
SIDE_APK_SHA256="$(awk 'NF {print $1; exit}' "$STAGE/$APK_NAME.sha256" | tr '[:upper:]' '[:lower:]')"

[[ "$ACTUAL_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] \
  || fail "APK SHA-256 mismatch: expected=$EXPECTED_APK_SHA256 actual=$ACTUAL_APK_SHA256"
[[ "$SIDE_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] \
  || fail "Release checksum sidecar mismatch: expected=$EXPECTED_APK_SHA256 sidecar=$SIDE_APK_SHA256"

log "APK verified: $ACTUAL_APK_SHA256"

tar -czf "$BACKUP" "$REL"
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
  "${GIT[@]}" status --short -- "$REL" || true
} > "$META"

log "Backup: $BACKUP"

mkdir -p \
  "$STAGE/base/$(dirname "$REL")" \
  "$STAGE/target/$(dirname "$REL")" \
  "$STAGE/tree/$(dirname "$REL")"

"${GIT[@]}" show "$BASE_COMMIT:$REL" > "$STAGE/base/$REL"
"${GIT[@]}" show "$TARGET_COMMIT:$REL" > "$STAGE/target/$REL"

log "Three-way merging Android POS 0.2.4 Settings update..."
set +e
git merge-file -p --diff3 \
  -L "LIVE:$REL" \
  -L "V10_BASE:$REL" \
  -L "V11_TARGET:$REL" \
  "$PMD_ROOT/$REL" \
  "$STAGE/base/$REL" \
  "$STAGE/target/$REL" \
  > "$STAGE/tree/$REL"
rc=$?
set -e

if [[ $rc -ne 0 ]] || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/tree/$REL"; then
  mkdir -p "$CONFLICT/$(dirname "$REL")"
  cp -f "$STAGE/tree/$REL" "$CONFLICT/$REL"
  fail "Merge conflict. Live file was not changed. Conflict saved: $CONFLICT/$REL"
fi

grep -q "PMD_ANDROID_POS_PREVIEW_V2_LINK" "$STAGE/tree/$REL" \
  || fail "Android POS Settings marker missing"
grep -q "$APK_NAME" "$STAGE/tree/$REL" \
  || fail "Android POS 0.2.4 APK filename missing"
grep -q "POS Preview 0.2.4" "$STAGE/tree/$REL" \
  || fail "Android POS 0.2.4 label missing"

log "Installing Settings view atomically..."
dst="$PMD_ROOT/$REL"
uid="$(stat -c '%u' "$dst")"
gid="$(stat -c '%g' "$dst")"
mode="$(stat -c '%a' "$dst")"
tmp="${dst}.pmd-v11-new"

cp -f "$STAGE/tree/$REL" "$tmp"
chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
chown "$uid:$gid" "$tmp" 2>/dev/null || true
mv -f "$tmp" "$dst"

log "Clearing Laravel/TastyIgniter caches..."
php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true
php artisan optimize:clear >/dev/null 2>&1 || warn "optimize:clear returned non-zero"

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Verification:"
grep -n "PMD_ANDROID_POS_PREVIEW_V2_LINK" "$PMD_ROOT/$REL" | head -1
grep -n "$APK_NAME" "$PMD_ROOT/$REL" | head -1
grep -n "POS Preview 0.2.4" "$PMD_ROOT/$REL" | head -1

cat <<EOF

============================================================
PayMyDine Android POS Preview V11 deployed.

Settings > Cashier App > Android Tablet / POS now downloads:
  $APK_NAME

Version:
  0.2.4-pos-shell-debug
  versionCode 8
  package com.paymydine.mobile.pospreview

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
