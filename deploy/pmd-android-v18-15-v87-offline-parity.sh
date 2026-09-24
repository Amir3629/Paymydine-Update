#!/usr/bin/env bash
set -Eeuo pipefail

# PMD_ANDROID_V18_15_V87_OFFLINE_PARITY
PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
PMD_HOST="${PMD_HOST:-}"

QPOS_BASE_COMMIT="${QPOS_BASE_COMMIT:-e7795b5a5990226c1241948a251f52e59f43428d}"
QPOS_TARGET_COMMIT="${QPOS_TARGET_COMMIT:-5d0ed351388314bf79287205c4405f3383230a92}"
ANDROID_SOURCE_COMMIT="${ANDROID_SOURCE_COMMIT:-aea972574d10ec59390c9179b055da4ef63cadcc}"

APK_VERSION="0.3.13"
APK_RELEASE_NAME="PayMyDine-POS-Tablet-Preview-${APK_VERSION}.apk"
APK_PUBLIC_NAME="PayMyDine-Android-${APK_VERSION}.apk"
APK_RELEASE_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/${APK_RELEASE_NAME}"
APK_SHA_URL="${APK_RELEASE_URL}.sha256"
EXPECTED_APK_SHA256="63713a756c37373585f2761f6412111f378d307adc74e2403f7095f578c59076"

QPOS_FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)
SETTINGS_FILE="app/admin/views/pmdsettings/index.blade.php"
BOOTSTRAP_FILE="app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
COMMAND_FILE="app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"

log(){ printf '\n[PMD V18.15 ANDROID 0.3.13] %s\n' "$*"; }
fail(){ printf '\n[PMD V18.15 ANDROID 0.3.13][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

for cmd in git curl sha256sum tar stat grep awk tr sed cp mv mkdir dirname chmod chown; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

[[ "$EXPECTED_APK_SHA256" =~ ^[0-9a-f]{64}$ ]] || fail "Invalid pinned APK SHA-256."

for rel in "${QPOS_FILES[@]}" "$SETTINGS_FILE" "$BOOTSTRAP_FILE" "$COMMAND_FILE"; do
  [[ -f "$PMD_ROOT/$rel" ]] || fail "Live file missing: $rel"
done

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Checkout: $PMD_ROOT"
log "Fetching protected source refs..."
"${GIT[@]}" fetch --prune origin main feature/android-local-first-v1

for ref in "$QPOS_BASE_COMMIT" "$QPOS_TARGET_COMMIT" "$ANDROID_SOURCE_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null || fail "Required commit unavailable: $ref"
done

# Refuse to apply this release over an older offline authority.
grep -q "PMD_ANDROID_CANONICAL_QPOS_SETTINGS_V18" "$PMD_ROOT/$BOOTSTRAP_FILE" || fail "V18.14 canonical offline bootstrap is not installed."
grep -q "PMD_ANDROID_CANONICAL_MULTI_CHECK_SNAPSHOT_V18" "$PMD_ROOT/$BOOTSTRAP_FILE" || fail "V18.14 multi-check snapshot contract is not installed."
grep -q "PMD_MOBILE_OFFLINE_ORIGINAL_TIME_V18" "$PMD_ROOT/$COMMAND_FILE" || fail "V18.14 original order-time contract is not installed."
grep -q "PMD_MOBILE_OFFLINE_PAYMENT_TIME_V18" "$PMD_ROOT/$COMMAND_FILE" || fail "V18.14 original payment-time contract is not installed."

# Verify that the Android source commit really packages the same V87 product.
"${GIT[@]}" show "$ANDROID_SOURCE_COMMIT:mobile/android/app/build.gradle.kts" | grep -q "PMD_ANDROID_0_3_13_MOBILE_FLOW" || fail "Android 0.3.13 version marker missing."
"${GIT[@]}" show "$ANDROID_SOURCE_COMMIT:mobile/android/app/src/main/java/com/paymydine/mobile/PosActivity.kt" | grep -q "PMD_ANDROID_POS_LIVE_ROTATION_V87" || fail "Android V87 live-rotation marker missing."
"${GIT[@]}" show "$ANDROID_SOURCE_COMMIT:app/admin/assets/css/pmd-quick-pos-v1.css" | grep -q "PMD_QPOS_MOBILE_FLOW_V87" || fail "Bundled V87 CSS marker missing from Android source."
"${GIT[@]}" show "$ANDROID_SOURCE_COMMIT:app/admin/assets/js/pmd-quick-pos-v1.js" | grep -q "PMD_QPOS_MOBILE_HISTORY_V87" || fail "Bundled V87 JS marker missing from Android source."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-v1815-android-0313-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-v1815-android-0313-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-v1815-0313-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-v1815-0313-before-$STAMP.txt"
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
for rel in "${QPOS_FILES[@]}" "$SETTINGS_FILE"; do
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
  echo "qpos_target=$QPOS_TARGET_COMMIT"
  echo "android_source_commit=$ANDROID_SOURCE_COMMIT"
  echo "apk_release=$APK_RELEASE_NAME"
  echo "apk_public=$APK_PUBLIC_NAME"
  echo "apk_sha256=$ACTUAL_APK_SHA256"
  echo
  "${GIT[@]}" status --short -- "${QPOS_FILES[@]}" "$SETTINGS_FILE" || true
} > "$META"

log "Backup: $BACKUP"
log "Building protected V18.15 Quick POS V87 merge candidates..."

for rel in "${QPOS_FILES[@]}"; do
  mkdir -p \
    "$STAGE/base/$(dirname "$rel")" \
    "$STAGE/target/$(dirname "$rel")" \
    "$STAGE/candidate/$(dirname "$rel")" \
    "$CONFLICT/$(dirname "$rel")"

  "${GIT[@]}" show "$QPOS_BASE_COMMIT:$rel" > "$STAGE/base/$rel" || fail "Base file missing from $QPOS_BASE_COMMIT: $rel"
  "${GIT[@]}" show "$QPOS_TARGET_COMMIT:$rel" > "$STAGE/target/$rel" || fail "Target file missing from $QPOS_TARGET_COMMIT: $rel"

  set +e
  git merge-file -p --diff3 \
    -L "LIVE:$rel" \
    -L "BASE:$rel" \
    -L "V18.15:$rel" \
    "$PMD_ROOT/$rel" \
    "$STAGE/base/$rel" \
    "$STAGE/target/$rel" \
    > "$STAGE/candidate/$rel"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$rel"; then
    cp -f "$STAGE/candidate/$rel" "$CONFLICT/$rel"
    fail "Merge conflict. No V18.15 server files were installed. Candidate: $CONFLICT/$rel"
  fi
done

mkdir -p "$STAGE/candidate/$(dirname "$SETTINGS_FILE")"
cp -f "$PMD_ROOT/$SETTINGS_FILE" "$STAGE/candidate/$SETTINGS_FILE"
SETTINGS="$STAGE/candidate/$SETTINGS_FILE"

grep -Eq 'PayMyDine-Android-0\.3\.[0-9]+\.apk' "$SETTINGS" || fail "Current Android download pointer was not found in Settings."
sed -E -i 's/PayMyDine-Android-0\.3\.[0-9]+\.apk/PayMyDine-Android-0.3.13.apk/g' "$SETTINGS"
if grep -Eq '(Operations Preview|Canonical Offline POS) 0\.3\.[0-9]+' "$SETTINGS"; then
  sed -E -i 's/(Operations Preview|Canonical Offline POS) 0\.3\.[0-9]+/Canonical Offline POS 0.3.13/g' "$SETTINGS"
fi

CSS="$STAGE/candidate/app/admin/assets/css/pmd-quick-pos-v1.css"
JS="$STAGE/candidate/app/admin/assets/js/pmd-quick-pos-v1.js"
VIEW="$STAGE/candidate/app/admin/views/pmd_quick_pos_v1.blade.php"

log "Validating V87 online/offline parity contract..."
grep -q "PMD_QPOS_MOBILE_FLOW_V87" "$CSS" || fail "V87 mobile-flow CSS marker missing."
grep -q "PMD_QPOS_MOBILE_HISTORY_V87" "$JS" || fail "V87 mobile History marker missing."
grep -q 'pmd-quick-pos-v1.css?v=20260924-87' "$VIEW" || fail "V87 CSS cache-buster missing from Quick POS view."
grep -q 'pmd-quick-pos-v1.js?v=20260924-zcs-profile-v2-v87' "$VIEW" || fail "V87 JS cache-buster missing from Quick POS view."
grep -q "PayMyDine-Android-0.3.13.apk" "$SETTINGS" || fail "Settings does not point to Android 0.3.13."
grep -q "Canonical Offline POS 0.3.13" "$SETTINGS" || fail "Settings Android 0.3.13 label missing."

# Guard the already-deployed offline business authority. V18.15 must not replace it.
grep -q "PMD_ANDROID_CANONICAL_QPOS_SETTINGS_V18" "$PMD_ROOT/$BOOTSTRAP_FILE" || fail "Live V18.14 bootstrap marker disappeared."
grep -q "PMD_MOBILE_OFFLINE_CASH_PAYMENT_V17" "$PMD_ROOT/$COMMAND_FILE" || fail "Live offline cash marker disappeared."
grep -q "PMD_MOBILE_OFFLINE_TABLE_ACTIONS_V17" "$PMD_ROOT/$COMMAND_FILE" || fail "Live offline table-action marker disappeared."

log "Publishing verified Android 0.3.13 on the PayMyDine domain..."
mkdir -p "$WEB_DIR"
root_uid="$(stat -c '%u' "$PMD_ROOT")"
root_gid="$(stat -c '%g' "$PMD_ROOT")"

apk_tmp="$WEB_APK.pmd-v1815-new"
sha_tmp="$WEB_SHA.pmd-v1815-new"
cp -f "$STAGE/$APK_RELEASE_NAME" "$apk_tmp"
printf '%s  %s\n' "$ACTUAL_APK_SHA256" "$APK_PUBLIC_NAME" > "$sha_tmp"
chmod 0644 "$apk_tmp" "$sha_tmp"
chown "$root_uid:$root_gid" "$apk_tmp" "$sha_tmp" 2>/dev/null || true
mv -f "$apk_tmp" "$WEB_APK"
mv -f "$sha_tmp" "$WEB_SHA"

LOCAL_APK_SHA256="$(sha256sum "$WEB_APK" | awk '{print $1}' | tr '[:upper:]' '[:lower:]')"
[[ "$LOCAL_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] || fail "First-party APK checksum changed after publication."

log "Installing validated V18.15 server files..."
for rel in "${QPOS_FILES[@]}" "$SETTINGS_FILE"; do
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"
  tmp="${dst}.pmd-v1815-new"

  cp -f "$STAGE/candidate/$rel" "$tmp"
  chmod "$mode" "$tmp" 2>/dev/null || chmod 0644 "$tmp"
  chown "$uid:$gid" "$tmp" 2>/dev/null || true
  mv -f "$tmp" "$dst"
done

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
grep -n "PMD_QPOS_MOBILE_FLOW_V87" "$PMD_ROOT/app/admin/assets/css/pmd-quick-pos-v1.css" | head -1
grep -n "PMD_QPOS_MOBILE_HISTORY_V87" "$PMD_ROOT/app/admin/assets/js/pmd-quick-pos-v1.js" | head -1
grep -n 'pmd-quick-pos-v1.css?v=20260924-87' "$PMD_ROOT/app/admin/views/pmd_quick_pos_v1.blade.php" | head -1
grep -n 'pmd-quick-pos-v1.js?v=20260924-zcs-profile-v2-v87' "$PMD_ROOT/app/admin/views/pmd_quick_pos_v1.blade.php" | head -1
grep -n "PayMyDine-Android-0.3.13.apk" "$PMD_ROOT/$SETTINGS_FILE" | head -1
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
PayMyDine Android V18.15 / APK 0.3.13 deployed.

Online/offline parity:
  - Cloud Quick POS is upgraded from V86 to V87.
  - Android 0.3.13 bundles the same V87 Quick POS CSS/JS for local mode.
  - Mobile/portrait table and food-card flow now matches online and offline.
  - History uses the same V87 mobile layout online and offline.
  - POS keeps one live WebView while rotating between portrait and landscape.

Offline authority preserved:
  - WAN loss stays inside the current POS Activity/WebView.
  - SQLite snapshot, durable cart, sent items, current-day History and images remain local-first.
  - Hold/Send, full cash payment, Cleaning/Free/Move remain durable offline.
  - Card/terminal/provider approval remains Cloud-only and fail-closed.
  - Original offline order/payment timestamps remain preserved on reconnect.

Verified release:
  Quick POS target:
    $QPOS_TARGET_COMMIT
  Android source:
    $ANDROID_SOURCE_COMMIT
  APK:
    $APK_PUBLIC_NAME
  SHA-256:
    $LOCAL_APK_SHA256

No database migration.
No pairing reset.
No Android Clear Data.
No password persistence.
No git reset --hard.

Backup:
  $BACKUP
  $META
============================================================
EOF
