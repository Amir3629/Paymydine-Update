#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"

WEB_COMMIT="502651e590ebd06d63ef0ddb38ac26b7554d1b2c"
SETTINGS_COMMIT="d12ded857636152ad7b180c7c95fb1e8a5a493f8"
ANDROID_COMMIT="bb39cb0af393e4aff0a64a6111acc4f06e63bb3e"

APK_VERSION="0.3.26"
APK_RELEASE="PayMyDine-POS-Tablet-Preview-${APK_VERSION}.apk"
APK_PUBLIC="PayMyDine-Android-${APK_VERSION}.apk"
RELEASE_BASE="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview"
APK_URL="${RELEASE_BASE}/${APK_RELEASE}"
SHA_URL="${APK_URL}.sha256"
EXPECTED_SHA256="675558560afeb98dfd3c32fea5e49562f6a1faf388f36b467731fdeffe29d32d"

CSS_REL="app/admin/assets/css/pmd-quick-pos-v1.css"
VIEW_REL="app/admin/views/pmd_quick_pos_v1.blade.php"
SETTINGS_REL="app/admin/views/pmdsettings/index.blade.php"

LIVE_FILES=(
  "$CSS_REL"
  "$VIEW_REL"
  "$SETTINGS_REL"
)

WEB_DIR="${PMD_ROOT}/downloads/paymydine"
WEB_APK="${WEB_DIR}/${APK_PUBLIC}"
WEB_SHA="${WEB_APK}.sha256"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v100-0326-v2-${STAMP}"
BACKUP_DIR="${PMD_ROOT}/storage/pmd-deploy-backups"
BACKUP="${BACKUP_DIR}/v100-android-0326-v2-before-${STAMP}.tar.gz"

log(){ printf '\n[PayMyDine V100 / Android 0.3.26 V2] %s\n' "$*"; }
fail(){ printf '\n[ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "${PMD_ROOT}/.git" ]] || fail "Not a git checkout: ${PMD_ROOT}"
[[ -f "${PMD_ROOT}/artisan" ]] || fail "artisan missing"

for cmd in git curl tar stat grep install php sha256sum awk dirname mkdir; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Required command missing: $cmd"
done

sudo -n true
mkdir -p "$STAGE"
trap 'rm -rf "$STAGE"' EXIT

GIT=(git -c "safe.directory=${PMD_ROOT}" -C "${PMD_ROOT}")

stage_git_file() {
  local commit="$1"
  local rel="$2"
  local target="$STAGE/web/$rel"
  mkdir -p "$(dirname "$target")"
  "${GIT[@]}" show "${commit}:${rel}" > "$target"
  [[ -s "$target" ]] || fail "Staged file is empty: $rel"
}

echo "============================================================"
echo " PayMyDine V100 + Android 0.3.26 V2"
echo " Web commit      : $WEB_COMMIT"
echo " Settings commit : $SETTINGS_COMMIT"
echo " Android commit  : $ANDROID_COMMIT"
echo "============================================================"

log "1/8 - Fetching exact GitHub commits"
"${GIT[@]}" fetch origin main
"${GIT[@]}" fetch origin feature/android-local-first-v1
"${GIT[@]}" cat-file -e "${WEB_COMMIT}^{commit}" || fail "V100 web commit unavailable"
"${GIT[@]}" cat-file -e "${SETTINGS_COMMIT}^{commit}" || fail "Settings commit unavailable"
"${GIT[@]}" cat-file -e "${ANDROID_COMMIT}^{commit}" || fail "Android commit unavailable"
echo "COMMITS: PASS"

log "2/8 - Staging exact V100 files with parent-directory safety"
stage_git_file "$WEB_COMMIT" "$CSS_REL"
stage_git_file "$WEB_COMMIT" "$VIEW_REL"
stage_git_file "$SETTINGS_COMMIT" "$SETTINGS_REL"

CSS="$STAGE/web/$CSS_REL"
VIEW="$STAGE/web/$VIEW_REL"
SETTINGS="$STAGE/web/$SETTINGS_REL"

grep -q "PMD_QPOS_MOBILE_FIT_READABLE_V98" "$CSS" || fail "V98 fit baseline missing"
grep -q "PMD_QPOS_MOBILE_BALANCED_V99" "$CSS" || fail "V99 balance baseline missing"
grep -q "PMD_QPOS_MOBILE_NORMAL_BUTTONS_V100" "$CSS" || fail "V100 normal-button marker missing"
grep -q "pmd-quick-pos-v1.css?v=20260924-v100" "$VIEW" || fail "V100 CSS cache bust missing"
grep -q "PayMyDine-Android-0.3.26.apk" "$SETTINGS" || fail "Settings 0.3.26 link missing"
grep -q "Canonical Offline POS 0.3.26" "$SETTINGS" || fail "Settings 0.3.26 label missing"
echo "STAGING: PASS"

log "3/8 - Verifying Android 0.3.26 source"
GRADLE_TMP="$STAGE/build.gradle.kts"
POS_TMP="$STAGE/PosActivity.kt"

"${GIT[@]}" show "${ANDROID_COMMIT}:mobile/android/app/build.gradle.kts" > "$GRADLE_TMP"
"${GIT[@]}" show "${ANDROID_COMMIT}:mobile/android/app/src/main/java/com/paymydine/mobile/PosActivity.kt" > "$POS_TMP"

grep -q "versionCode = 39" "$GRADLE_TMP" || fail "Android versionCode 39 missing"
grep -q 'versionName = "0.3.26-v100-normal-mobile"' "$GRADLE_TMP" || fail "Android V100 versionName missing"
grep -q "PMD_ANDROID_0_3_26_NORMAL_BUTTONS_V100" "$GRADLE_TMP" || fail "Android V100 marker missing"
grep -q "PMD_ANDROID_NORMAL_PAGE_SCALE_V100" "$POS_TMP" || fail "Android page-scale marker missing"
[[ "$(grep -c 'textZoom = 100' "$POS_TMP")" -eq 2 ]] || fail "Expected two WebView textZoom=100 guards"
[[ "$(grep -c 'setInitialScale(0)' "$POS_TMP")" -eq 2 ]] || fail "Expected two natural initial-scale guards"
echo "ANDROID SOURCE: PASS"

log "4/8 - Downloading signed Android 0.3.26"
curl -fL --retry 3 --retry-delay 2 "$APK_URL" -o "$STAGE/$APK_RELEASE"
curl -fL --retry 3 --retry-delay 2 "$SHA_URL" -o "$STAGE/$APK_RELEASE.sha256"

ACTUAL_SHA256="$(sha256sum "$STAGE/$APK_RELEASE" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
SIDE_SHA256="$(awk 'NF {print $1; exit}' "$STAGE/$APK_RELEASE.sha256" | tr '[:upper:]' '[:lower:]')"

echo "APK SHA256: $ACTUAL_SHA256"
[[ "$ACTUAL_SHA256" == "$EXPECTED_SHA256" ]] || fail "APK checksum mismatch"
[[ "$SIDE_SHA256" == "$EXPECTED_SHA256" ]] || fail "Release checksum mismatch"
echo "APK CHECKSUM: PASS"

log "5/8 - Creating backup"
sudo mkdir -p "$BACKUP_DIR"
BACKUP_FILES=()
for rel in "${LIVE_FILES[@]}"; do
  [[ -f "${PMD_ROOT}/$rel" ]] && BACKUP_FILES+=("$rel")
done

for old in   "downloads/paymydine/PayMyDine-Android-0.3.23.apk"   "downloads/paymydine/PayMyDine-Android-0.3.23.apk.sha256"   "downloads/paymydine/PayMyDine-Android-0.3.24.apk"   "downloads/paymydine/PayMyDine-Android-0.3.24.apk.sha256"   "downloads/paymydine/PayMyDine-Android-0.3.25.apk"   "downloads/paymydine/PayMyDine-Android-0.3.25.apk.sha256"   "downloads/paymydine/PayMyDine-Android-0.3.26.apk"   "downloads/paymydine/PayMyDine-Android-0.3.26.apk.sha256"; do
  [[ -f "${PMD_ROOT}/$old" ]] && BACKUP_FILES+=("$old")
done

if [[ "${#BACKUP_FILES[@]}" -gt 0 ]]; then
  (
    cd "$PMD_ROOT"
    sudo tar -czf "$BACKUP" "${BACKUP_FILES[@]}"
  )
  echo "BACKUP: $BACKUP"
else
  echo "BACKUP: no existing target files"
fi

log "6/8 - Installing ONLY exact V100 presentation/settings files"
for rel in "${LIVE_FILES[@]}"; do
  src="$STAGE/web/$rel"
  dst="${PMD_ROOT}/$rel"
  mkdir -p "$(dirname "$dst")"

  if [[ -e "$dst" ]]; then
    mode="$(stat -c '%a' "$dst")"
    uid="$(stat -c '%u' "$dst")"
    gid="$(stat -c '%g' "$dst")"
    sudo install -m "$mode" -o "$uid" -g "$gid" "$src" "$dst"
  else
    sudo install -m 0644 "$src" "$dst"
  fi
  echo "UPDATED: $rel"
done

log "7/8 - Publishing Android 0.3.26"
sudo mkdir -p "$WEB_DIR"
sudo install -m 0644 "$STAGE/$APK_RELEASE" "$WEB_APK"
printf '%s  %s\n' "$EXPECTED_SHA256" "$APK_PUBLIC" | sudo tee "$WEB_SHA" >/dev/null

FINAL_SHA="$(sha256sum "$WEB_APK" | awk '{print $1}')"
[[ "$FINAL_SHA" == "$EXPECTED_SHA256" ]] || fail "Published APK checksum mismatch"
echo "APK PUBLISHED: $WEB_APK"

log "8/8 - Clearing views and final verification"
cd "$PMD_ROOT"
sudo -u www-data php artisan view:clear >/dev/null 2>&1 || php artisan view:clear >/dev/null 2>&1 || true

grep -q "PMD_QPOS_MOBILE_NORMAL_BUTTONS_V100" "$CSS_REL"
grep -q "pmd-quick-pos-v1.css?v=20260924-v100" "$VIEW_REL"
grep -q "PayMyDine-Android-0.3.26.apk" "$SETTINGS_REL"
[[ "$(sha256sum "$WEB_APK" | awk '{print $1}')" == "$EXPECTED_SHA256" ]]

echo
echo "============================================================"
echo " PAYMYDINE V100 + ANDROID 0.3.26 V2 COMPLETE"
echo "============================================================"
echo "Staging parent dirs          = FIXED"
echo "V101 server sync file        = NOT TOUCHED"
echo "Natural browser scale        = PRESERVED"
echo "Normal mobile controls       = V100"
echo "Food names / prices          = V99 READABILITY PRESERVED"
echo "Android version              = 0.3.26-v100-normal-mobile"
echo "Android versionCode          = 39"
echo "WebView textZoom             = 100"
echo "WebView initial scale        = NATURAL"
echo "APK                          = $APK_PUBLIC"
echo "SHA256                       = $FINAL_SHA"
echo "============================================================"
