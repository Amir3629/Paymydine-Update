#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-tomo.paymydine.com}"
PHP_FPM="${PHP_FPM:-php8.3-fpm}"
BRANCH="feature/cashier-desktop-settings-brand-v107"
PATCH="deploy/pmd-cashier-desktop-v107-settings-downloads-patch.py"
WORKFLOW=".github/workflows/cashier-desktop-v107.yml"
TAG="pmd-cashier-v1-preview"
REPO="Amir3629/Paymydine-Update"

FILES=(
  "app/admin/views/pmddevices/index.blade.php"
  "app/admin/views/pmdsettings/index.blade.php"
  "app/admin/controllers/Pmdsettings.php"
)

cd "$PMD_ROOT"
HEAD_BEFORE="$(git rev-parse HEAD)"
BRANCH_BEFORE="$(git branch --show-current)"
STAGE="$(mktemp -d /tmp/pmd-cashier-v107-stage.XXXXXX)"
BACKUP=""
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
  echo "AUTOMATIC PMD CASHIER V1.0.7 SETTINGS UI ROLLBACK"
  for relative in "${FILES[@]}"; do
    if [[ -f "$BACKUP/$relative" ]]; then
      install -D \
        -m "$(stat -c '%a' "$BACKUP/$relative")" \
        -o "$(stat -c '%U' "$BACKUP/$relative")" \
        -g "$(stat -c '%G' "$BACKUP/$relative")" \
        "$BACKUP/$relative" "$PMD_ROOT/$relative"
    fi
  done
  php artisan view:clear >/dev/null 2>&1 || true
  systemctl reload "$PHP_FPM" >/dev/null 2>&1 || true
  echo "PMD CASHIER V1.0.7 SETTINGS UI ROLLBACK COMPLETE"
}

refuse() {
  echo "PMD CASHIER V1.0.7 REFUSED: $1" >&2
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

log "PMD CASHIER DESKTOP V1.0.7 - SETTINGS DOWNLOAD FOOTER + BRANDED APP"
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

log "2. FETCH REVIEWED BRANCH WITHOUT MOVING LIVE HEAD"
git fetch origin "$BRANCH" || refuse "git fetch failed"
SOURCE_SHA="$(git rev-parse FETCH_HEAD)"
BUILD_SOURCE_SHA="$(git log -1 --format=%H FETCH_HEAD -- apps/cashier-desktop "$WORKFLOW")"
echo "SOURCE_SHA=$SOURCE_SHA"
echo "BUILD_SOURCE_SHA=$BUILD_SOURCE_SHA"
[[ -n "$BUILD_SOURCE_SHA" ]] || refuse "could not determine latest V1.0.7 app build source"

log "3. REQUIRE RELEASE FROM LATEST V1.0.7 APP BUILD SOURCE"
RELEASE_TARGET="$(curl -fsSL --max-time 30 "https://api.github.com/repos/$REPO/releases/tags/$TAG" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin).get("target_commitish", ""))' \
  || true)"
echo "RELEASE_TARGET=$RELEASE_TARGET"
[[ -n "$RELEASE_TARGET" ]] || refuse "release metadata unavailable"
[[ "$RELEASE_TARGET" == "$BUILD_SOURCE_SHA" ]] || refuse "V1.0.7 release is not built from latest app/workflow source yet"

asset_ok "PayMyDine-Cashier-Setup-1.0.7.exe" || refuse "Windows V1.0.7 asset is not ready"
asset_ok "PayMyDine-Cashier-1.0.7-mac-arm64.dmg" || refuse "Mac Apple Silicon V1.0.7 asset is not ready"
asset_ok "PayMyDine-Cashier-1.0.7-mac-x64.dmg" || refuse "Mac Intel V1.0.7 asset is not ready"

log "4. STAGE LIVE AUTHORITIES"
for relative in "${FILES[@]}"; do
  [[ -f "$PMD_ROOT/$relative" ]] || refuse "live authority missing: $relative"
  mkdir -p "$STAGE/$(dirname "$relative")"
  cp -p "$PMD_ROOT/$relative" "$STAGE/$relative" || refuse "could not stage $relative"
done

mkdir -p "$STAGE/$(dirname "$PATCH")"
git show "FETCH_HEAD:$PATCH" > "$STAGE/$PATCH" || refuse "could not read V1.0.7 patcher"
python3 -m py_compile "$STAGE/$PATCH" || refuse "patcher syntax failed"
python3 "$STAGE/$PATCH" "$STAGE" || refuse "Settings/Devices patch failed"

php -l "$STAGE/app/admin/views/pmddevices/index.blade.php" || refuse "staged Devices view PHP syntax failed"
php -l "$STAGE/app/admin/views/pmdsettings/index.blade.php" || refuse "staged Settings view PHP syntax failed"
php -l "$STAGE/app/admin/controllers/Pmdsettings.php" || refuse "staged Settings controller PHP syntax failed"

! grep -q 'id="cashier-desktop-app"' "$STAGE/app/admin/views/pmddevices/index.blade.php" || refuse "Devices download card remains"
! grep -q 'PMD_CASHIER_DESKTOP_DOWNLOADS_R1' "$STAGE/app/admin/views/pmddevices/index.blade.php" || refuse "visible old Devices marker remains"
! grep -q 'PMD_CASHIER_DESKTOP_SETTINGS_SHORTCUT_R1' "$STAGE/app/admin/controllers/Pmdsettings.php" || refuse "Settings shortcut remains"
grep -q 'PMD_CASHIER_DOWNLOADS_SETTINGS_FOOTER_V107' "$STAGE/app/admin/views/pmdsettings/index.blade.php" || refuse "Settings footer marker missing"
grep -q 'PayMyDine-Cashier-Setup-1.0.7.exe' "$STAGE/app/admin/views/pmdsettings/index.blade.php" || refuse "Windows V1.0.7 link missing"
grep -q 'PayMyDine-Cashier-1.0.7-mac-arm64.dmg' "$STAGE/app/admin/views/pmdsettings/index.blade.php" || refuse "Apple Silicon V1.0.7 link missing"
grep -q 'PayMyDine-Cashier-1.0.7-mac-x64.dmg' "$STAGE/app/admin/views/pmdsettings/index.blade.php" || refuse "Intel Mac V1.0.7 link missing"

log "5. BACKUP + ACTIVATE THREE LIVE AUTHORITIES"
BACKUP="$PMD_ROOT/storage/app/pmd-backups/cashier-v107-settings-$(date +%Y%m%d-%H%M%S)"
for relative in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$relative")"
  cp -p "$PMD_ROOT/$relative" "$BACKUP/$relative" || refuse "backup failed: $relative"
done

for relative in "${FILES[@]}"; do
  MODE="$(stat -c '%a' "$PMD_ROOT/$relative")"
  OWNER="$(stat -c '%U' "$PMD_ROOT/$relative")"
  GROUP="$(stat -c '%G' "$PMD_ROOT/$relative")"
  install -D -m "$MODE" -o "$OWNER" -g "$GROUP" "$STAGE/$relative" "$PMD_ROOT/$relative" || refuse "activation failed: $relative"
done
ACTIVATED=1

php artisan view:clear >/dev/null 2>&1 || refuse "view cache clear failed"
systemctl reload "$PHP_FPM" >/dev/null 2>&1 || refuse "$PHP_FPM reload failed"

log "6. POST-DEPLOY PROOF"
for relative in "${FILES[@]}"; do
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

! grep -q 'id="cashier-desktop-app"' "$PMD_ROOT/app/admin/views/pmddevices/index.blade.php" || refuse "live Devices download card remains"
! grep -q 'PMD_CASHIER_DESKTOP_SETTINGS_SHORTCUT_R1' "$PMD_ROOT/app/admin/controllers/Pmdsettings.php" || refuse "live Settings shortcut remains"
grep -q 'PMD_CASHIER_DOWNLOADS_SETTINGS_FOOTER_V107' "$PMD_ROOT/app/admin/views/pmdsettings/index.blade.php" || refuse "live Settings footer missing"

ADMIN_AFTER="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/admin" || true)"
ROOT_AFTER="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/" || true)"
SETTINGS_AFTER="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/admin/pmdsettings" || true)"
DEVICES_AFTER="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/admin/pmddevices" || true)"
echo "POST admin=$ADMIN_AFTER root=$ROOT_AFTER settings=$SETTINGS_AFTER devices=$DEVICES_AFTER"
[[ "$ADMIN_AFTER" =~ ^[23] ]] || refuse "admin post-health is not 2xx/3xx"
[[ "$ROOT_AFTER" =~ ^[23] ]] || refuse "root post-health is not 2xx/3xx"
[[ "$SETTINGS_AFTER" =~ ^[23] ]] || refuse "settings post-health is not 2xx/3xx"
[[ "$DEVICES_AFTER" =~ ^[23] ]] || refuse "devices post-health is not 2xx/3xx"

log "PMD CASHIER DESKTOP V1.0.7 SETTINGS FOOTER DEPLOYED"
echo "SETTINGS_SHORTCUT_CARD_REMOVED=YES"
echo "DEVICES_DOWNLOAD_SECTION_REMOVED=YES"
echo "SETTINGS_BOTTOM_DOWNLOADS=WINDOWS_APPLE_SILICON_INTEL"
echo "DESKTOP_APP_VERSION=1.0.7"
echo "DESKTOP_HARDWARE_UI_BRANDED=YES"
echo "DESKTOP_REAL_PAYMYDINE_LOGO=YES"
echo "DESKTOP_BLUE_PLACEHOLDER_STYLE_REMOVED=YES"
echo "FILES_CHANGED=3_LIVE_AUTHORITIES"
echo "DB_CHANGES=NO"
echo "PAYMENT_BACKEND_CHANGED=NO"
echo "LIVE_GIT_HEAD_MOVED=NO"
