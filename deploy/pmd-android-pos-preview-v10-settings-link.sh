#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-93b98bb2041dc6536e0b1db1855c523e322e0bfe}"
TARGET_COMMIT="${TARGET_COMMIT:-33a1c96f9801555502a62ce90fed491c16aa9541}"

log(){ printf '\n[PMD POS V10] %s\n' "$*"; }
warn(){ printf '\n[PMD POS V10][WARN] %s\n' "$*" >&2; }
fail(){ printf '\n[PMD POS V10][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")
REL="app/admin/views/pmdsettings/index.blade.php"

log "Checkout: $PMD_ROOT"
log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null     || fail "Required commit unavailable: $ref"
done

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-pos-v10-stage-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-pos-v10-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-pos-preview-v10-settings-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-pos-preview-v10-settings-before-$STAMP.txt"

mkdir -p "$BACKUP_DIR" "$STAGE" "$CONFLICT"
[[ -f "$PMD_ROOT/$REL" ]] || fail "Live Settings view missing: $REL"

tar -czf "$BACKUP" "$REL"
{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "head=$("${GIT[@]}" rev-parse HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "base=$BASE_COMMIT"
  echo "target=$TARGET_COMMIT"
  echo
  "${GIT[@]}" status --short -- "$REL" || true
} > "$META"

log "Backup: $BACKUP"

mkdir -p "$STAGE/base/$(dirname "$REL")" "$STAGE/target/$(dirname "$REL")" "$STAGE/tree/$(dirname "$REL")"
"${GIT[@]}" show "$BASE_COMMIT:$REL" > "$STAGE/base/$REL"
"${GIT[@]}" show "$TARGET_COMMIT:$REL" > "$STAGE/target/$REL"

log "Three-way merging Android Settings download-link update..."
set +e
git merge-file -p --diff3   -L "LIVE:$REL"   -L "V9_BASE:$REL"   -L "V10_TARGET:$REL"   "$PMD_ROOT/$REL" "$STAGE/base/$REL" "$STAGE/target/$REL"   > "$STAGE/tree/$REL"
rc=$?
set -e

if [[ $rc -ne 0 ]] || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/tree/$REL"; then
  mkdir -p "$CONFLICT/$(dirname "$REL")"
  cp -f "$STAGE/tree/$REL" "$CONFLICT/$REL"
  fail "Merge conflict. Saved: $CONFLICT/$REL"
fi

grep -q "PMD_ANDROID_POS_PREVIEW_V2_LINK" "$STAGE/tree/$REL"   || fail "New Android POS link marker missing."
grep -q "PayMyDine-POS-Tablet-Preview.apk" "$STAGE/tree/$REL"   || fail "New Android POS APK filename missing."
grep -q "POS Preview 0.2.3" "$STAGE/tree/$REL"   || fail "New Android POS version label missing."

log "Installing Settings view atomically..."
dst="$PMD_ROOT/$REL"
uid="$(stat -c '%u' "$dst")"
gid="$(stat -c '%g' "$dst")"
mode="$(stat -c '%a' "$dst")"
tmp="${dst}.pmd-v10-new"
cp -f "$STAGE/tree/$REL" "$tmp"
chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
chown "$uid:$gid" "$tmp" 2>/dev/null || true
mv -f "$tmp" "$dst"

log "Clearing view/application caches..."
php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true
php artisan optimize:clear >/dev/null 2>&1 || warn "optimize:clear returned non-zero"

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Verification:"
grep -n "PMD_ANDROID_POS_PREVIEW_V2_LINK" "$PMD_ROOT/$REL" | head -1
grep -n "PayMyDine-POS-Tablet-Preview.apk" "$PMD_ROOT/$REL" | head -1
grep -n "POS Preview 0.2.3" "$PMD_ROOT/$REL" | head -1

cat <<EOF

============================================================
PayMyDine Android POS Preview V10 Settings link deployed.

The Settings > Cashier App > Android Tablet / POS button now downloads:
  PayMyDine-POS-Tablet-Preview.apk

This APK uses a NEW preview package ID, so it can install alongside the
older conflicting preview package without uninstalling it.

Backup:
  $BACKUP
  $META

No git reset --hard.
No migrations.
============================================================
EOF
