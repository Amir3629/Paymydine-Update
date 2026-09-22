#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
PMD_HOST="${PMD_HOST:-}"

BASE_COMMIT="${BASE_COMMIT:-cd1c1ac607670ac5ff21769e6913bf6f16f9486c}"
TARGET_COMMIT="${TARGET_COMMIT:-9b272045c51caa6edaa0eec363c76c66dcf4109f}"

APK_RELEASE_NAME="PayMyDine-POS-Tablet-Preview-0.3.6.apk"
APK_PUBLIC_NAME="PayMyDine-Android-0.3.6.apk"
APK_RELEASE_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/${APK_RELEASE_NAME}"
APK_SHA_URL="${APK_RELEASE_URL}.sha256"
EXPECTED_APK_SHA256="c2fb22b13c04418eb25aad60bdf2ecdefcdc70dd7617fee5ad3848ff4f199170"

SETTINGS_REL="app/admin/views/pmdsettings/index.blade.php"

log(){ printf '\n[PMD V18.11 ANDROID 0.3.6 OFFLINE] %s\n' "$*"; }
fail(){ printf '\n[PMD V18.11 ANDROID 0.3.6 OFFLINE][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"
[[ -f "$PMD_ROOT/$SETTINGS_REL" ]] || fail "PayMyDine Settings view is missing."

for cmd in git curl sha256sum tar stat grep awk tr; do
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

# Forward-only from the server fixes already deployed in V18.8-V18.10.
grep -q "PMD_MOBILE_CANONICAL_LOCATION_AUTH_V13" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceSessionController.php" \
  || fail "V18.8 workspace location authority is not installed."
grep -q "PMD_ANDROID_PAIRED_DEVICE_PASSWORD_LOGIN_V13" \
  "$PMD_ROOT/app/Http/Controllers/PmdMobileWorkspaceAuthController.php" \
  || fail "V18.9 paired staff login is not installed."
grep -q "PMD_ANDROID_AUTHENTICATED_TRANSPORT_V14" \
  "$PMD_ROOT/app/admin/Services/PmdDefaultStaffRoleService.php" \
  || fail "V18.10 Android transport authorization is not installed."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-v1811-android-036-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-v1811-android-036-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-v1811-036-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-v1811-036-before-$STAMP.txt"

WEB_DIR="$PMD_ROOT/downloads/paymydine"
WEB_APK="$WEB_DIR/$APK_PUBLIC_NAME"
WEB_SHA="$WEB_APK.sha256"

mkdir -p \
  "$BACKUP_DIR" \
  "$STAGE/base/$(dirname "$SETTINGS_REL")" \
  "$STAGE/target/$(dirname "$SETTINGS_REL")" \
  "$STAGE/candidate/$(dirname "$SETTINGS_REL")" \
  "$CONFLICT/$(dirname "$SETTINGS_REL")"

log "Downloading Android 0.3.6 release..."
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

EXISTING=("$SETTINGS_REL")
[[ -e "$WEB_APK" ]] && EXISTING+=("${WEB_APK#$PMD_ROOT/}")
[[ -e "$WEB_SHA" ]] && EXISTING+=("${WEB_SHA#$PMD_ROOT/}")
tar -czf "$BACKUP" "${EXISTING[@]}"

{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "head=$("${GIT[@]}" rev-parse HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "base=$BASE_COMMIT"
  echo "target=$TARGET_COMMIT"
  echo "android_source_commit=0b9b76f43939a3fec956ba163ebf0087b856a55e"
  echo "android_ci_run=35752806140"
  echo "apk_release=$APK_RELEASE_NAME"
  echo "apk_public=$APK_PUBLIC_NAME"
  echo "apk_sha256=$ACTUAL_APK_SHA256"
  echo
  "${GIT[@]}" status --short -- "$SETTINGS_REL" || true
} > "$META"

log "Backup: $BACKUP"
log "Building protected Settings merge candidate..."

"${GIT[@]}" show "$BASE_COMMIT:$SETTINGS_REL" > "$STAGE/base/$SETTINGS_REL" \
  || fail "Base Settings file missing from $BASE_COMMIT."
"${GIT[@]}" show "$TARGET_COMMIT:$SETTINGS_REL" > "$STAGE/target/$SETTINGS_REL" \
  || fail "Target Settings file missing from $TARGET_COMMIT."

set +e
git merge-file -p --diff3 \
  -L "LIVE:$SETTINGS_REL" \
  -L "BASE:$SETTINGS_REL" \
  -L "V18.11:$SETTINGS_REL" \
  "$PMD_ROOT/$SETTINGS_REL" \
  "$STAGE/base/$SETTINGS_REL" \
  "$STAGE/target/$SETTINGS_REL" \
  > "$STAGE/candidate/$SETTINGS_REL"
rc=$?
set -e

if [[ $rc -ne 0 ]] \
  || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$SETTINGS_REL"; then
  cp -f "$STAGE/candidate/$SETTINGS_REL" "$CONFLICT/$SETTINGS_REL"
  fail "Merge conflict. No V18.11 files were installed. Candidate: $CONFLICT/$SETTINGS_REL"
fi

SETTINGS="$STAGE/candidate/$SETTINGS_REL"

log "Validating Settings Android 0.3.6 contract..."
grep -q "PMD_ANDROID_POS_PREVIEW_V6_OFFLINE_FAILOVER_LOGIN_FRAME" "$SETTINGS" \
  || fail "Android 0.3.6 Settings marker missing."
grep -q "PayMyDine-Android-0.3.6.apk" "$SETTINGS" \
  || fail "Settings does not point to Android 0.3.6."
grep -q "Operations Preview 0.3.6" "$SETTINGS" \
  || fail "Settings Android label is not 0.3.6."
if grep -q "PayMyDine-Android-0.3.5.apk" "$SETTINGS"; then
  fail "Settings candidate still points to Android 0.3.5."
fi

log "Publishing verified Android 0.3.6 on the PayMyDine domain..."
mkdir -p "$WEB_DIR"
root_uid="$(stat -c '%u' "$PMD_ROOT")"
root_gid="$(stat -c '%g' "$PMD_ROOT")"

apk_tmp="$WEB_APK.pmd-v1811-new"
sha_tmp="$WEB_SHA.pmd-v1811-new"
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

log "Installing Settings download pointer..."
dst="$PMD_ROOT/$SETTINGS_REL"
uid="$(stat -c '%u' "$dst")"
gid="$(stat -c '%g' "$dst")"
mode="$(stat -c '%a' "$dst")"
tmp="${dst}.pmd-v1811-new"
cp -f "$SETTINGS" "$tmp"
chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
chown "$uid:$gid" "$tmp" 2>/dev/null || true
mv -f "$tmp" "$dst"

log "Clearing Laravel/TastyIgniter caches..."
php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true
php artisan optimize:clear >/dev/null 2>&1 || true

if command -v systemctl >/dev/null 2>&1 \
  && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Verification:"
grep -n "PMD_ANDROID_POS_PREVIEW_V6_OFFLINE_FAILOVER_LOGIN_FRAME" \
  "$PMD_ROOT/$SETTINGS_REL" | head -1
grep -n "PayMyDine-Android-0.3.6.apk" "$PMD_ROOT/$SETTINGS_REL" | head -1
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
PayMyDine Android V18.11 / APK 0.3.6 deployed.

Android 0.3.6:
  - Wi-Fi/WAN loss in an authorized POS session switches immediately to the
    local SQLite POS instead of leaving the Cloud page to show fetch errors.
  - Resource/XHR failures during a real WAN cut also trigger local POS failover.
  - Raw network/DNS/fetch errors are suppressed on the Staff Login card when a
    verified offline POS/KDS session is available.
  - Login username/password card is wider and tablet-landscape responsive.
  - Same package + same pinned preview signing certificate: install/update over
    0.3.5 without uninstalling and without clearing app data.

Offline authority:
  - Cashier/Waiter POS: local-first offline supported.
  - KDS: local-first offline supported.
  - Owner/Manager/Accountant/Reservations web workspaces still require Cloud.
  - Payments remain fail-closed without Cloud success.

Verified build:
  Android source commit:
    0b9b76f43939a3fec956ba163ebf0087b856a55e
  GitHub Actions run:
    35752806140
  Unit tests: PASS
  Android compile/assemble: PASS
  Android lint: PASS
  APK package/version/signing pin: PASS
  Release upload: PASS

APK:
  $APK_PUBLIC_NAME
  SHA-256:
    $LOCAL_APK_SHA256

No migration.
No pairing reset.
No Clear Data.
No git reset --hard.

Backup:
  $BACKUP
  $META
============================================================
EOF
