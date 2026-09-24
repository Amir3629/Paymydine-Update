#!/usr/bin/env bash
set -Eeuo pipefail

# PMD_ANDROID_V18_18_V94_OFFLINE_COMPLETE
PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"

BASE_COMMIT="${BASE_COMMIT:-ac8220f15ee94f6975569cbf5edbf79610937270}"
WEB_TARGET_COMMIT="${WEB_TARGET_COMMIT:-b448c19eefae7a83a91e449b70d6bb7dfb95e8f9}"
ANDROID_SOURCE_COMMIT="${ANDROID_SOURCE_COMMIT:-53320eda20ce886802c26cbb536c6a808f785ab9}"

APK_VERSION="0.3.20"
APK_RELEASE="PayMyDine-POS-Tablet-Preview-${APK_VERSION}.apk"
APK_PUBLIC="PayMyDine-Android-${APK_VERSION}.apk"
RELEASE_BASE="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview"
APK_URL="${RELEASE_BASE}/${APK_RELEASE}"
APK_SHA_URL="${APK_URL}.sha256"
EXPECTED_APK_SHA256="ec9fed9224ee8206c40c57381f9c56b424f5fd9303acd0a7e739485181176e9b"

LIVE_FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/views/pmdsettings/index.blade.php"
  "app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
  "app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"
)

log(){ printf '\n[PMD V18.18 / ANDROID 0.3.20 / V94] %s\n' "$*"; }
fail(){ printf '\n[PMD V18.18][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

for cmd in git curl sha256sum tar stat grep awk tr cp mv mkdir dirname chmod chown php; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

for rel in "${LIVE_FILES[@]}"; do
  [[ -f "$PMD_ROOT/$rel" ]] || fail "Live file missing: $rel"
done

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching pinned source refs..."
"${GIT[@]}" fetch --prune origin main feature/android-local-first-v1

for ref in "$BASE_COMMIT" "$WEB_TARGET_COMMIT" "$ANDROID_SOURCE_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null ||
    fail "Required commit unavailable: $ref"
done

git_show_contains() {
  local ref="$1" path="$2" needle="$3"
  grep -Fq "$needle" < <("${GIT[@]}" show "$ref:$path")
}

git_show_not_contains() {
  local ref="$1" path="$2" needle="$3"
  ! grep -Fq "$needle" < <("${GIT[@]}" show "$ref:$path")
}

log "Validating Android 0.3.20 offline-complete source contract..."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/build.gradle.kts" "versionCode = 33" ||
  fail "Android versionCode 33 missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/build.gradle.kts" 'versionName = "0.3.20-v94-mobile-ui"' ||
  fail "Android 0.3.20 versionName missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/build.gradle.kts" "PMD_ANDROID_0_3_20_OFFLINE_COMPLETE_V23" ||
  fail "Android offline-complete V23 marker missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "app/admin/assets/js/pmd-quick-pos-v1.js" "PMD_QPOS_NATIVE_PROVISIONAL_CHECK_IDS_V93" ||
  fail "Negative provisional-check selection marker missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "app/admin/assets/js/pmd-quick-pos-v1.js" "state.activeOrderId = id !== 0 ? id : null" ||
  fail "Negative check selection logic missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "app/admin/assets/js/pmd-quick-pos-v1.js" "orderMenuId !== 0" ||
  fail "Negative provisional line control logic missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/LocalPosBridge.kt" "PMD_ANDROID_PROVISIONAL_ITEM_MUTATION_V23" ||
  fail "Provisional item mutation bridge missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/LocalPosBridge.kt" "PMD_ANDROID_LOCAL_TABLE_OCCUPIED_V23" ||
  fail "Immediate occupied-table projection missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/data/local/LocalPosRepository.kt" "PMD_ANDROID_PROVISIONAL_ORDER_EDIT_V23" ||
  fail "Queued provisional order editing missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/data/local/BootstrapRepository.kt" "PMD_ANDROID_NON_DESTRUCTIVE_RECONNECT_SNAPSHOT_V23" ||
  fail "Non-destructive reconnect snapshot missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/ui/PmdStaffLogin.kt" "PMD_ANDROID_LOGIN_NO_OFFLINE_BUTTON_V20" ||
  fail "No-offline-button login marker missing."
git_show_not_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/ui/PmdStaffLogin.kt" "Continue offline as " ||
  fail "Legacy separate offline-login button is present."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="$PMD_ROOT/storage/pmd-v1818-v94-0320-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-v1818-v94-conflicts-$STAMP"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/android-v1818-0320-v94-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-v1818-0320-v94-before-$STAMP.txt"
WEB_DIR="$PMD_ROOT/downloads/paymydine"
WEB_APK="$WEB_DIR/$APK_PUBLIC"
WEB_SHA="$WEB_APK.sha256"

mkdir -p "$STAGE/base" "$STAGE/target" "$STAGE/candidate" "$CONFLICT" "$BACKUP_DIR"

log "Downloading checksum-pinned Android 0.3.20..."
curl -fL --retry 3 --retry-delay 2 "$APK_URL" -o "$STAGE/$APK_RELEASE"
curl -fL --retry 3 --retry-delay 2 "$APK_SHA_URL" -o "$STAGE/$APK_RELEASE.sha256"

ACTUAL_APK_SHA256="$(sha256sum "$STAGE/$APK_RELEASE" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
SIDE_APK_SHA256="$(awk 'NF {print $1; exit}' "$STAGE/$APK_RELEASE.sha256" | tr '[:upper:]' '[:lower:]')"

[[ "$ACTUAL_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] ||
  fail "APK SHA mismatch: expected=$EXPECTED_APK_SHA256 actual=$ACTUAL_APK_SHA256"
[[ "$SIDE_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] ||
  fail "Release checksum sidecar mismatch."
log "APK verified: $ACTUAL_APK_SHA256"

BACKUP_FILES=()
for rel in "${LIVE_FILES[@]}"; do BACKUP_FILES+=("$rel"); done
[[ -f "$WEB_APK" ]] && BACKUP_FILES+=("${WEB_APK#$PMD_ROOT/}")
[[ -f "$WEB_SHA" ]] && BACKUP_FILES+=("${WEB_SHA#$PMD_ROOT/}")

tar -czf "$BACKUP" "${BACKUP_FILES[@]}"

{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "checkout_head=$("${GIT[@]}" rev-parse HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "base_commit=$BASE_COMMIT"
  echo "web_target=$WEB_TARGET_COMMIT"
  echo "android_source=$ANDROID_SOURCE_COMMIT"
  echo "apk=$APK_PUBLIC"
  echo "apk_sha256=$ACTUAL_APK_SHA256"
  echo
  "${GIT[@]}" status --short -- "${LIVE_FILES[@]}" || true
} > "$META"

log "Backup: $BACKUP"
log "Building protected V92 -> V94 merge candidates..."

for rel in "${LIVE_FILES[@]}"; do
  mkdir -p     "$STAGE/base/$(dirname "$rel")"     "$STAGE/target/$(dirname "$rel")"     "$STAGE/candidate/$(dirname "$rel")"     "$CONFLICT/$(dirname "$rel")"

  "${GIT[@]}" show "$BASE_COMMIT:$rel" > "$STAGE/base/$rel" ||
    fail "Base file missing: $BASE_COMMIT:$rel"
  "${GIT[@]}" show "$WEB_TARGET_COMMIT:$rel" > "$STAGE/target/$rel" ||
    fail "Target file missing: $WEB_TARGET_COMMIT:$rel"

  set +e
  git merge-file -p --diff3     -L "LIVE:$rel"     -L "BASE:$rel"     -L "TARGET:$rel"     "$PMD_ROOT/$rel"     "$STAGE/base/$rel"     "$STAGE/target/$rel"     > "$STAGE/candidate/$rel"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] ||
     grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$rel"; then
    cp -f "$STAGE/candidate/$rel" "$CONFLICT/$rel"
    fail "Merge conflict. No V18.18 files installed. Candidate: $CONFLICT/$rel"
  fi
done

CSS="$STAGE/candidate/app/admin/assets/css/pmd-quick-pos-v1.css"
JS="$STAGE/candidate/app/admin/assets/js/pmd-quick-pos-v1.js"
VIEW="$STAGE/candidate/app/admin/views/pmd_quick_pos_v1.blade.php"
SETTINGS="$STAGE/candidate/app/admin/views/pmdsettings/index.blade.php"
BOOTSTRAP="$STAGE/candidate/app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
COMMAND="$STAGE/candidate/app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"

log "Validating merged V94/offline-complete server contract..."
grep -q "PMD_QPOS_MOBILE_TOUCH_HISTORY_V93" "$CSS" ||
  fail "V93 mobile History/touch CSS missing."
grep -q "PMD_QPOS_FLOATING_CART_MODAL_SAFETY_V94" "$CSS" ||
  fail "V94 floating-cart modal safety missing."
grep -q "PMD_QPOS_REQUEST_FAILOVER_V91" "$JS" ||
  fail "V91 request failover missing."
grep -q "PMD_QPOS_NATIVE_PROVISIONAL_CHECK_IDS_V93" "$JS" ||
  fail "V93 provisional check IDs missing."
grep -Fq "state.activeOrderId = id !== 0 ? id : null" "$JS" ||
  fail "Negative local checks are not selectable."
grep -Fq "if (itemId === 0) return;" "$JS" ||
  fail "Negative local line IDs are not accepted."
grep -Fq "orderMenuId !== 0" "$JS" ||
  fail "Sent-item +/- controls do not accept local line IDs."
grep -q "PMD_QPOS_HISTORY_TABLE_WORKSPACE_V93" "$JS" ||
  fail "History table workspace missing."
grep -q "PMD_QPOS_OFFLINE_COMPLETE_CACHE_BUSTER_V94" "$VIEW" ||
  fail "Offline-complete JS cache-buster marker missing."
grep -q "20260924-offline-complete-v94" "$VIEW" ||
  fail "Offline-complete JS cache-buster missing."
grep -q "PayMyDine-Android-0.3.20.apk" "$SETTINGS" ||
  fail "Settings does not point to Android 0.3.20."
grep -q "Canonical Offline POS 0.3.20" "$SETTINGS" ||
  fail "Settings 0.3.20 label missing."
grep -q "PMD_MOBILE_OFFLINE_CASH_CAPABILITY_V23" "$BOOTSTRAP" ||
  fail "Offline cash capability marker missing."
grep -Fq "'offline_payment_enabled' => true" "$BOOTSTRAP" ||
  fail "Offline payment capability is not enabled."
grep -Fq "'offline_cash_payment_enabled' => true" "$BOOTSTRAP" ||
  fail "Offline cash capability is not enabled."
grep -Fq "'offline_card_payment_enabled' => false" "$BOOTSTRAP" ||
  fail "Offline card must remain disabled."
grep -q "PMD_MOBILE_OFFLINE_ORIGINAL_TIME_V23" "$COMMAND" ||
  fail "Offline business-time V23 marker missing."
grep -q "isOriginalLocalCreateCommand" "$COMMAND" ||
  fail "Local-create timestamp authority missing."
grep -q "client_created_at_ms" "$COMMAND" ||
  fail "Original order timestamp payload missing."

php -l "$BOOTSTRAP" >/dev/null ||
  fail "Merged bootstrap PHP failed syntax validation."
php -l "$COMMAND" >/dev/null ||
  fail "Merged command processor PHP failed syntax validation."
if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null ||
    fail "Merged Quick POS JavaScript failed syntax validation."
fi

log "Installing validated V18.18 files..."
for rel in "${LIVE_FILES[@]}"; do
  dst="$PMD_ROOT/$rel"
  tmp="${dst}.pmd-v1818-new"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"

  cp -f "$STAGE/candidate/$rel" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

log "Publishing verified Android 0.3.20..."
mkdir -p "$WEB_DIR"
root_uid="$(stat -c '%u' "$PMD_ROOT")"
root_gid="$(stat -c '%g' "$PMD_ROOT")"

apk_tmp="$WEB_APK.pmd-v1818-new"
sha_tmp="$WEB_SHA.pmd-v1818-new"
cp -f "$STAGE/$APK_RELEASE" "$apk_tmp"
printf '%s  %s\n' "$ACTUAL_APK_SHA256" "$APK_PUBLIC" > "$sha_tmp"
chmod 0644 "$apk_tmp" "$sha_tmp"
chown "$root_uid:$root_gid" "$apk_tmp" "$sha_tmp" 2>/dev/null || true
mv -f "$apk_tmp" "$WEB_APK"
mv -f "$sha_tmp" "$WEB_SHA"

FINAL_SHA="$(sha256sum "$WEB_APK" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
[[ "$FINAL_SHA" == "$EXPECTED_APK_SHA256" ]] ||
  fail "Published APK checksum changed."

log "Clearing Laravel/TastyIgniter caches..."
php artisan route:clear >/dev/null 2>&1 || true
php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true
php artisan optimize:clear >/dev/null 2>&1 || true

if command -v systemctl >/dev/null 2>&1 &&
   systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Verification:"
grep -n "PMD_QPOS_FLOATING_CART_MODAL_SAFETY_V94" "$PMD_ROOT/app/admin/assets/css/pmd-quick-pos-v1.css" | head -1
grep -n "PMD_QPOS_NATIVE_PROVISIONAL_CHECK_IDS_V93" "$PMD_ROOT/app/admin/assets/js/pmd-quick-pos-v1.js" | head -1
grep -n "PMD_QPOS_OFFLINE_COMPLETE_CACHE_BUSTER_V94" "$PMD_ROOT/app/admin/views/pmd_quick_pos_v1.blade.php" | head -1
grep -n "PayMyDine-Android-0.3.20.apk" "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" | head -1
grep -n "PMD_MOBILE_OFFLINE_CASH_CAPABILITY_V23" "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobileBootstrapService.php" | head -1
grep -n "PMD_MOBILE_OFFLINE_ORIGINAL_TIME_V23" "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobileCommandProcessor.php" | head -1
sha256sum "$WEB_APK"

cat <<EOF

=============================================================
PayMyDine V18.18 / Android 0.3.20 / Quick POS V94 deployed.

Offline order fixes:
  - A provisional negative local check is a real selectable check.
  - The local check can be opened and paid with full Cash offline.
  - Sent items on the still-unsynced local check support +/- locally.
  - The SAME pending SEND/HOLD outbox command is edited; no duplicate order is created.
  - A table becomes occupied immediately after local Send/Hold.

Payment:
  - Full Cash is certified offline and queued durably.
  - Card/terminal/provider approval remains internet-required and fail-closed.
  - Split payment remains Cloud-only.

Reconnect:
  - Reconnect bootstrap no longer destroys a healthy local menu/table snapshot
    when Cloud returns a transient empty/partial critical section.
  - Pending local work is re-projected onto table status after refresh.
  - Cached food images/menu data are preserved through that reconnect path.

Business time:
  - New local ORDER_SEND/HOLD commands keep client_created_at_ms as the
    authoritative order business time.
  - Cloud orders.created_at / order_date / order_time are backdated to the
    actual placement time (within the existing sanity window), not sync time.

Verified release:
  Web target:
    $WEB_TARGET_COMMIT
  Android source:
    $ANDROID_SOURCE_COMMIT
  APK:
    $APK_PUBLIC
  SHA-256:
    $FINAL_SHA

No database migration.
No pairing reset.
No Android Clear Data.
No raw password/PIN persistence.
No git reset --hard.

Backup:
  $BACKUP
  $META
=============================================================
EOF
