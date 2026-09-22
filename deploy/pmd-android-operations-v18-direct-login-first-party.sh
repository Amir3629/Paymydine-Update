#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
BASE_COMMIT="${BASE_COMMIT:-9da6418d2c2532a3b1d828ebfe9ecec69fb6981f}"
TARGET_COMMIT="${TARGET_COMMIT:-baa42298c5d3f8e1ed4b0b0fadc71d9b9cbe8b6d}"

APK_RELEASE_NAME="PayMyDine-POS-Tablet-Preview-0.3.3.apk"
APK_PUBLIC_NAME="PayMyDine-Android-0.3.3.apk"
APK_RELEASE_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/${APK_RELEASE_NAME}"
APK_SHA_URL="${APK_RELEASE_URL}.sha256"
EXPECTED_APK_SHA256="77c36e65c458a8b26c53f7802cf1c94e3eb08bc19ab088c3e542f993d80fb83a"

FILES=(
  "app/Services/PmdMobileSync/PmdMobileStaffGrantService.php"
  "app/Services/PmdMobileSync/PmdMobileDeviceAuthService.php"
  "app/Http/Controllers/PmdMobileWorkspaceAuthController.php"
  "app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
  "app/Http/Controllers/PmdMobilePosSessionController.php"
  "routes/pmd-mobile-sync-v1.php"
  "app/admin/views/pmdsettings/index.blade.php"
)

log(){ printf '\n[PMD POS V18] %s\n' "$*"; }
warn(){ printf '\n[PMD POS V18][WARN] %s\n' "$*" >&2; }
fail(){ printf '\n[PMD POS V18][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"
[[ -f "$PMD_ROOT/index.php" ]] || fail "TastyIgniter web entrypoint missing: $PMD_ROOT/index.php"

for cmd in git curl sha256sum php tar stat cmp; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Checkout: $PMD_ROOT"
log "Fetching origin/main..."
"${GIT[@]}" fetch --prune origin main

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null \
    || fail "Required commit unavailable: $ref"
done

log "Checking V17 contract before changing live files..."
grep -q "PMD_ANDROID_WORKSPACE_REAUTH_V1" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" \
  || fail "V17 workspace auth controller is missing."
grep -q "Operations Preview 0.3.2" \
  "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" \
  || fail "V17 Android Settings label is missing."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-pos-v18-stage-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-pos-v18-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-operations-v18-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-operations-v18-before-$STAMP.txt"
WEB_DOWNLOAD_DIR="$PMD_ROOT/downloads/paymydine"
PUBLIC_APK="$WEB_DOWNLOAD_DIR/$APK_PUBLIC_NAME"
PUBLIC_SHA="$PUBLIC_APK.sha256"

mkdir -p "$BACKUP_DIR" "$STAGE/base" "$STAGE/target" "$STAGE/candidate" "$CONFLICT"

log "Verifying Android 0.3.3 release before touching live files..."
curl -fL --retry 3 --retry-delay 2 "$APK_RELEASE_URL" -o "$STAGE/$APK_RELEASE_NAME"
curl -fL --retry 3 --retry-delay 2 "$APK_SHA_URL" -o "$STAGE/$APK_RELEASE_NAME.sha256"

ACTUAL_APK_SHA256="$(sha256sum "$STAGE/$APK_RELEASE_NAME" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
SIDE_APK_SHA256="$(awk 'NF {print $1; exit}' "$STAGE/$APK_RELEASE_NAME.sha256" | tr '[:upper:]' '[:lower:]')"

[[ "$ACTUAL_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] \
  || fail "APK SHA-256 mismatch: expected=$EXPECTED_APK_SHA256 actual=$ACTUAL_APK_SHA256"
[[ "$SIDE_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] \
  || fail "Release checksum sidecar mismatch: expected=$EXPECTED_APK_SHA256 sidecar=$SIDE_APK_SHA256"

log "APK verified: $ACTUAL_APK_SHA256"

EXISTING=()
for rel in "${FILES[@]}"; do
  if [[ -e "$PMD_ROOT/$rel" ]]; then
    EXISTING+=("$rel")
  fi
done
if [[ -e "$PUBLIC_APK" ]]; then
  EXISTING+=("${PUBLIC_APK#$PMD_ROOT/}")
fi
if [[ -e "$PUBLIC_SHA" ]]; then
  EXISTING+=("${PUBLIC_SHA#$PMD_ROOT/}")
fi

if [[ ${#EXISTING[@]} -gt 0 ]]; then
  tar -czf "$BACKUP" "${EXISTING[@]}"
else
  tar -czf "$BACKUP" --files-from /dev/null
fi

{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "head=$("${GIT[@]}" rev-parse HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "base=$BASE_COMMIT"
  echo "target=$TARGET_COMMIT"
  echo "apk_release=$APK_RELEASE_NAME"
  echo "apk_public=$APK_PUBLIC_NAME"
  echo "apk_sha256=$ACTUAL_APK_SHA256"
  echo
  "${GIT[@]}" status --short -- "${FILES[@]}" || true
} > "$META"

log "Backup: $BACKUP"
log "Building V18 candidates with three-way merge protection..."

for rel in "${FILES[@]}"; do
  mkdir -p \
    "$STAGE/base/$(dirname "$rel")" \
    "$STAGE/target/$(dirname "$rel")" \
    "$STAGE/candidate/$(dirname "$rel")" \
    "$CONFLICT/$(dirname "$rel")"

  "${GIT[@]}" show "$TARGET_COMMIT:$rel" > "$STAGE/target/$rel" \
    || fail "Target file missing from $TARGET_COMMIT: $rel"

  if "${GIT[@]}" cat-file -e "$BASE_COMMIT:$rel" 2>/dev/null; then
    [[ -f "$PMD_ROOT/$rel" ]] \
      || fail "Existing baseline file is missing live: $rel"

    "${GIT[@]}" show "$BASE_COMMIT:$rel" > "$STAGE/base/$rel"

    set +e
    git merge-file -p --diff3 \
      -L "LIVE:$rel" \
      -L "BASE:$rel" \
      -L "V18:$rel" \
      "$PMD_ROOT/$rel" \
      "$STAGE/base/$rel" \
      "$STAGE/target/$rel" \
      > "$STAGE/candidate/$rel"
    rc=$?
    set -e

    if [[ $rc -ne 0 ]] \
      || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$rel"; then
      cp -f "$STAGE/candidate/$rel" "$CONFLICT/$rel"
      fail "Merge conflict. No V18 files were installed. Conflict saved: $CONFLICT/$rel"
    fi
  else
    if [[ -e "$PMD_ROOT/$rel" ]]; then
      if cmp -s "$PMD_ROOT/$rel" "$STAGE/target/$rel"; then
        cp -f "$STAGE/target/$rel" "$STAGE/candidate/$rel"
      else
        cp -f "$PMD_ROOT/$rel" "$CONFLICT/$rel.live"
        cp -f "$STAGE/target/$rel" "$CONFLICT/$rel.target"
        fail "New V18 path already exists with different live content: $rel. No files were installed."
      fi
    else
      cp -f "$STAGE/target/$rel" "$STAGE/candidate/$rel"
    fi
  fi
done

log "Validating staged V18 server contract..."
grep -q "PMD_MOBILE_STAFF_GRANT_V1" \
  "$STAGE/candidate/app/Services/PmdMobileSync/PmdMobileStaffGrantService.php" \
  || fail "Signed staff grant service marker is missing."
grep -q "X-PayMyDine-Staff-Grant" \
  "$STAGE/candidate/app/Services/PmdMobileSync/PmdMobileStaffGrantService.php" \
  || fail "Signed staff grant header contract is missing."
grep -q "PMD_MOBILE_STAFF_GRANT_OVERRIDE_V1" \
  "$STAGE/candidate/app/Services/PmdMobileSync/PmdMobileDeviceAuthService.php" \
  || fail "Device auth staff override marker is missing."
grep -q "PMD_ANDROID_STAFF_LOGIN_ROUTER_V2" \
  "$STAGE/candidate/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" \
  || fail "Direct staff login router marker is missing."
grep -q "Users_model::query" \
  "$STAGE/candidate/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" \
  || fail "Shared-device username lookup is missing."
grep -q "Hash::check" \
  "$STAGE/candidate/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" \
  || fail "Password verification is missing."
grep -q "PMD_MOBILE_ROLE_WORKSPACE_SESSION_V2" \
  "$STAGE/candidate/app/Http/Controllers/PmdMobileWorkspaceSessionController.php" \
  || fail "Role-driven web workspace session marker is missing."
grep -q "routeForRoleCode" \
  "$STAGE/candidate/app/Http/Controllers/PmdMobilePosSessionController.php" \
  || fail "Cashier/Waiter canonical role routing is missing."
grep -q "workspace/authorize" \
  "$STAGE/candidate/routes/pmd-mobile-sync-v1.php" \
  || fail "Staff login authorization route is missing."
grep -q "throttle:20,1" \
  "$STAGE/candidate/routes/pmd-mobile-sync-v1.php" \
  || fail "Shared staff login throttle is missing."
grep -q "PMD_ANDROID_POS_PREVIEW_V3_FIRST_PARTY_LINK" \
  "$STAGE/candidate/app/admin/views/pmdsettings/index.blade.php" \
  || fail "First-party Android download marker is missing."
grep -q "PayMyDine-Android-0.3.3.apk" \
  "$STAGE/candidate/app/admin/views/pmdsettings/index.blade.php" \
  || fail "Settings does not point at first-party Android 0.3.3."
grep -q "Operations Preview 0.3.3" \
  "$STAGE/candidate/app/admin/views/pmdsettings/index.blade.php" \
  || fail "Settings Android preview label is not 0.3.3."

for rel in \
  "app/Services/PmdMobileSync/PmdMobileStaffGrantService.php" \
  "app/Services/PmdMobileSync/PmdMobileDeviceAuthService.php" \
  "app/Http/Controllers/PmdMobileWorkspaceAuthController.php" \
  "app/Http/Controllers/PmdMobileWorkspaceSessionController.php" \
  "app/Http/Controllers/PmdMobilePosSessionController.php" \
  "routes/pmd-mobile-sync-v1.php"; do
  php -l "$STAGE/candidate/$rel" >/dev/null \
    || fail "PHP syntax failed: $rel"
done

log "Publishing verified APK in the TastyIgniter document root..."
mkdir -p "$WEB_DOWNLOAD_DIR"
public_uid="$(stat -c '%u' "$PMD_ROOT")"
public_gid="$(stat -c '%g' "$PMD_ROOT")"

apk_tmp="$PUBLIC_APK.pmd-v18-new"
sha_tmp="$PUBLIC_SHA.pmd-v18-new"
cp -f "$STAGE/$APK_RELEASE_NAME" "$apk_tmp"
printf '%s  %s\n' "$ACTUAL_APK_SHA256" "$APK_PUBLIC_NAME" > "$sha_tmp"
chmod 0644 "$apk_tmp" "$sha_tmp"
chown "$public_uid:$public_gid" "$apk_tmp" "$sha_tmp" 2>/dev/null || true
mv -f "$apk_tmp" "$PUBLIC_APK"
mv -f "$sha_tmp" "$PUBLIC_SHA"

LOCAL_PUBLIC_SHA="$(sha256sum "$PUBLIC_APK" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
[[ "$LOCAL_PUBLIC_SHA" == "$EXPECTED_APK_SHA256" ]] \
  || fail "First-party APK checksum changed after install."

log "Installing validated V18 server files..."
for rel in "${FILES[@]}"; do
  dst="$PMD_ROOT/$rel"
  mkdir -p "$(dirname "$dst")"

  if [[ -e "$dst" ]]; then
    uid="$(stat -c '%u' "$dst")"
    gid="$(stat -c '%g' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  else
    uid="$(stat -c '%u' "$(dirname "$dst")")"
    gid="$(stat -c '%g' "$(dirname "$dst")")"
    mode="644"
  fi

  tmp="${dst}.pmd-v18-new"
  cp -f "$STAGE/candidate/$rel" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

log "Clearing Laravel/TastyIgniter caches..."
php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true
php artisan optimize:clear >/dev/null 2>&1 \
  || warn "optimize:clear returned non-zero"

if command -v systemctl >/dev/null 2>&1 \
  && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Verification:"
grep -n "PMD_ANDROID_STAFF_LOGIN_ROUTER_V2" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" | head -1
grep -n "PMD_MOBILE_STAFF_GRANT_V1" \
  "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobileStaffGrantService.php" | head -1
grep -n "PMD_MOBILE_ROLE_WORKSPACE_SESSION_V2" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceSessionController.php" | head -1
grep -n "throttle:20,1" \
  "$PMD_ROOT/routes/pmd-mobile-sync-v1.php" | head -1
grep -n "PayMyDine-Android-0.3.3.apk" \
  "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" | head -1
grep -n "Operations Preview 0.3.3" \
  "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" | head -1
sha256sum "$PUBLIC_APK"

cat <<EOF

============================================================
PayMyDine Android Operations V18 deployed.

Android preview:
  PayMyDine-Android-0.3.3.apk
  0.3.3-direct-login-debug
  versionCode 16
  package com.paymydine.mobile.pospreview

Verified APK SHA-256:
  $ACTUAL_APK_SHA256

First-party file:
  downloads/paymydine/PayMyDine-Android-0.3.3.apk

What V18 enables:
  - Launcher logo is reduced into the Android adaptive-icon safe zone.
  - The old workspace chooser/hub is removed from the Android app.
  - After one-time restaurant/device pairing, the app opens the staff Login directly.
  - Any active staff member assigned to that restaurant can sign in on the shared trusted tablet.
  - Username/password are checked server-side and are never stored on Android.
  - A short-lived HMAC-signed staff grant is bound to the exact restaurant + device + role.
  - Cashier opens canonical POS.
  - Waiter opens canonical Waiter POS.
  - KDS roles open the role's KDS station.
  - Reservations opens Reservations.
  - Accountant opens Accountant.
  - Manager opens Manager.
  - Owner opens Owner.
  - Kitchen Staff/Sonstige continue to their canonical My Work route.
  - POS/KDS offline continuation stays limited to a previously verified staff session.
  - Offline POS commands retain the current signed-in staff/user attribution.
  - Settings downloads Android 0.3.3 from the PayMyDine domain, not a public GitHub URL.
  - Payment settlement remains fail-closed when its real provider authority is unavailable.

Backup:
  $BACKUP
  $META

No git reset --hard.
No migrations.
No live dirty file was blindly overwritten.
============================================================
EOF
