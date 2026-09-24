#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"

WEB_COMMIT="f036955a0ef31300250cbaf25bd6893746bfc556"
ANDROID_COMMIT="53320eda20ce886802c26cbb536c6a808f785ab9"

APK_VERSION="0.3.20"
APK_RELEASE="PayMyDine-POS-Tablet-Preview-${APK_VERSION}.apk"
APK_PUBLIC="PayMyDine-Android-${APK_VERSION}.apk"

RELEASE_BASE="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview"
APK_URL="${RELEASE_BASE}/${APK_RELEASE}"
SHA_URL="${APK_URL}.sha256"

EXPECTED_SHA256="ec9fed9224ee8206c40c57381f9c56b424f5fd9303acd0a7e739485181176e9b"

LIVE_FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/views/pmdsettings/index.blade.php"
  "app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
  "app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"
)

WEB_DIR="${PMD_ROOT}/downloads/paymydine"
WEB_APK="${WEB_DIR}/${APK_PUBLIC}"
WEB_SHA="${WEB_APK}.sha256"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v94-0320-${STAMP}"
BACKUP_DIR="${PMD_ROOT}/storage/pmd-deploy-backups"
BACKUP="${BACKUP_DIR}/v94-android-0320-before-${STAMP}.tar.gz"

log() {
  printf '\n[PayMyDine V94 / Android 0.3.20] %s\n' "$*"
}

fail() {
  printf '\n[ERROR] %s\n' "$*" >&2
  exit 1
}

[[ -d "${PMD_ROOT}/.git" ]] || fail "Not a Git checkout: ${PMD_ROOT}"
[[ -f "${PMD_ROOT}/artisan" ]] || fail "artisan missing: ${PMD_ROOT}/artisan"

for cmd in git curl sha256sum tar stat grep awk tr install php; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Required command missing: $cmd"
done

sudo -n true
mkdir -p "$STAGE/web" "$STAGE/android"
trap 'rm -rf "$STAGE"' EXIT

GIT=(git -c "safe.directory=${PMD_ROOT}" -C "${PMD_ROOT}")

echo "============================================================"
echo " PayMyDine V94 + Android 0.3.20"
echo " Web commit     : ${WEB_COMMIT}"
echo " Android commit : ${ANDROID_COMMIT}"
echo "============================================================"

log "1/9 - Fetching exact GitHub commits"

"${GIT[@]}" fetch origin main
"${GIT[@]}" fetch origin feature/android-local-first-v1

"${GIT[@]}" cat-file -e "${WEB_COMMIT}^{commit}" ||
  fail "Web commit is unavailable"

"${GIT[@]}" cat-file -e "${ANDROID_COMMIT}^{commit}" ||
  fail "Android commit is unavailable"

echo "COMMITS: PASS"

log "2/9 - Staging exact live V94 files"

for rel in "${LIVE_FILES[@]}"; do
  mkdir -p "$STAGE/web/$(dirname "$rel")"
  "${GIT[@]}" show "${WEB_COMMIT}:${rel}" > "$STAGE/web/$rel"
done

grep -q "PMD_QPOS_MOBILE_TOUCH_HISTORY_V93"   "$STAGE/web/app/admin/assets/css/pmd-quick-pos-v1.css" ||
  fail "Mobile V93 CSS marker missing"

grep -q "PMD_QPOS_FLOATING_CART_MODAL_SAFETY_V94"   "$STAGE/web/app/admin/assets/css/pmd-quick-pos-v1.css" ||
  fail "Floating-cart V94 marker missing"

grep -q "PMD_QPOS_HISTORY_TABLE_WORKSPACE_V93"   "$STAGE/web/app/admin/assets/js/pmd-quick-pos-v1.js" ||
  fail "History table workspace marker missing"

grep -q "PMD_QPOS_REQUEST_FAILOVER_V91"   "$STAGE/web/app/admin/assets/js/pmd-quick-pos-v1.js" ||
  fail "V91 request failover marker missing"

grep -q "pmd-quick-pos-v1.css?v=20260924-v94"   "$STAGE/web/app/admin/views/pmd_quick_pos_v1.blade.php" ||
  fail "V94 CSS cache bust missing"

grep -q "pmd-quick-pos-v1.js?v=20260924-v94"   "$STAGE/web/app/admin/views/pmd_quick_pos_v1.blade.php" ||
  fail "V94 JS cache bust missing"

grep -q "PayMyDine-Android-0.3.20.apk"   "$STAGE/web/app/admin/views/pmdsettings/index.blade.php" ||
  fail "Settings 0.3.20 link missing"

grep -q "PMD_MOBILE_OFFLINE_CASH_CAPABILITY_V23"   "$STAGE/web/app/Services/PmdMobileSync/PmdMobileBootstrapService.php" ||
  fail "V23 offline cash capability missing"

grep -q "PMD_MOBILE_OFFLINE_ORIGINAL_TIME_V23"   "$STAGE/web/app/Services/PmdMobileSync/PmdMobileCommandProcessor.php" ||
  fail "V23 business-time authority missing"

php -l "$STAGE/web/app/Services/PmdMobileSync/PmdMobileBootstrapService.php" >/dev/null
php -l "$STAGE/web/app/Services/PmdMobileSync/PmdMobileCommandProcessor.php" >/dev/null

echo "LIVE V94 FILES: PASS"

log "3/9 - Verifying exact Android 0.3.20 source without pipefail pipelines"

"${GIT[@]}" show   "${ANDROID_COMMIT}:mobile/android/app/build.gradle.kts"   > "$STAGE/android/build.gradle.kts"

"${GIT[@]}" show   "${ANDROID_COMMIT}:app/admin/assets/css/pmd-quick-pos-v1.css"   > "$STAGE/android/pmd-quick-pos-v1.css"

"${GIT[@]}" show   "${ANDROID_COMMIT}:app/admin/assets/js/pmd-quick-pos-v1.js"   > "$STAGE/android/pmd-quick-pos-v1.js"

grep -q 'versionCode = 33'   "$STAGE/android/build.gradle.kts" ||
  fail "Android versionCode 33 missing"

grep -q 'versionName = "0.3.20-v94-mobile-ui"'   "$STAGE/android/build.gradle.kts" ||
  fail "Android versionName 0.3.20 missing"

grep -q "PMD_ANDROID_0_3_20_OFFLINE_COMPLETE_V23"   "$STAGE/android/build.gradle.kts" ||
  fail "Android offline-complete V23 marker missing"

grep -q "PMD_QPOS_MOBILE_TOUCH_HISTORY_V93"   "$STAGE/android/pmd-quick-pos-v1.css" ||
  fail "Bundled mobile UI marker missing"

grep -q "PMD_QPOS_FLOATING_CART_MODAL_SAFETY_V94"   "$STAGE/android/pmd-quick-pos-v1.css" ||
  fail "Bundled floating-cart safety marker missing"

grep -q "PMD_QPOS_HISTORY_TABLE_WORKSPACE_V93"   "$STAGE/android/pmd-quick-pos-v1.js" ||
  fail "Bundled History table workspace marker missing"

grep -q "PMD_QPOS_NATIVE_PROVISIONAL_CHECK_IDS_V93"   "$STAGE/android/pmd-quick-pos-v1.js" ||
  fail "Bundled provisional check marker missing"

grep -q "PMD_QPOS_TERMINAL_SAFE_FAILOVER_V92"   "$STAGE/android/pmd-quick-pos-v1.js" ||
  fail "Bundled terminal-safe failover marker missing"

echo "ANDROID SOURCE: PASS"

log "4/9 - Downloading signed APK + checksum"

curl -fL --retry 3 --retry-delay 2   "$APK_URL"   -o "$STAGE/$APK_RELEASE"

curl -fL --retry 3 --retry-delay 2   "$SHA_URL"   -o "$STAGE/$APK_RELEASE.sha256"

ACTUAL_SHA256="$(
  sha256sum "$STAGE/$APK_RELEASE" |
  awk '{print $1}' |
  tr '[:upper:]' '[:lower:]'
)"

SIDE_SHA256="$(
  awk 'NF {print $1; exit}' "$STAGE/$APK_RELEASE.sha256" |
  tr '[:upper:]' '[:lower:]'
)"

echo "APK SHA256: $ACTUAL_SHA256"

[[ "$ACTUAL_SHA256" == "$EXPECTED_SHA256" ]] ||
  fail "APK checksum mismatch"

[[ "$SIDE_SHA256" == "$EXPECTED_SHA256" ]] ||
  fail "Release sidecar checksum mismatch"

echo "APK CHECKSUM: PASS"

log "5/9 - Creating backup"

sudo mkdir -p "$BACKUP_DIR"

BACKUP_FILES=()

for rel in "${LIVE_FILES[@]}"; do
  [[ -f "${PMD_ROOT}/${rel}" ]] && BACKUP_FILES+=("$rel")
done

for old_version in 0.3.17 0.3.18 0.3.19 0.3.20; do
  for suffix in apk apk.sha256; do
    rel="downloads/paymydine/PayMyDine-Android-${old_version}.${suffix}"
    [[ -f "${PMD_ROOT}/${rel}" ]] && BACKUP_FILES+=("$rel")
  done
done

(
  cd "$PMD_ROOT"
  sudo tar -czf "$BACKUP" "${BACKUP_FILES[@]}"
)

echo "BACKUP: $BACKUP"

log "6/9 - Installing ONLY the exact V94 live files"

for rel in "${LIVE_FILES[@]}"; do
  SRC="$STAGE/web/$rel"
  DST="${PMD_ROOT}/$rel"

  FILE_MODE="$(stat -c '%a' "$DST")"
  FILE_OWNER_UID="$(stat -c '%u' "$DST")"
  FILE_OWNER_GID="$(stat -c '%g' "$DST")"

  sudo install     -m "$FILE_MODE"     -o "$FILE_OWNER_UID"     -g "$FILE_OWNER_GID"     "$SRC"     "$DST"

  echo "UPDATED: $rel"
done

log "7/9 - Publishing Android 0.3.20"

sudo mkdir -p "$WEB_DIR"

sudo install   -m 0644   "$STAGE/$APK_RELEASE"   "$WEB_APK"

printf '%s  %s\n' "$EXPECTED_SHA256" "$APK_PUBLIC" |
  sudo tee "$WEB_SHA" >/dev/null

FINAL_SHA="$(
  sha256sum "$WEB_APK" |
  awk '{print $1}' |
  tr '[:upper:]' '[:lower:]'
)"

[[ "$FINAL_SHA" == "$EXPECTED_SHA256" ]] ||
  fail "Published APK checksum mismatch"

echo "APK PUBLISHED: $WEB_APK"

log "8/9 - Clearing compiled views"

cd "$PMD_ROOT"

sudo -u www-data php artisan view:clear >/dev/null 2>&1 ||
  php artisan view:clear >/dev/null 2>&1 ||
  true

log "9/9 - Final live verification"

grep -q "PMD_QPOS_MOBILE_TOUCH_HISTORY_V93"   app/admin/assets/css/pmd-quick-pos-v1.css

grep -q "PMD_QPOS_FLOATING_CART_MODAL_SAFETY_V94"   app/admin/assets/css/pmd-quick-pos-v1.css

grep -q "PMD_QPOS_HISTORY_TABLE_WORKSPACE_V93"   app/admin/assets/js/pmd-quick-pos-v1.js

grep -q "pmd-quick-pos-v1.css?v=20260924-v94"   app/admin/views/pmd_quick_pos_v1.blade.php

grep -q "PayMyDine-Android-0.3.20.apk"   app/admin/views/pmdsettings/index.blade.php

grep -q "PMD_MOBILE_OFFLINE_CASH_CAPABILITY_V23"   app/Services/PmdMobileSync/PmdMobileBootstrapService.php

grep -q "PMD_MOBILE_OFFLINE_ORIGINAL_TIME_V23"   app/Services/PmdMobileSync/PmdMobileCommandProcessor.php

echo
echo "============================================================"
echo " PAYMYDINE V94 + ANDROID 0.3.20 UPDATE COMPLETE"
echo "============================================================"
echo
echo "Mobile POS:"
echo "  Floating total/cart bar       = FIXED / FOLLOWS SCROLL"
echo "  Tap total/cart bar            = SCROLLS TO CHECKOUT"
echo "  Cart hidden over workspaces   = YES"
echo "  Floor buttons                 = BIGGER"
echo "  Table buttons                 = BIGGER"
echo "  Category buttons              = BIGGER"
echo "  Food typography              = BIGGER"
echo "  Search / inputs               = BIGGER"
echo
echo "Mobile History:"
echo "  Tiny horizontal table rail    = REMOVED"
echo "  Floor tabs                    = SAME POS STYLE"
echo "  Pickup                        = FULL TABLE TILE"
echo "  Physical tables               = FULL STATUS-COLORED GRID"
echo "  Busy/payment/attention state  = VISIBLE"
echo "  All tables                    = AVAILABLE"
echo "  History browsing changes POS  = NO"
echo "  History buttons/fonts         = BIGGER"
echo
echo "Android:"
echo "  Version Code                  = 33"
echo "  Version                       = 0.3.20-v94-mobile-ui"
echo "  Offline-complete V23          = PRESERVED"
echo "  V92 terminal-safe failover    = PRESERVED"
echo "  APK                           = $APK_PUBLIC"
echo "  SHA256                        = $FINAL_SHA"
echo
echo "Updated live files:"
printf '  %s\n' "${LIVE_FILES[@]}"
echo "  $WEB_APK"
echo "  $WEB_SHA"
echo
echo "NOT touched:"
echo "  database schema"
echo "  payment provider configuration"
echo "  KDS UI"
echo "  Reservations UI"
echo
echo "Backup:"
echo "  $BACKUP"
echo "============================================================"
