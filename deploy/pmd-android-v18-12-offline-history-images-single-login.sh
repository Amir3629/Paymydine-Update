#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
PMD_HOST="${PMD_HOST:-}"

BASE_COMMIT="${BASE_COMMIT:-bacd4ea5a83e111596f71fee5c512db9a6298a0a}"
TARGET_COMMIT="${TARGET_COMMIT:-9146c37239fb59538bef8c30b45dc282008f0562}"

APK_RELEASE_NAME="PayMyDine-POS-Tablet-Preview-0.3.7.apk"
APK_PUBLIC_NAME="PayMyDine-Android-0.3.7.apk"
APK_RELEASE_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/${APK_RELEASE_NAME}"
APK_SHA_URL="${APK_RELEASE_URL}.sha256"
EXPECTED_APK_SHA256="371cbf3ce9d2c900cb8dc9560aabe5aa660eecfbe16cb841d0d89d04eb0c63c8"

FILES=(
  "app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
  "app/Services/PmdMobileSync/PmdMobilePairingService.php"
  "app/admin/views/pmdsettings/index.blade.php"
)

log(){ printf '\n[PMD V18.12 ANDROID 0.3.7] %s\n' "$*"; }
fail(){ printf '\n[PMD V18.12 ANDROID 0.3.7][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

for cmd in git curl sha256sum php tar stat grep awk tr; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

for rel in "${FILES[@]}"; do
  [[ -f "$PMD_ROOT/$rel" ]] || fail "Live file missing: $rel"
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

# Forward-only from the exact Android server baseline already deployed.
grep -q "PMD_MOBILE_CANONICAL_LOCATION_AUTH_V13" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceSessionController.php" \
  || fail "V18.8 canonical mobile location authority is not installed."
grep -q "PMD_ANDROID_PAIRED_DEVICE_PASSWORD_LOGIN_V13" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" \
  || fail "V18.9 paired staff login is not installed."
grep -q "PMD_ANDROID_AUTHENTICATED_TRANSPORT_V14" \
  "$PMD_ROOT/app/admin/Services/PmdDefaultStaffRoleService.php" \
  || fail "V18.10 Android transport authorization is not installed."
grep -q "PMD_ANDROID_POS_PREVIEW_V6_OFFLINE_FAILOVER_LOGIN_FRAME" \
  "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" \
  || fail "V18.11 Android 0.3.6 Settings baseline is not installed."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-v1812-android-037-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-v1812-android-037-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-v1812-037-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-v1812-037-before-$STAMP.txt"

WEB_DIR="$PMD_ROOT/downloads/paymydine"
WEB_APK="$WEB_DIR/$APK_PUBLIC_NAME"
WEB_SHA="$WEB_APK.sha256"

mkdir -p "$BACKUP_DIR" "$STAGE/base" "$STAGE/target" "$STAGE/candidate" "$CONFLICT"

log "Downloading Android 0.3.7 release..."
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
  echo "android_source_commit=54420003a5d79b0b522af05c20cbdd81541b59a5"
  echo "android_ci_run=35783711641"
  echo "apk_release=$APK_RELEASE_NAME"
  echo "apk_public=$APK_PUBLIC_NAME"
  echo "apk_sha256=$ACTUAL_APK_SHA256"
  echo
  "${GIT[@]}" status --short -- "${FILES[@]}" || true
} > "$META"

log "Backup: $BACKUP"
log "Building protected V18.12 three-way merge candidates..."

for rel in "${FILES[@]}"; do
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
    -L "V18.12:$rel" \
    "$PMD_ROOT/$rel" \
    "$STAGE/base/$rel" \
    "$STAGE/target/$rel" \
    > "$STAGE/candidate/$rel"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] \
    || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$rel"; then
    cp -f "$STAGE/candidate/$rel" "$CONFLICT/$rel"
    fail "Merge conflict. No V18.12 files were installed. Candidate: $CONFLICT/$rel"
  fi
done

BOOT="$STAGE/candidate/app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
PAIR="$STAGE/candidate/app/Services/PmdMobileSync/PmdMobilePairingService.php"
SETTINGS="$STAGE/candidate/app/admin/views/pmdsettings/index.blade.php"

log "Validating offline History / images / single-login contract..."

grep -q "PMD_ANDROID_OFFLINE_HISTORY_SNAPSHOT_V16" "$BOOT" \
  || fail "Offline History bootstrap marker missing."
grep -q "recentHistory" "$BOOT" \
  || fail "Offline History projection is missing."
grep -q "'history' => \$this->recentHistory" "$BOOT" \
  || fail "History is not attached to mobile bootstrap."
grep -q "'menu_id'" "$BOOT" \
  || fail "History items are not linked to cached menu images."

grep -q "PMD_MOBILE_PAIR_INITIAL_STAFF_GRANT_V16" "$PAIR" \
  || fail "Initial pairing Staff Grant marker missing."
grep -q "'initial_authorization' => \$initialAuthorization" "$PAIR" \
  || fail "Pairing exchange does not return initial authorization."
grep -q "PmdMobileStaffGrantService" "$PAIR" \
  || fail "Pairing does not use signed Staff Grant authority."
grep -q "PmdWorkSessionPolicyService" "$PAIR" \
  || fail "Initial pairing session is not capped by work-session policy."
grep -q "userMayUseLocation" "$PAIR" \
  || fail "Initial pairing session lost canonical location authorization."
grep -q "routeForRoleCode" "$PAIR" \
  || fail "Initial pairing session lost canonical role routing."

grep -q "PMD_ANDROID_POS_PREVIEW_V7_OFFLINE_HISTORY_IMAGES_SINGLE_LOGIN" "$SETTINGS" \
  || fail "Android 0.3.7 Settings marker missing."
grep -q "PayMyDine-Android-0.3.7.apk" "$SETTINGS" \
  || fail "Settings does not point to Android 0.3.7."
grep -q "Operations Preview 0.3.7" "$SETTINGS" \
  || fail "Settings Android label is not 0.3.7."
if grep -q "PayMyDine-Android-0.3.6.apk" "$SETTINGS"; then
  fail "Settings candidate still points to Android 0.3.6."
fi

php -l "$BOOT" >/dev/null \
  || fail "PHP syntax failed in mobile bootstrap service."
php -l "$PAIR" >/dev/null \
  || fail "PHP syntax failed in mobile pairing service."

log "Publishing verified Android 0.3.7 on the PayMyDine domain..."
mkdir -p "$WEB_DIR"
root_uid="$(stat -c '%u' "$PMD_ROOT")"
root_gid="$(stat -c '%g' "$PMD_ROOT")"

apk_tmp="$WEB_APK.pmd-v1812-new"
sha_tmp="$WEB_SHA.pmd-v1812-new"
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

log "Installing validated V18.12 server files..."
for rel in "${FILES[@]}"; do
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"

  tmp="${dst}.pmd-v1812-new"
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
grep -n "PMD_ANDROID_OFFLINE_HISTORY_SNAPSHOT_V16" \
  "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobileBootstrapService.php" | head -1
grep -n "PMD_MOBILE_PAIR_INITIAL_STAFF_GRANT_V16" \
  "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobilePairingService.php" | head -1
grep -n "PayMyDine-Android-0.3.7.apk" \
  "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" | head -1
php -l "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
php -l "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobilePairingService.php"
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
PayMyDine Android V18.12 / APK 0.3.7 deployed.

Offline POS:
  - History works from the last trusted restaurant snapshot.
  - Up to 300 recent orders include items, notes and payment summaries.
  - Selected-table and all-table History scopes work offline.
  - Menu thumbnails are cached privately while online and render offline.
  - Cached thumbnails are also used for matching items inside History.
  - Offline History is read-only; settlement/invoice mutations stay Cloud-only.

Pairing / login:
  - First device pairing still requires username/password plus restaurant
    approval for device trust.
  - After that approval, the same already-verified identity receives a signed
    initial Staff Grant and opens its canonical role destination directly.
  - The same password is NOT requested a second time during that initial pair.
  - Passwords are not stored on Android.
  - Later dashboard/workspace switches still require username/password.
  - Owner / Portal canonical MFA remains enforced.

Login UI:
  - The username/password card keeps a real tablet-height frame.
  - Short viewport / keyboard conditions scroll the page instead of crushing
    logo, inputs and buttons vertically.

Verified Android build:
  Source commit:
    54420003a5d79b0b522af05c20cbdd81541b59a5
  GitHub Actions run:
    35783711641
  Server PHP syntax + safety contract: PASS
  Local WebView JavaScript syntax: PASS
  Android unit tests: PASS
  Android assemble: PASS
  Android lint: PASS
  Package/version/signing pin: PASS
  Artifact + release upload: PASS

APK:
  $APK_PUBLIC_NAME
  SHA-256:
    $LOCAL_APK_SHA256

No database migration.
No pairing reset.
No Android Clear Data.
No password persistence.
No payment behavior change.
No git reset --hard.

Backup:
  $BACKUP
  $META
============================================================
EOF
