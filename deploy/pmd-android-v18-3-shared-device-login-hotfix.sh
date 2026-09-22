#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-42bee3662644117b36dbd75144802b833c1f08fd}"
TARGET_COMMIT="${TARGET_COMMIT:-c9991ef22453c6d49bf2b6fbf2d66c7c976a63a8}"

FILES=(
  "app/Services/PmdMobileSync/PmdMobileDeviceAuthService.php"
  "app/Http/Controllers/PmdMobileWorkspaceAuthController.php"
)

log(){ printf '\n[PMD V18.3 LOGIN FIX] %s\n' "$*"; }
fail(){ printf '\n[PMD V18.3 LOGIN FIX][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

for cmd in git php tar grep stat; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null \
    || fail "Required commit unavailable: $ref"
done

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-v183-login-$STAMP"
BACKUP="$BACKUP_DIR/android-v183-login-before-$STAMP.tar.gz"

mkdir -p "$BACKUP_DIR" "$STAGE/base" "$STAGE/target" "$STAGE/candidate"
tar -czf "$BACKUP" "${FILES[@]}"
log "Backup: $BACKUP"

for rel in "${FILES[@]}"; do
  mkdir -p \
    "$STAGE/base/$(dirname "$rel")" \
    "$STAGE/target/$(dirname "$rel")" \
    "$STAGE/candidate/$(dirname "$rel")"

  "${GIT[@]}" show "$BASE_COMMIT:$rel" > "$STAGE/base/$rel" \
    || fail "Base file missing: $rel"
  "${GIT[@]}" show "$TARGET_COMMIT:$rel" > "$STAGE/target/$rel" \
    || fail "Target file missing: $rel"

  set +e
  git merge-file -p --diff3 \
    -L "LIVE:$rel" \
    -L "BASE:$rel" \
    -L "V18.3:$rel" \
    "$PMD_ROOT/$rel" \
    "$STAGE/base/$rel" \
    "$STAGE/target/$rel" \
    > "$STAGE/candidate/$rel"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] \
    || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$rel"; then
    fail "Three-way merge conflict. Live files were NOT changed. Candidate: $STAGE/candidate/$rel"
  fi

  php -l "$STAGE/candidate/$rel" >/dev/null \
    || fail "PHP syntax failed: $rel"
done

log "Validating shared-device login contract..."
grep -q "PMD_MOBILE_DEVICE_TRUST_FIRST_V2" \
  "$STAGE/candidate/app/Services/PmdMobileSync/PmdMobileDeviceAuthService.php" \
  || fail "Device-trust-first marker missing."
grep -q "PMD_MOBILE_STAFF_GRANT_FIRST_V2" \
  "$STAGE/candidate/app/Services/PmdMobileSync/PmdMobileDeviceAuthService.php" \
  || fail "Staff-grant-first marker missing."
grep -q "authenticateDevice" \
  "$STAGE/candidate/app/Services/PmdMobileSync/PmdMobileDeviceAuthService.php" \
  || fail "Device-only authentication method missing."
grep -q "PMD_ANDROID_DEVICE_TRUST_BEFORE_STAFF_LOGIN_V3" \
  "$STAGE/candidate/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" \
  || fail "Android staff-login trust marker missing."
grep -q "HttpResponseException" \
  "$STAGE/candidate/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" \
  || fail "JSON auth error handling missing."

log "Installing V18.3 files..."
for rel in "${FILES[@]}"; do
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"

  tmp="${dst}.pmd-v183-new"
  cp -f "$STAGE/candidate/$rel" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

log "Clearing caches..."
php artisan route:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true
php artisan optimize:clear >/dev/null 2>&1 || true

if command -v systemctl >/dev/null 2>&1 \
  && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Verification:"
grep -n "PMD_MOBILE_DEVICE_TRUST_FIRST_V2" \
  "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobileDeviceAuthService.php" | head -1
grep -n "PMD_MOBILE_STAFF_GRANT_FIRST_V2" \
  "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobileDeviceAuthService.php" | head -1
grep -n "PMD_ANDROID_DEVICE_TRUST_BEFORE_STAFF_LOGIN_V3" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" | head -1

cat <<EOF

============================================================
PayMyDine Android V18.3 shared-device login fix deployed.

What changed:
  - The paired tablet is now validated as device/location trust first.
  - Staff Grant identity is resolved before the historical pairing account.
  - Initial staff login no longer depends on the account that paired the tablet.
  - Android 401/403 auth failures now return a readable JSON message.
  - "usernameportal" remains compatible with the canonical web login convention.

No APK reinstall required.
No database changes.
No pairing/device data changes.

Backup:
  $BACKUP
============================================================
EOF
