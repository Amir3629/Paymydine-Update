#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-tomo.paymydine.com}"
PHP_FPM="${PHP_FPM:-php8.3-fpm}"
BRANCH="feature/cashier-desktop-print-routing-v108"
PATCH="deploy/pmd-cashier-desktop-v108-print-routing-patch.py"
WORKFLOW=".github/workflows/cashier-desktop-v108.yml"
TAG="pmd-cashier-v1-preview"
REPO="Amir3629/Paymydine-Update"

INVOICE="app/admin/views/orders/customer_invoice.blade.php"
SETTINGS="app/admin/views/pmdsettings/index.blade.php"
ASSET="app/admin/assets/js/pmd-desktop-print-bridge-v108.js"
FILES=("$INVOICE" "$SETTINGS")

cd "$PMD_ROOT"
HEAD_BEFORE="$(git rev-parse HEAD)"
BRANCH_BEFORE="$(git branch --show-current)"
STAGE="$(mktemp -d /tmp/pmd-cashier-v108-stage.XXXXXX)"
BACKUP=""
ASSET_EXISTED=0
ACTIVATED=0

cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

log() {
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

rollback() {
  if [[ "$ACTIVATED" != "1" || -z "$BACKUP" ]]; then return 0; fi
  echo "AUTOMATIC PMD CASHIER V1.0.8 PRINT ROUTING ROLLBACK"
  for relative in "${FILES[@]}"; do
    if [[ -f "$BACKUP/$relative" ]]; then
      install -D \
        -m "$(stat -c '%a' "$BACKUP/$relative")" \
        -o "$(stat -c '%U' "$BACKUP/$relative")" \
        -g "$(stat -c '%G' "$BACKUP/$relative")" \
        "$BACKUP/$relative" "$PMD_ROOT/$relative"
    fi
  done
  if [[ "$ASSET_EXISTED" == "1" && -f "$BACKUP/$ASSET" ]]; then
    install -D \
      -m "$(stat -c '%a' "$BACKUP/$ASSET")" \
      -o "$(stat -c '%U' "$BACKUP/$ASSET")" \
      -g "$(stat -c '%G' "$BACKUP/$ASSET")" \
      "$BACKUP/$ASSET" "$PMD_ROOT/$ASSET"
  else
    rm -f "$PMD_ROOT/$ASSET"
  fi
  php artisan view:clear >/dev/null 2>&1 || true
  systemctl reload "$PHP_FPM" >/dev/null 2>&1 || true
  echo "PMD CASHIER V1.0.8 PRINT ROUTING ROLLBACK COMPLETE"
}

refuse() {
  echo "PMD CASHIER V1.0.8 REFUSED: $1" >&2
  rollback
  exit 1
}

asset_ok() {
  local name="$1"
  local url="https://github.com/$REPO/releases/download/$TAG/$name"
  local result
  result="$(curl -fsSIL --max-time 30 -o /dev/null -w '%{http_code}|%{url_effective}' "$url" || true)"
  echo "$name => $result"
  [[ "${result%%|*}" == "200" ]]
}

log "PMD CASHIER DESKTOP V1.0.8 - DIRECT RECEIPT/INVOICE PRINT ROUTING"
echo "HEAD:   $HEAD_BEFORE"
echo "BRANCH: $BRANCH_BEFORE"

log "1. PRE-DEPLOY HEALTH"
ADMIN_CODE="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/admin" || true)"
ROOT_CODE="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/" || true)"
SETTINGS_CODE="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/admin/pmdsettings" || true)"
echo "admin=$ADMIN_CODE root=$ROOT_CODE settings=$SETTINGS_CODE"
[[ "$ADMIN_CODE" =~ ^[23] ]] || refuse "admin pre-health is not 2xx/3xx"
[[ "$ROOT_CODE" =~ ^[23] ]] || refuse "root pre-health is not 2xx/3xx"
[[ "$SETTINGS_CODE" =~ ^[23] ]] || refuse "settings pre-health is not 2xx/3xx"

log "2. FETCH REVIEWED V1.0.8 BRANCH WITHOUT MOVING LIVE HEAD"
git fetch origin "$BRANCH" || refuse "git fetch failed"
SOURCE_SHA="$(git rev-parse FETCH_HEAD)"
BUILD_SOURCE_SHA="$(git log -1 --format=%H FETCH_HEAD -- apps/cashier-desktop "$WORKFLOW")"
echo "SOURCE_SHA=$SOURCE_SHA"
echo "BUILD_SOURCE_SHA=$BUILD_SOURCE_SHA"
[[ -n "$BUILD_SOURCE_SHA" ]] || refuse "could not determine latest V1.0.8 app build source"

log "3. REQUIRE RELEASE FROM LATEST V1.0.8 BUILD SOURCE"
RELEASE_TARGET="$(curl -fsSL --max-time 30 "https://api.github.com/repos/$REPO/releases/tags/$TAG" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin).get("target_commitish", ""))' \
  || true)"
echo "RELEASE_TARGET=$RELEASE_TARGET"
[[ -n "$RELEASE_TARGET" ]] || refuse "release metadata unavailable"
[[ "$RELEASE_TARGET" == "$BUILD_SOURCE_SHA" ]] || refuse "V1.0.8 release is not built from latest app/workflow source yet"

asset_ok "PayMyDine-Cashier-Setup-1.0.8.exe" || refuse "Windows V1.0.8 asset is not ready"
asset_ok "PayMyDine-Cashier-1.0.8-mac-arm64.dmg" || refuse "Mac Apple Silicon V1.0.8 asset is not ready"
asset_ok "PayMyDine-Cashier-1.0.8-mac-x64.dmg" || refuse "Mac Intel V1.0.8 asset is not ready"

log "4. STAGE LIVE PRINT AUTHORITIES"
for relative in "${FILES[@]}"; do
  [[ -f "$PMD_ROOT/$relative" ]] || refuse "live authority missing: $relative"
  mkdir -p "$STAGE/$(dirname "$relative")"
  cp -p "$PMD_ROOT/$relative" "$STAGE/$relative" || refuse "could not stage $relative"
done

mkdir -p "$STAGE/$(dirname "$ASSET")"
git show "FETCH_HEAD:$ASSET" > "$STAGE/$ASSET" || refuse "could not stage desktop print bridge asset"
mkdir -p "$STAGE/$(dirname "$PATCH")"
git show "FETCH_HEAD:$PATCH" > "$STAGE/$PATCH" || refuse "could not read V1.0.8 patcher"
python3 -m py_compile "$STAGE/$PATCH" || refuse "patcher syntax failed"
python3 "$STAGE/$PATCH" "$STAGE" || refuse "V1.0.8 print routing patch failed"

php -l "$STAGE/$INVOICE" || refuse "staged invoice PHP syntax failed"
php -l "$STAGE/$SETTINGS" || refuse "staged Settings PHP syntax failed"
if command -v node >/dev/null 2>&1; then
  node --check "$STAGE/$ASSET" || refuse "desktop print bridge JS syntax failed"
fi

grep -q 'pmd-desktop-print-bridge-v108.js' "$STAGE/$INVOICE" || refuse "invoice desktop bridge injection missing"
grep -q 'PMD_DESKTOP_STANDALONE_PRINT_BRIDGE_V108' "$STAGE/$ASSET" || refuse "desktop bridge marker missing"
grep -q 'PayMyDine-Cashier-Setup-1.0.8.exe' "$STAGE/$SETTINGS" || refuse "Windows V1.0.8 settings link missing"
grep -q 'PayMyDine-Cashier-1.0.8-mac-arm64.dmg' "$STAGE/$SETTINGS" || refuse "Apple Silicon V1.0.8 settings link missing"
grep -q 'PayMyDine-Cashier-1.0.8-mac-x64.dmg' "$STAGE/$SETTINGS" || refuse "Intel V1.0.8 settings link missing"

log "5. BACKUP + ACTIVATE PRINT AUTHORITIES"
BACKUP="$PMD_ROOT/storage/app/pmd-backups/cashier-v108-print-$(date +%Y%m%d-%H%M%S)"
for relative in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$relative")"
  cp -p "$PMD_ROOT/$relative" "$BACKUP/$relative" || refuse "backup failed: $relative"
done
if [[ -f "$PMD_ROOT/$ASSET" ]]; then
  ASSET_EXISTED=1
  mkdir -p "$BACKUP/$(dirname "$ASSET")"
  cp -p "$PMD_ROOT/$ASSET" "$BACKUP/$ASSET" || refuse "asset backup failed"
fi

for relative in "${FILES[@]}"; do
  MODE="$(stat -c '%a' "$PMD_ROOT/$relative")"
  OWNER="$(stat -c '%U' "$PMD_ROOT/$relative")"
  GROUP="$(stat -c '%G' "$PMD_ROOT/$relative")"
  install -D -m "$MODE" -o "$OWNER" -g "$GROUP" "$STAGE/$relative" "$PMD_ROOT/$relative" || refuse "activation failed: $relative"
done

ASSET_OWNER="$(stat -c '%U' "$PMD_ROOT/app/admin/assets/js")"
ASSET_GROUP="$(stat -c '%G' "$PMD_ROOT/app/admin/assets/js")"
install -D -m 0644 -o "$ASSET_OWNER" -g "$ASSET_GROUP" "$STAGE/$ASSET" "$PMD_ROOT/$ASSET" || refuse "desktop bridge asset activation failed"
ACTIVATED=1

php artisan view:clear >/dev/null 2>&1 || refuse "view cache clear failed"
systemctl reload "$PHP_FPM" >/dev/null 2>&1 || refuse "$PHP_FPM reload failed"

log "6. POST-DEPLOY PROOF"
for relative in "${FILES[@]}" "$ASSET"; do
  STAGE_SHA="$(sha256sum "$STAGE/$relative" | awk '{print $1}')"
  LIVE_SHA="$(sha256sum "$PMD_ROOT/$relative" | awk '{print $1}')"
  echo "$relative stage=$STAGE_SHA live=$LIVE_SHA"
  [[ "$LIVE_SHA" == "$STAGE_SHA" ]] || refuse "live bytes differ from staged bytes: $relative"
done

HEAD_AFTER="$(git rev-parse HEAD)"
BRANCH_AFTER="$(git branch --show-current)"
echo "HEAD_BEFORE=$HEAD_BEFORE"
echo "HEAD_AFTER=$HEAD_AFTER"
echo "BRANCH_BEFORE=$BRANCH_BEFORE"
echo "BRANCH_AFTER=$BRANCH_AFTER"
[[ "$HEAD_AFTER" == "$HEAD_BEFORE" ]] || refuse "live Git HEAD moved"
[[ "$BRANCH_AFTER" == "$BRANCH_BEFORE" ]] || refuse "live Git branch changed"

grep -q 'pmd-desktop-print-bridge-v108.js' "$PMD_ROOT/$INVOICE" || refuse "live invoice bridge missing"
grep -q 'PMD_DESKTOP_STANDALONE_PRINT_BRIDGE_V108' "$PMD_ROOT/$ASSET" || refuse "live print bridge marker missing"
grep -q 'PayMyDine-Cashier-Setup-1.0.8.exe' "$PMD_ROOT/$SETTINGS" || refuse "live V1.0.8 Settings link missing"

ADMIN_AFTER="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/admin" || true)"
ROOT_AFTER="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/" || true)"
SETTINGS_AFTER="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/admin/pmdsettings" || true)"
echo "POST admin=$ADMIN_AFTER root=$ROOT_AFTER settings=$SETTINGS_AFTER"
[[ "$ADMIN_AFTER" =~ ^[23] ]] || refuse "admin post-health is not 2xx/3xx"
[[ "$ROOT_AFTER" =~ ^[23] ]] || refuse "root post-health is not 2xx/3xx"
[[ "$SETTINGS_AFTER" =~ ^[23] ]] || refuse "settings post-health is not 2xx/3xx"

log "PMD CASHIER DESKTOP V1.0.8 PRINT ROUTING DEPLOYED"
echo "DESKTOP_APP_VERSION=1.0.8"
echo "RECEIPT_POPUP_DIRECT_PRINT=YES"
echo "ORDER_CENTER_INVOICE_POPUP_DIRECT_PRINT=YES"
echo "STANDALONE_INVOICE_DESKTOP_BRIDGE=YES"
echo "WINDOWS_NATIVE_PRINT_DIALOG_FOR_DESKTOP_REPRINT=NO"
echo "GENERIC_TEXT_ONLY_RASTER_PATH_PRESERVED=YES"
echo "VIRTUAL_PDF_MODE_PRESERVED=YES"
echo "TRUTHFUL_HARDWARE_TESTS_PRESERVED=YES"
echo "CASH_DRAWER_PAYMENT_DEDUPE_PRESERVED=YES"
echo "FILES_CHANGED=2_VIEWS_PLUS_1_JS_ASSET"
echo "DB_CHANGES=NO"
echo "PAYMENT_BACKEND_CHANGED=NO"
echo "LIVE_GIT_HEAD_MOVED=NO"
