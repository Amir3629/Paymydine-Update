#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="0eab32b8501acb0afed34996b0f44d4471f9b0b5"
APK_SHA256="6f78b0a9e7c9bd9d6458b2e121dd879787ec130e34ecde5f8c7dc45e0916dffc"
APK_NAME="PayMyDine-Android-0.3.36.apk"
APK_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/${APK_NAME}"
APK_REL="downloads/paymydine/${APK_NAME}"
APK_SHA_REL="downloads/paymydine/${APK_NAME}.sha256"

FILES=(
  "app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
  "app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/css/pmd-qpos-web-parity-v112.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/js/pmd-qpos-web-parity-v112.js"
  "app/admin/assets/js/push-notifications.js"
  "app/admin/controllers/PmdQuickPosV1.php"
  "app/admin/controllers/concerns/PmdQuickPosBatchPaymentV114Concern.php"
  "app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/views/pmdsettings/index.blade.php"
  "routes/admin-quick-mode.php"
)

log(){ printf '\n[PayMyDine V120 Local-First] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V120 Local-First][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v git >/dev/null 2>&1 || fail "git is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum is required"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching pinned V120 Local-First handoff"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" ||
  fail "Pinned handoff commit is unavailable: $SOURCE_COMMIT"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v120-local-first-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v120-local-first-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

log "Staging exact server/Web source"
for rel in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel" ||
    fail "Unable to stage $rel"
done

BOOT="$STAGE/app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
COMMANDS="$STAGE/app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"
CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
PARITY_CSS="$STAGE/app/admin/assets/css/pmd-qpos-web-parity-v112.css"
JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
PARITY_JS="$STAGE/app/admin/assets/js/pmd-qpos-web-parity-v112.js"
PUSH="$STAGE/app/admin/assets/js/push-notifications.js"
QUICK="$STAGE/app/admin/controllers/PmdQuickPosV1.php"
BATCH="$STAGE/app/admin/controllers/concerns/PmdQuickPosBatchPaymentV114Concern.php"
PERSIST="$STAGE/app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
SAVE="$STAGE/app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
SETTINGS="$STAGE/app/admin/views/pmdsettings/index.blade.php"
ROUTES="$STAGE/routes/admin-quick-mode.php"

log "Validating Local-First + V120 contracts before touching live files"
grep -Fq "PMD_MOBILE_TRUSTED_TIME_ANCHOR_V104" "$BOOT" ||
  fail "Trusted server-time anchor missing"
grep -Fq "PMD_MOBILE_ORDER_ITEM_ADJUST_V106" "$COMMANDS" ||
  fail "Cloud-line reconciliation command missing"
grep -Fq "PMD_MOBILE_CASH_LOCAL_AGGREGATE_RESOLVE_V101" "$COMMANDS" ||
  fail "Offline Cash aggregate reconciliation missing"

grep -Fq "PMD_QPOS_SYNC_VISIBILITY_V104" "$JS" ||
  fail "Local-First sync visibility missing"
grep -Fq "PMD_QPOS_KITCHEN_ROUND_SPLIT_V119" "$JS" ||
  fail "V119 Kitchen-round split missing"
grep -Fq "PMD_QPOS_MULTI_CHECK_PAY_RUNTIME_V114" "$JS" ||
  fail "V114 multi-check payment runtime missing"
grep -Fq "PMD_QPOS_MOBILE_PAYMENT_STACK_V120" "$CSS" ||
  fail "V120 payment layout missing"
grep -Fq "PMD_QPOS_SYNC_STATE_V104" "$CSS" ||
  fail "Sync-state styling missing"

cmp -s "$CSS" "$PARITY_CSS" ||
  fail "Android/Web CSS parity differs"
cmp -s "$JS" "$PARITY_JS" ||
  fail "Android/Web JS parity differs"

grep -Fq "PMD_MOBILE_PAY_BEFORE_KITCHEN_V108" "$SAVE" ||
  fail "Pay-before-Kitchen server contract missing"
grep -Fq "PMD_QPOS_RECEIVED_APPEND_SAVE_V113" "$SAVE" ||
  fail "Received-order append save contract missing"
grep -Fq "PMD_QPOS_APPEND_AUTHORITY_V116" "$PERSIST" ||
  fail "Canonical append authority missing"
grep -Fq "payment-batch-summary" "$ROUTES" ||
  fail "Batch payment summary route missing"
grep -Fq "payment-batch-settle" "$ROUTES" ||
  fail "Batch payment settle route missing"

grep -Fq "data-qpos-sync-state" "$VIEW" ||
  fail "Native sync-state chip missing"
grep -Fq "pmd-qpos-web-parity-v112.css?v=20260925-v120" "$VIEW" ||
  fail "V120 parity CSS cache-buster missing"
grep -Fq "pmd-qpos-web-parity-v112.js?v=20260925-v120" "$VIEW" ||
  fail "V120 parity JS cache-buster missing"
grep -Fq "PayMyDine-Android-0.3.36.apk" "$SETTINGS" ||
  fail "Settings does not point to Android 0.3.36"
grep -Fq "PMD_PUSH_NATIVE_OFFLINE_SUSPEND_V18" "$PUSH" ||
  fail "Offline notification polling guard missing"

for php_file in "$BOOT" "$COMMANDS" "$QUICK" "$BATCH" "$PERSIST" "$SAVE" "$VIEW" "$SETTINGS" "$ROUTES"; do
  php -l "$php_file" >/dev/null ||
    fail "PHP syntax failed: $php_file"
done

if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null || fail "Quick POS JavaScript syntax failed"
  node --check "$PARITY_JS" >/dev/null || fail "Parity JavaScript syntax failed"
  node --check "$PUSH" >/dev/null || fail "Push notification JavaScript syntax failed"
fi

log "Downloading signed Android 0.3.36 release"
mkdir -p "$STAGE/downloads/paymydine"
curl -fL --retry 3 --retry-delay 2   "$APK_URL"   -o "$STAGE/$APK_REL"

ACTUAL_APK_SHA="$(sha256sum "$STAGE/$APK_REL" | awk '{print $1}')"
[[ "$ACTUAL_APK_SHA" == "$APK_SHA256" ]] ||
  fail "APK SHA-256 mismatch: expected $APK_SHA256, got $ACTUAL_APK_SHA"

printf '%s  %s\n' "$APK_SHA256" "$APK_NAME" > "$STAGE/$APK_SHA_REL"

EXISTING=()
for rel in "${FILES[@]}" "$APK_REL" "$APK_SHA_REL"; do
  [[ -e "$rel" ]] && EXISTING+=("$rel")
done

if (("${#EXISTING[@]}" > 0)); then
  log "Backing up current production files"
  sudo tar -czf "$BACKUP" -- "${EXISTING[@]}"
  sudo chmod 0640 "$BACKUP" || true
fi

owner_for_new_file() {
  local rel="$1"
  local ref=""
  case "$rel" in
    *.css)
      ref="$PMD_ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
      ;;
    *.js)
      ref="$PMD_ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
      ;;
    routes/*)
      ref="$PMD_ROOT/routes/admin-quick-mode.php"
      ;;
    app/admin/views/*)
      ref="$PMD_ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
      ;;
    app/Services/*)
      ref="$PMD_ROOT/app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"
      ;;
    *)
      ref="$PMD_ROOT/app/admin/controllers/PmdQuickPosV1.php"
      ;;
  esac
  [[ -e "$ref" ]] || ref="$PMD_ROOT"
  printf '%s:%s\n' "$(stat -c '%u' "$ref")" "$(stat -c '%g' "$ref")"
}

log "Installing validated V120 Local-First platform files"
for rel in "${FILES[@]}"; do
  src="$STAGE/$rel"
  dst="$PMD_ROOT/$rel"

  if [[ -e "$dst" ]]; then
    uid="$(stat -c '%u' "$dst")"
    gid="$(stat -c '%g' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  else
    owner="$(owner_for_new_file "$rel")"
    uid="${owner%%:*}"
    gid="${owner##*:}"
    mode="644"
  fi

  sudo install -D -m "$mode" -o "$uid" -g "$gid" "$src" "$dst"
  echo "UPDATED: $rel"
done

log "Installing checksum-pinned Android APK"
APK_DIR="$PMD_ROOT/downloads/paymydine"
sudo mkdir -p "$APK_DIR"
if [[ -d "$APK_DIR" ]]; then
  apk_uid="$(stat -c '%u' "$APK_DIR")"
  apk_gid="$(stat -c '%g' "$APK_DIR")"
else
  apk_uid="$(stat -c '%u' "$PMD_ROOT")"
  apk_gid="$(stat -c '%g' "$PMD_ROOT")"
fi
sudo install -m 0644 -o "$apk_uid" -g "$apk_gid"   "$STAGE/$APK_REL" "$PMD_ROOT/$APK_REL"
sudo install -m 0644 -o "$apk_uid" -g "$apk_gid"   "$STAGE/$APK_SHA_REL" "$PMD_ROOT/$APK_SHA_REL"

log "Clearing Laravel runtime caches"
sudo -u www-data php artisan view:clear >/dev/null 2>&1 ||
  php artisan view:clear >/dev/null 2>&1 || true
sudo -u www-data php artisan route:clear >/dev/null 2>&1 ||
  php artisan route:clear >/dev/null 2>&1 || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1 ||
  php artisan cache:clear >/dev/null 2>&1 || true

log "Post-deploy verification"
cmp -s   app/admin/assets/css/pmd-quick-pos-v1.css   app/admin/assets/css/pmd-qpos-web-parity-v112.css ||
  fail "Live CSS parity verification failed"
cmp -s   app/admin/assets/js/pmd-quick-pos-v1.js   app/admin/assets/js/pmd-qpos-web-parity-v112.js ||
  fail "Live JS parity verification failed"

grep -Fq "PMD_QPOS_KITCHEN_ROUND_SPLIT_V119"   app/admin/assets/js/pmd-quick-pos-v1.js ||
  fail "Live V119 Kitchen-round verification failed"
grep -Fq "PMD_QPOS_MOBILE_PAYMENT_STACK_V120"   app/admin/assets/css/pmd-quick-pos-v1.css ||
  fail "Live V120 payment layout verification failed"
grep -Fq "data-qpos-sync-state"   app/admin/views/pmd_quick_pos_v1.blade.php ||
  fail "Live Local-First sync state missing"
grep -Fq "PayMyDine-Android-0.3.36.apk"   app/admin/views/pmdsettings/index.blade.php ||
  fail "Live Settings Android link is incorrect"
grep -Fq "PMD_PUSH_NATIVE_OFFLINE_SUSPEND_V18"   app/admin/assets/js/push-notifications.js ||
  fail "Live native-offline push guard missing"

LIVE_APK_SHA="$(sha256sum "$PMD_ROOT/$APK_REL" | awk '{print $1}')"
[[ "$LIVE_APK_SHA" == "$APK_SHA256" ]] ||
  fail "Live APK checksum mismatch"

cat <<EOF

============================================================
 PAYMYDINE V120 LOCAL-FIRST 0.3.36 DEPLOY COMPLETE
============================================================
Platform baseline:
  ec5eafa8152a618b2c84f47f952ae8e81c545a8b

Pinned handoff:
  $SOURCE_COMMIT

Android source:
  821b5b82905f7fb1947f996ebb068f1fac935b35

APK:
  $APK_NAME
  SHA-256 $APK_SHA256

ACTIVE BEHAVIOR
  Cashier UI authority       = Android SQLite / Local-First
  Cloud                      = background canonical sync
  Reconnect                  = no POS WebView replacement
  Cash full settlement       = durable offline queue
  Cloud-line +/-             = durable canonical reconciliation
  Pay-before-Kitchen HOLD    = Cloud-only reconciliation
  Kitchen started            = new order / new KDS round
  Android/Web Quick POS      = exact CSS/JS parity
  Mobile payment layout      = V120
  Rejected sync work         = visible / not silently dropped

INTENTIONALLY CLOUD-ONLY
  Card / integrated terminal authorization
  Combined multi-check settlement
  Split/provider payment flows

Backup:
  $BACKUP
============================================================
EOF
