#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
PMD_HOST="${PMD_HOST:-}"

BASE_COMMIT="${BASE_COMMIT:-0d49a93e3849132670c0f65f99be5e94e1af152d}"
TARGET_COMMIT="${TARGET_COMMIT:-56286f9ceea973d9af5428ad6de5f342fd99c116}"

APK_RELEASE_NAME="PayMyDine-POS-Tablet-Preview-0.3.4.apk"
APK_PUBLIC_NAME="PayMyDine-Android-0.3.4.apk"
APK_RELEASE_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/${APK_RELEASE_NAME}"
APK_SHA_URL="${APK_RELEASE_URL}.sha256"
EXPECTED_APK_SHA256="3c0f4760500f00b39a54bc87315fe64679b37824c78a05d3fa425ef98d76546e"

FILES=(
  "app/Services/PmdSiteAccessService.php"
  "app/Http/Controllers/PmdMobilePosSessionController.php"
  "app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
  "app/admin/views/pmdsettings/index.blade.php"
)

log(){ printf '\n[PMD V18.6 FINAL SESSION AUTHORITY] %s\n' "$*"; }
warn(){ printf '\n[PMD V18.6 FINAL SESSION AUTHORITY][WARN] %s\n' "$*" >&2; }
fail(){ printf '\n[PMD V18.6 FINAL SESSION AUTHORITY][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"
[[ -f "$PMD_ROOT/index.php" ]] || fail "TastyIgniter web entrypoint missing: $PMD_ROOT/index.php"

for cmd in git curl sha256sum php tar stat grep sed; do
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

# The live VPS must already contain the V18.5 re-entry fix. V18.6 is forward
# only and deliberately does not roll the server back.
grep -q "PMD_MOBILE_SESSION_REENTRY_BYPASS_V5" \
  "$PMD_ROOT/app/Services/PmdSiteAccessWorkspaceGateService.php" \
  || fail "V18.5 mobile session re-entry contract is missing on the live VPS."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-v186-final-session-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-v186-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-v186-final-session-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-v186-final-session-before-$STAMP.txt"

WEB_DIR="$PMD_ROOT/downloads/paymydine"
WEB_APK="$WEB_DIR/$APK_PUBLIC_NAME"
WEB_SHA="$WEB_APK.sha256"

mkdir -p   "$BACKUP_DIR"   "$STAGE/base"   "$STAGE/target"   "$STAGE/candidate"   "$CONFLICT"

log "Downloading and verifying Android 0.3.4..."
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
  [[ -e "$PMD_ROOT/$rel" ]] && EXISTING+=("$rel")
done
[[ -e "$WEB_APK" ]] && EXISTING+=("${WEB_APK#$PMD_ROOT/}")
[[ -e "$WEB_SHA" ]] && EXISTING+=("${WEB_SHA#$PMD_ROOT/}")

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
log "Building V18.6 candidates with three-way merge protection..."

for rel in "${FILES[@]}"; do
  [[ -f "$PMD_ROOT/$rel" ]] || fail "Live file missing: $rel"

  mkdir -p     "$STAGE/base/$(dirname "$rel")"     "$STAGE/target/$(dirname "$rel")"     "$STAGE/candidate/$(dirname "$rel")"     "$CONFLICT/$(dirname "$rel")"

  "${GIT[@]}" show "$BASE_COMMIT:$rel" > "$STAGE/base/$rel"     || fail "Base file missing from $BASE_COMMIT: $rel"
  "${GIT[@]}" show "$TARGET_COMMIT:$rel" > "$STAGE/target/$rel"     || fail "Target file missing from $TARGET_COMMIT: $rel"

  set +e
  git merge-file -p --diff3     -L "LIVE:$rel"     -L "BASE:$rel"     -L "V18.6:$rel"     "$PMD_ROOT/$rel"     "$STAGE/base/$rel"     "$STAGE/target/$rel"     > "$STAGE/candidate/$rel"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]]     || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$rel"; then
    cp -f "$STAGE/candidate/$rel" "$CONFLICT/$rel"
    fail "Merge conflict. No V18.6 server files were installed. Candidate: $CONFLICT/$rel"
  fi
done

log "Validating final Android/session authority contract..."

SITE="$STAGE/candidate/app/Services/PmdSiteAccessService.php"
POS="$STAGE/candidate/app/Http/Controllers/PmdMobilePosSessionController.php"
WORK="$STAGE/candidate/app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
SETTINGS="$STAGE/candidate/app/admin/views/pmdsettings/index.blade.php"

grep -q "PMD_MOBILE_SESSION_LOCATION_AUTHORITY_V6" "$SITE"   || fail "Mobile session location authority marker missing."
grep -q "SESSION_MOBILE_LOCATION" "$SITE"   || fail "Explicit mobile location session key missing."
grep -q "SESSION_MOBILE_DEVICE" "$SITE"   || fail "Explicit mobile device session key missing."
grep -q "SESSION_MOBILE_LOCATION" "$POS"   || fail "POS does not bind the bearer-verified location."
grep -q "PMD_MOBILE_ADMIN_SESSION_BINDING_V6" "$POS"   || fail "POS mobile session binding marker missing."
grep -q "SESSION_MOBILE_LOCATION" "$WORK"   || fail "Role workspace does not bind the bearer-verified location."
grep -q "PMD_MOBILE_ADMIN_SESSION_BINDING_V6" "$WORK"   || fail "Role workspace mobile session binding marker missing."
grep -q "PMD_MOBILE_OWNER_CANONICAL_SECURITY_V6" "$WORK"   || fail "Owner canonical MFA continuation marker missing."
grep -q "pmd_login_owner_security_v1" "$WORK"   || fail "Owner MFA session state is not queued."
grep -q "admin_url('login')" "$WORK"   || fail "Owner MFA does not return to canonical Login."
grep -q "PMD_ANDROID_POS_PREVIEW_V4_SESSION_AUTHORITY" "$SETTINGS"   || fail "Settings 0.3.4 marker missing."
grep -q "PayMyDine-Android-0.3.4.apk" "$SETTINGS"   || fail "Settings does not point at first-party Android 0.3.4."
grep -q "Operations Preview 0.3.4" "$SETTINGS"   || fail "Settings preview label is not 0.3.4."

for rel in   "app/Services/PmdSiteAccessService.php"   "app/Http/Controllers/PmdMobilePosSessionController.php"   "app/Http/Controllers/PmdMobileWorkspaceSessionController.php"; do
  php -l "$STAGE/candidate/$rel" >/dev/null     || fail "PHP syntax failed: $rel"
done

log "Publishing verified Android 0.3.4 on the PayMyDine domain..."
mkdir -p "$WEB_DIR"
root_uid="$(stat -c '%u' "$PMD_ROOT")"
root_gid="$(stat -c '%g' "$PMD_ROOT")"

apk_tmp="$WEB_APK.pmd-v186-new"
sha_tmp="$WEB_SHA.pmd-v186-new"
cp -f "$STAGE/$APK_RELEASE_NAME" "$apk_tmp"
printf '%s  %s\n' "$ACTUAL_APK_SHA256" "$APK_PUBLIC_NAME" > "$sha_tmp"
chmod 0644 "$apk_tmp" "$sha_tmp"
chown "$root_uid:$root_gid" "$apk_tmp" "$sha_tmp" 2>/dev/null || true
mv -f "$apk_tmp" "$WEB_APK"
mv -f "$sha_tmp" "$WEB_SHA"

LOCAL_APK_SHA256="$(sha256sum "$WEB_APK" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
[[ "$LOCAL_APK_SHA256" == "$EXPECTED_APK_SHA256" ]]   || fail "First-party APK checksum changed after publication."

log "Installing validated V18.6 server files..."
for rel in "${FILES[@]}"; do
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"

  tmp="${dst}.pmd-v186-new"
  cp -f "$STAGE/candidate/$rel" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

log "Clearing Laravel/TastyIgniter caches..."
php artisan route:clear >/dev/null 2>&1 || true
php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true
php artisan optimize:clear >/dev/null 2>&1 || true

if command -v systemctl >/dev/null 2>&1   && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Verification:"
grep -n "PMD_MOBILE_SESSION_LOCATION_AUTHORITY_V6"   "$PMD_ROOT/app/Services/PmdSiteAccessService.php" | head -1
grep -n "SESSION_MOBILE_LOCATION"   "$PMD_ROOT/app/Services/PmdSiteAccessService.php" | head -2
grep -n "PMD_MOBILE_ADMIN_SESSION_BINDING_V6"   "$PMD_ROOT/app/Http/Controllers/PmdMobilePosSessionController.php" | head -1
grep -n "PMD_MOBILE_ADMIN_SESSION_BINDING_V6"   "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceSessionController.php" | head -1
grep -n "PMD_MOBILE_OWNER_CANONICAL_SECURITY_V6"   "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceSessionController.php" | head -1
grep -n "PayMyDine-Android-0.3.4.apk"   "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" | head -1
sha256sum "$WEB_APK"

if [[ -n "$PMD_HOST" ]]; then
  URL="https://$PMD_HOST/downloads/paymydine/$APK_PUBLIC_NAME"
  log "Checking first-party URL: $URL"
  HTTP_CODE="$(curl -L -sS -o /dev/null -w '%{http_code}' "$URL" || true)"
  [[ "$HTTP_CODE" == "200" ]]     || fail "First-party Android URL returned HTTP $HTTP_CODE"
  log "First-party Android URL returned HTTP 200."
fi

cat <<EOF

============================================================
PayMyDine Android Operations V18.6 FINAL deployed.

Server/session fixes:
  - Android Admin sessions are explicitly bound to the bearer-verified
    restaurant location and device.
  - Cashier/Waiter identity can no longer replace the tablet restaurant with
    another primary staff location after redirect.
  - Owner/Admin is sent directly into the canonical PayMyDine Owner MFA
    continuation before Owner Dashboard.
  - V18.5 authenticated mobile-session re-entry remains active.
  - Shared-device staff identity remains separate from the historical pairer.

Android:
  $APK_PUBLIC_NAME
  0.3.4-session-authority-debug
  versionCode 17
  package com.paymydine.mobile.pospreview

Verified APK SHA-256:
  $LOCAL_APK_SHA256

Android 0.3.4 additionally:
  - clears stale WebView session cookies before native bearer bootstrap;
  - does not loop /admin/login back into mobile bootstrap;
  - renders canonical Owner MFA inside the app;
  - returns 401/403 to Staff Sign in instead of falsely calling every failure
    a revoked paired device.

First-party file:
  downloads/paymydine/$APK_PUBLIC_NAME

Backup:
  $BACKUP
  $META

No git reset --hard.
No migrations.
No pairing reset.
No Clear Data.
============================================================
EOF
