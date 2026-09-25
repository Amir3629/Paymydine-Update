#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_REF="archive/v122-local-first-037-source"
SOURCE_COMMIT="dd42da80047384d0184fadc97e5f8a804cbdbb57"
FROZEN_PLATFORM="4d16e6a4c8d18ef581d117281c2183dbfea5b627"

APK_NAME="PayMyDine-Android-0.3.37.apk"
APK_SHA256="4ad8991693746b4ec3526567a033c474f356f1080a1c52f8e64e232a71970418"
APK_URL="https://github.com/Amir3629/Paymydine-Update/releases/download/pmd-android-local-first-preview/${APK_NAME}"
APK_REL="downloads/paymydine/${APK_NAME}"
APK_SHA_REL="downloads/paymydine/${APK_NAME}.sha256"

FILES=(
  "app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
  "app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"
  "app/Services/PmdMobileSync/PmdMobilePairingService.php"
  "app/Services/TerminalPayments/TerminalPaymentService.php"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/css/pmd-qpos-web-parity-v112.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/js/pmd-qpos-web-parity-v112.js"
  "app/admin/assets/js/push-notifications.js"
  "app/admin/controllers/PmdQuickPosV1.php"
  "app/admin/controllers/KitchenDisplay.php"
  "app/admin/controllers/PmdWaiterPosV1.php"
  "app/admin/controllers/PmdWaiterTableStateV154.php"
  "app/admin/controllers/concerns/PmdQuickPosBatchPaymentV114Concern.php"
  "app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
  "app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php"
  "app/admin/controllers/concerns/PmdWaiterPosOperationsSummaryV12Concern.php"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/views/kitchendisplay/index.blade.php"
  "app/admin/views/pmdsettings/index.blade.php"
  "routes/admin-quick-mode.php"
)

log(){ printf '\n[PayMyDine V122 Local-First 0.3.37] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V122 Local-First 0.3.37][ERROR] %s\n' "$*" >&2; exit 1; }

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

log "Fetching immutable V122 Local-First source"
"${GIT[@]}" fetch origin "$SOURCE_REF"
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" ||
  fail "Pinned source commit unavailable: $SOURCE_COMMIT"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v122-local-first-037-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v122-local-first-037-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

log "Staging exact cumulative platform payload"
for rel in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel" ||
    fail "Unable to stage $rel"
done

BOOT="$STAGE/app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
COMMANDS="$STAGE/app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"
PAIRING="$STAGE/app/Services/PmdMobileSync/PmdMobilePairingService.php"
TERMINAL="$STAGE/app/Services/TerminalPayments/TerminalPaymentService.php"
CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
PARITY_CSS="$STAGE/app/admin/assets/css/pmd-qpos-web-parity-v112.css"
JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
PARITY_JS="$STAGE/app/admin/assets/js/pmd-qpos-web-parity-v112.js"
PUSH="$STAGE/app/admin/assets/js/push-notifications.js"
QUICK="$STAGE/app/admin/controllers/PmdQuickPosV1.php"
KDS_CONTROLLER="$STAGE/app/admin/controllers/KitchenDisplay.php"
WAITER="$STAGE/app/admin/controllers/PmdWaiterPosV1.php"
TABLE_STATE="$STAGE/app/admin/controllers/PmdWaiterTableStateV154.php"
BATCH="$STAGE/app/admin/controllers/concerns/PmdQuickPosBatchPaymentV114Concern.php"
BOOTSTRAP_CONCERN="$STAGE/app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
PERSIST="$STAGE/app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
SAVE="$STAGE/app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
SETTLE="$STAGE/app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php"
OPS="$STAGE/app/admin/controllers/concerns/PmdWaiterPosOperationsSummaryV12Concern.php"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
KDS_VIEW="$STAGE/app/admin/views/kitchendisplay/index.blade.php"
SETTINGS="$STAGE/app/admin/views/pmdsettings/index.blade.php"
QUICK_ROUTES="$STAGE/routes/admin-quick-mode.php"

log "Validating frozen V122 + Local-First contracts before touching production"

cmp -s "$CSS" "$PARITY_CSS" ||
  fail "Android/Web CSS parity differs in frozen source"
cmp -s "$JS" "$PARITY_JS" ||
  fail "Android/Web JS parity differs in frozen source"

grep -Fq "PMD_MOBILE_TRUSTED_TIME_ANCHOR_V104" "$BOOT" ||
  fail "Trusted server-time anchor missing"
grep -Fq "PMD_MOBILE_OFFLINE_CASH_CAPABILITY_V23" "$BOOT" ||
  fail "Offline Cash capability missing"
grep -Fq "PMD_MOBILE_ORDER_ITEM_ADJUST_V106" "$COMMANDS" ||
  fail "Cloud-line reconciliation command missing"
grep -Fq "PMD_MOBILE_CASH_LOCAL_AGGREGATE_RESOLVE_V101" "$COMMANDS" ||
  fail "Offline Cash aggregate reconciliation missing"

grep -Fq "PMD_QPOS_SYNC_VISIBILITY_V104" "$JS" ||
  fail "Local-First sync visibility missing"
grep -Fq "PMD_QPOS_KITCHEN_ROUND_SPLIT_V119" "$JS" ||
  fail "V119 Kitchen-round split missing"
grep -Fq "PMD_QPOS_SERVER_ROUND_AUTHORITY_V121" "$JS" ||
  fail "V121 server round authority missing"
grep -Fq "PMD_QPOS_BATCH_MAIN_PAY_V122" "$JS" ||
  fail "V122 combined Pay behavior missing"

grep -Fq "PMD_QPOS_MOBILE_PAYMENT_STACK_V120" "$CSS" ||
  fail "V120 mobile payment stack missing"
grep -Fq "PMD_QPOS_MOBILE_FLOATING_KEYPAD_V121" "$CSS" ||
  fail "V121 floating keypad missing"
grep -Fq "PMD_QPOS_MOBILE_LAYER_TOP_V122" "$CSS" ||
  fail "V122 mobile layer/category behavior missing"

grep -Fq "PMD_MOBILE_PAY_BEFORE_KITCHEN_V108" "$SAVE" ||
  fail "Pay-before-Kitchen server contract missing"
grep -Fq "PMD_QPOS_SERVER_ROUND_AUTHORITY_V121" "$PERSIST" ||
  fail "Server Kitchen-round authority missing"
grep -Fq "payment-batch-summary" "$QUICK_ROUTES" ||
  fail "Batch payment summary route missing"
grep -Fq "payment-batch-settle" "$QUICK_ROUTES" ||
  fail "Batch payment settle route missing"

grep -Fq "PMD_KDS_RECEIVED_APPEND_REFRESH_V122" "$KDS_VIEW" ||
  fail "V122 KDS append refresh missing"
grep -Fq "pmd-qpos-web-parity-v112.css?v=20260925-v122" "$VIEW" ||
  fail "V122 Android CSS cache-buster missing"
grep -Fq "pmd-qpos-web-parity-v112.js?v=20260925-v122" "$VIEW" ||
  fail "V122 Android JS cache-buster missing"
grep -Fq "PayMyDine-Android-0.3.37.apk" "$SETTINGS" ||
  fail "Settings does not point to Android 0.3.37"
grep -Fq "PMD_PUSH_NATIVE_OFFLINE_SUSPEND_V18" "$PUSH" ||
  fail "Native-offline notification polling guard missing"

for php_file in   "$BOOT" "$COMMANDS" "$PAIRING" "$TERMINAL" "$QUICK" "$KDS_CONTROLLER"   "$WAITER" "$TABLE_STATE" "$BATCH" "$BOOTSTRAP_CONCERN" "$PERSIST"   "$SAVE" "$SETTLE" "$OPS" "$QUICK_ROUTES"; do
  php -l "$php_file" >/dev/null ||
    fail "PHP syntax failed: $php_file"
done

if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null ||
    fail "Quick POS JavaScript syntax failed"
  node --check "$PARITY_JS" >/dev/null ||
    fail "Parity JavaScript syntax failed"
  node --check "$PUSH" >/dev/null ||
    fail "Push notification JavaScript syntax failed"
fi

log "Downloading signed Android 0.3.37 release"
mkdir -p "$STAGE/downloads/paymydine"
curl -fL --retry 3 --retry-delay 2   "$APK_URL"   -o "$STAGE/$APK_REL"

ACTUAL_APK_SHA="$(sha256sum "$STAGE/$APK_REL" | awk '{print $1}')"
[[ "$ACTUAL_APK_SHA" == "$APK_SHA256" ]] ||
  fail "APK SHA-256 mismatch: expected $APK_SHA256, got $ACTUAL_APK_SHA"

printf '%s  %s\n' "$APK_SHA256" "$APK_NAME" > "$STAGE/$APK_SHA_REL"

EXISTING=()
for rel in "${FILES[@]}" "$APK_REL" "$APK_SHA_REL"; do
  [[ -e "$PMD_ROOT/$rel" ]] && EXISTING+=("$rel")
done

if (("${#EXISTING[@]}" > 0)); then
  log "Backing up current production files"
  sudo tar -C "$PMD_ROOT" -czf "$BACKUP" -- "${EXISTING[@]}"
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

log "Installing cumulative V122 platform payload"
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
apk_uid="$(stat -c '%u' "$APK_DIR")"
apk_gid="$(stat -c '%g' "$APK_DIR")"

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
  fail "Live Android/Web CSS parity verification failed"

cmp -s   app/admin/assets/js/pmd-quick-pos-v1.js   app/admin/assets/js/pmd-qpos-web-parity-v112.js ||
  fail "Live Android/Web JS parity verification failed"

grep -Fq "PMD_QPOS_BATCH_MAIN_PAY_V122"   app/admin/assets/js/pmd-quick-pos-v1.js ||
  fail "Live V122 combined Pay verification failed"
grep -Fq "PMD_QPOS_SERVER_ROUND_AUTHORITY_V121"   app/admin/assets/js/pmd-quick-pos-v1.js ||
  fail "Live V121 round-authority verification failed"
grep -Fq "PMD_QPOS_MOBILE_LAYER_TOP_V122"   app/admin/assets/css/pmd-quick-pos-v1.css ||
  fail "Live V122 mobile layout verification failed"
grep -Fq "PMD_KDS_RECEIVED_APPEND_REFRESH_V122"   app/admin/views/kitchendisplay/index.blade.php ||
  fail "Live V122 KDS refresh verification failed"
grep -Fq "PayMyDine-Android-0.3.37.apk"   app/admin/views/pmdsettings/index.blade.php ||
  fail "Live Settings Android link is incorrect"
grep -Fq "PMD_PUSH_NATIVE_OFFLINE_SUSPEND_V18"   app/admin/assets/js/push-notifications.js ||
  fail "Live native-offline push guard missing"

LIVE_APK_SHA="$(sha256sum "$PMD_ROOT/$APK_REL" | awk '{print $1}')"
[[ "$LIVE_APK_SHA" == "$APK_SHA256" ]] ||
  fail "Live APK checksum mismatch"

cat <<EOF

============================================================
 PAYMYDINE V122 LOCAL-FIRST 0.3.37 DEPLOY COMPLETE
============================================================
Frozen platform:
  $FROZEN_PLATFORM

Immutable source:
  $SOURCE_COMMIT
  $SOURCE_REF

Android:
  versionCode 50
  versionName 0.3.37-v122-local-first

APK:
  $APK_NAME
  SHA-256 $APK_SHA256

ACTIVE
  Cashier authority          = Android SQLite / Local-First
  Cloud                      = background canonical sync
  Reconnect                  = no active POS WebView replacement
  Offline Cash               = durable queue + canonical reconciliation
  Cloud-line +/-             = durable canonical reconciliation
  Pay-before-Kitchen HOLD    = Cloud-only reconciliation
  Kitchen-round authority    = server canonical V121
  KDS received append        = V122 refresh/repaint
  Multi-order Pay UX         = V122
  Android/Web Quick POS      = exact V122 parity
  Rejected sync work         = visible / not silently dropped

CLOUD-ONLY BY DESIGN
  Card / terminal / provider authorization
  Combined multi-check canonical settlement
  Split/provider payment flows

Backup:
  $BACKUP
============================================================
EOF
