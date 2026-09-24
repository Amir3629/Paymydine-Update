#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"

V100_SCRIPT_COMMIT="e9cb772c414c2e567c64d66eb85ef8bcc117cbc3"
V101_SCRIPT_COMMIT="a0e75a6a8ad7d74c01f4fd1aa2ca26d35975cc72"

V100_SCRIPT_PATH="deploy/pmd-v100-normal-mobile-web.sh"
V101_SCRIPT_PATH="deploy/pmd-android-v18-24-v101-reconnect-cash.sh"

APK_VERSION="0.3.27"
APK_RELEASE="PayMyDine-POS-Tablet-Preview-${APK_VERSION}.apk"
RELEASE_BASE="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview"
APK_URL="${RELEASE_BASE}/${APK_RELEASE}"
APK_SHA_URL="${APK_URL}.sha256"
EXPECTED_SHA256="00c75088b3fed0aaa5e173e8ef9e4fce28940850695a6433d9133b96c41bee04"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TMP="/tmp/pmd-v100-v101-final-${STAMP}"

fail(){ printf '\n[FINAL DEPLOY ERROR] %s\n' "$*" >&2; exit 1; }
log(){ printf '\n[PayMyDine V100 UI + V101 Android] %s\n' "$*"; }

[[ -d "${PMD_ROOT}/.git" ]] || fail "Not a git checkout: ${PMD_ROOT}"
[[ -f "${PMD_ROOT}/artisan" ]] || fail "artisan missing"

for cmd in git curl sha256sum awk grep chmod mkdir rm; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Required command missing: $cmd"
done

mkdir -p "$TMP"
trap 'rm -rf "$TMP"' EXIT

GIT=(git -c "safe.directory=${PMD_ROOT}" -C "${PMD_ROOT}")

echo "============================================================"
echo " PayMyDine Final Mobile Deploy"
echo " Web UI       : V100 normal mobile controls"
echo " Android/App  : 0.3.27 V101 reconnect + cash reconciliation"
echo "============================================================"

log "1/5 - Fetching pinned deploy sources"
"${GIT[@]}" fetch origin main feature/android-local-first-v1
"${GIT[@]}" cat-file -e "${V100_SCRIPT_COMMIT}^{commit}" || fail "V100 deploy commit unavailable"
"${GIT[@]}" cat-file -e "${V101_SCRIPT_COMMIT}^{commit}" || fail "V101 deploy commit unavailable"

"${GIT[@]}" show "${V100_SCRIPT_COMMIT}:${V100_SCRIPT_PATH}" > "$TMP/v100.sh"
"${GIT[@]}" show "${V101_SCRIPT_COMMIT}:${V101_SCRIPT_PATH}" > "$TMP/v101.sh"
chmod +x "$TMP/v100.sh" "$TMP/v101.sh"

grep -q "PMD_QPOS_MOBILE_NORMAL_BUTTONS_V100" "$TMP/v100.sh" ||
  fail "V100 deploy script contract missing"
grep -q "PMD_ANDROID_V18_24_V101_RECONNECT_CASH" "$TMP/v101.sh" ||
  fail "V101 deploy script contract missing"

log "2/5 - Preflighting current GitHub Android 0.3.27 asset BEFORE touching live files"
curl -fL --retry 3 --retry-delay 2 "$APK_URL" -o "$TMP/$APK_RELEASE"
curl -fL --retry 3 --retry-delay 2 "$APK_SHA_URL" -o "$TMP/$APK_RELEASE.sha256"

ACTUAL="$(sha256sum "$TMP/$APK_RELEASE" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
SIDE="$(awk 'NF {print $1; exit}' "$TMP/$APK_RELEASE.sha256" | tr '[:upper:]' '[:lower:]')"

echo "Release APK SHA256: $ACTUAL"
[[ "$ACTUAL" == "$EXPECTED_SHA256" ]] ||
  fail "0.3.27 release asset changed: expected=$EXPECTED_SHA256 actual=$ACTUAL"
[[ "$SIDE" == "$EXPECTED_SHA256" ]] ||
  fail "0.3.27 release sidecar does not match expected SHA"
echo "RELEASE PREFLIGHT: PASS"

log "3/5 - Installing V100 web/mobile UI"
PMD_ROOT="$PMD_ROOT" bash "$TMP/v100.sh"

log "4/5 - Installing V101 server reconciliation + Android 0.3.27"
PMD_ROOT="$PMD_ROOT" bash "$TMP/v101.sh"

log "5/5 - Final cross-layer verification"
grep -q "PMD_QPOS_MOBILE_NORMAL_BUTTONS_V100"   "$PMD_ROOT/app/admin/assets/css/pmd-quick-pos-v1.css" ||
  fail "Live V100 CSS marker missing"

grep -q "pmd-quick-pos-v1.css?v=20260924-v100"   "$PMD_ROOT/app/admin/views/pmd_quick_pos_v1.blade.php" ||
  fail "Live V100 CSS cache-bust missing"

grep -q "PMD_MOBILE_CASH_LOCAL_AGGREGATE_RESOLVE_V101"   "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobileCommandProcessor.php" ||
  fail "Live V101 server cash marker missing"

grep -q "PayMyDine-Android-0.3.27.apk"   "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" ||
  fail "Live Settings does not point to Android 0.3.27"

FINAL_APK="$PMD_ROOT/downloads/paymydine/PayMyDine-Android-0.3.27.apk"
[[ -f "$FINAL_APK" ]] || fail "Published Android 0.3.27 APK missing"
FINAL_SHA="$(sha256sum "$FINAL_APK" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
[[ "$FINAL_SHA" == "$EXPECTED_SHA256" ]] ||
  fail "Published Android 0.3.27 checksum mismatch"

cat <<EOF

=============================================================
 PAYMYDINE MOBILE FINAL UPDATE COMPLETE
=============================================================
Web/mobile UI:
  V100 normal-size buttons     = INSTALLED
  V98/V99 fit architecture    = PRESERVED
  Food names/prices readable  = PRESERVED
  Natural browser zoom        = PRESERVED

Android:
  Version                     = 0.3.27-v101-reconnect-cash
  Version Code                = 40
  V100 WebView scale fix      = PRESERVED
  textZoom                    = 100
  initial WebView scale       = NATURAL
  V101 reconnect/cash fixes   = INCLUDED

APK:
  PayMyDine-Android-0.3.27.apk
  SHA256:
  $FINAL_SHA
=============================================================
EOF
