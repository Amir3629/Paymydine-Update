#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
PMD_HOST="${PMD_HOST:-}"

BASE_COMMIT="${BASE_COMMIT:-8a9ad135d79618a54699fa695e968c90e08f6895}"
TARGET_COMMIT="${TARGET_COMMIT:-f54daec56f564187461caa2b6c4d4f398016541c}"

APK_RELEASE_NAME="PayMyDine-POS-Tablet-Preview-0.3.5.apk"
APK_PUBLIC_NAME="PayMyDine-Android-0.3.5.apk"
APK_RELEASE_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/${APK_RELEASE_NAME}"
APK_SHA_URL="${APK_RELEASE_URL}.sha256"
EXPECTED_APK_SHA256="d6cae607b1d6babed6983525015b6b12ca2156456002a969092dad59774cb428"

FILES=(
  "app/Services/PmdSiteAccessService.php"
  "app/Services/PmdMobileSync/PmdMobilePairingService.php"
  "app/Services/PmdMobileSync/PmdMobileStaffGrantService.php"
  "app/Http/Controllers/PmdMobilePairController.php"
  "app/Http/Controllers/PmdMobileWorkspaceAuthController.php"
  "app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
  "routes/pmd-mobile-sync-v1.php"
  "app/admin/views/pmdsettings/index.blade.php"
)

log(){ printf '\n[PMD V18.7 CANONICAL LOGIN + OFFLINE] %s\n' "$*"; }
warn(){ printf '\n[PMD V18.7 CANONICAL LOGIN + OFFLINE][WARN] %s\n' "$*" >&2; }
fail(){ printf '\n[PMD V18.7 CANONICAL LOGIN + OFFLINE][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"
[[ -f "$PMD_ROOT/index.php" ]] || fail "TastyIgniter web entrypoint missing: $PMD_ROOT/index.php"

for cmd in git curl sha256sum php tar stat grep awk tr; do
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

# V18.7 is deliberately forward-only from the currently deployed V18.6
# session-authority baseline. It does not reset pairing, SQLite, or tenant data.
grep -q "PMD_MOBILE_OWNER_CANONICAL_SECURITY_V6" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceSessionController.php" \
  || fail "V18.6 Owner/session authority baseline is missing on the live VPS."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-v187-canonical-login-offline-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-v187-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-v187-canonical-login-offline-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-v187-canonical-login-offline-before-$STAMP.txt"

WEB_DIR="$PMD_ROOT/downloads/paymydine"
WEB_APK="$WEB_DIR/$APK_PUBLIC_NAME"
WEB_SHA="$WEB_APK.sha256"

mkdir -p \
  "$BACKUP_DIR" \
  "$STAGE/base" \
  "$STAGE/target" \
  "$STAGE/candidate" \
  "$CONFLICT"

log "Downloading and verifying Android 0.3.5..."
curl -fL --retry 3 --retry-delay 2 "$APK_RELEASE_URL" \
  -o "$STAGE/$APK_RELEASE_NAME"
curl -fL --retry 3 --retry-delay 2 "$APK_SHA_URL" \
  -o "$STAGE/$APK_RELEASE_NAME.sha256"

ACTUAL_APK_SHA256="$(
  sha256sum "$STAGE/$APK_RELEASE_NAME" |
    awk '{print $1}' |
    tr '[:upper:]' '[:lower:]'
)"
SIDE_APK_SHA256="$(
  awk 'NF {print $1; exit}' "$STAGE/$APK_RELEASE_NAME.sha256" |
    tr '[:upper:]' '[:lower:]'
)"

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
log "Building V18.7 candidates with three-way merge protection..."

for rel in "${FILES[@]}"; do
  [[ -f "$PMD_ROOT/$rel" ]] || fail "Live file missing: $rel"

  mkdir -p \
    "$STAGE/base/$(dirname "$rel")" \
    "$STAGE/target/$(dirname "$rel")" \
    "$STAGE/candidate/$(dirname "$rel")" \
    "$CONFLICT/$(dirname "$rel")"

  "${GIT[@]}" show "$BASE_COMMIT:$rel" > "$STAGE/base/$rel" \
    || fail "Base file missing from $BASE_COMMIT: $rel"
  "${GIT[@]}" show "$TARGET_COMMIT:$rel" > "$STAGE/target/$rel" \
    || fail "Target file missing from $TARGET_COMMIT: $rel"

  set +e
  git merge-file -p --diff3 \
    -L "LIVE:$rel" \
    -L "BASE:$rel" \
    -L "V18.7:$rel" \
    "$PMD_ROOT/$rel" \
    "$STAGE/base/$rel" \
    "$STAGE/target/$rel" \
    > "$STAGE/candidate/$rel"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] \
    || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$rel"; then
    cp -f "$STAGE/candidate/$rel" "$CONFLICT/$rel"
    fail "Merge conflict. No V18.7 server files were installed. Candidate: $CONFLICT/$rel"
  fi
done

log "Validating canonical-login / dashboard-approval / offline contract..."

SITE="$STAGE/candidate/app/Services/PmdSiteAccessService.php"
PAIRING="$STAGE/candidate/app/Services/PmdMobileSync/PmdMobilePairingService.php"
GRANT="$STAGE/candidate/app/Services/PmdMobileSync/PmdMobileStaffGrantService.php"
PAIR_CTRL="$STAGE/candidate/app/Http/Controllers/PmdMobilePairController.php"
AUTH="$STAGE/candidate/app/Http/Controllers/PmdMobileWorkspaceAuthController.php"
WORK="$STAGE/candidate/app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
ROUTES="$STAGE/candidate/routes/pmd-mobile-sync-v1.php"
SETTINGS="$STAGE/candidate/app/admin/views/pmdsettings/index.blade.php"

grep -q "PMD_SITE_ACCESS_EXPLICIT_IDENTITY_CHALLENGE_V12" "$SITE" \
  || fail "Explicit native Site Access challenge authority missing."
grep -q "beginChallengeForIdentity" "$SITE" \
  || fail "Native/dashboard challenge creation method missing."

grep -q "PMD_MOBILE_NATIVE_PAIR_DASHBOARD_WAIT_V12" "$PAIRING" \
  || fail "Native pairing dashboard-wait contract missing."
grep -q "beginNativeDashboardApproval" "$PAIRING" \
  || fail "Native pairing request creation method missing."

grep -q "PMD_MOBILE_NATIVE_PAIR_REQUEST_V12" "$PAIR_CTRL" \
  || fail "Native in-app pair request endpoint missing."

grep -q "PMD_ANDROID_CANONICAL_LOGIN_WAIT_V12" "$AUTH" \
  || fail "Canonical Android login wait controller marker missing."
grep -q "offline_expires_at" "$AUTH" \
  || fail "Separate offline session expiry is missing."
grep -q "PmdWorkSessionPolicyService" "$AUTH" \
  || fail "Android authorization is not bound to web work-session policy."

grep -q "destination' => \$destination" "$GRANT" \
  || fail "Signed Staff Grant destination claim missing."
grep -q "maxExpiresAt" "$GRANT" \
  || fail "Staff Grant is not capped by the work-session boundary."

grep -q "PMD_MOBILE_PORTAL_CANONICAL_SECURITY_V12" "$WORK" \
  || fail "usernameportal canonical MFA continuation missing."
grep -q "PMD_MOBILE_SIGNED_DESTINATION_AUTHORITY_V12" "$WORK" \
  || fail "Signed destination authority missing."
grep -q "PMD_MOBILE_OWNER_CANONICAL_SECURITY_V6" "$WORK" \
  || fail "Owner canonical MFA continuation missing."

grep -q "pair/request" "$ROUTES" \
  || fail "Native pair/request route missing."
grep -q "workspace/request" "$ROUTES" \
  || fail "Native workspace/request route missing."
grep -q "workspace/status" "$ROUTES" \
  || fail "Native workspace/status route missing."

grep -q "PMD_ANDROID_POS_PREVIEW_V5_CANONICAL_LOGIN_OFFLINE" "$SETTINGS" \
  || fail "Settings Android 0.3.5 marker missing."
grep -q "PayMyDine-Android-0.3.5.apk" "$SETTINGS" \
  || fail "Settings does not point to first-party Android 0.3.5."
grep -q "Operations Preview 0.3.5" "$SETTINGS" \
  || fail "Settings Android label is not 0.3.5."

for rel in \
  "app/Services/PmdSiteAccessService.php" \
  "app/Services/PmdMobileSync/PmdMobilePairingService.php" \
  "app/Services/PmdMobileSync/PmdMobileStaffGrantService.php" \
  "app/Http/Controllers/PmdMobilePairController.php" \
  "app/Http/Controllers/PmdMobileWorkspaceAuthController.php" \
  "app/Http/Controllers/PmdMobileWorkspaceSessionController.php" \
  "routes/pmd-mobile-sync-v1.php"; do
  php -l "$STAGE/candidate/$rel" >/dev/null \
    || fail "PHP syntax failed: $rel"
done

log "Publishing verified Android 0.3.5 on the PayMyDine domain..."
mkdir -p "$WEB_DIR"
root_uid="$(stat -c '%u' "$PMD_ROOT")"
root_gid="$(stat -c '%g' "$PMD_ROOT")"

apk_tmp="$WEB_APK.pmd-v187-new"
sha_tmp="$WEB_SHA.pmd-v187-new"
cp -f "$STAGE/$APK_RELEASE_NAME" "$apk_tmp"
printf '%s  %s\n' "$ACTUAL_APK_SHA256" "$APK_PUBLIC_NAME" > "$sha_tmp"
chmod 0644 "$apk_tmp" "$sha_tmp"
chown "$root_uid:$root_gid" "$apk_tmp" "$sha_tmp" 2>/dev/null || true
mv -f "$apk_tmp" "$WEB_APK"
mv -f "$sha_tmp" "$WEB_SHA"

LOCAL_APK_SHA256="$(
  sha256sum "$WEB_APK" |
    awk '{print $1}' |
    tr '[:upper:]' '[:lower:]'
)"
[[ "$LOCAL_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] \
  || fail "First-party APK checksum changed after publication."

log "Installing validated V18.7 server files..."
for rel in "${FILES[@]}"; do
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"

  tmp="${dst}.pmd-v187-new"
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

if command -v systemctl >/dev/null 2>&1 \
  && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Verification:"
grep -n "PMD_SITE_ACCESS_EXPLICIT_IDENTITY_CHALLENGE_V12" "$PMD_ROOT/app/Services/PmdSiteAccessService.php" | head -1
grep -n "PMD_MOBILE_NATIVE_PAIR_DASHBOARD_WAIT_V12" "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobilePairingService.php" | head -1
grep -n "PMD_MOBILE_NATIVE_PAIR_REQUEST_V12" "$PMD_ROOT/app/Http/Controllers/PmdMobilePairController.php" | head -1
grep -n "PMD_ANDROID_CANONICAL_LOGIN_WAIT_V12" "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" | head -1
grep -n "PMD_MOBILE_PORTAL_CANONICAL_SECURITY_V12" "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceSessionController.php" | head -1
grep -n "workspace/request" "$PMD_ROOT/routes/pmd-mobile-sync-v1.php" | head -1
grep -n "PayMyDine-Android-0.3.5.apk" "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" | head -1
sha256sum "$WEB_APK"

if [[ -n "$PMD_HOST" ]]; then
  URL="https://$PMD_HOST/downloads/paymydine/$APK_PUBLIC_NAME"
  log "Checking first-party URL: $URL"
  HTTP_CODE="$(curl -L -sS -o /dev/null -w '%{http_code}' "$URL" || true)"
  [[ "$HTTP_CODE" == "200" ]] \
    || fail "First-party Android URL returned HTTP $HTTP_CODE"
  log "First-party Android URL returned HTTP 200."
fi

cat <<EOF

============================================================
PayMyDine Android Operations V18.7 deployed.

Approval / login:
  - Android no longer opens /admin/mobile/pair/start or a confirmation page.
  - The app stays on the PayMyDine Login card while restaurant approval waits.
  - The existing Owner / Manager / trusted Cashier dashboard approval card is
    the authority for Android pairing and normal non-Owner workspace sign-in.
  - Owner keeps canonical Owner Authenticator inside the app.
  - usernameportal keeps canonical personal Portal Authenticator inside the app.
  - Role destinations remain server-owned by PmdDefaultStaffRoleService.

Offline:
  - POS/KDS local authority is separate from the short-lived Cloud bearer grant.
  - Valid local work sessions survive WAN/Cloud loss through the canonical
    work-session boundary.
  - If Android still has network but PayMyDine Cloud is unreachable, a valid
    local POS/KDS session can continue offline.
  - Payments remain fail-closed without Cloud success.

Android:
  $APK_PUBLIC_NAME
  0.3.5-canonical-login-offline-debug
  versionCode 18
  package com.paymydine.mobile.pospreview

Verified APK SHA-256:
  $LOCAL_APK_SHA256

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
