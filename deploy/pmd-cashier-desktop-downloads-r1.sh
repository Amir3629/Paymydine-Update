#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="feature/cashier-desktop-universal-v1"
STAGE="$(mktemp -d /tmp/pmd-cashier-downloads-r1.XXXXXX)"
BACKUP="$ROOT/storage/pmd-backups/cashier-desktop-downloads-r1-$(date +%Y%m%d-%H%M%S)"
SETTINGS_REL="app/admin/controllers/Pmdsettings.php"
DEVICES_REL="app/admin/views/pmddevices/index.blade.php"
PATCHER_REL="deploy/pmd-cashier-desktop-downloads-r1-patch.py"
HEAD_BEFORE="$(git -C "$ROOT" rev-parse HEAD)"
BRANCH_BEFORE="$(git -C "$ROOT" branch --show-current)"
ACTIVATED=0

cleanup() { rm -rf "$STAGE"; }
rollback() {
  if [[ "$ACTIVATED" == "1" && -d "$BACKUP" ]]; then
    echo "AUTOMATIC CASHIER DOWNLOAD UI ROLLBACK"
    cp -a "$BACKUP/$SETTINGS_REL" "$ROOT/$SETTINGS_REL"
    cp -a "$BACKUP/$DEVICES_REL" "$ROOT/$DEVICES_REL"
    (cd "$ROOT" && php artisan view:clear >/dev/null 2>&1 || true)
    echo "CASHIER DOWNLOAD UI ROLLBACK COMPLETE"
  fi
}
trap 'rc=$?; if [[ $rc -ne 0 ]]; then rollback; fi; cleanup; exit $rc' EXIT

log() {
  echo "============================================================"
  echo "$1"
  echo "============================================================"
}

cd "$ROOT"
log "PMD CASHIER DESKTOP DOWNLOADS R1 - VIEW/SETTINGS ONLY"
echo "HEAD:   $HEAD_BEFORE"
echo "BRANCH: $BRANCH_BEFORE"

git fetch origin "$BRANCH"
FETCH_SHA="$(git rev-parse FETCH_HEAD)"
echo "SOURCE: $FETCH_SHA"

mkdir -p "$STAGE/$(dirname "$SETTINGS_REL")" "$STAGE/$(dirname "$DEVICES_REL")" "$STAGE/deploy"
cp -a "$ROOT/$SETTINGS_REL" "$STAGE/$SETTINGS_REL"
cp -a "$ROOT/$DEVICES_REL" "$STAGE/$DEVICES_REL"
git show "FETCH_HEAD:$PATCHER_REL" > "$STAGE/$PATCHER_REL"

python3 "$STAGE/$PATCHER_REL" "$STAGE/$SETTINGS_REL" "$STAGE/$DEVICES_REL"
php -l "$STAGE/$SETTINGS_REL" >/dev/null
grep -q 'PMD_CASHIER_DESKTOP_SETTINGS_SHORTCUT_R1' "$STAGE/$SETTINGS_REL"
grep -q 'PMD_CASHIER_DESKTOP_DOWNLOADS_R1' "$STAGE/$DEVICES_REL"
grep -q 'PayMyDine-Cashier-Setup-1.0.1.exe' "$STAGE/$DEVICES_REL"
grep -q 'PayMyDine-Cashier-1.0.1-mac-arm64.dmg' "$STAGE/$DEVICES_REL"
grep -q 'PayMyDine-Cashier-1.0.1-mac-x64.dmg' "$STAGE/$DEVICES_REL"

echo "DOWNLOAD_UI_CONTRACT=PASS"

mkdir -p "$BACKUP/$(dirname "$SETTINGS_REL")" "$BACKUP/$(dirname "$DEVICES_REL")"
cp -a "$ROOT/$SETTINGS_REL" "$BACKUP/$SETTINGS_REL"
cp -a "$ROOT/$DEVICES_REL" "$BACKUP/$DEVICES_REL"

install_preserving() {
  local src="$1" dst="$2"
  local mode owner group
  mode="$(stat -c '%a' "$dst")"
  owner="$(stat -c '%u' "$dst")"
  group="$(stat -c '%g' "$dst")"
  cp "$src" "$dst"
  chown "$owner:$group" "$dst"
  chmod "$mode" "$dst"
}

install_preserving "$STAGE/$SETTINGS_REL" "$ROOT/$SETTINGS_REL"
install_preserving "$STAGE/$DEVICES_REL" "$ROOT/$DEVICES_REL"
ACTIVATED=1

php artisan view:clear >/dev/null 2>&1 || true

grep -q 'PMD_CASHIER_DESKTOP_SETTINGS_SHORTCUT_R1' "$ROOT/$SETTINGS_REL"
grep -q 'PMD_CASHIER_DESKTOP_DOWNLOADS_R1' "$ROOT/$DEVICES_REL"

HEAD_AFTER="$(git rev-parse HEAD)"
echo "HEAD_BEFORE=$HEAD_BEFORE"
echo "HEAD_AFTER=$HEAD_AFTER"
[[ "$HEAD_BEFORE" == "$HEAD_AFTER" ]] || { echo "REFUSED: live Git HEAD moved"; exit 1; }

echo "NO_DB_CHANGES=YES"
echo "NO_PAYMENT_CHANGES=YES"
echo "NO_HARDWARE_BACKEND_CHANGES=YES"
echo "PMD CASHIER DESKTOP DOWNLOADS R1 DEPLOYED"
