#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-tomo.paymydine.com}"
PHP_FPM="${PHP_FPM:-php8.3-fpm}"
BRANCH="feature/cashier-desktop-settings-launcher-v107"
PATCH="deploy/pmd-cashier-desktop-v107-settings-launcher-patch.py"
VIEW="app/admin/views/pmdsettings/index.blade.php"
TAG="pmd-cashier-v1-preview"
REPO="Amir3629/Paymydine-Update"

cd "$PMD_ROOT"
HEAD_BEFORE="$(git rev-parse HEAD)"
BRANCH_BEFORE="$(git branch --show-current)"
STAGE="$(mktemp -d /tmp/pmd-cashier-launcher-v107.XXXXXX)"
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
  if [[ "$ACTIVATED" != "1" || -z "$BACKUP" || ! -f "$BACKUP/$VIEW" ]]; then
    return 0
  fi

  echo "AUTOMATIC PMD CASHIER SETTINGS LAUNCHER ROLLBACK"
  install -D \
    -m "$(stat -c '%a' "$BACKUP/$VIEW")" \
    -o "$(stat -c '%U' "$BACKUP/$VIEW")" \
    -g "$(stat -c '%G' "$BACKUP/$VIEW")" \
    "$BACKUP/$VIEW" "$PMD_ROOT/$VIEW"
  php artisan view:clear >/dev/null 2>&1 || true
  systemctl reload "$PHP_FPM" >/dev/null 2>&1 || true
  echo "PMD CASHIER SETTINGS LAUNCHER ROLLBACK COMPLETE"
}

refuse() {
  echo "PMD CASHIER SETTINGS LAUNCHER REFUSED: $1" >&2
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

log "PMD CASHIER SETTINGS COMPACT LAUNCHER V1.0.7"
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

log "2. REQUIRE EXISTING V1.0.7 DOWNLOADS"
asset_ok "PayMyDine-Cashier-Setup-1.0.7.exe" || refuse "Windows V1.0.7 asset unavailable"
asset_ok "PayMyDine-Cashier-1.0.7-mac-arm64.dmg" || refuse "Apple Silicon V1.0.7 asset unavailable"
asset_ok "PayMyDine-Cashier-1.0.7-mac-x64.dmg" || refuse "Intel Mac V1.0.7 asset unavailable"

log "3. FETCH REVIEWED UI WITHOUT MOVING LIVE HEAD"
git fetch origin "$BRANCH" || refuse "git fetch failed"
SOURCE_SHA="$(git rev-parse FETCH_HEAD)"
echo "SOURCE_SHA=$SOURCE_SHA"

log "4. STAGE LIVE SETTINGS AUTHORITY"
[[ -f "$PMD_ROOT/$VIEW" ]] || refuse "live Settings view missing"
mkdir -p "$STAGE/$(dirname "$VIEW")" "$STAGE/$(dirname "$PATCH")"
cp -p "$PMD_ROOT/$VIEW" "$STAGE/$VIEW" || refuse "could not stage Settings view"
git show "FETCH_HEAD:$PATCH" > "$STAGE/$PATCH" || refuse "could not read launcher patcher"
python3 -m py_compile "$STAGE/$PATCH" || refuse "launcher patcher syntax failed"
python3 "$STAGE/$PATCH" "$STAGE" || refuse "launcher UI patch failed"
php -l "$STAGE/$VIEW" || refuse "staged Settings PHP syntax failed"

grep -q 'PMD_CASHIER_SETTINGS_LAUNCHER_V107' "$STAGE/$VIEW" || refuse "launcher marker missing"
grep -q '>Cashier App<' "$STAGE/$VIEW" || refuse "Cashier App label missing"
grep -q '/brand/paymydine-logo.svg' "$STAGE/$VIEW" || refuse "PayMyDine logo missing"
grep -q 'Windows 10 / 11' "$STAGE/$VIEW" || refuse "Windows option missing"
grep -q 'Mac · Apple Silicon' "$STAGE/$VIEW" || refuse "Apple Silicon option missing"
grep -q 'Mac · Intel' "$STAGE/$VIEW" || refuse "Intel option missing"
! grep -q 'PMD_CASHIER_DOWNLOADS_SETTINGS_FOOTER_V107' "$STAGE/$VIEW" || refuse "old three-card footer remains"

echo "SETTINGS_LAUNCHER_CONTRACT=PASS"

log "5. BACKUP + ACTIVATE ONE VIEW ONLY"
BACKUP="$PMD_ROOT/storage/app/pmd-backups/cashier-settings-launcher-v107-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP/$(dirname "$VIEW")"
cp -p "$PMD_ROOT/$VIEW" "$BACKUP/$VIEW" || refuse "backup failed"

MODE="$(stat -c '%a' "$PMD_ROOT/$VIEW")"
OWNER="$(stat -c '%U' "$PMD_ROOT/$VIEW")"
GROUP="$(stat -c '%G' "$PMD_ROOT/$VIEW")"
install -D -m "$MODE" -o "$OWNER" -g "$GROUP" "$STAGE/$VIEW" "$PMD_ROOT/$VIEW" || refuse "activation failed"
ACTIVATED=1

php artisan view:clear >/dev/null 2>&1 || refuse "view cache clear failed"
systemctl reload "$PHP_FPM" >/dev/null 2>&1 || refuse "$PHP_FPM reload failed"

log "6. POST-DEPLOY PROOF"
STAGE_SHA="$(sha256sum "$STAGE/$VIEW" | awk '{print $1}')"
LIVE_SHA="$(sha256sum "$PMD_ROOT/$VIEW" | awk '{print $1}')"
echo "STAGE_VIEW_SHA=$STAGE_SHA"
echo "LIVE_VIEW_SHA=$LIVE_SHA"
[[ "$LIVE_SHA" == "$STAGE_SHA" ]] || refuse "live Settings view differs from staged bytes"

HEAD_AFTER="$(git rev-parse HEAD)"
BRANCH_AFTER="$(git branch --show-current)"
echo "HEAD_BEFORE=$HEAD_BEFORE"
echo "HEAD_AFTER=$HEAD_AFTER"
echo "BRANCH_BEFORE=$BRANCH_BEFORE"
echo "BRANCH_AFTER=$BRANCH_AFTER"
[[ "$HEAD_AFTER" == "$HEAD_BEFORE" ]] || refuse "live Git HEAD moved"
[[ "$BRANCH_AFTER" == "$BRANCH_BEFORE" ]] || refuse "live Git branch changed"

grep -q 'PMD_CASHIER_SETTINGS_LAUNCHER_V107' "$PMD_ROOT/$VIEW" || refuse "live launcher missing"
! grep -q 'PMD_CASHIER_DOWNLOADS_SETTINGS_FOOTER_V107' "$PMD_ROOT/$VIEW" || refuse "live old footer remains"

ADMIN_AFTER="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/admin" || true)"
ROOT_AFTER="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/" || true)"
SETTINGS_AFTER="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/admin/pmdsettings" || true)"
echo "POST admin=$ADMIN_AFTER root=$ROOT_AFTER settings=$SETTINGS_AFTER"
[[ "$ADMIN_AFTER" =~ ^[23] ]] || refuse "admin post-health is not 2xx/3xx"
[[ "$ROOT_AFTER" =~ ^[23] ]] || refuse "root post-health is not 2xx/3xx"
[[ "$SETTINGS_AFTER" =~ ^[23] ]] || refuse "settings post-health is not 2xx/3xx"

log "PMD CASHIER SETTINGS COMPACT LAUNCHER V1.0.7 DEPLOYED"
echo "SETTINGS_CASHIER_UI=COMPACT_LAUNCHER"
echo "SETTINGS_CASHIER_LABEL=Cashier_App"
echo "PAYMYDINE_ICON=YES"
echo "WINDOWS_BRAND_COLOR=#0078D4"
echo "APPLE_LOGO=BLACK"
echo "INTEL_BRAND_COLOR=#0071C5"
echo "DOWNLOAD_CHOICES=WINDOWS_APPLE_SILICON_INTEL"
echo "ALWAYS_VISIBLE_WITHOUT_SCROLL=YES"
echo "EDGE_DIVIDER=NO"
echo "FILES_CHANGED=1_VIEW_ONLY"
echo "DB_CHANGES=NO"
echo "PAYMENT_BACKEND_CHANGED=NO"
echo "DESKTOP_APP_BUILD_CHANGED=NO"
echo "LIVE_GIT_HEAD_MOVED=NO"
