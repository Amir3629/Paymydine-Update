#!/usr/bin/env bash
set -Eeuo pipefail

# PMD_ANDROID_V18_24_V101_RECONNECT_CASH_V2
# Permission-safe continuation for VPS deployments where live/backup paths
# are owned by root/www-data. Validation and merge preparation happen before
# any privileged live write.
PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"

PHP_BASE_COMMIT="${PHP_BASE_COMMIT:-2456d150e632be756a3b268acce3a37895bbf4ec}"
PHP_TARGET_COMMIT="${PHP_TARGET_COMMIT:-43ea8ba5f65d9d458a4ede0fe1a09c4a8ec78eaa}"
ANDROID_SOURCE_COMMIT="${ANDROID_SOURCE_COMMIT:-64d355374912e33fd0190318e5039f2124a8a818}"

APK_VERSION="0.3.27"
APK_RELEASE="PayMyDine-POS-Tablet-Preview-${APK_VERSION}.apk"
APK_PUBLIC="PayMyDine-Android-${APK_VERSION}.apk"
RELEASE_BASE="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview"
APK_URL="${RELEASE_BASE}/${APK_RELEASE}"
APK_SHA_URL="${APK_URL}.sha256"
EXPECTED_APK_SHA256="00c75088b3fed0aaa5e173e8ef9e4fce28940850695a6433d9133b96c41bee04"

COMMAND_FILE="app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"
SETTINGS_FILE="app/admin/views/pmdsettings/index.blade.php"

log(){ printf '\n[PMD V18.24 / ANDROID 0.3.27 / V101 V2] %s\n' "$*"; }
fail(){ printf '\n[PMD V18.24 V101 V2][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"
[[ -f "$PMD_ROOT/$COMMAND_FILE" ]] || fail "Mobile command processor missing."
[[ -f "$PMD_ROOT/$SETTINGS_FILE" ]] || fail "Settings file missing."

for cmd in git curl sha256sum tar stat grep awk tr sed cp mkdir dirname chmod php sudo install; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

sudo -n true || fail "Passwordless sudo is required for protected live/backup paths."

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "1/9 - Fetching pinned source refs"
"${GIT[@]}" fetch --prune origin main feature/android-local-first-v1

for ref in "$PHP_BASE_COMMIT" "$PHP_TARGET_COMMIT" "$ANDROID_SOURCE_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null ||
    fail "Required commit unavailable: $ref"
done

git_show_contains() {
  local ref="$1" path="$2" needle="$3"
  grep -Fq "$needle" < <("${GIT[@]}" show "$ref:$path")
}

log "2/9 - Validating Android 0.3.27 V101 source contract"
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/build.gradle.kts" "versionCode = 40" ||
  fail "Android versionCode 40 missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/build.gradle.kts" 'versionName = "0.3.27-v101-reconnect-cash"' ||
  fail "Android V101 versionName missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/PosActivity.kt" "PMD_ANDROID_NORMAL_PAGE_SCALE_V100" ||
  fail "V100 natural WebView scale marker missing from V101 APK source."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/PosActivity.kt" "textZoom = 100" ||
  fail "V100 textZoom=100 guard missing from V101 APK source."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/PosActivity.kt" "setInitialScale(0)" ||
  fail "V100 natural initial-scale guard missing from V101 APK source."
git_show_contains "$ANDROID_SOURCE_COMMIT" "app/admin/assets/css/pmd-quick-pos-v1.css" "PMD_QPOS_MOBILE_NORMAL_BUTTONS_V100" ||
  fail "V100 mobile normal-button CSS missing from V101 APK source."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/data/local/BootstrapRepository.kt" "PMD_ANDROID_NON_DESTRUCTIVE_RECONNECT_UNION_V101" ||
  fail "Reconnect union V101 marker missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/data/local/OfflineImageCache.kt" "PMD_ANDROID_IMAGE_CACHE_PRESERVE_PARTIAL_REFRESH_V101" ||
  fail "Image-cache preservation V101 marker missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/data/local/LocalPosRepository.kt" "PMD_ANDROID_CASH_REBIND_AFTER_ORDER_ACK_V101" ||
  fail "Cash rebind V101 marker missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/sync/SyncEngine.kt" "PMD_ANDROID_DEPENDENT_COMMAND_RELOAD_V101" ||
  fail "Dependent-command reload V101 marker missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "app/Services/PmdMobileSync/PmdMobileCommandProcessor.php" "PMD_MOBILE_CASH_LOCAL_AGGREGATE_RESOLVE_V101" ||
  fail "Server cash fallback V101 marker missing."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v1824-v101-v2-${STAMP}"
CONFLICT="/tmp/pmd-v1824-v101-conflict-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/android-v1824-0327-v101-v2-before-${STAMP}.tar.gz"
META="$BACKUP_DIR/android-v1824-0327-v101-v2-before-${STAMP}.txt"
META_TMP="$STAGE/deploy-meta.txt"
WEB_DIR="$PMD_ROOT/downloads/paymydine"
WEB_APK="$WEB_DIR/$APK_PUBLIC"
WEB_SHA="$WEB_APK.sha256"

mkdir -p   "$STAGE/base/$(dirname "$COMMAND_FILE")"   "$STAGE/target/$(dirname "$COMMAND_FILE")"   "$STAGE/candidate/$(dirname "$COMMAND_FILE")"   "$STAGE/candidate/$(dirname "$SETTINGS_FILE")"   "$CONFLICT/$(dirname "$COMMAND_FILE")"
trap 'rm -rf "$STAGE" "$CONFLICT"' EXIT

log "3/9 - Downloading checksum-pinned Android 0.3.27"
curl -fL --retry 3 --retry-delay 2 "$APK_URL" -o "$STAGE/$APK_RELEASE"
curl -fL --retry 3 --retry-delay 2 "$APK_SHA_URL" -o "$STAGE/$APK_RELEASE.sha256"

ACTUAL_APK_SHA256="$(sha256sum "$STAGE/$APK_RELEASE" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
SIDE_APK_SHA256="$(awk 'NF {print $1; exit}' "$STAGE/$APK_RELEASE.sha256" | tr '[:upper:]' '[:lower:]')"

[[ "$ACTUAL_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] ||
  fail "APK checksum mismatch: expected=$EXPECTED_APK_SHA256 actual=$ACTUAL_APK_SHA256"
[[ "$SIDE_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] ||
  fail "Release checksum sidecar mismatch."
echo "APK VERIFIED: $ACTUAL_APK_SHA256"

log "4/9 - Preparing protected V23 -> V101 Cash server candidate"
COMMAND_CANDIDATE="$STAGE/candidate/$COMMAND_FILE"

if grep -q "PMD_MOBILE_CASH_LOCAL_AGGREGATE_RESOLVE_V101" "$PMD_ROOT/$COMMAND_FILE"; then
  cp -f "$PMD_ROOT/$COMMAND_FILE" "$COMMAND_CANDIDATE"
  echo "LIVE V101 CASH: ALREADY PRESENT / PRESERVED"
else
  "${GIT[@]}" show "$PHP_BASE_COMMIT:$COMMAND_FILE" > "$STAGE/base/$COMMAND_FILE" ||
    fail "V23 PHP base unavailable."
  "${GIT[@]}" show "$PHP_TARGET_COMMIT:$COMMAND_FILE" > "$STAGE/target/$COMMAND_FILE" ||
    fail "V101 PHP target unavailable."

  set +e
  git merge-file -p --diff3     -L "LIVE:$COMMAND_FILE"     -L "V23_BASE:$COMMAND_FILE"     -L "V101_TARGET:$COMMAND_FILE"     "$PMD_ROOT/$COMMAND_FILE"     "$STAGE/base/$COMMAND_FILE"     "$STAGE/target/$COMMAND_FILE"     > "$COMMAND_CANDIDATE"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] ||
     grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$COMMAND_CANDIDATE"; then
    fail "Cash PHP protected merge conflict. Nothing installed. Candidate retained until script exit: $COMMAND_CANDIDATE"
  fi
fi

log "5/9 - Preparing Settings pointer for Android 0.3.27"
SETTINGS_CANDIDATE="$STAGE/candidate/$SETTINGS_FILE"
cp -f "$PMD_ROOT/$SETTINGS_FILE" "$SETTINGS_CANDIDATE"

grep -Eq 'PayMyDine-Android-0\.3\.[0-9]+\.apk' "$SETTINGS_CANDIDATE" ||
  fail "Android download pointer not found in live Settings."

sed -E -i   's/PayMyDine-Android-0\.3\.[0-9]+\.apk/PayMyDine-Android-0.3.27.apk/g'   "$SETTINGS_CANDIDATE"

if grep -Eq '(Operations Preview|Canonical Offline POS) 0\.3\.[0-9]+' "$SETTINGS_CANDIDATE"; then
  sed -E -i     's/(Operations Preview|Canonical Offline POS) 0\.3\.[0-9]+/Canonical Offline POS 0.3.27/g'     "$SETTINGS_CANDIDATE"
fi

log "6/9 - Validating ALL candidates before any live write"
grep -q "PMD_MOBILE_OFFLINE_CASH_PAYMENT_V17" "$COMMAND_CANDIDATE" ||
  fail "Existing offline Cash contract missing."
grep -q "PMD_MOBILE_OFFLINE_ORIGINAL_TIME_V23" "$COMMAND_CANDIDATE" ||
  fail "Existing offline order-time V23 contract missing."
grep -q "PMD_MOBILE_OFFLINE_PAYMENT_TIME_V18" "$COMMAND_CANDIDATE" ||
  fail "Existing offline payment-time contract missing."
grep -q "PMD_MOBILE_CASH_LOCAL_AGGREGATE_RESOLVE_V101" "$COMMAND_CANDIDATE" ||
  fail "V101 legacy Cash aggregate resolution missing."
grep -q "resolveCanonicalCashOrderId" "$COMMAND_CANDIDATE" ||
  fail "V101 canonical Cash resolver missing."
grep -q "PayMyDine-Android-0.3.27.apk" "$SETTINGS_CANDIDATE" ||
  fail "Settings does not point to Android 0.3.27."
grep -q "Canonical Offline POS 0.3.27" "$SETTINGS_CANDIDATE" ||
  fail "Settings 0.3.27 label missing."
php -l "$COMMAND_CANDIDATE" >/dev/null ||
  fail "V101 command processor PHP syntax failed."
echo "CANDIDATES: PASS"

log "7/9 - Creating permission-safe backup"
sudo mkdir -p "$BACKUP_DIR"

BACKUP_FILES=("$COMMAND_FILE" "$SETTINGS_FILE")
[[ -f "$WEB_APK" ]] && BACKUP_FILES+=("${WEB_APK#$PMD_ROOT/}")
[[ -f "$WEB_SHA" ]] && BACKUP_FILES+=("${WEB_SHA#$PMD_ROOT/}")

(
  cd "$PMD_ROOT"
  sudo tar -czf "$BACKUP" "${BACKUP_FILES[@]}"
)

{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "checkout_head=$("${GIT[@]}" rev-parse HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "php_base=$PHP_BASE_COMMIT"
  echo "php_target=$PHP_TARGET_COMMIT"
  echo "android_source=$ANDROID_SOURCE_COMMIT"
  echo "apk=$APK_PUBLIC"
  echo "apk_sha256=$ACTUAL_APK_SHA256"
  echo
  "${GIT[@]}" status --short -- "$COMMAND_FILE" "$SETTINGS_FILE" || true
} > "$META_TMP"
sudo install -m 0644 "$META_TMP" "$META"

[[ -s "$BACKUP" ]] || fail "Backup archive was not created."
[[ -s "$META" ]] || fail "Backup metadata was not created."
echo "BACKUP: $BACKUP"

log "8/9 - Installing validated server files and publishing APK"
for rel in "$COMMAND_FILE" "$SETTINGS_FILE"; do
  src="$STAGE/candidate/$rel"
  dst="$PMD_ROOT/$rel"
  mode="$(stat -c '%a' "$dst")"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"

  sudo install -m "$mode" -o "$uid" -g "$gid" "$src" "$dst"
  echo "UPDATED: $rel"
done

sudo mkdir -p "$WEB_DIR"
web_uid="$(stat -c '%u' "$WEB_DIR")"
web_gid="$(stat -c '%g' "$WEB_DIR")"

sudo install -m 0644 -o "$web_uid" -g "$web_gid" "$STAGE/$APK_RELEASE" "$WEB_APK"
printf '%s  %s\n' "$ACTUAL_APK_SHA256" "$APK_PUBLIC" > "$STAGE/$APK_PUBLIC.sha256"
sudo install -m 0644 -o "$web_uid" -g "$web_gid" "$STAGE/$APK_PUBLIC.sha256" "$WEB_SHA"

FINAL_SHA="$(sha256sum "$WEB_APK" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
[[ "$FINAL_SHA" == "$EXPECTED_APK_SHA256" ]] ||
  fail "Published APK checksum changed."
echo "APK PUBLISHED: $WEB_APK"

log "9/9 - Clearing caches and final verification"
cd "$PMD_ROOT"
sudo -u www-data php artisan route:clear >/dev/null 2>&1 || php artisan route:clear >/dev/null 2>&1 || true
sudo -u www-data php artisan view:clear >/dev/null 2>&1 || php artisan view:clear >/dev/null 2>&1 || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1 || php artisan cache:clear >/dev/null 2>&1 || true
sudo -u www-data php artisan optimize:clear >/dev/null 2>&1 || php artisan optimize:clear >/dev/null 2>&1 || true

if command -v systemctl >/dev/null 2>&1 &&
   systemctl is-active --quiet php8.3-fpm.service; then
  sudo systemctl reload php8.3-fpm.service
  echo "PHP-FPM: RELOADED"
fi

grep -q "PMD_MOBILE_CASH_LOCAL_AGGREGATE_RESOLVE_V101" "$PMD_ROOT/$COMMAND_FILE"
grep -q "PayMyDine-Android-0.3.27.apk" "$PMD_ROOT/$SETTINGS_FILE"
grep -q "Canonical Offline POS 0.3.27" "$PMD_ROOT/$SETTINGS_FILE"
[[ "$(sha256sum "$WEB_APK" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')" == "$EXPECTED_APK_SHA256" ]]

cat <<EOF

=============================================================
 PAYMYDINE V101 + ANDROID 0.3.27 V2 COMPLETE
=============================================================
Permission-safe deployment:
  Backup directory/write      = SUDO-SAFE
  Live server file install    = SUDO-SAFE
  APK/checksum publication    = SUDO-SAFE
  Cache/PHP-FPM maintenance   = SUDO-SAFE

Existing V100 web UI:
  Already installed earlier   = PRESERVED
  Normal mobile buttons       = PRESERVED
  Food names/prices           = PRESERVED

Android:
  Version                     = 0.3.27-v101-reconnect-cash
  Version Code                = 40
  V100 natural WebView scale  = INCLUDED
  textZoom                    = 100
  initial scale               = NATURAL
  V101 reconnect fixes        = INCLUDED
  V101 cash reconciliation    = INCLUDED

APK:
  $APK_PUBLIC
  SHA256:
  $FINAL_SHA

Backup:
  $BACKUP
  $META
=============================================================
EOF
