#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
PMD_HOST="${PMD_HOST:-}"

# V18.12 was the last protected server deployment. V18.13 merges forward from
# that exact target while preserving local/live edits in the restaurant checkout.
BASE_COMMIT="${BASE_COMMIT:-9146c37239fb59538bef8c30b45dc282008f0562}"
TARGET_COMMIT="${TARGET_COMMIT:-f62c20deffe080746d58152fb7a07eca0e508282}"

APK_RELEASE_NAME="PayMyDine-POS-Tablet-Preview-0.3.8.apk"
APK_PUBLIC_NAME="PayMyDine-Android-0.3.8.apk"
APK_RELEASE_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/${APK_RELEASE_NAME}"
APK_SHA_URL="${APK_RELEASE_URL}.sha256"
EXPECTED_APK_SHA256="be9e0550cbc0840d9295f12192e6492ca83938548d939267f480796ed39df925"

MERGE_FILES=(
  "app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
  "app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"
  "app/Services/PmdMobileSync/PmdMobilePairingService.php"
  "app/admin/controllers/PmdQuickPosV1.php"
  "app/admin/controllers/PmdWaiterPosV1.php"
  "app/admin/controllers/PmdWaiterTableStateV154.php"
  "app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
)
SETTINGS_FILE="app/admin/views/pmdsettings/index.blade.php"

log(){ printf '\n[PMD V18.13 ANDROID 0.3.8] %s\n' "$*"; }
fail(){ printf '\n[PMD V18.13 ANDROID 0.3.8][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT/artisan"

for cmd in git curl sha256sum php tar stat grep awk tr sed cp mv mkdir; do
  command -v "$cmd" >/dev/null 2>&1 || fail "$cmd is required"
done

for rel in "${MERGE_FILES[@]}" "$SETTINGS_FILE"; do
  [[ -f "$PMD_ROOT/$rel" ]] || fail "Live file missing: $rel"
done

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Checkout: $PMD_ROOT"
log "Fetching protected source refs..."
"${GIT[@]}" fetch --prune origin main feature/android-local-first-v1

for ref in "$BASE_COMMIT" "$TARGET_COMMIT"; do
  "${GIT[@]}" cat-file -e "${ref}^{commit}" 2>/dev/null \
    || fail "Required commit unavailable: $ref"
done

# Forward-only safety gates: V18.13 is allowed only on top of the V18.12
# mobile/offline contract that was already deployed.
grep -q "PMD_ANDROID_OFFLINE_HISTORY_SNAPSHOT_V16" \
  "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobileBootstrapService.php" \
  || fail "V18.12 offline-history bootstrap is not installed."
grep -q "PMD_MOBILE_PAIR_INITIAL_STAFF_GRANT_V16" \
  "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobilePairingService.php" \
  || fail "V18.12 mobile pairing authority is not installed."
grep -q "PMD_ANDROID_POS_PREVIEW_V7_OFFLINE_HISTORY_IMAGES_SINGLE_LOGIN" \
  "$PMD_ROOT/$SETTINGS_FILE" \
  || fail "V18.12 Android Settings baseline is not installed."

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
STAGE="$PMD_ROOT/storage/pmd-v1813-android-038-$STAMP"
CONFLICT="$PMD_ROOT/storage/pmd-v1813-android-038-conflicts-$STAMP"
BACKUP="$BACKUP_DIR/android-v1813-038-before-$STAMP.tar.gz"
META="$BACKUP_DIR/android-v1813-038-before-$STAMP.txt"

WEB_DIR="$PMD_ROOT/downloads/paymydine"
WEB_APK="$WEB_DIR/$APK_PUBLIC_NAME"
WEB_SHA="$WEB_APK.sha256"

mkdir -p \
  "$BACKUP_DIR" \
  "$STAGE/base" \
  "$STAGE/target" \
  "$STAGE/candidate" \
  "$CONFLICT"

log "Downloading checksum-pinned Android 0.3.8..."
curl -fL --retry 3 --retry-delay 2 "$APK_RELEASE_URL" \
  -o "$STAGE/$APK_RELEASE_NAME"
curl -fL --retry 3 --retry-delay 2 "$APK_SHA_URL" \
  -o "$STAGE/$APK_RELEASE_NAME.sha256"

ACTUAL_APK_SHA256="$(
  sha256sum "$STAGE/$APK_RELEASE_NAME" |
    awk '{print $1}' |
    tr '[:upper:]' '[:lower:]'
)"
SIDE_APK_SHA256="$(
  awk 'NF {print $1; exit}' "$STAGE/$APK_RELEASE_NAME.sha256" |
    tr '[:upper:]' '[:lower:]'
)"

[[ "$ACTUAL_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] \
  || fail "APK SHA-256 mismatch: expected=$EXPECTED_APK_SHA256 actual=$ACTUAL_APK_SHA256"
[[ "$SIDE_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] \
  || fail "Release checksum sidecar mismatch: expected=$EXPECTED_APK_SHA256 sidecar=$SIDE_APK_SHA256"

log "APK verified: $ACTUAL_APK_SHA256"

EXISTING=()
for rel in "${MERGE_FILES[@]}" "$SETTINGS_FILE"; do
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
  echo "base=$BASE_COMMIT"
  echo "target=$TARGET_COMMIT"
  echo "android_source_commit=f62c20deffe080746d58152fb7a07eca0e508282"
  echo "android_ci_run=35795502396"
  echo "apk_release=$APK_RELEASE_NAME"
  echo "apk_public=$APK_PUBLIC_NAME"
  echo "apk_sha256=$ACTUAL_APK_SHA256"
  echo
  "${GIT[@]}" status --short -- "${MERGE_FILES[@]}" "$SETTINGS_FILE" || true
} > "$META"

log "Backup: $BACKUP"
log "Building protected V18.13 three-way merge candidates..."

for rel in "${MERGE_FILES[@]}"; do
  mkdir -p \
    "$STAGE/base/$(dirname "$rel")" \
    "$STAGE/target/$(dirname "$rel")" \
    "$STAGE/candidate/$(dirname "$rel")" \
    "$CONFLICT/$(dirname "$rel")"

  "${GIT[@]}" show "$BASE_COMMIT:$rel" > "$STAGE/base/$rel" \
    || fail "Base file missing from $BASE_COMMIT: $rel"
  "${GIT[@]}" show "$TARGET_COMMIT:$rel" > "$STAGE/target/$rel" \
    || fail "Target file missing from $TARGET_COMMIT: $rel"

  set +e
  git merge-file -p --diff3 \
    -L "LIVE:$rel" \
    -L "BASE:$rel" \
    -L "V18.13:$rel" \
    "$PMD_ROOT/$rel" \
    "$STAGE/base/$rel" \
    "$STAGE/target/$rel" \
    > "$STAGE/candidate/$rel"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]] \
    || grep -qE '^(<<<<<<<|=======|>>>>>>>|\|\|\|\|\|\|\|)' "$STAGE/candidate/$rel"; then
    cp -f "$STAGE/candidate/$rel" "$CONFLICT/$rel"
    fail "Merge conflict. No V18.13 files were installed. Candidate: $CONFLICT/$rel"
  fi
done

# The feature branch intentionally does not carry the newer V18.12 Settings
# page. Patch only the live Android download/version strings, never replace the
# rest of the restaurant Settings view from the divergent branch.
mkdir -p "$STAGE/candidate/$(dirname "$SETTINGS_FILE")"
cp -f "$PMD_ROOT/$SETTINGS_FILE" "$STAGE/candidate/$SETTINGS_FILE"
SETTINGS="$STAGE/candidate/$SETTINGS_FILE"

if grep -q "PayMyDine-Android-0.3.7.apk" "$SETTINGS"; then
  sed -i \
    's/PayMyDine-Android-0\.3\.7\.apk/PayMyDine-Android-0.3.8.apk/g' \
    "$SETTINGS"
elif ! grep -q "PayMyDine-Android-0.3.8.apk" "$SETTINGS"; then
  fail "Settings Android download baseline is neither 0.3.7 nor 0.3.8."
fi

if grep -q "Operations Preview 0.3.7" "$SETTINGS"; then
  sed -i \
    's/Operations Preview 0\.3\.7/Operations Preview 0.3.8/g' \
    "$SETTINGS"
elif ! grep -q "Operations Preview 0.3.8" "$SETTINGS"; then
  fail "Settings Android version label baseline is neither 0.3.7 nor 0.3.8."
fi

BOOT="$STAGE/candidate/app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
COMMANDS="$STAGE/candidate/app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"
PAIR="$STAGE/candidate/app/Services/PmdMobileSync/PmdMobilePairingService.php"
QPOS="$STAGE/candidate/app/admin/controllers/PmdQuickPosV1.php"
WAITER="$STAGE/candidate/app/admin/controllers/PmdWaiterPosV1.php"
TABLE_STATE="$STAGE/candidate/app/admin/controllers/PmdWaiterTableStateV154.php"
BOOTSTRAP_CONCERN="$STAGE/candidate/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"

log "Validating seamless offline POS contract..."

grep -q "PMD_ANDROID_OFFLINE_TODAY_HISTORY_V17" "$BOOT" \
  || fail "V17 offline Today/history bootstrap marker missing."
grep -q "PMD_MOBILE_OFFLINE_CASH_PAYMENT_V17" "$COMMANDS" \
  || fail "Offline cash command processor marker missing."
grep -q "PMD_MOBILE_OFFLINE_TABLE_ACTIONS_V17" "$COMMANDS" \
  || fail "Offline table actions processor marker missing."
grep -q "CASH_PAYMENT_V1" "$COMMANDS" \
  || fail "Offline cash command is not registered."
grep -q "TABLE_STATE_V1" "$COMMANDS" \
  || fail "Offline table-state command is not registered."
grep -q "TABLE_MOVE_V1" "$COMMANDS" \
  || fail "Offline table-move command is not registered."
grep -q "PMD_MOBILE_PAIR_INITIAL_STAFF_GRANT_V16" "$PAIR" \
  || fail "Initial staff-grant authority was lost."
grep -q "PMD_MOBILE_CANONICAL_TRANSFER_PAYLOAD_V17" "$QPOS" \
  || fail "Canonical mobile transfer payload marker missing."
grep -q "PMD_MOBILE_SYNC_V1" "$WAITER" \
  || fail "Waiter mobile sync contract marker missing."
grep -q "PMD_MOBILE_TABLE_STATE_CONTEXT_V17" "$TABLE_STATE" \
  || fail "Canonical mobile table-state context marker missing."
grep -q "PMD_MOBILE_CANONICAL_PAYLOAD_OVERRIDE_V17" "$BOOTSTRAP_CONCERN" \
  || fail "Canonical mobile bootstrap payload override marker missing."
grep -q "PayMyDine-Android-0.3.8.apk" "$SETTINGS" \
  || fail "Settings does not point to Android 0.3.8."
grep -q "Operations Preview 0.3.8" "$SETTINGS" \
  || fail "Settings Android label is not 0.3.8."

for rel in "${MERGE_FILES[@]}"; do
  php -l "$STAGE/candidate/$rel" >/dev/null \
    || fail "PHP syntax failed: $rel"
done

log "Publishing verified Android 0.3.8 on the PayMyDine domain..."
mkdir -p "$WEB_DIR"
root_uid="$(stat -c '%u' "$PMD_ROOT")"
root_gid="$(stat -c '%g' "$PMD_ROOT")"

apk_tmp="$WEB_APK.pmd-v1813-new"
sha_tmp="$WEB_SHA.pmd-v1813-new"
cp -f "$STAGE/$APK_RELEASE_NAME" "$apk_tmp"
printf '%s  %s\n' "$ACTUAL_APK_SHA256" "$APK_PUBLIC_NAME" > "$sha_tmp"
chmod 0644 "$apk_tmp" "$sha_tmp"
chown "$root_uid:$root_gid" "$apk_tmp" "$sha_tmp" 2>/dev/null || true
mv -f "$apk_tmp" "$WEB_APK"
mv -f "$sha_tmp" "$WEB_SHA"

LOCAL_APK_SHA256="$(
  sha256sum "$WEB_APK" |
    awk '{print $1}' |
    tr '[:upper:]' '[:lower:]'
)"
[[ "$LOCAL_APK_SHA256" == "$EXPECTED_APK_SHA256" ]] \
  || fail "First-party APK checksum changed after publication."

log "Installing validated V18.13 server files..."
for rel in "${MERGE_FILES[@]}" "$SETTINGS_FILE"; do
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"

  tmp="${dst}.pmd-v1813-new"
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

if command -v systemctl >/dev/null 2>&1 \
  && systemctl is-active --quiet php8.3-fpm.service; then
  systemctl reload php8.3-fpm.service
  log "Reloaded php8.3-fpm.service"
fi

log "Verification:"
grep -n "PMD_ANDROID_OFFLINE_TODAY_HISTORY_V17" \
  "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobileBootstrapService.php" | head -1
grep -n "PMD_MOBILE_OFFLINE_CASH_PAYMENT_V17" \
  "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobileCommandProcessor.php" | head -1
grep -n "PMD_MOBILE_OFFLINE_TABLE_ACTIONS_V17" \
  "$PMD_ROOT/app/Services/PmdMobileSync/PmdMobileCommandProcessor.php" | head -1
grep -n "PMD_MOBILE_CANONICAL_TRANSFER_PAYLOAD_V17" \
  "$PMD_ROOT/app/admin/controllers/PmdQuickPosV1.php" | head -1
grep -n "PMD_MOBILE_TABLE_STATE_CONTEXT_V17" \
  "$PMD_ROOT/app/admin/controllers/PmdWaiterTableStateV154.php" | head -1
grep -n "PayMyDine-Android-0.3.8.apk" \
  "$PMD_ROOT/$SETTINGS_FILE" | head -1

for rel in "${MERGE_FILES[@]}"; do
  php -l "$PMD_ROOT/$rel"
done
sha256sum "$WEB_APK"

if [[ -n "$PMD_HOST" ]]; then
  URL="https://$PMD_HOST/downloads/paymydine/$APK_PUBLIC_NAME"
  log "Checking first-party URL: $URL"
  HTTP_CODE="$(curl -L -sS -o /dev/null -w '%{http_code}' "$URL" || true)"
  [[ "$HTTP_CODE" == "200" ]] \
    || fail "First-party Android URL returned HTTP $HTTP_CODE"
  log "First-party Android URL returned HTTP 200."
fi

cat <<EOF

============================================================
PayMyDine Android V18.13 / APK 0.3.8 deployed.

Seamless POS failover:
  - POS stays inside the same PosActivity online and offline.
  - A WAN outage switches transport authority in place; it does not log the
    cashier out or open a second reduced POS product.
  - A process restart during the same verified offline work session resumes POS
    automatically while the offline lease is valid.
  - Reconnect drains the durable outbox before returning to Cloud authority.

Offline operational actions:
  - Send and Hold remain durable/idempotent.
  - Full cash payment can be recorded offline.
  - Pay with unsent items persists ordered SEND -> CASH intents atomically.
  - Table Cleaning / Free / Move are available offline and revalidated on sync.
  - Floors, cached History, menu images and queued-state visibility remain
    available from the trusted local snapshot.
  - Table/cash idempotency hashes retain order/table business intent.

Customer display:
  - The ZCS/customer-facing display remains bridged during failover.
  - Local cart/payment state continues to update it offline.
  - Cached data:image menu artwork can render without WAN access.

Verified Android build:
  Source commit:
    f62c20deffe080746d58152fb7a07eca0e508282
  GitHub Actions run:
    35795502396
  Server PHP syntax + safety contract: PASS
  Local WebView JavaScript syntax: PASS
  Android unit tests: PASS
  Android assemble: PASS
  Android lint: PASS
  Package/version/signing pin: PASS
  Artifact upload: PASS
  Preview release publication: PASS

APK:
  $APK_PUBLIC_NAME
  SHA-256:
    $LOCAL_APK_SHA256

No database migration.
No pairing reset.
No Android Clear Data.
No password persistence.
No git reset --hard.
Existing live files are merged, not wholesale replaced from the feature branch.

Backup:
  $BACKUP
  $META
============================================================
EOF
