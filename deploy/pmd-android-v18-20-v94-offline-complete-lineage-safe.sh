#!/usr/bin/env bash
set -Eeuo pipefail

# PMD_ANDROID_V18_20_V94_OFFLINE_COMPLETE_LINEAGE_SAFE
PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"

# Quick POS baseline actually deployed by V18.17 -> final V94 behavior target.
QPOS_BASE_COMMIT="${QPOS_BASE_COMMIT:-87af917412b7d3e674d0cd8b663ecb89fe1bd6b2}"
QPOS_TARGET_COMMIT="${QPOS_TARGET_COMMIT:-53320eda20ce886802c26cbb536c6a808f785ab9}"

# Exact clean VPS snapshot captured before the V23 server changes -> V23 target.
PHP_BASE_COMMIT="${PHP_BASE_COMMIT:-04919ec9fb0a2bb54bf47c45f29014dbd505a9eb}"
PHP_TARGET_COMMIT="${PHP_TARGET_COMMIT:-2456d150e632be756a3b268acce3a37895bbf4ec}"

ANDROID_SOURCE_COMMIT="${ANDROID_SOURCE_COMMIT:-53320eda20ce886802c26cbb536c6a808f785ab9}"

APK_VERSION="0.3.20"
APK_RELEASE="PayMyDine-POS-Tablet-Preview-${APK_VERSION}.apk"
APK_PUBLIC="PayMyDine-Android-${APK_VERSION}.apk"
RELEASE_BASE="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview"
APK_URL="${RELEASE_BASE}/${APK_RELEASE}"
APK_SHA_URL="${APK_URL}.sha256"
EXPECTED_APK_SHA256="ec9fed9224ee8206c40c57381f9c56b424f5fd9303acd0a7e739485181176e9b"

QPOS_FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
)
PHP_FILES=(
  "app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
  "app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"
)
VIEW_FILE="app/admin/views/pmd_quick_pos_v1.blade.php"
SETTINGS_FILE="app/admin/views/pmdsettings/index.blade.php"

log(){ printf '\n[PMD V18.20 / ANDROID 0.3.20 / V94 LINEAGE SAFE] %s\n' "$*"; }
fail(){ printf '\n[PMD V18.20][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

for cmd in git curl sha256sum tar stat grep awk tr sed cp mv mkdir dirname chmod chown php; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

for rel in "${QPOS_FILES[@]}" "${PHP_FILES[@]}" "$VIEW_FILE" "$SETTINGS_FILE"; do
  [[ -f "$PMD_ROOT/$rel" ]] || fail "Live file missing: $rel"
done

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching pinned refs..."
"${GIT[@]}" fetch --prune origin main feature/android-local-first-v1

for ref in "$QPOS_BASE_COMMIT" "$QPOS_TARGET_COMMIT" "$PHP_BASE_COMMIT" "$PHP_TARGET_COMMIT" "$ANDROID_SOURCE_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null ||
    fail "Required commit unavailable: $ref"
done

# These are true lineage checks, not marker guesses.
"${GIT[@]}" merge-base --is-ancestor "$QPOS_BASE_COMMIT" "$QPOS_TARGET_COMMIT" ||
  fail "Quick POS base is not an ancestor of the V94 target."
"${GIT[@]}" merge-base --is-ancestor "$PHP_BASE_COMMIT" "$PHP_TARGET_COMMIT" ||
  fail "Clean VPS PHP snapshot is not an ancestor of the V23 target."

git_show_contains() {
  local ref="$1" path="$2" needle="$3"
  grep -Fq "$needle" < <("${GIT[@]}" show "$ref:$path")
}

git_show_not_contains() {
  local ref="$1" path="$2" needle="$3"
  ! grep -Fq "$needle" < <("${GIT[@]}" show "$ref:$path")
}

log "Validating pinned Android/V94/V23 target contracts..."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/build.gradle.kts" "versionCode = 33" ||
  fail "Android versionCode 33 missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/build.gradle.kts" 'versionName = "0.3.20-v94-mobile-ui"' ||
  fail "Android 0.3.20 versionName missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/build.gradle.kts" "PMD_ANDROID_0_3_20_OFFLINE_COMPLETE_V23" ||
  fail "Offline-complete Android marker missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "app/admin/assets/js/pmd-quick-pos-v1.js" "PMD_QPOS_NATIVE_PROVISIONAL_CHECK_IDS_V93" ||
  fail "Provisional local-check support missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/LocalPosBridge.kt" "PMD_ANDROID_PROVISIONAL_ITEM_MUTATION_V23" ||
  fail "Provisional item mutation bridge missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/LocalPosBridge.kt" "PMD_ANDROID_LOCAL_TABLE_OCCUPIED_V23" ||
  fail "Immediate local occupied-table projection missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/data/local/LocalPosRepository.kt" "PMD_ANDROID_PROVISIONAL_ORDER_EDIT_V23" ||
  fail "Queued provisional order editing missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/data/local/BootstrapRepository.kt" "PMD_ANDROID_NON_DESTRUCTIVE_RECONNECT_SNAPSHOT_V23" ||
  fail "Non-destructive reconnect snapshot missing."
git_show_not_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/ui/PmdStaffLogin.kt" "Continue offline as " ||
  fail "Legacy separate offline button exists."

git_show_contains "$PHP_TARGET_COMMIT" "app/Services/PmdMobileSync/PmdMobileBootstrapService.php" "PMD_MOBILE_OFFLINE_CASH_CAPABILITY_V23" ||
  fail "V23 offline cash capability target missing."
git_show_contains "$PHP_TARGET_COMMIT" "app/Services/PmdMobileSync/PmdMobileCommandProcessor.php" "PMD_MOBILE_OFFLINE_ORIGINAL_TIME_V23" ||
  fail "V23 business-time target missing."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="$PMD_ROOT/storage/pmd-v1820-v94-0320-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-v1820-v94-conflicts-$STAMP"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/android-v1820-0320-v94-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-v1820-0320-v94-before-$STAMP.txt"

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
  fail "APK checksum mismatch: expected=$EXPECTED_APK_SHA256 actual=$ACTUAL_APK_SHA256"
[[ "$SIDE_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] ||
  fail "Release checksum sidecar mismatch."

log "APK verified: $ACTUAL_APK_SHA256"

BACKUP_FILES=(
  "${QPOS_FILES[@]}"
  "${PHP_FILES[@]}"
  "$VIEW_FILE"
  "$SETTINGS_FILE"
)
[[ -f "$WEB_APK" ]] && BACKUP_FILES+=("${WEB_APK#$PMD_ROOT/}")
[[ -f "$WEB_SHA" ]] && BACKUP_FILES+=("${WEB_SHA#$PMD_ROOT/}")

tar -czf "$BACKUP" "${BACKUP_FILES[@]}"

{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "checkout_head=$("${GIT[@]}" rev-parse HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "qpos_base=$QPOS_BASE_COMMIT"
  echo "qpos_target=$QPOS_TARGET_COMMIT"
  echo "php_base=$PHP_BASE_COMMIT"
  echo "php_target=$PHP_TARGET_COMMIT"
  echo "android_source=$ANDROID_SOURCE_COMMIT"
  echo "apk=$APK_PUBLIC"
  echo "apk_sha256=$ACTUAL_APK_SHA256"
  echo
  "${GIT[@]}" status --short -- "${QPOS_FILES[@]}" "${PHP_FILES[@]}" "$VIEW_FILE" "$SETTINGS_FILE" || true
} > "$META"

log "Backup: $BACKUP"

merge_protected() {
  local rel="$1"
  local base="$2"
  local target="$3"
  local label="$4"

  mkdir -p     "$STAGE/base/$(dirname "$rel")"     "$STAGE/target/$(dirname "$rel")"     "$STAGE/candidate/$(dirname "$rel")"     "$CONFLICT/$(dirname "$rel")"

  "${GIT[@]}" show "$base:$rel" > "$STAGE/base/$rel" ||
    fail "Base file unavailable: $base:$rel"
  "${GIT[@]}" show "$target:$rel" > "$STAGE/target/$rel" ||
    fail "Target file unavailable: $target:$rel"

  set +e
  git merge-file -p --diff3     -L "LIVE:$rel"     -L "BASE:$rel"     -L "$label:$rel"     "$PMD_ROOT/$rel"     "$STAGE/base/$rel"     "$STAGE/target/$rel"     > "$STAGE/candidate/$rel"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] ||
     grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$rel"; then
    cp -f "$STAGE/candidate/$rel" "$CONFLICT/$rel"
    fail "Protected merge conflict in $rel. Nothing installed. Candidate: $CONFLICT/$rel"
  fi
}

log "Building protected V92 -> V94 Quick POS candidates..."
for rel in "${QPOS_FILES[@]}"; do
  merge_protected "$rel" "$QPOS_BASE_COMMIT" "$QPOS_TARGET_COMMIT" "V94"
done

log "Building protected clean-VPS -> V23 sync candidates..."
for rel in "${PHP_FILES[@]}"; do
  merge_protected "$rel" "$PHP_BASE_COMMIT" "$PHP_TARGET_COMMIT" "V23"
done

log "Preserving live Blade/Settings; changing only release/cache pointers..."
mkdir -p   "$STAGE/candidate/$(dirname "$VIEW_FILE")"   "$STAGE/candidate/$(dirname "$SETTINGS_FILE")"

cp -f "$PMD_ROOT/$VIEW_FILE" "$STAGE/candidate/$VIEW_FILE"
cp -f "$PMD_ROOT/$SETTINGS_FILE" "$STAGE/candidate/$SETTINGS_FILE"

VIEW="$STAGE/candidate/$VIEW_FILE"
SETTINGS="$STAGE/candidate/$SETTINGS_FILE"
CSS="$STAGE/candidate/app/admin/assets/css/pmd-quick-pos-v1.css"
JS="$STAGE/candidate/app/admin/assets/js/pmd-quick-pos-v1.js"
BOOTSTRAP="$STAGE/candidate/app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
COMMAND="$STAGE/candidate/app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"

# Normalize any accidental literal "\n" immediately before the Quick POS script.
sed -i 's#--}}\\n<script src="/app/admin/assets/js/pmd-quick-pos-v1.js#--}}>\
<script src="/app/admin/assets/js/pmd-quick-pos-v1.js#g' "$VIEW"

grep -Eq 'pmd-quick-pos-v1\.css\?v=[^"]+' "$VIEW" ||
  fail "Quick POS CSS asset tag not found in live Blade."
grep -Eq 'pmd-quick-pos-v1\.js\?v=[^"]+' "$VIEW" ||
  fail "Quick POS JS asset tag not found in live Blade."

sed -E -i   's#pmd-quick-pos-v1\.css\?v=[^"]+#pmd-quick-pos-v1.css?v=20260924-v94#g'   "$VIEW"
sed -E -i   's#pmd-quick-pos-v1\.js\?v=[^"]+#pmd-quick-pos-v1.js?v=20260924-offline-complete-v94#g'   "$VIEW"

grep -Eq 'PayMyDine-Android-0\.3\.[0-9]+\.apk' "$SETTINGS" ||
  fail "Android download pointer not found in live Settings."
sed -E -i   's/PayMyDine-Android-0\.3\.[0-9]+\.apk/PayMyDine-Android-0.3.20.apk/g'   "$SETTINGS"
if grep -Eq '(Operations Preview|Canonical Offline POS) 0\.3\.[0-9]+' "$SETTINGS"; then
  sed -E -i     's/(Operations Preview|Canonical Offline POS) 0\.3\.[0-9]+/Canonical Offline POS 0.3.20/g'     "$SETTINGS"
fi

log "Validating merged offline-complete contract..."
grep -q "PMD_QPOS_MOBILE_TOUCH_HISTORY_V93" "$CSS" ||
  fail "V93 mobile History/touch CSS missing."
grep -q "PMD_QPOS_FLOATING_CART_MODAL_SAFETY_V94" "$CSS" ||
  fail "V94 modal-safe cart missing."

grep -q "PMD_QPOS_REQUEST_FAILOVER_V91" "$JS" ||
  fail "V91 request failover missing."
grep -q "PMD_QPOS_NATIVE_DURABLE_MUTATIONS_V92" "$JS" ||
  fail "V92 durable mutations missing."
grep -q "PMD_QPOS_TERMINAL_SAFE_FAILOVER_V92" "$JS" ||
  fail "V92 terminal-safe failover missing."
grep -q "PMD_QPOS_NATIVE_PROVISIONAL_CHECK_IDS_V93" "$JS" ||
  fail "V93 provisional check IDs missing."
grep -Fq "state.activeOrderId = id !== 0 ? id : null" "$JS" ||
  fail "Negative local checks are not selectable."
grep -Fq "if (itemId === 0) return;" "$JS" ||
  fail "Negative local line IDs are rejected."
grep -Fq "orderMenuId !== 0" "$JS" ||
  fail "Sent-item +/- does not accept local line IDs."

grep -q 'pmd-quick-pos-v1.css?v=20260924-v94' "$VIEW" ||
  fail "V94 CSS cache identity missing."
grep -q 'pmd-quick-pos-v1.js?v=20260924-offline-complete-v94' "$VIEW" ||
  fail "Offline-complete JS cache identity missing."
! grep -Fq '\n<script src="/app/admin/assets/js/pmd-quick-pos-v1.js' "$VIEW" ||
  fail "Literal backslash-n remains before Quick POS JS."

grep -q "PayMyDine-Android-0.3.20.apk" "$SETTINGS" ||
  fail "Settings does not point to Android 0.3.20."
grep -q "Canonical Offline POS 0.3.20" "$SETTINGS" ||
  fail "Settings 0.3.20 label missing."

grep -q "PMD_MOBILE_OFFLINE_CASH_CAPABILITY_V23" "$BOOTSTRAP" ||
  fail "Offline cash V23 marker missing."
grep -Fq "'offline_payment_enabled' => true" "$BOOTSTRAP" ||
  fail "Offline payment capability is not enabled."
grep -Fq "'offline_cash_payment_enabled' => true" "$BOOTSTRAP" ||
  fail "Offline cash capability is not enabled."
grep -Fq "'offline_card_payment_enabled' => false" "$BOOTSTRAP" ||
  fail "Offline card capability must remain disabled."

grep -q "PMD_MOBILE_OFFLINE_ORIGINAL_TIME_V23" "$COMMAND" ||
  fail "Business-time V23 marker missing."
grep -q "isOriginalLocalCreateCommand" "$COMMAND" ||
  fail "Local-create timestamp authority missing."
grep -q "client_created_at_ms" "$COMMAND" ||
  fail "Client-created business timestamp missing."
grep -q "PMD_MOBILE_OFFLINE_PAYMENT_TIME_V18" "$COMMAND" ||
  fail "Offline payment timestamp contract missing."

php -l "$BOOTSTRAP" >/dev/null ||
  fail "Bootstrap PHP syntax failed."
php -l "$COMMAND" >/dev/null ||
  fail "Command processor PHP syntax failed."
if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null ||
    fail "Quick POS JavaScript syntax failed."
fi

log "Installing validated V18.20 candidates..."
ALL_INSTALL_FILES=(
  "${QPOS_FILES[@]}"
  "${PHP_FILES[@]}"
  "$VIEW_FILE"
  "$SETTINGS_FILE"
)
for rel in "${ALL_INSTALL_FILES[@]}"; do
  dst="$PMD_ROOT/$rel"
  tmp="${dst}.pmd-v1820-new"
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

apk_tmp="$WEB_APK.pmd-v1820-new"
sha_tmp="$WEB_SHA.pmd-v1820-new"
cp -f "$STAGE/$APK_RELEASE" "$apk_tmp"
printf '%s  %s\n' "$ACTUAL_APK_SHA256" "$APK_PUBLIC" > "$sha_tmp"
chmod 0644 "$apk_tmp" "$sha_tmp"
chown "$root_uid:$root_gid" "$apk_tmp" "$sha_tmp" 2>/dev/null || true
mv -f "$apk_tmp" "$WEB_APK"
mv -f "$sha_tmp" "$WEB_SHA"

FINAL_SHA="$(sha256sum "$WEB_APK" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
[[ "$FINAL_SHA" == "$EXPECTED_APK_SHA256" ]] ||
  fail "Published APK checksum changed."

log "Clearing application caches..."
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
grep -n 'pmd-quick-pos-v1.js?v=20260924-offline-complete-v94' "$PMD_ROOT/$VIEW_FILE" | head -1
grep -n "PayMyDine-Android-0.3.20.apk" "$PMD_ROOT/$SETTINGS_FILE" | head -1
grep -n "PMD_MOBILE_OFFLINE_CASH_CAPABILITY_V23" "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobileBootstrapService.php" | head -1
grep -n "PMD_MOBILE_OFFLINE_ORIGINAL_TIME_V23" "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobileCommandProcessor.php" | head -1
sha256sum "$WEB_APK"

cat <<EOF

=============================================================
PayMyDine V18.20 / Android 0.3.20 / Quick POS V94 installed.

Lineage safety:
  - Quick POS merge: deployed V92 source -> final V94 target.
  - PHP merge: exact Clean VPS snapshot 04919ec9 -> V23 target.
  - No old-marker precondition is used.
  - Blade/Settings stay live and receive only semantic cache/release pointer changes.

Offline POS:
  - provisional negative checks are selectable
  - sent provisional items support +/-
  - full Cash is durable offline
  - Card/terminal remains Cloud-only
  - table becomes occupied immediately after local Send/Hold
  - reconnect preserves healthy menu/table snapshot
  - original order placement time survives later sync

Verified Android:
  Source: $ANDROID_SOURCE_COMMIT
  APK: $APK_PUBLIC
  SHA-256: $FINAL_SHA

No database migration.
No pairing reset.
No Android Clear Data.
No git reset --hard.

Backup:
  $BACKUP
  $META
=============================================================
EOF
