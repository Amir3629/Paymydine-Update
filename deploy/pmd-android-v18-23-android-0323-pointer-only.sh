#!/usr/bin/env bash
set -Eeuo pipefail

# PMD_ANDROID_V18_23_APK_0_3_23_POINTER_ONLY
PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"

ANDROID_SOURCE_COMMIT="${ANDROID_SOURCE_COMMIT:-78e6fc2d5b739b414a082b5f1ea277e61e5835d2}"
APK_VERSION="0.3.23"
APK_RELEASE="PayMyDine-POS-Tablet-Preview-${APK_VERSION}.apk"
APK_PUBLIC="PayMyDine-Android-${APK_VERSION}.apk"
RELEASE_BASE="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview"
APK_URL="${RELEASE_BASE}/${APK_RELEASE}"
APK_SHA_URL="${APK_URL}.sha256"
EXPECTED_APK_SHA256="b30c298b389a947e2329fdc1d2a75c3663a6dbf964f875fb0cfcff40634b171a"

SETTINGS_FILE="app/admin/views/pmdsettings/index.blade.php"

log(){ printf '\n[PMD V18.23 / ANDROID 0.3.23 POINTER ONLY] %s\n' "$*"; }
fail(){ printf '\n[PMD V18.23][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"
[[ -f "$PMD_ROOT/$SETTINGS_FILE" ]] || fail "Settings file missing: $SETTINGS_FILE"

for cmd in git curl sha256sum tar stat grep awk tr sed cp mv mkdir chmod chown php; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching pinned Android source..."
"${GIT[@]}" fetch --prune origin main feature/android-local-first-v1
"${GIT[@]}" cat-file -e "${ANDROID_SOURCE_COMMIT}^{commit}" 2>/dev/null ||
  fail "Android source commit unavailable: $ANDROID_SOURCE_COMMIT"

git_show_contains() {
  local path="$1" needle="$2"
  grep -Fq "$needle" < <("${GIT[@]}" show "$ANDROID_SOURCE_COMMIT:$path")
}

log "Validating Android 0.3.23 preserves the offline-complete contract..."
git_show_contains "mobile/android/app/build.gradle.kts" "versionCode = 36" ||
  fail "Android versionCode 36 missing."
git_show_contains "mobile/android/app/build.gradle.kts" 'versionName = "0.3.23-v97-portrait-xl"' ||
  fail "Android 0.3.23 V97 identity missing."
git_show_contains "mobile/android/app/build.gradle.kts" "PMD_ANDROID_0_3_20_OFFLINE_COMPLETE_V23" ||
  fail "Offline-complete baseline marker was not preserved."
git_show_contains "mobile/android/app/src/main/java/com/paymydine/mobile/LocalPosBridge.kt" "PMD_ANDROID_PROVISIONAL_ITEM_MUTATION_V23" ||
  fail "Offline provisional item mutation missing."
git_show_contains "mobile/android/app/src/main/java/com/paymydine/mobile/LocalPosBridge.kt" "PMD_ANDROID_LOCAL_TABLE_OCCUPIED_V23" ||
  fail "Offline local table projection missing."
git_show_contains "mobile/android/app/src/main/java/com/paymydine/mobile/data/local/LocalPosRepository.kt" "PMD_ANDROID_PROVISIONAL_ORDER_EDIT_V23" ||
  fail "Offline provisional order editing missing."
git_show_contains "mobile/android/app/src/main/java/com/paymydine/mobile/data/local/BootstrapRepository.kt" "PMD_ANDROID_NON_DESTRUCTIVE_RECONNECT_SNAPSHOT_V23" ||
  fail "Non-destructive reconnect snapshot missing."
git_show_contains "app/admin/assets/js/pmd-quick-pos-v1.js" "PMD_QPOS_NATIVE_PROVISIONAL_CHECK_IDS_V93" ||
  fail "Negative local check support missing."
git_show_contains "app/admin/assets/js/pmd-quick-pos-v1.js" "PMD_QPOS_NATIVE_DURABLE_MUTATIONS_V92" ||
  fail "Durable local mutation path missing."
git_show_contains "app/admin/assets/js/pmd-quick-pos-v1.js" "PMD_QPOS_REQUEST_FAILOVER_V91" ||
  fail "WAN request failover missing."
git_show_contains "app/admin/assets/css/pmd-quick-pos-v1.css" "PMD_QPOS_PORTRAIT_XL_TOUCH_V97" ||
  fail "V97 portrait XL UI marker missing."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="$PMD_ROOT/storage/pmd-v1823-android-0323-$STAMP"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/android-v1823-0323-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-v1823-0323-before-$STAMP.txt"
WEB_DIR="$PMD_ROOT/downloads/paymydine"
WEB_APK="$WEB_DIR/$APK_PUBLIC"
WEB_SHA="$WEB_APK.sha256"

mkdir -p "$STAGE" "$BACKUP_DIR"

log "Downloading checksum-pinned Android 0.3.23..."
curl -fL --retry 3 --retry-delay 2 "$APK_URL" -o "$STAGE/$APK_RELEASE"
curl -fL --retry 3 --retry-delay 2 "$APK_SHA_URL" -o "$STAGE/$APK_RELEASE.sha256"

ACTUAL_APK_SHA256="$(sha256sum "$STAGE/$APK_RELEASE" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
SIDE_APK_SHA256="$(awk 'NF {print $1; exit}' "$STAGE/$APK_RELEASE.sha256" | tr '[:upper:]' '[:lower:]')"

[[ "$ACTUAL_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] ||
  fail "APK checksum mismatch: expected=$EXPECTED_APK_SHA256 actual=$ACTUAL_APK_SHA256"
[[ "$SIDE_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] ||
  fail "Release checksum sidecar mismatch."

log "APK verified: $ACTUAL_APK_SHA256"

BACKUP_FILES=("$SETTINGS_FILE")
[[ -f "$WEB_APK" ]] && BACKUP_FILES+=("${WEB_APK#$PMD_ROOT/}")
[[ -f "$WEB_SHA" ]] && BACKUP_FILES+=("${WEB_SHA#$PMD_ROOT/}")
tar -czf "$BACKUP" "${BACKUP_FILES[@]}"

{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "checkout_head=$("${GIT[@]}" rev-parse HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "android_source=$ANDROID_SOURCE_COMMIT"
  echo "apk=$APK_PUBLIC"
  echo "apk_sha256=$ACTUAL_APK_SHA256"
} > "$META"

log "Preparing Settings pointer only; POS CSS/JS/PHP remain untouched..."
SETTINGS_CANDIDATE="$STAGE/pmdsettings-index.blade.php"
cp -f "$PMD_ROOT/$SETTINGS_FILE" "$SETTINGS_CANDIDATE"

grep -Eq 'PayMyDine-Android-0\.3\.[0-9]+\.apk' "$SETTINGS_CANDIDATE" ||
  fail "Android download pointer not found in live Settings."

sed -E -i   's/PayMyDine-Android-0\.3\.[0-9]+\.apk/PayMyDine-Android-0.3.23.apk/g'   "$SETTINGS_CANDIDATE"

if grep -Eq '(Operations Preview|Canonical Offline POS) 0\.3\.[0-9]+' "$SETTINGS_CANDIDATE"; then
  sed -E -i     's/(Operations Preview|Canonical Offline POS) 0\.3\.[0-9]+/Canonical Offline POS 0.3.23/g'     "$SETTINGS_CANDIDATE"
fi

grep -q "PayMyDine-Android-0.3.23.apk" "$SETTINGS_CANDIDATE" ||
  fail "Candidate Settings does not point to Android 0.3.23."
grep -q "Canonical Offline POS 0.3.23" "$SETTINGS_CANDIDATE" ||
  fail "Candidate Settings 0.3.23 label missing."

log "Installing Settings pointer and publishing APK..."
dst="$PMD_ROOT/$SETTINGS_FILE"
tmp="${dst}.pmd-v1823-new"
uid="$(stat -c '%u' "$dst")"
gid="$(stat -c '%g' "$dst")"
mode="$(stat -c '%a' "$dst")"

cp -f "$SETTINGS_CANDIDATE" "$tmp"
chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
chown "$uid:$gid" "$tmp" 2>/dev/null || true
mv -f "$tmp" "$dst"

mkdir -p "$WEB_DIR"
root_uid="$(stat -c '%u' "$PMD_ROOT")"
root_gid="$(stat -c '%g' "$PMD_ROOT")"

apk_tmp="$WEB_APK.pmd-v1823-new"
sha_tmp="$WEB_SHA.pmd-v1823-new"
cp -f "$STAGE/$APK_RELEASE" "$apk_tmp"
printf '%s  %s\n' "$ACTUAL_APK_SHA256" "$APK_PUBLIC" > "$sha_tmp"
chmod 0644 "$apk_tmp" "$sha_tmp"
chown "$root_uid:$root_gid" "$apk_tmp" "$sha_tmp" 2>/dev/null || true
mv -f "$apk_tmp" "$WEB_APK"
mv -f "$sha_tmp" "$WEB_SHA"

FINAL_SHA="$(sha256sum "$WEB_APK" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
[[ "$FINAL_SHA" == "$EXPECTED_APK_SHA256" ]] ||
  fail "Published APK checksum changed."

php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

log "Verification:"
grep -n "PayMyDine-Android-0.3.23.apk" "$PMD_ROOT/$SETTINGS_FILE" | head -1
grep -n "Canonical Offline POS 0.3.23" "$PMD_ROOT/$SETTINGS_FILE" | head -1
sha256sum "$WEB_APK"

cat <<EOF

=============================================================
PayMyDine V18.23 / Android 0.3.23 pointer update complete.

Changed:
  - Published PayMyDine-Android-0.3.23.apk
  - Settings download points to Android 0.3.23
  - Settings label shows Canonical Offline POS 0.3.23

Untouched:
  - Quick POS CSS
  - Quick POS JS
  - Mobile sync PHP
  - Database
  - Pairing
  - Android app data

Verified Android:
  Source: $ANDROID_SOURCE_COMMIT
  APK: $APK_PUBLIC
  SHA-256: $FINAL_SHA

Offline-complete contract is preserved in Android 0.3.23.
Backup:
  $BACKUP
  $META
=============================================================
EOF
