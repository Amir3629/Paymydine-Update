#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"

WEB_COMMIT="e0130b49395d635b793170e5629678c4468b6e05"
SETTINGS_COMMIT="fc6370049615798e0321ecac755d9fdcc15b2007"
ANDROID_COMMIT="5e053451f22444a1ad21d0e812722524f070a65d"

APK_VERSION="0.3.28"
APK_RELEASE="PayMyDine-POS-Tablet-Preview-${APK_VERSION}.apk"
APK_PUBLIC="PayMyDine-Android-${APK_VERSION}.apk"
RELEASE_BASE="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview"
APK_URL="${RELEASE_BASE}/${APK_RELEASE}"
APK_SHA_URL="${APK_URL}.sha256"
EXPECTED_APK_SHA256="f9d8bebbef7071a4bbf03cca80307c08f349d08ca8663666cdcc9cd9eb3b14b0"

CSS_REL="app/admin/assets/css/pmd-quick-pos-v1.css"
JS_REL="app/admin/assets/js/pmd-quick-pos-v1.js"
VIEW_REL="app/admin/views/pmd_quick_pos_v1.blade.php"
SETTINGS_REL="app/admin/views/pmdsettings/index.blade.php"
LIVE_FILES=("$CSS_REL" "$JS_REL" "$VIEW_REL" "$SETTINGS_REL")

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v102-0328-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v102-android-0328-before-${STAMP}.tar.gz"
WEB_DIR="$PMD_ROOT/downloads/paymydine"
WEB_APK="$WEB_DIR/$APK_PUBLIC"
WEB_SHA="$WEB_APK.sha256"

log(){ printf '\n[PayMyDine V102 / Android 0.3.28] %s\n' "$*"; }
fail(){ printf '\n[PMD V102 ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing"

for cmd in git curl sha256sum tar stat grep awk tr install dirname mkdir php sudo; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

sudo -n true || fail "Passwordless sudo is required."

mkdir -p "$STAGE/web"
trap 'rm -rf "$STAGE"' EXIT
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

stage_git_file() {
  local commit="$1" rel="$2" target="$STAGE/web/$2"
  mkdir -p "$(dirname "$target")"
  "${GIT[@]}" show "${commit}:${rel}" > "$target"
  [[ -s "$target" ]] || fail "Staged file is empty: $rel"
}

echo "============================================================"
echo " PayMyDine V102 Responsive Matrix + Android 0.3.28"
echo " Web commit      : $WEB_COMMIT"
echo " Settings commit : $SETTINGS_COMMIT"
echo " Android commit  : $ANDROID_COMMIT"
echo "============================================================"

log "1/8 - Fetching exact source commits"
"${GIT[@]}" fetch origin main feature/android-local-first-v1
for ref in "$WEB_COMMIT" "$SETTINGS_COMMIT" "$ANDROID_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" || fail "Required commit unavailable: $ref"
done
echo "COMMITS: PASS"

log "2/8 - Staging and validating V102 web matrix"
stage_git_file "$WEB_COMMIT" "$CSS_REL"
stage_git_file "$WEB_COMMIT" "$JS_REL"
stage_git_file "$WEB_COMMIT" "$VIEW_REL"
stage_git_file "$SETTINGS_COMMIT" "$SETTINGS_REL"

CSS="$STAGE/web/$CSS_REL"
JS="$STAGE/web/$JS_REL"
VIEW="$STAGE/web/$VIEW_REL"
SETTINGS="$STAGE/web/$SETTINGS_REL"

grep -q "PMD_QPOS_PHONE_ONLY_SCOPE_V102" "$CSS" || fail "V102 phone-only scope missing"
grep -q "PMD_QPOS_RESPONSIVE_MATRIX_V102" "$CSS" || fail "V102 tablet matrix missing"
grep -q "@media (min-width: 600px) and (max-width: 1024px) and (orientation: portrait)" "$CSS" ||
  fail "Tablet portrait media contract missing"
grep -q "is-tablet-portrait-v102 .pmd-qpos-table-grid" "$CSS" || fail "Tablet table-grid contract missing"
grep -q "is-tablet-portrait-v102 .pmd-qpos-product-grid" "$CSS" || fail "Tablet product-grid contract missing"

if grep -Fq '@media (max-width: 820px), (max-width: 1024px) and (orientation: portrait)' "$CSS"; then
  fail "Legacy broad portrait-as-phone breakpoint still exists"
fi
if grep -Fq '@media (max-width: 600px), (max-width: 900px) and (orientation: portrait)' "$CSS"; then
  fail "Legacy broad large-phone breakpoint still exists"
fi

grep -q "PMD_QPOS_RESPONSIVE_MATRIX_RUNTIME_V102" "$JS" || fail "V102 runtime matrix missing"
grep -q "PMD_QPOS_PHONE_MAX_V102 = 599" "$JS" || fail "Phone threshold missing"
grep -q "PMD_QPOS_TABLET_MAX_V102 = 1024" "$JS" || fail "Tablet threshold missing"
grep -q "is-phone-portrait-v102" "$JS" || fail "Phone portrait class missing"
grep -q "is-phone-landscape-v102" "$JS" || fail "Phone landscape class missing"
grep -q "is-tablet-portrait-v102" "$JS" || fail "Tablet portrait class missing"
grep -q "is-tablet-landscape-v102" "$JS" || fail "Tablet landscape class missing"

grep -q "pmd-quick-pos-v1.css?v=20260924-v102" "$VIEW" || fail "V102 CSS cache bust missing"
grep -q "pmd-quick-pos-v1.js?v=20260924-v102" "$VIEW" || fail "V102 JS cache bust missing"
grep -q 'width=device-width, initial-scale=1, viewport-fit=cover' "$VIEW" || fail "Natural viewport meta missing"
grep -q "PayMyDine-Android-0.3.28.apk" "$SETTINGS" || fail "Settings 0.3.28 pointer missing"
grep -q "Canonical Offline POS 0.3.28" "$SETTINGS" || fail "Settings 0.3.28 label missing"
echo "V102 WEB MATRIX: PASS"

log "3/8 - Verifying Android 0.3.28 source + natural WebView scale"
GRADLE_TMP="$STAGE/build.gradle.kts"
POS_TMP="$STAGE/PosActivity.kt"
"${GIT[@]}" show "$ANDROID_COMMIT:mobile/android/app/build.gradle.kts" > "$GRADLE_TMP"
"${GIT[@]}" show "$ANDROID_COMMIT:mobile/android/app/src/main/java/com/paymydine/mobile/PosActivity.kt" > "$POS_TMP"

grep -q "versionCode = 41" "$GRADLE_TMP" || fail "Android versionCode 41 missing"
grep -q 'versionName = "0.3.28-v102-responsive-matrix"' "$GRADLE_TMP" || fail "Android V102 versionName missing"
grep -q "PMD_ANDROID_0_3_28_RESPONSIVE_MATRIX_V102" "$GRADLE_TMP" || fail "Android V102 marker missing"
grep -q "PMD_ANDROID_0_3_27_RECONNECT_CASH_V101" "$GRADLE_TMP" || fail "V101 baseline marker missing"
grep -q "PMD_ANDROID_NORMAL_PAGE_SCALE_V100" "$POS_TMP" || fail "Natural WebView scale marker missing"
[[ "$(grep -c 'textZoom = 100' "$POS_TMP")" -eq 2 ]] || fail "Expected textZoom=100 in both WebViews"
[[ "$(grep -c 'setInitialScale(0)' "$POS_TMP")" -eq 2 ]] || fail "Expected natural initial scale in both WebViews"
[[ "$(grep -c 'loadWithOverviewMode = false' "$POS_TMP")" -eq 2 ]] || fail "Overview zoom must be disabled in both WebViews"
[[ "$(grep -c 'useWideViewPort = true' "$POS_TMP")" -eq 2 ]] || fail "Wide viewport must be enabled in both WebViews"
echo "ANDROID SOURCE: PASS"

log "4/8 - Downloading checksum-pinned Android 0.3.28"
curl -fL --retry 3 --retry-delay 2 "$APK_URL" -o "$STAGE/$APK_RELEASE"
curl -fL --retry 3 --retry-delay 2 "$APK_SHA_URL" -o "$STAGE/$APK_RELEASE.sha256"

ACTUAL_SHA="$(sha256sum "$STAGE/$APK_RELEASE" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
SIDE_SHA="$(awk 'NF {print $1; exit}' "$STAGE/$APK_RELEASE.sha256" | tr '[:upper:]' '[:lower:]')"
echo "APK SHA256: $ACTUAL_SHA"
[[ "$ACTUAL_SHA" == "$EXPECTED_APK_SHA256" ]] ||
  fail "APK release changed: expected=$EXPECTED_APK_SHA256 actual=$ACTUAL_SHA"
[[ "$SIDE_SHA" == "$EXPECTED_APK_SHA256" ]] || fail "Release SHA sidecar mismatch"
echo "APK CHECKSUM: PASS"

log "5/8 - Creating permission-safe backup"
sudo mkdir -p "$BACKUP_DIR"
BACKUP_FILES=()
for rel in "${LIVE_FILES[@]}"; do
  [[ -f "$PMD_ROOT/$rel" ]] && BACKUP_FILES+=("$rel")
done
for old in   "downloads/paymydine/PayMyDine-Android-0.3.27.apk"   "downloads/paymydine/PayMyDine-Android-0.3.27.apk.sha256"   "downloads/paymydine/PayMyDine-Android-0.3.28.apk"   "downloads/paymydine/PayMyDine-Android-0.3.28.apk.sha256"; do
  [[ -f "$PMD_ROOT/$old" ]] && BACKUP_FILES+=("$old")
done

if [[ "${#BACKUP_FILES[@]}" -gt 0 ]]; then
  (
    cd "$PMD_ROOT"
    sudo tar -czf "$BACKUP" "${BACKUP_FILES[@]}"
  )
  echo "BACKUP: $BACKUP"
fi

log "6/8 - Installing exact V102 presentation/settings files"
for rel in "${LIVE_FILES[@]}"; do
  src="$STAGE/web/$rel"
  dst="$PMD_ROOT/$rel"
  mode="$(stat -c '%a' "$dst")"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  sudo install -m "$mode" -o "$uid" -g "$gid" "$src" "$dst"
  echo "UPDATED: $rel"
done

log "7/8 - Publishing verified Android 0.3.28"
sudo mkdir -p "$WEB_DIR"
web_uid="$(stat -c '%u' "$WEB_DIR")"
web_gid="$(stat -c '%g' "$WEB_DIR")"
sudo install -m 0644 -o "$web_uid" -g "$web_gid" "$STAGE/$APK_RELEASE" "$WEB_APK"
printf '%s  %s\n' "$EXPECTED_APK_SHA256" "$APK_PUBLIC" > "$STAGE/$APK_PUBLIC.sha256"
sudo install -m 0644 -o "$web_uid" -g "$web_gid" "$STAGE/$APK_PUBLIC.sha256" "$WEB_SHA"
FINAL_SHA="$(sha256sum "$WEB_APK" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
[[ "$FINAL_SHA" == "$EXPECTED_APK_SHA256" ]] || fail "Published APK checksum mismatch"
echo "APK PUBLISHED: $WEB_APK"

log "8/8 - Clearing caches and final live verification"
cd "$PMD_ROOT"
sudo -u www-data php artisan view:clear >/dev/null 2>&1 || php artisan view:clear >/dev/null 2>&1 || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1 || php artisan cache:clear >/dev/null 2>&1 || true

grep -q "PMD_QPOS_RESPONSIVE_MATRIX_V102" "$CSS_REL"
grep -q "PMD_QPOS_RESPONSIVE_MATRIX_RUNTIME_V102" "$JS_REL"
grep -q "pmd-quick-pos-v1.css?v=20260924-v102" "$VIEW_REL"
grep -q "pmd-quick-pos-v1.js?v=20260924-v102" "$VIEW_REL"
grep -q "PayMyDine-Android-0.3.28.apk" "$SETTINGS_REL"
[[ "$(sha256sum "$WEB_APK" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')" == "$EXPECTED_APK_SHA256" ]]

cat <<EOF

=============================================================
 PAYMYDINE V102 + ANDROID 0.3.28 COMPLETE
=============================================================
Responsive matrix:
  Phone portrait  <= 599px   = V100 phone UI preserved
  Phone landscape            = landscape rules / phone runtime class
  Tablet portrait 600-1024px = dedicated tablet UI
  Tablet landscape           = landscape rules / tablet runtime class

Tablet portrait:
  Floor controls             = 4-column / 48px
  Table grid                 = 4 columns / 82px tiles
  Product grid               = 3 columns
  Food name                  = 20px
  Food price                 = 26px
  Search / categories        = 52px / 48px
  Floating total             = 60px
  History                    = 2-pane tablet workspace
  Phone V98/V99/V100 scale   = NOT APPLIED

Android:
  Version                     = 0.3.28-v102-responsive-matrix
  Version Code                = 41
  V101 reconnect/cash fixes   = PRESERVED
  textZoom                    = 100
  initial scale               = NATURAL
  overview zoom               = DISABLED

APK:
  $APK_PUBLIC
  SHA256:
  $FINAL_SHA

V101 server reconciliation files are NOT overwritten by this deploy.
=============================================================
EOF
