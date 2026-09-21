#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
TEST_HOST="${TEST_HOST:-moon.paymydine.com}"
BRANCH="feature/cashier-desktop-virtual-print-v104"
VIEW="app/admin/views/pmddevices/index.blade.php"
PATCH="deploy/pmd-cashier-desktop-v104-downloads-patch.py"
TAG="pmd-cashier-v1-preview"
REPO="Amir3629/Paymydine-Update"

cd "$PMD_ROOT"
HEAD_BEFORE="$(git rev-parse HEAD)"
BRANCH_BEFORE="$(git branch --show-current)"
STAGE="$(mktemp -d /tmp/pmd-cashier-v104-stage.XXXXXX)"
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
  echo "AUTOMATIC PMD CASHIER V1.0.4 DOWNLOAD UI ROLLBACK"
  if [[ -f "$BACKUP/$VIEW" ]]; then
    install -D -m "$(stat -c '%a' "$BACKUP/$VIEW")" \
      -o "$(stat -c '%U' "$BACKUP/$VIEW")" \
      -g "$(stat -c '%G' "$BACKUP/$VIEW")" \
      "$BACKUP/$VIEW" "$PMD_ROOT/$VIEW"
  fi
  php artisan view:clear >/dev/null 2>&1 || true
  echo "PMD CASHIER V1.0.4 DOWNLOAD UI ROLLBACK COMPLETE"
}

refuse() {
  echo "PMD CASHIER V1.0.4 REFUSED: $1" >&2
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

log "PMD CASHIER DESKTOP V1.0.4 - VIRTUAL PDF DOWNLOAD UPDATE"
echo "HEAD:   $HEAD_BEFORE"
echo "BRANCH: $BRANCH_BEFORE"

log "1. PRE-DEPLOY HEALTH"
ADMIN_CODE="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/admin" || true)"
ROOT_CODE="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/" || true)"
echo "admin=$ADMIN_CODE root=$ROOT_CODE"
[[ "$ADMIN_CODE" =~ ^[23] ]] || refuse "admin pre-health is not 2xx/3xx"
[[ "$ROOT_CODE" =~ ^[23] ]] || refuse "root pre-health is not 2xx/3xx"

log "2. REQUIRE ALL V1.0.4 RELEASE ASSETS"
asset_ok "PayMyDine-Cashier-Setup-1.0.4.exe" || refuse "Windows V1.0.4 release asset is not ready"
asset_ok "PayMyDine-Cashier-1.0.4-mac-arm64.dmg" || refuse "Mac Apple Silicon V1.0.4 release asset is not ready"
asset_ok "PayMyDine-Cashier-1.0.4-mac-x64.dmg" || refuse "Mac Intel V1.0.4 release asset is not ready"

log "3. FETCH REVIEWED BRANCH WITHOUT MOVING LIVE HEAD"
git fetch origin "$BRANCH" || refuse "git fetch failed"

mkdir -p "$STAGE/$(dirname "$VIEW")" "$STAGE/deploy"
cp -p "$PMD_ROOT/$VIEW" "$STAGE/$VIEW" || refuse "could not stage live Devices view"
git show "FETCH_HEAD:$PATCH" > "$STAGE/$PATCH" || refuse "could not read V1.0.4 patcher"

log "4. PATCH LIVE-AUTHORITY DOWNLOAD UI"
python3 -m py_compile "$STAGE/$PATCH" || refuse "patcher syntax failed"
python3 "$STAGE/$PATCH" "$STAGE" || refuse "download UI patch failed"
php -l "$STAGE/$VIEW" || refuse "staged Devices view PHP syntax failed"
grep -q 'PMD_CASHIER_DESKTOP_DOWNLOADS_V104' "$STAGE/$VIEW" || refuse "V1.0.4 marker missing"
grep -q 'PayMyDine-Cashier-Setup-1.0.4.exe' "$STAGE/$VIEW" || refuse "Windows V1.0.4 link missing"
grep -q 'PayMyDine-Cashier-1.0.4-mac-arm64.dmg' "$STAGE/$VIEW" || refuse "Mac arm64 V1.0.4 link missing"
grep -q 'PayMyDine-Cashier-1.0.4-mac-x64.dmg' "$STAGE/$VIEW" || refuse "Mac x64 V1.0.4 link missing"

STAGE_SHA="$(sha256sum "$STAGE/$VIEW" | awk '{print $1}')"
echo "STAGE_VIEW_SHA=$STAGE_SHA"

log "5. BACKUP + ACTIVATE ONE VIEW ONLY"
BACKUP="$PMD_ROOT/storage/app/pmd-backups/cashier-v104-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP/$(dirname "$VIEW")"
cp -p "$PMD_ROOT/$VIEW" "$BACKUP/$VIEW"

MODE="$(stat -c '%a' "$PMD_ROOT/$VIEW")"
OWNER="$(stat -c '%U' "$PMD_ROOT/$VIEW")"
GROUP="$(stat -c '%G' "$PMD_ROOT/$VIEW")"
install -D -m "$MODE" -o "$OWNER" -g "$GROUP" "$STAGE/$VIEW" "$PMD_ROOT/$VIEW"
ACTIVATED=1
php artisan view:clear >/dev/null 2>&1 || refuse "view cache clear failed"

log "6. POST-DEPLOY PROOF"
LIVE_SHA="$(sha256sum "$PMD_ROOT/$VIEW" | awk '{print $1}')"
HEAD_AFTER="$(git rev-parse HEAD)"
BRANCH_AFTER="$(git branch --show-current)"
echo "LIVE_VIEW_SHA=$LIVE_SHA"
echo "HEAD_BEFORE=$HEAD_BEFORE"
echo "HEAD_AFTER=$HEAD_AFTER"
echo "BRANCH_BEFORE=$BRANCH_BEFORE"
echo "BRANCH_AFTER=$BRANCH_AFTER"

[[ "$LIVE_SHA" == "$STAGE_SHA" ]] || refuse "live view bytes differ from staged view"
[[ "$HEAD_AFTER" == "$HEAD_BEFORE" ]] || refuse "live Git HEAD moved"
[[ "$BRANCH_AFTER" == "$BRANCH_BEFORE" ]] || refuse "live Git branch changed"
grep -q 'PMD_CASHIER_DESKTOP_DOWNLOADS_V104' "$PMD_ROOT/$VIEW" || refuse "live V1.0.4 marker missing"

ADMIN_AFTER="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/admin" || true)"
ROOT_AFTER="$(curl -k -sS -o /dev/null -w '%{http_code}' "https://$TEST_HOST/" || true)"
echo "POST admin=$ADMIN_AFTER root=$ROOT_AFTER"
[[ "$ADMIN_AFTER" =~ ^[23] ]] || refuse "admin post-health is not 2xx/3xx"
[[ "$ROOT_AFTER" =~ ^[23] ]] || refuse "root post-health is not 2xx/3xx"

log "PMD CASHIER DESKTOP V1.0.4 DOWNLOADS DEPLOYED"
echo "FILES_CHANGED=1_VIEW_ONLY"
echo "DESKTOP_APP_VERSION=1.0.4"
echo "VIRTUAL_PDF_MODE=YES"
echo "PHYSICAL_PRINTING_CHANGED_ON_SERVER=NO"
echo "PAYMENT_BACKEND_CHANGED=NO"
echo "DB_CHANGES=NO"
echo "LIVE_GIT_HEAD_MOVED=NO"
echo "Next: download V1.0.4, open Printer & cash drawer, choose Virtual PDF, Save, then Test Virtual PDF."
