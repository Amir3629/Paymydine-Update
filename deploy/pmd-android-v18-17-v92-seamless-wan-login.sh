#!/usr/bin/env bash
set -Eeuo pipefail

# PMD_ANDROID_V18_17_V92_SEAMLESS_WAN_LOGIN
PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
PMD_HOST="${PMD_HOST:-}"

QPOS_BASE_COMMIT="${QPOS_BASE_COMMIT:-74cf7fdf0a31b3cf50cf1ecb2f394d9cf1751b4f}"
SOURCE_COMMIT="${SOURCE_COMMIT:-87af917412b7d3e674d0cd8b663ecb89fe1bd6b2}"

APK_VERSION="0.3.18"
APK_RELEASE_NAME="PayMyDine-POS-Tablet-Preview-${APK_VERSION}.apk"
APK_PUBLIC_NAME="PayMyDine-Android-${APK_VERSION}.apk"
APK_RELEASE_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/${APK_RELEASE_NAME}"
APK_SHA_URL="${APK_RELEASE_URL}.sha256"
EXPECTED_APK_SHA256="0bec63dac4019be9df902c51faa1e66e0abf716aa6de2f2e5e9c6c95825497f7"

QPOS_FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
)
VIEW_FILE="app/admin/views/pmd_quick_pos_v1.blade.php"
SETTINGS_FILE="app/admin/views/pmdsettings/index.blade.php"
BOOTSTRAP_FILE="app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
COMMAND_FILE="app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"

log(){ printf '\n[PMD V18.17 ANDROID 0.3.18 V92] %s\n' "$*"; }
fail(){ printf '\n[PMD V18.17 ANDROID 0.3.18 V92][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

for cmd in git curl sha256sum tar stat grep awk tr sed cp mv mkdir dirname chmod chown; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

[[ "$EXPECTED_APK_SHA256" =~ ^[0-9a-f]{64}$ ]] || fail "Invalid pinned APK SHA-256."

for rel in "${QPOS_FILES[@]}" "$VIEW_FILE" "$SETTINGS_FILE" "$BOOTSTRAP_FILE" "$COMMAND_FILE"; do
  [[ -f "$PMD_ROOT/$rel" ]] || fail "Live file missing: $rel"
done

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Checkout: $PMD_ROOT"
log "Fetching protected source refs..."
"${GIT[@]}" fetch --prune origin main feature/android-local-first-v1

for ref in "$QPOS_BASE_COMMIT" "$SOURCE_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null || fail "Required commit unavailable: $ref"
done

# Existing durable offline authority must already be present.
grep -q "PMD_ANDROID_CANONICAL_QPOS_SETTINGS_V18" "$PMD_ROOT/$BOOTSTRAP_FILE" || fail "Canonical offline bootstrap is not installed."
grep -q "PMD_ANDROID_CANONICAL_MULTI_CHECK_SNAPSHOT_V18" "$PMD_ROOT/$BOOTSTRAP_FILE" || fail "Multi-check snapshot contract is not installed."
grep -q "PMD_MOBILE_OFFLINE_CASH_PAYMENT_V17" "$PMD_ROOT/$COMMAND_FILE" || fail "Offline cash authority is not installed."
grep -q "PMD_MOBILE_OFFLINE_TABLE_ACTIONS_V17" "$PMD_ROOT/$COMMAND_FILE" || fail "Offline table-action authority is not installed."
grep -q "PMD_MOBILE_OFFLINE_ORIGINAL_TIME_V18" "$PMD_ROOT/$COMMAND_FILE" || fail "Original offline order-time contract is not installed."
grep -q "PMD_MOBILE_OFFLINE_PAYMENT_TIME_V18" "$PMD_ROOT/$COMMAND_FILE" || fail "Original offline payment-time contract is not installed."

git_show_contains() {
  local ref="$1" path="$2" needle="$3"
  grep -Fq "$needle" < <("${GIT[@]}" show "$ref:$path")
}

git_show_not_contains() {
  local ref="$1" path="$2" needle="$3"
  ! grep -Fq "$needle" < <("${GIT[@]}" show "$ref:$path")
}

log "Validating pinned V92 Android/source contract..."
git_show_contains "$SOURCE_COMMIT" "mobile/android/app/build.gradle.kts" "PMD_ANDROID_0_3_18_SEAMLESS_LOCAL_V22" || fail "Android 0.3.18 V92 version marker missing."
git_show_contains "$SOURCE_COMMIT" "app/admin/assets/css/pmd-quick-pos-v1.css" "PMD_QPOS_VISUAL_CLEANUP_V90" || fail "V90 visual contract missing."
git_show_contains "$SOURCE_COMMIT" "app/admin/assets/js/pmd-quick-pos-v1.js" "PMD_QPOS_REQUEST_FAILOVER_V91" || fail "V91 request failover marker missing."
git_show_contains "$SOURCE_COMMIT" "app/admin/assets/js/pmd-quick-pos-v1.js" "PMD_QPOS_NATIVE_DURABLE_MUTATIONS_V92" || fail "V92 durable mutation marker missing."
git_show_contains "$SOURCE_COMMIT" "app/admin/assets/js/pmd-quick-pos-v1.js" "PMD_QPOS_TERMINAL_SAFE_FAILOVER_V92" || fail "V92 terminal-safe marker missing."
git_show_contains "$SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/network/ConnectivityObserver.kt" "PMD_ANDROID_CONNECTIVITY_SYNC_PROBE_V21" || fail "Synchronous validated-network probe missing."
git_show_contains "$SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/LocalPosBridge.kt" "PMD_ANDROID_POS_REQUEST_FAILOVER_V21" || fail "Native request failover bridge missing."
git_show_contains "$SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/security/OfflineCredentialCrypto.kt" "PMD_ANDROID_OFFLINE_LOGIN_VERIFIER_V22" || fail "Offline credential verifier missing."
git_show_contains "$SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/security/DeviceCredentialStore.kt" "PMD_ANDROID_SAME_LOGIN_OFFLINE_V22" || fail "Secure same-login offline credential storage missing."
git_show_contains "$SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/ui/PmdStaffLogin.kt" "PMD_ANDROID_SAME_LOGIN_OFFLINE_V22" || fail "Same Login offline re-auth marker missing."
git_show_contains "$SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/PosActivity.kt" "PMD_ANDROID_NATIVE_SIGN_OUT_V22" || fail "Native Sign out marker missing."
git_show_contains "$SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/ui/PmdStaffLogin.kt" "PMD_ANDROID_LOGIN_NO_OFFLINE_BUTTON_V20" || fail "No-offline-button marker missing."
git_show_not_contains "$SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/ui/PmdStaffLogin.kt" "Continue offline as " || fail "Legacy separate offline-login button is present."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-v1817-android-0318-v92-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-v1817-android-0318-v92-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-v1817-0318-v92-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-v1817-0318-v92-before-$STAMP.txt"
WEB_DIR="$PMD_ROOT/downloads/paymydine"
WEB_APK="$WEB_DIR/$APK_PUBLIC_NAME"
WEB_SHA="$WEB_APK.sha256"

mkdir -p "$BACKUP_DIR" "$STAGE/base" "$STAGE/target" "$STAGE/candidate" "$CONFLICT"

log "Downloading checksum-pinned Android $APK_VERSION..."
curl -fL --retry 3 --retry-delay 2 "$APK_RELEASE_URL" -o "$STAGE/$APK_RELEASE_NAME"
curl -fL --retry 3 --retry-delay 2 "$APK_SHA_URL" -o "$STAGE/$APK_RELEASE_NAME.sha256"

ACTUAL_APK_SHA256="$(sha256sum "$STAGE/$APK_RELEASE_NAME" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
SIDE_APK_SHA256="$(awk 'NF {print $1; exit}' "$STAGE/$APK_RELEASE_NAME.sha256" | tr '[:upper:]' '[:lower:]')"

[[ "$ACTUAL_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] || fail "APK SHA-256 mismatch: expected=$EXPECTED_APK_SHA256 actual=$ACTUAL_APK_SHA256"
[[ "$SIDE_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] || fail "Release checksum sidecar mismatch: expected=$EXPECTED_APK_SHA256 sidecar=$SIDE_APK_SHA256"
log "APK verified: $ACTUAL_APK_SHA256"

EXISTING=()
for rel in "${QPOS_FILES[@]}" "$VIEW_FILE" "$SETTINGS_FILE"; do
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
  echo "qpos_base=$QPOS_BASE_COMMIT"
  echo "source_commit=$SOURCE_COMMIT"
  echo "apk_release=$APK_RELEASE_NAME"
  echo "apk_public=$APK_PUBLIC_NAME"
  echo "apk_sha256=$ACTUAL_APK_SHA256"
  echo
  "${GIT[@]}" status --short -- "${QPOS_FILES[@]}" "$VIEW_FILE" "$SETTINGS_FILE" || true
} > "$META"

log "Backup: $BACKUP"
log "Building protected V89 -> V92 Quick POS merge candidates..."

for rel in "${QPOS_FILES[@]}"; do
  mkdir -p     "$STAGE/base/$(dirname "$rel")"     "$STAGE/target/$(dirname "$rel")"     "$STAGE/candidate/$(dirname "$rel")"     "$CONFLICT/$(dirname "$rel")"

  "${GIT[@]}" show "$QPOS_BASE_COMMIT:$rel" > "$STAGE/base/$rel" || fail "Base file missing from $QPOS_BASE_COMMIT: $rel"
  "${GIT[@]}" show "$SOURCE_COMMIT:$rel" > "$STAGE/target/$rel" || fail "Target file missing from $SOURCE_COMMIT: $rel"

  set +e
  git merge-file -p --diff3     -L "LIVE:$rel"     -L "BASE:$rel"     -L "V92:$rel"     "$PMD_ROOT/$rel"     "$STAGE/base/$rel"     "$STAGE/target/$rel"     > "$STAGE/candidate/$rel"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$rel"; then
    cp -f "$STAGE/candidate/$rel" "$CONFLICT/$rel"
    fail "Merge conflict. No V92 server files were installed. Candidate: $CONFLICT/$rel"
  fi
done

mkdir -p   "$STAGE/candidate/$(dirname "$VIEW_FILE")"   "$STAGE/candidate/$(dirname "$SETTINGS_FILE")"

cp -f "$PMD_ROOT/$VIEW_FILE" "$STAGE/candidate/$VIEW_FILE"
cp -f "$PMD_ROOT/$SETTINGS_FILE" "$STAGE/candidate/$SETTINGS_FILE"

VIEW="$STAGE/candidate/$VIEW_FILE"
SETTINGS="$STAGE/candidate/$SETTINGS_FILE"
CSS="$STAGE/candidate/app/admin/assets/css/pmd-quick-pos-v1.css"
JS="$STAGE/candidate/app/admin/assets/js/pmd-quick-pos-v1.js"

# Preserve the production Blade and update only cache identities.
grep -Eq 'pmd-quick-pos-v1\.css\?v=[^"]+' "$VIEW" || fail "Quick POS CSS asset tag was not found."
grep -Eq 'pmd-quick-pos-v1\.js\?v=[^"]+' "$VIEW" || fail "Quick POS JS asset tag was not found."
sed -E -i 's#pmd-quick-pos-v1\.css\?v=[^"]+#pmd-quick-pos-v1.css?v=20260924-90#g' "$VIEW"
sed -E -i 's#pmd-quick-pos-v1\.js\?v=[^"]+#pmd-quick-pos-v1.js?v=20260924-seamless-local-v92#g' "$VIEW"

# Preserve the production Settings page and update only the Android release pointer.
grep -Eq 'PayMyDine-Android-0\.3\.[0-9]+\.apk' "$SETTINGS" || fail "Current Android download pointer was not found in Settings."
sed -E -i 's/PayMyDine-Android-0\.3\.[0-9]+\.apk/PayMyDine-Android-0.3.18.apk/g' "$SETTINGS"
if grep -Eq '(Operations Preview|Canonical Offline POS) 0\.3\.[0-9]+' "$SETTINGS"; then
  sed -E -i 's/(Operations Preview|Canonical Offline POS) 0\.3\.[0-9]+/Canonical Offline POS 0.3.18/g' "$SETTINGS"
fi

log "Validating V92 server candidate..."
grep -q "PMD_QPOS_VISUAL_CLEANUP_V90" "$CSS" || fail "V90 visual cleanup marker missing from candidate CSS."
grep -q "PMD_QPOS_MOBILE_CART_IN_FLOW_V90" "$CSS" || fail "V90 mobile cart marker missing from candidate CSS."
grep -q "PMD_QPOS_REQUEST_FAILOVER_V91" "$JS" || fail "V91 request failover marker missing from candidate JS."
grep -q "PMD_QPOS_NATIVE_DURABLE_MUTATIONS_V92" "$JS" || fail "V92 durable mutation marker missing from candidate JS."
grep -q "PMD_QPOS_TERMINAL_SAFE_FAILOVER_V92" "$JS" || fail "V92 terminal-safe marker missing from candidate JS."
grep -q "nativeCloudUnavailableV91" "$JS" || fail "Synchronous native Cloud probe usage missing from candidate JS."
grep -q "isNativeDurableMutationV92" "$JS" || fail "Durable mutation classifier missing from candidate JS."
grep -q 'pmd-quick-pos-v1.css?v=20260924-90' "$VIEW" || fail "V90 CSS cache-buster missing from candidate view."
grep -q 'pmd-quick-pos-v1.js?v=20260924-seamless-local-v92' "$VIEW" || fail "V92 JS cache-buster missing from candidate view."
grep -q "PayMyDine-Android-0.3.18.apk" "$SETTINGS" || fail "Settings does not point to Android 0.3.18."
grep -q "Canonical Offline POS 0.3.18" "$SETTINGS" || fail "Settings Android 0.3.18 label missing."

if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null || fail "Merged Quick POS JavaScript failed syntax validation."
fi

log "Installing validated V92 server files..."
for rel in "${QPOS_FILES[@]}" "$VIEW_FILE" "$SETTINGS_FILE"; do
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"
  tmp="${dst}.pmd-v1817-new"

  cp -f "$STAGE/candidate/$rel" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

log "Publishing verified Android 0.3.18 on the PayMyDine domain..."
mkdir -p "$WEB_DIR"
root_uid="$(stat -c '%u' "$PMD_ROOT")"
root_gid="$(stat -c '%g' "$PMD_ROOT")"

apk_tmp="$WEB_APK.pmd-v1817-new"
sha_tmp="$WEB_SHA.pmd-v1817-new"
cp -f "$STAGE/$APK_RELEASE_NAME" "$apk_tmp"
printf '%s  %s\n' "$ACTUAL_APK_SHA256" "$APK_PUBLIC_NAME" > "$sha_tmp"
chmod 0644 "$apk_tmp" "$sha_tmp"
chown "$root_uid:$root_gid" "$apk_tmp" "$sha_tmp" 2>/dev/null || true
mv -f "$apk_tmp" "$WEB_APK"
mv -f "$sha_tmp" "$WEB_SHA"

LOCAL_APK_SHA256="$(sha256sum "$WEB_APK" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
[[ "$LOCAL_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] || fail "First-party APK checksum changed after publication."

log "Clearing Laravel/TastyIgniter caches..."
php artisan route:clear >/dev/null 2>&1 || true
php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true
php artisan optimize:clear >/dev/null 2>&1 || true

if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Verification:"
grep -n "PMD_QPOS_VISUAL_CLEANUP_V90" "$PMD_ROOT/app/admin/assets/css/pmd-quick-pos-v1.css" | head -1
grep -n "PMD_QPOS_REQUEST_FAILOVER_V91" "$PMD_ROOT/app/admin/assets/js/pmd-quick-pos-v1.js" | head -1
grep -n "PMD_QPOS_NATIVE_DURABLE_MUTATIONS_V92" "$PMD_ROOT/app/admin/assets/js/pmd-quick-pos-v1.js" | head -1
grep -n "PMD_QPOS_TERMINAL_SAFE_FAILOVER_V92" "$PMD_ROOT/app/admin/assets/js/pmd-quick-pos-v1.js" | head -1
grep -n 'pmd-quick-pos-v1.js?v=20260924-seamless-local-v92' "$PMD_ROOT/$VIEW_FILE" | head -1
grep -n "PayMyDine-Android-0.3.18.apk" "$PMD_ROOT/$SETTINGS_FILE" | head -1
grep -n "PMD_ANDROID_CANONICAL_QPOS_SETTINGS_V18" "$PMD_ROOT/$BOOTSTRAP_FILE" | head -1
grep -n "PMD_MOBILE_OFFLINE_PAYMENT_TIME_V18" "$PMD_ROOT/$COMMAND_FILE" | head -1
sha256sum "$WEB_APK"

if [[ -n "$PMD_HOST" ]]; then
  URL="https://$PMD_HOST/downloads/paymydine/$APK_PUBLIC_NAME"
  log "Checking first-party URL: $URL"
  HTTP_CODE="$(curl -L -sS -o /dev/null -w '%{http_code}' "$URL" || true)"
  [[ "$HTTP_CODE" == "200" ]] || fail "First-party Android URL returned HTTP $HTTP_CODE"
  log "First-party Android URL returned HTTP 200."
fi

cat <<EOF

=============================================================
PayMyDine Android V18.17 / APK 0.3.18 / Quick POS V92 deployed.

WAN-cut fix:
  - Quick POS checks Android's synchronous validated-network state before Cloud use.
  - GET requests fall back to the native SQLite transport when Cloud disappears.
  - SEND/HOLD, full cash settlement, Cleaning/Free and Move use the certified
    local durable path when the validated network is actually gone.
  - A lost/ambiguous Cloud mutation response is not blindly duplicated locally.
  - Online card/terminal/provider flow remains Cloud-first and fail-closed.
  - The current Activity/WebView stays in place during local failover.

Login fix:
  - There is still NO separate "Continue offline" button.
  - After one successful online login on Android 0.3.18, the SAME Login form can
    verify that staff member locally during a later WAN outage.
  - Sign out is device-local first, so it returns to the same Login even offline.
  - Raw passwords/PINs are NOT persisted. Only a salted PBKDF2 verifier is kept
    inside Android Keystore-encrypted credential storage until offline expiry.

Verified release:
  Source commit:
    $SOURCE_COMMIT
  APK:
    $APK_PUBLIC_NAME
  SHA-256:
    $LOCAL_APK_SHA256

No database migration.
No pairing reset.
No Android Clear Data.
No raw password/PIN persistence.
No git reset --hard.

Important first-use note:
  For offline re-login, sign in ONCE while online after installing 0.3.18 so the
  secure local verifier is created. Mid-shift WAN failover does not require this.

Backup:
  $BACKUP
  $META
=============================================================
EOF
