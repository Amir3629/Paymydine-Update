#!/usr/bin/env bash
set -Eeuo pipefail

# PMD_ANDROID_V18_22_V94_ADAPTIVE_OFFLINE_COMPLETE
PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"

PRE_V1817_SNAPSHOT="${PRE_V1817_SNAPSHOT:-04919ec9fb0a2bb54bf47c45f29014dbd505a9eb}"
QPOS_V92_SOURCE="${QPOS_V92_SOURCE:-87af917412b7d3e674d0cd8b663ecb89fe1bd6b2}"
QPOS_V94_SOURCE="${QPOS_V94_SOURCE:-53320eda20ce886802c26cbb536c6a808f785ab9}"
PHP_V23_TARGET="${PHP_V23_TARGET:-2456d150e632be756a3b268acce3a37895bbf4ec}"
ANDROID_SOURCE_COMMIT="${ANDROID_SOURCE_COMMIT:-53320eda20ce886802c26cbb536c6a808f785ab9}"

APK_VERSION="0.3.20"
APK_RELEASE="PayMyDine-POS-Tablet-Preview-${APK_VERSION}.apk"
APK_PUBLIC="PayMyDine-Android-${APK_VERSION}.apk"
RELEASE_BASE="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview"
APK_URL="${RELEASE_BASE}/${APK_RELEASE}"
APK_SHA_URL="${APK_URL}.sha256"
EXPECTED_APK_SHA256="ec9fed9224ee8206c40c57381f9c56b424f5fd9303acd0a7e739485181176e9b"

CSS_FILE="app/admin/assets/css/pmd-quick-pos-v1.css"
JS_FILE="app/admin/assets/js/pmd-quick-pos-v1.js"
VIEW_FILE="app/admin/views/pmd_quick_pos_v1.blade.php"
SETTINGS_FILE="app/admin/views/pmdsettings/index.blade.php"
BOOTSTRAP_FILE="app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
COMMAND_FILE="app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"

LIVE_FILES=(
  "$CSS_FILE"
  "$JS_FILE"
  "$VIEW_FILE"
  "$SETTINGS_FILE"
  "$BOOTSTRAP_FILE"
  "$COMMAND_FILE"
)

log(){ printf '\n[PMD V18.22 / ANDROID 0.3.20 / ADAPTIVE V94] %s\n' "$*"; }
fail(){ printf '\n[PMD V18.22][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

for cmd in git curl sha256sum tar stat grep awk tr sed cp mv mkdir dirname chmod chown php cmp tail; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

for rel in "${LIVE_FILES[@]}"; do
  [[ -f "$PMD_ROOT/$rel" ]] || fail "Live file missing: $rel"
done

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching pinned source refs..."
"${GIT[@]}" fetch --prune origin main feature/android-local-first-v1

for ref in "$PRE_V1817_SNAPSHOT" "$QPOS_V92_SOURCE" "$QPOS_V94_SOURCE" "$PHP_V23_TARGET" "$ANDROID_SOURCE_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null ||
    fail "Required commit unavailable: $ref"
done

"${GIT[@]}" merge-base --is-ancestor "$QPOS_V92_SOURCE" "$QPOS_V94_SOURCE" ||
  fail "V92 is not an ancestor of the V94 source."
"${GIT[@]}" merge-base --is-ancestor "$PRE_V1817_SNAPSHOT" "$PHP_V23_TARGET" ||
  fail "Clean VPS snapshot is not an ancestor of the V23 server target."

git_show_contains() {
  local ref="$1" path="$2" needle="$3"
  grep -Fq "$needle" < <("${GIT[@]}" show "$ref:$path")
}

git_show_not_contains() {
  local ref="$1" path="$2" needle="$3"
  ! grep -Fq "$needle" < <("${GIT[@]}" show "$ref:$path")
}

log "Validating pinned Android/offline source contract..."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/build.gradle.kts" "versionCode = 33" ||
  fail "Android 0.3.20 versionCode missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/build.gradle.kts" "PMD_ANDROID_0_3_20_OFFLINE_COMPLETE_V23" ||
  fail "Android offline-complete marker missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "$JS_FILE" "PMD_QPOS_NATIVE_PROVISIONAL_CHECK_IDS_V93" ||
  fail "Provisional-check JS target missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/LocalPosBridge.kt" "PMD_ANDROID_PROVISIONAL_ITEM_MUTATION_V23" ||
  fail "Provisional item mutation bridge missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/LocalPosBridge.kt" "PMD_ANDROID_LOCAL_TABLE_OCCUPIED_V23" ||
  fail "Local occupied-table projection missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/data/local/LocalPosRepository.kt" "PMD_ANDROID_PROVISIONAL_ORDER_EDIT_V23" ||
  fail "Local provisional order editing missing."
git_show_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/data/local/BootstrapRepository.kt" "PMD_ANDROID_NON_DESTRUCTIVE_RECONNECT_SNAPSHOT_V23" ||
  fail "Non-destructive reconnect snapshot missing."
git_show_not_contains "$ANDROID_SOURCE_COMMIT" "mobile/android/app/src/main/java/com/paymydine/mobile/ui/PmdStaffLogin.kt" "Continue offline as " ||
  fail "Legacy separate offline login button is present."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="$PMD_ROOT/storage/pmd-v1822-v94-0320-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-v1822-v94-conflicts-$STAMP"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/android-v1822-0320-v94-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-v1822-0320-v94-before-$STAMP.txt"
WEB_DIR="$PMD_ROOT/downloads/paymydine"
WEB_APK="$WEB_DIR/$APK_PUBLIC"
WEB_SHA="$WEB_APK.sha256"

mkdir -p "$STAGE" "$STAGE/candidate" "$STAGE/source" "$CONFLICT" "$BACKUP_DIR"

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

BACKUP_FILES=("${LIVE_FILES[@]}")
[[ -f "$WEB_APK" ]] && BACKUP_FILES+=("${WEB_APK#$PMD_ROOT/}")
[[ -f "$WEB_SHA" ]] && BACKUP_FILES+=("${WEB_SHA#$PMD_ROOT/}")
tar -czf "$BACKUP" "${BACKUP_FILES[@]}"

{
  echo "timestamp_utc=$STAMP"
  echo "root=$PMD_ROOT"
  echo "checkout_head=$("${GIT[@]}" rev-parse HEAD)"
  echo "origin_main=$("${GIT[@]}" rev-parse origin/main)"
  echo "pre_v1817_snapshot=$PRE_V1817_SNAPSHOT"
  echo "qpos_v92_source=$QPOS_V92_SOURCE"
  echo "qpos_v94_source=$QPOS_V94_SOURCE"
  echo "php_v23_target=$PHP_V23_TARGET"
  echo "android_source=$ANDROID_SOURCE_COMMIT"
  echo "apk_sha256=$ACTUAL_APK_SHA256"
  echo
  "${GIT[@]}" status --short -- "${LIVE_FILES[@]}" || true
} > "$META"

log "Backup: $BACKUP"

mkdir -p   "$STAGE/candidate/$(dirname "$CSS_FILE")"   "$STAGE/candidate/$(dirname "$JS_FILE")"   "$STAGE/candidate/$(dirname "$VIEW_FILE")"   "$STAGE/candidate/$(dirname "$SETTINGS_FILE")"   "$STAGE/candidate/$(dirname "$BOOTSTRAP_FILE")"   "$STAGE/candidate/$(dirname "$COMMAND_FILE")"

# ------------------------------------------------------------------
# CSS: never full-merge. V94 CSS is V92 CSS + an exact appended suffix.
# If live is already V94/V95/V96, preserve it byte-for-byte.
# ------------------------------------------------------------------
log "Preparing CSS adaptively without full-file merge..."
CSS_BASE="$STAGE/source/css-v92.css"
CSS_TARGET="$STAGE/source/css-v94.css"
CSS_CANDIDATE="$STAGE/candidate/$CSS_FILE"

"${GIT[@]}" show "$QPOS_V92_SOURCE:$CSS_FILE" > "$CSS_BASE"
"${GIT[@]}" show "$QPOS_V94_SOURCE:$CSS_FILE" > "$CSS_TARGET"

BASE_CSS_SIZE="$(stat -c '%s' "$CSS_BASE")"
TARGET_CSS_SIZE="$(stat -c '%s' "$CSS_TARGET")"
(( TARGET_CSS_SIZE > BASE_CSS_SIZE )) ||
  fail "V94 CSS is not larger than its V92 base."
cmp -n "$BASE_CSS_SIZE" "$CSS_BASE" "$CSS_TARGET" >/dev/null ||
  fail "V94 CSS is not an append-only descendant of V92 CSS."

cp -f "$PMD_ROOT/$CSS_FILE" "$CSS_CANDIDATE"

has_v93=0
has_v94=0
grep -q "PMD_QPOS_MOBILE_TOUCH_HISTORY_V93" "$CSS_CANDIDATE" && has_v93=1 || true
grep -q "PMD_QPOS_FLOATING_CART_MODAL_SAFETY_V94" "$CSS_CANDIDATE" && has_v94=1 || true

if [[ "$has_v93" -eq 1 && "$has_v94" -eq 1 ]]; then
  log "Live CSS already contains V93/V94 (possibly V95/V96); preserving it unchanged."
elif [[ "$has_v93" -eq 0 && "$has_v94" -eq 0 ]]; then
  grep -q "PMD_QPOS_VISUAL_CLEANUP_V90" "$CSS_CANDIDATE" ||
    fail "Live CSS is neither known V90 nor V93+; refusing semantic append."
  printf '\n' >> "$CSS_CANDIDATE"
  tail -c "+$((BASE_CSS_SIZE + 1))" "$CSS_TARGET" >> "$CSS_CANDIDATE"
  log "Appended the exact V93/V94 CSS suffix to the live CSS."
else
  fail "Live CSS contains only one of the V93/V94 markers; refusing partial CSS state."
fi

# ------------------------------------------------------------------
# JS: the clean VPS snapshot was captured after successful V18.17.
# Apply only the V92-source -> V94-source delta onto the current live JS.
# If live already has V93 controls (for example a newer web hotfix), preserve it.
# ------------------------------------------------------------------
log "Preparing JS adaptively from V92 source -> V94 target..."
JS_V92="$STAGE/source/js-v92.js"
JS_V94="$STAGE/source/js-v94.js"
JS_CANDIDATE="$STAGE/candidate/$JS_FILE"

"${GIT[@]}" show "$QPOS_V92_SOURCE:$JS_FILE" > "$JS_V92"
"${GIT[@]}" show "$QPOS_V94_SOURCE:$JS_FILE" > "$JS_V94"

if grep -q "PMD_QPOS_NATIVE_PROVISIONAL_CHECK_IDS_V93" "$PMD_ROOT/$JS_FILE" &&
   grep -q "PMD_QPOS_HISTORY_TABLE_WORKSPACE_V93" "$PMD_ROOT/$JS_FILE"; then
  cp -f "$PMD_ROOT/$JS_FILE" "$JS_CANDIDATE"
  log "Live JS already contains V93 offline-order controls; preserving it unchanged."
else
  set +e
  git merge-file -p --diff3 \
    -L "LIVE:$JS_FILE" \
    -L "V92_SOURCE:$JS_FILE" \
    -L "V94_SOURCE:$JS_FILE" \
    "$PMD_ROOT/$JS_FILE" "$JS_V92" "$JS_V94" \
    > "$JS_CANDIDATE"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] ||
     grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$JS_CANDIDATE"; then
    mkdir -p "$CONFLICT/$(dirname "$JS_FILE")"
    cp -f "$JS_CANDIDATE" "$CONFLICT/$JS_FILE"
    fail "JS V92 -> V94 merge conflict. Nothing installed. Candidate: $CONFLICT/$JS_FILE"
  fi
fi
# ------------------------------------------------------------------
# PHP: if the V23 capability is already live, preserve it. Otherwise
# merge from the exact Clean VPS snapshot captured before these changes.
# ------------------------------------------------------------------
log "Preparing server sync PHP adaptively..."
for rel in "$BOOTSTRAP_FILE" "$COMMAND_FILE"; do
  candidate="$STAGE/candidate/$rel"
  marker=""
  if [[ "$rel" == "$BOOTSTRAP_FILE" ]]; then
    marker="PMD_MOBILE_OFFLINE_CASH_CAPABILITY_V23"
  else
    marker="PMD_MOBILE_OFFLINE_ORIGINAL_TIME_V23"
  fi

  if grep -q "$marker" "$PMD_ROOT/$rel"; then
    cp -f "$PMD_ROOT/$rel" "$candidate"
    log "Live $(basename "$rel") already has $marker; preserving it."
  else
    base="$STAGE/source/php-base-$(basename "$rel")"
    target="$STAGE/source/php-target-$(basename "$rel")"
    "${GIT[@]}" show "$PRE_V1817_SNAPSHOT:$rel" > "$base"
    "${GIT[@]}" show "$PHP_V23_TARGET:$rel" > "$target"

    set +e
    git merge-file -p --diff3       -L "LIVE:$rel"       -L "CLEAN_VPS:$rel"       -L "V23:$rel"       "$PMD_ROOT/$rel" "$base" "$target" > "$candidate"
    rc=$?
    set -e

    if [[ $rc -ne 0 ]] ||
       grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$candidate"; then
      mkdir -p "$CONFLICT/$(dirname "$rel")"
      cp -f "$candidate" "$CONFLICT/$rel"
      fail "PHP lineage merge conflict in $rel. Nothing installed. Candidate: $CONFLICT/$rel"
    fi
  fi
done

# ------------------------------------------------------------------
# Blade + Settings: preserve live content; only mutate release identities.
# ------------------------------------------------------------------
log "Preparing live Blade/Settings semantic pointers..."
VIEW="$STAGE/candidate/$VIEW_FILE"
SETTINGS="$STAGE/candidate/$SETTINGS_FILE"

cp -f "$PMD_ROOT/$VIEW_FILE" "$VIEW"
cp -f "$PMD_ROOT/$SETTINGS_FILE" "$SETTINGS"

grep -Eq 'pmd-quick-pos-v1\.css\?v=[^"]+' "$VIEW" ||
  fail "Quick POS CSS asset tag not found in live Blade."
grep -Eq 'pmd-quick-pos-v1\.js\?v=[^"]+' "$VIEW" ||
  fail "Quick POS JS asset tag not found in live Blade."

sed -E -i   's#pmd-quick-pos-v1\.css\?v=[^"]+#pmd-quick-pos-v1.css?v=20260924-offline-refresh-v1822#g'   "$VIEW"
sed -E -i   's#pmd-quick-pos-v1\.js\?v=[^"]+#pmd-quick-pos-v1.js?v=20260924-offline-complete-v1822#g'   "$VIEW"

grep -Eq 'PayMyDine-Android-0\.3\.[0-9]+\.apk' "$SETTINGS" ||
  fail "Android download pointer not found in live Settings."
sed -E -i   's/PayMyDine-Android-0\.3\.[0-9]+\.apk/PayMyDine-Android-0.3.20.apk/g'   "$SETTINGS"
if grep -Eq '(Operations Preview|Canonical Offline POS) 0\.3\.[0-9]+' "$SETTINGS"; then
  sed -E -i     's/(Operations Preview|Canonical Offline POS) 0\.3\.[0-9]+/Canonical Offline POS 0.3.20/g'     "$SETTINGS"
fi

CSS_CANDIDATE="$STAGE/candidate/$CSS_FILE"
JS_CANDIDATE="$STAGE/candidate/$JS_FILE"
BOOTSTRAP="$STAGE/candidate/$BOOTSTRAP_FILE"
COMMAND="$STAGE/candidate/$COMMAND_FILE"

log "Validating the complete candidate before installing anything..."
grep -q "PMD_QPOS_MOBILE_TOUCH_HISTORY_V93" "$CSS_CANDIDATE" ||
  fail "Candidate CSS missing V93 mobile History/touch contract."
grep -q "PMD_QPOS_FLOATING_CART_MODAL_SAFETY_V94" "$CSS_CANDIDATE" ||
  fail "Candidate CSS missing V94 modal-safe cart contract."

grep -q "PMD_QPOS_REQUEST_FAILOVER_V91" "$JS_CANDIDATE" ||
  fail "Candidate JS missing V91 request failover."
grep -q "PMD_QPOS_NATIVE_DURABLE_MUTATIONS_V92" "$JS_CANDIDATE" ||
  fail "Candidate JS missing V92 durable mutations."
grep -q "PMD_QPOS_TERMINAL_SAFE_FAILOVER_V92" "$JS_CANDIDATE" ||
  fail "Candidate JS missing terminal-safe failover."
grep -q "PMD_QPOS_NATIVE_PROVISIONAL_CHECK_IDS_V93" "$JS_CANDIDATE" ||
  fail "Candidate JS missing selectable local provisional checks."
grep -Fq "state.activeOrderId = id !== 0 ? id : null" "$JS_CANDIDATE" ||
  fail "Candidate JS still rejects negative local check IDs."
grep -Fq "if (itemId === 0) return;" "$JS_CANDIDATE" ||
  fail "Candidate JS rejects negative local line IDs."
grep -Fq "orderMenuId !== 0" "$JS_CANDIDATE" ||
  fail "Candidate JS sent-item +/- does not accept local IDs."

grep -q "PMD_MOBILE_OFFLINE_CASH_CAPABILITY_V23" "$BOOTSTRAP" ||
  fail "Candidate bootstrap missing offline cash V23."
grep -Fq "'offline_payment_enabled' => true" "$BOOTSTRAP" ||
  fail "Candidate bootstrap does not enable offline payment."
grep -Fq "'offline_cash_payment_enabled' => true" "$BOOTSTRAP" ||
  fail "Candidate bootstrap does not enable offline Cash."
grep -Fq "'offline_card_payment_enabled' => false" "$BOOTSTRAP" ||
  fail "Candidate bootstrap must keep offline Card disabled."

grep -q "PMD_MOBILE_OFFLINE_ORIGINAL_TIME_V23" "$COMMAND" ||
  fail "Candidate command processor missing business-time V23."
grep -q "isOriginalLocalCreateCommand" "$COMMAND" ||
  fail "Candidate command processor missing local-create time authority."
grep -q "client_created_at_ms" "$COMMAND" ||
  fail "Candidate command processor missing original order time."

grep -q 'pmd-quick-pos-v1.css?v=20260924-offline-refresh-v1822' "$VIEW" ||
  fail "CSS refresh identity missing."
grep -q 'pmd-quick-pos-v1.js?v=20260924-offline-complete-v1822' "$VIEW" ||
  fail "JS refresh identity missing."
grep -q "PayMyDine-Android-0.3.20.apk" "$SETTINGS" ||
  fail "Settings does not point to Android 0.3.20."

php -l "$BOOTSTRAP" >/dev/null ||
  fail "Bootstrap PHP syntax failed."
php -l "$COMMAND" >/dev/null ||
  fail "Command processor PHP syntax failed."
if command -v node >/dev/null 2>&1; then
  node --check "$JS_CANDIDATE" >/dev/null ||
    fail "Quick POS JavaScript syntax failed."
fi

log "All candidate validation passed. Installing atomically..."
for rel in "${LIVE_FILES[@]}"; do
  src="$STAGE/candidate/$rel"
  dst="$PMD_ROOT/$rel"
  tmp="${dst}.pmd-v1822-new"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"

  cp -f "$src" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

log "Publishing verified Android 0.3.20..."
mkdir -p "$WEB_DIR"
root_uid="$(stat -c '%u' "$PMD_ROOT")"
root_gid="$(stat -c '%g' "$PMD_ROOT")"

apk_tmp="$WEB_APK.pmd-v1822-new"
sha_tmp="$WEB_SHA.pmd-v1822-new"
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
grep -n "PMD_QPOS_MOBILE_TOUCH_HISTORY_V93" "$PMD_ROOT/$CSS_FILE" | head -1
grep -n "PMD_QPOS_FLOATING_CART_MODAL_SAFETY_V94" "$PMD_ROOT/$CSS_FILE" | head -1
grep -n "PMD_QPOS_NATIVE_PROVISIONAL_CHECK_IDS_V93" "$PMD_ROOT/$JS_FILE" | head -1
grep -n 'pmd-quick-pos-v1.js?v=20260924-offline-complete-v1822' "$PMD_ROOT/$VIEW_FILE" | head -1
grep -n "PMD_MOBILE_OFFLINE_CASH_CAPABILITY_V23" "$PMD_ROOT/$BOOTSTRAP_FILE" | head -1
grep -n "PMD_MOBILE_OFFLINE_ORIGINAL_TIME_V23" "$PMD_ROOT/$COMMAND_FILE" | head -1
sha256sum "$WEB_APK"

cat <<EOF

=============================================================
PayMyDine V18.22 / Android 0.3.20 / Adaptive V94 installed.

Adaptive deployment:
  - CSS full-file merge was removed.
  - Existing V94/V95/V96 CSS is preserved unchanged.
  - Older V90 CSS receives only the exact append-only V93/V94 suffix.
  - JS applies only the V92-source -> V94-source delta onto the current live file.
  - Existing V93+ JS from a newer web hotfix is preserved unchanged.
  - Existing V23 PHP files are preserved; older files are merged from the
    exact Clean VPS snapshot.

Offline contract:
  - provisional local checks are selectable
  - sent provisional items support +/-
  - full Cash is durable offline
  - Card/terminal remains Cloud-only
  - table state becomes occupied locally after Send/Hold
  - reconnect does not wipe a healthy local menu/table snapshot
  - original offline placement time is authoritative on later sync

Android:
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
